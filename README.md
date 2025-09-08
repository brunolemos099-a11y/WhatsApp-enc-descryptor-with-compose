# WA ENC Decryptor

Correção de build para EasyPanel/Compose:
- Troca `npm ci` -> `npm install --omit=dev` (sem package-lock.json)
- Adiciona `wget` no runtime para o healthcheck

Endpoints:
- GET /decrypt
- POST /decrypt
- POST /decrypt-batch
