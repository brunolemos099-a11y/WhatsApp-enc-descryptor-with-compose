import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import multer from "multer";
import bodyParser from "body-parser";
import cors from "cors";
import { fetchEncFile, b64ToBuf, guessContentType, normalizeMediaType } from "./utils.js";

let WA_DECRYPT = null;
async function loadWaDecrypt() {
  if (WA_DECRYPT) return WA_DECRYPT;
  const mod = await import("@open-wa/wa-decrypt");
  WA_DECRYPT =
    mod?.default?.decryptMedia ||
    mod?.decryptMedia ||
    mod?.default ||
    mod;
  if (typeof WA_DECRYPT !== "function") {
    throw new Error("Função decryptMedia não encontrada");
  }
  return WA_DECRYPT;
}

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 64 * 1024 * 1024 } });

app.use(helmet());
app.use(morgan("tiny"));
app.use(cors({ origin: "*", methods: ["GET","POST"] }));
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

app.get("/health", (_req,res)=>res.json({ok:true,ts:Date.now()}));

app.get("/decrypt", async (req,res)=>{
  try {
    const { url, mediaKey, fileEncSHA256, mediaType, return:ret } = req.query;
    if (!url || !mediaKey) return res.status(400).json({ error: "url e mediaKey são obrigatórios"});
    const encBuffer = await fetchEncFile(url);
    const decryptMedia = await loadWaDecrypt();
    const type = normalizeMediaType(mediaType);
    const decBuffer = await decryptMedia(encBuffer, String(mediaKey), type, fileEncSHA256||undefined);
    if (String(ret).toLowerCase() === "base64") {
      return res.json({ ok:true, base64: decBuffer.toString("base64"), mime: await guessContentType(decBuffer) });
    }
    res.setHeader("Content-Type", await guessContentType(decBuffer));
    return res.send(decBuffer);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post("/decrypt", upload.single("file"), async (req,res)=>{
  try {
    const fields = req.body || {};
    const type = normalizeMediaType(fields.mediaType);
    const mediaKey = fields.mediaKey;
    if (!mediaKey) return res.status(400).json({ error: "mediaKey obrigatório"});
    let encBuffer=null;
    if (req.file?.buffer) encBuffer=req.file.buffer;
    else if (fields.encBase64) encBuffer=b64ToBuf(fields.encBase64);
    else if (fields.encUrl) encBuffer=await fetchEncFile(fields.encUrl);
    else return res.status(400).json({ error: "nenhum .enc enviado"});
    const decryptMedia = await loadWaDecrypt();
    const decBuffer = await decryptMedia(encBuffer, String(mediaKey), type, fields.fileEncSHA256||undefined);
    if (String(fields.return).toLowerCase()==="base64") {
      return res.json({ ok:true, base64: decBuffer.toString("base64"), mime: await guessContentType(decBuffer) });
    }
    res.setHeader("Content-Type", await guessContentType(decBuffer));
    return res.send(decBuffer);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post("/decrypt-batch", async (req,res)=>{
  try {
    const items = Array.isArray(req.body) ? req.body : [];
    if (!items.length) return res.status(400).json({ error: "Envie um array de itens" });
    const decryptMedia = await loadWaDecrypt();
    const results = await Promise.all(items.map(async (it, idx)=>{
      try{
        const type = normalizeMediaType(it.mediaType);
        let encBuffer = it.encBase64 ? b64ToBuf(it.encBase64) : (it.encUrl ? await fetchEncFile(it.encUrl) : null);
        if (!encBuffer) throw new Error("Item sem encBase64/encUrl");
        if (!it.mediaKey) throw new Error("Item sem mediaKey");
        const decBuffer = await decryptMedia(encBuffer, String(it.mediaKey), type, it.fileEncSHA256||undefined);
        return { index: idx, ok:true, base64: decBuffer.toString("base64"), mime: await guessContentType(decBuffer) };
      }catch(err){ return { index: idx, ok:false, error: String(err?.message||err) }; }
    }));
    return res.json({ ok:true, results });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

const PORT=process.env.PORT||3000;
app.listen(PORT, ()=>console.log("wa-enc-decryptor rodando na porta "+PORT));
