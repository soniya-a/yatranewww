import fs from 'fs';
import path from 'path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { rawPixelsToBmp } from '../src/lib/resume/scannedPdfOcr';
import { performOcrOnImageBuffer } from '../src/lib/resume/ocrFallback';

async function testMixed() {
  const buf = fs.readFileSync('scratch/upload_fixtures/mixed_resume.pdf');
  const pureData = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);

  const doc = await pdfjsLib.getDocument({
    data: pureData,
    useSystemFonts: true,
    disableFontFace: true,
  }).promise;

  console.log('Mixed PDF page count:', doc.numPages);

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    console.log(`Page ${p} text items:`, tc.items.length);

    if (tc.items.length > 0) {
      const pageStr = tc.items.map((i: any) => i.str).join(' ');
      console.log(`Page ${p} text preview:`, pageStr.slice(0, 150));
    } else {
      console.log(`Page ${p} has 0 text items. Checking for image XObject...`);
      const ops = await page.getOperatorList();
      for (let i = 0; i < ops.fnArray.length; i++) {
        if (ops.fnArray[i] === pdfjsLib.OPS.paintImageXObject) {
          const imgName = ops.argsArray[i][0];
          const imgObj = await new Promise<any>((resolve) => {
            (page.objs as any).get(imgName, (res: any) => resolve(res));
          });
          if (imgObj) {
            console.log(`Page ${p} image found: ${imgObj.width}x${imgObj.height}. Running OCR...`);
            const bmp = rawPixelsToBmp(imgObj.width, imgObj.height, imgObj.data, imgObj.kind);
            const ocr = await performOcrOnImageBuffer(bmp);
            console.log(`Page ${p} OCR text preview:`, ocr.text.slice(0, 150));
          }
        }
      }
    }
  }
}

testMixed().catch(console.error);
