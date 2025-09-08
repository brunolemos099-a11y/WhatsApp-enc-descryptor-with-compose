import axios from "axios";
import { fileTypeFromBuffer } from "file-type";

export async function fetchEncFile(url, extraHeaders = {}) {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    headers: { "User-Agent": "Mozilla/5.0", ...extraHeaders },
    maxRedirects: 3,
    validateStatus: (s) => s >= 200 && s < 300
  });
  return Buffer.from(res.data);
}

export async function guessContentType(buf, fallback = "application/octet-stream") {
  const ft = await fileTypeFromBuffer(buf);
  return ft?.mime || fallback;
}

export function b64ToBuf(b64) {
  const norm = String(b64).replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(norm, "base64");
}

export function normalizeMediaType(input) {
  const v = String(input || "").toLowerCase().trim();
  if (["image", "audio", "video", "document"].includes(v)) return v;
  return "image";
}
