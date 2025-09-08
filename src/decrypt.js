import { deriveKeys, verifyMacOrThrow, aesCbcPkcs7Decrypt, sha256 } from './utils.js';

export async function decryptEncBytes(encBytes, { mediaKey, type, fileEncSHA256 }) {
  const { iv, cipherKey, macKey } = deriveKeys(mediaKey, type);
  if (fileEncSHA256) {
    const got = sha256(encBytes);
    const want = Buffer.from(fileEncSHA256, 'base64');
    if (want.length === 32 && !got.equals(want)) {
      throw new Error('fileEncSHA256 integrity check failed');
    }
  }
  const cipher = verifyMacOrThrow(encBytes, iv, macKey);
  const plain = aesCbcPkcs7Decrypt(cipher, cipherKey, iv);
  return plain;
}