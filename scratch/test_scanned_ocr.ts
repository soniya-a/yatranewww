import fs from 'fs';
import path from 'path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { performOcrOnImageBuffer } from '../src/lib/resume/ocrFallback';

function rgbToBmp(width: number, height: number, data: Uint8Array): Buffer {
  // BMP row size must be a multiple of 4 bytes
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const paddingSize = rowSize - width * 3;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;

  const buf = Buffer.alloc(fileSize);

  // 1. File Header (14 bytes)
  buf.write('BM', 0, 'ascii');
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt32LE(0, 6);
  buf.writeUInt32LE(54, 10); // Offset to pixel data

  // 2. DIB Header (BITMAPINFOHEADER - 40 bytes)
  buf.writeUInt32LE(40, 14); // Header size
  buf.writeInt32LE(width, 18);
  buf.writeInt32LE(height, 22); // Positive height = bottom-to-top
  buf.writeUInt16LE(1, 26); // Planes
  buf.writeUInt16LE(24, 28); // 24 bits per pixel (RGB)
  buf.writeUInt32LE(0, 30); // BI_RGB (uncompressed)
  buf.writeUInt32LE(pixelArraySize, 34);
  buf.writeInt32LE(2835, 38); // 72 DPI
  buf.writeInt32LE(2835, 42); // 72 DPI
  buf.writeUInt32LE(0, 46);
  buf.writeUInt32LE(0, 50);

  // 3. Pixel Data (BGR, bottom-to-top)
  let offset = 54;
  for (let y = height - 1; y >= 0; y--) {
    const srcRowStart = y * width * 3;
    for (let x = 0; x < width; x++) {
      const srcIdx = srcRowStart + x * 3;
      const r = data[srcIdx];
      const g = data[srcIdx + 1];
      const b = data[srcIdx + 2];

      buf[offset++] = b;
      buf[offset++] = g;
      buf[offset++] = r;
    }
    // Row padding
    for (let p = 0; p < paddingSize; p++) {
      buf[offset++] = 0;
    }
  }

  return buf;
}

async function main() {
  const filePath = path.resolve('scratch/upload_fixtures/scanned_resume.pdf');
  const buf = fs.readFileSync(filePath);
  const data = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);

  const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true, disableFontFace: true }).promise;
  const page = await doc.getPage(1);
  const ops = await page.getOperatorList();

  for (let i = 0; i < ops.fnArray.length; i++) {
    if (ops.fnArray[i] === pdfjsLib.OPS.paintImageXObject) {
      const imgName = ops.argsArray[i][0];
      const imgObj = await new Promise<any>((resolve) => {
        (page.objs as any).get(imgName, (obj: any) => resolve(obj));
      });

      if (imgObj && imgObj.data) {
        console.log(`Converting ${imgObj.width}x${imgObj.height} raw RGB to BMP...`);
        const bmpBuf = rgbToBmp(imgObj.width, imgObj.height, imgObj.data);
        console.log(`BMP size: ${bmpBuf.length} bytes. Running performOcrOnImageBuffer...`);
        const ocrRes = await performOcrOnImageBuffer(bmpBuf);
        console.log(`OCR Confidence: ${ocrRes.confidence}`);
        console.log(`OCR Text Length: ${ocrRes.text.length}`);
        console.log(`OCR Text Preview:\n${ocrRes.text.slice(0, 400)}`);
      }
    }
  }
}

main().catch(console.error);
