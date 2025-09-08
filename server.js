const express = require('express');
const crypto = require('crypto');
const multer = require('multer');

const app = express();
const port = process.env.PORT || 3000; // Usa a porta do ambiente ou 3000 como padrão

// Configuração do Multer para receber o arquivo em memória
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Dicionário de "info" strings para HKDF, conforme o tipo de mídia do WhatsApp
const MEDIA_TYPE_INFO = {
    'image': 'WhatsApp Image Keys',
    'audio': 'WhatsApp Audio Keys',
    'video': 'WhatsApp Video Keys',
    'document': 'WhatsApp Document Keys',
    'sticker': 'WhatsApp Image Keys' // Stickers usam a mesma info de imagens
};

/**
 * Deriva as chaves AES e HMAC a partir da mediaKey principal usando HKDF
 * @param {Buffer} mediaKeyBuffer - A mediaKey em formato de buffer.
 * @param {string} mediaType - O tipo de mídia ('image', 'audio', etc.).
 * @returns {{iv: Buffer, cipherKey: Buffer, macKey: Buffer}}
 */
function getDerivedKeys(mediaKeyBuffer, mediaType) {
    const info = MEDIA_TYPE_INFO[mediaType] || MEDIA_TYPE_INFO['image']; // Default para imagem
    const hkdf = crypto.hkdfSync('sha256', mediaKeyBuffer, Buffer.alloc(32), Buffer.from(info), 112);
    
    return {
        iv: hkdf.slice(0, 16),
        cipherKey: hkdf.slice(16, 48),
        macKey: hkdf.slice(48, 80)
    };
}

// Rota principal (GET) para um health check
app.get('/', (req, res) => {
    res.status(200).send('Servidor de descriptografia do WhatsApp está online. Use o endpoint POST /decrypt para enviar arquivos.');
});

// Rota de descriptografia (POST)
app.post('/decrypt', upload.single('file'), (req, res) => {
    try {
        // Validação da requisição
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo .enc foi enviado.' });
        }
        if (!req.body.mediaKey) {
            return res.status(400).json({ error: 'A mediaKey (em base64) é obrigatória.' });
        }
        if (!req.body.mediaType) {
            return res.status(400).json({ error: 'O mediaType (image, audio, etc.) é obrigatório.' });
        }

        const encryptedFileBuffer = req.file.buffer;
        const mediaKey = Buffer.from(req.body.mediaKey, 'base64');
        const mediaType = req.body.mediaType.toLowerCase();

        // 1. Derivar chaves IV, Cipher e MAC da mediaKey
        const { iv, cipherKey, macKey } = getDerivedKeys(mediaKey, mediaType);

        // 2. Separar o arquivo em conteúdo e assinatura HMAC
        const fileCiphertext = encryptedFileBuffer.slice(0, -32);
        const fileMac = encryptedFileBuffer.slice(-32);

        // 3. Validar a assinatura HMAC
        const hmac = crypto.createHmac('sha256', macKey).update(Buffer.concat([iv, fileCiphertext])).digest();

        if (!hmac.equals(fileMac)) {
            return res.status(400).json({ error: 'Falha na validação HMAC. A mediaKey está incorreta ou o arquivo está corrompido.' });
        }

        // 4. Descriptografar o conteúdo
        const decipher = crypto.createDecipheriv('aes-256-cbc', cipherKey, iv);
        const decrypted = Buffer.concat([decipher.update(fileCiphertext), decipher.final()]);

        // 5. Enviar o arquivo descriptografado como resposta
        // Definimos o content-type para que o n8n/navegador saiba que é um arquivo binário
        res.setHeader('Content-Disposition', 'attachment; filename=decrypted-file');
        res.setHeader('Content-Type', 'application/octet-stream');
        res.status(200).send(decrypted);

    } catch (error) {
        console.error('Erro no processo de descriptografia:', error);
        res.status(500).json({ error: 'Ocorreu um erro interno no servidor.', details: error.message });
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
