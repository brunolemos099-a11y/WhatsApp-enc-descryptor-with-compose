import crypto from 'node:crypto';

export const INFO_MAP = {
  image: 'WhatsApp Image Keys',
  audio: 'WhatsApp Audio Keys',
};

export function b64ToBuf(b64) {
  return Buffer.from(b64, 'base64');
}

export function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest();
}

export function hkdf(mediaKeyB64, infoString) {
  const mediaKey = b64ToBuf(mediaKeyB64);
  if (mediaKey.length !== 32) throw new Error('mediaKey must be 32 bytes base64');
  const salt = Buffer.alloc(32, 0);
  const info = Buffer.from(infoString, 'utf8');
  const prk = crypto.createHmac('sha256', salt).update(mediaKey).digest();
  let t = Buffer.alloc(0);
  let okm = Buffer.alloc(0);
  for (let i = 1; okm.length < 112; i++) {
    t = crypto.createHmac('sha256', prk).update(Buffer.concat([t, info, Buffer.from([i])])).digest();
    okm = Buffer.concat([okm, t]);
  }
  return okm.subarray(0, 112);
}

export function deriveKeys(mediaKeyB64, type) {
  const info = INFO_MAP[type];
  if (!info) throw new Error(`Unsupported type: ${type}`);
  const okm = hkdf(mediaKeyB64, info);
  const iv = okm.subarray(0, 16);
  const cipherKey = okm.subarray(16, 48);
  const macKey = okm.subarray(48, 80);
  return { iv, cipherKey, macKey };
}

export function verifyMacOrThrow(enc, iv, macKey) {
  if (enc.length < 10) throw new Error('Encrypted data too short');
  const mac = enc.subarray(enc.length - 10);
  const cipher = enc.subarray(0, enc.length - 10);
  const hmac = crypto.createHmac('sha256', macKey).update(Buffer.concat([iv, cipher])).digest().subarray(0, 10);
  if (!crypto.timingSafeEqual(mac, hmac)) throw new Error('MAC mismatch');
  return cipher;
}

export function aesCbcPkcs7Decrypt(cipher, key, iv) {
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const dec = Buffer.concat([decipher.update(cipher), decipher.final()]);
  return dec;
}