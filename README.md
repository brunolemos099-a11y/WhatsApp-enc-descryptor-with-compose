# WhatsApp ENC Media Decryptor

HTTP microservice to decrypt WhatsApp `.enc` files (images & audio) to binary. Built for n8n via HTTP Request node. Ships with Dockerfile; compatible with EasyPanel.

## Run with Docker
```bash
docker build -t wa-decryptor .
docker run -d --name wa-decryptor -p 8080:8080 wa-decryptor
```

## Endpoints
- GET /health → { ok: true }
- GET /decrypt?url=...&mediaKey=...&type=image&fileEncSHA256=...&format=base64&mimetype=image/jpeg
- POST /decrypt with JSON body
