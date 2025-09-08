import express from 'express';
import { decryptEncBytes } from './decrypt.js';

const app = express();
app.use(express.json({ limit: '25mb' }));

async function fetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

app.get('/health', (req, res) => res.json({ ok: true }));

app.get('/decrypt', async (req, res) => {
  try {
    const { url, mediaKey, type, fileEncSHA256, format, mimetype } = req.query;
    if (!url || !mediaKey || !type) return res.status(400).json({ error: 'Missing params' });
    const enc = await fetchBuffer(url);
    const plain = await decryptEncBytes(enc, { mediaKey, type, fileEncSHA256 });
    const outType = mimetype || (type === 'image' ? 'image/jpeg' : 'audio/ogg');
    if (format === 'base64') res.json({ base64: plain.toString('base64'), mimetype: outType, size: plain.length });
    else { res.setHeader('Content-Type', outType); res.send(plain); }
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.post('/decrypt', async (req, res) => {
  try {
    const { url, encBase64, mediaKey, type, fileEncSHA256, format, mimetype } = req.body || {};
    if ((!url && !encBase64) || !mediaKey || !type) return res.status(400).json({ error: 'Missing fields' });
    let enc = encBase64 ? Buffer.from(encBase64, 'base64') : await fetchBuffer(url);
    const plain = await decryptEncBytes(enc, { mediaKey, type, fileEncSHA256 });
    const outType = mimetype || (type === 'image' ? 'image/jpeg' : 'audio/ogg');
    if (format === 'base64') res.json({ base64: plain.toString('base64'), mimetype: outType, size: plain.length });
    else { res.setHeader('Content-Type', outType); res.send(plain); }
  } catch (e) { res.status(400).json({ error: e.message }); }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`[wa-decryptor] listening on :${PORT}`));
