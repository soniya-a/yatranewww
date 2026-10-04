import { createWorker } from "tesseract.js";

/**
 * OCR Fallback Engine using Tesseract.js
 * 
 * Extracts text from image buffers (PNG, JPG, TIFF, BMP) or scanned resume pages
 * when selectable text is missing or unavailable.
 */
export async function performOcrOnImageBuffer(imageBuffer: Buffer | Uint8Array): Promise<{ text: string; confidence: number }> {
  try {
    const worker = await createWorker("eng");
    const buf = Buffer.isBuffer(imageBuffer) ? imageBuffer : Buffer.from(imageBuffer);
    const ret = await worker.recognize(buf);
    await worker.terminate();

    const cleanText = (ret.data?.text || "").trim();
    const confidence = ret.data?.confidence || 0;

    return {
      text: cleanText,
      confidence
    };
  } catch (err: any) {
    console.error("[OCR Fallback Error]:", err?.message || String(err));
    return {
      text: "",
      confidence: 0
    };
  }
}
