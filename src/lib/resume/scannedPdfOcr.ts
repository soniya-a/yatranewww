import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { performOcrOnImageBuffer } from './ocrFallback';

export interface ScannedPdfOcrResult {
  text: string;
  charCount: number;
  numPages: number;
  ocrPagesProcessed: number;
  averageConfidence: number;
  diagnostics: {
    imagesExtracted: number;
    pagesChecked: number;
    warnings: string[];
  };
}

export class ScannedPdfError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'ScannedPdfError';
  }
}

/**
 * Converts raw pixel data (RGB, RGBA, or Grayscale) into a standard 24-bit uncompressed BMP Buffer.
 * Tesseract.js / Leptonica natively decodes BMP buffers without requiring native canvas/sharp bindings.
 */
export function rawPixelsToBmp(
  width: number,
  height: number,
  data: Uint8Array | Uint8ClampedArray,
  kind?: number
): Buffer {
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const paddingSize = rowSize - width * 3;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;

  const buf = Buffer.alloc(fileSize);

  // 1. BMP File Header (14 bytes)
  buf.write('BM', 0, 'ascii');
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt32LE(0, 6);
  buf.writeUInt32LE(54, 10); // Offset to start of pixel data

  // 2. DIB Header (BITMAPINFOHEADER - 40 bytes)
  buf.writeUInt32LE(40, 14); // Header size
  buf.writeInt32LE(width, 18);
  buf.writeInt32LE(height, 22); // Positive height = bottom-to-top layout
  buf.writeUInt16LE(1, 26); // Planes
  buf.writeUInt16LE(24, 28); // 24 bits per pixel
  buf.writeUInt32LE(0, 30); // BI_RGB (uncompressed)
  buf.writeUInt32LE(pixelArraySize, 34);
  buf.writeInt32LE(2835, 38); // 72 DPI
  buf.writeInt32LE(2835, 42); // 72 DPI
  buf.writeUInt32LE(0, 46);
  buf.writeUInt32LE(0, 50);

  // Determine channels from data length or kind
  const totalPixels = width * height;
  const channels = data.length >= totalPixels * 4 ? 4 : data.length >= totalPixels * 3 ? 3 : 1;

  let offset = 54;
  // Write rows bottom-to-top as standard for BMP
  for (let y = height - 1; y >= 0; y--) {
    const srcRowStart = y * width * channels;
    for (let x = 0; x < width; x++) {
      const srcIdx = srcRowStart + x * channels;
      let r = 0, g = 0, b = 0;

      if (channels === 1) {
        // Grayscale
        const gray = data[srcIdx];
        r = gray;
        g = gray;
        b = gray;
      } else {
        r = data[srcIdx];
        g = data[srcIdx + 1];
        b = data[srcIdx + 2];
      }

      // BMP stores color bytes in B, G, R order
      buf[offset++] = b;
      buf[offset++] = g;
      buf[offset++] = r;
    }
    // Pad row to 4-byte boundary
    for (let p = 0; p < paddingSize; p++) {
      buf[offset++] = 0;
    }
  }

  return buf;
}

import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

function toPureUint8Array(input: Buffer | Uint8Array | ArrayBuffer): Uint8Array {
  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }
  const view = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  const pure = new Uint8Array(input.byteLength);
  pure.set(view);
  return pure;
}

/**
 * Extracts and OCRs all page images from a scanned PDF when selectable text is missing or insufficient.
 */
export async function extractTextFromScannedPdf(
  dataBuffer: Buffer | Uint8Array,
  options: {
    maxPages?: number;
    maxResolution?: number;
    minImageSize?: number;
  } = {}
): Promise<ScannedPdfOcrResult> {
  const maxPages = options.maxPages ?? 5;
  const maxResolution = options.maxResolution ?? 4000;
  const minImageSize = options.minImageSize ?? 200; // Skip tiny icons/signatures under 200x200

  const warnings: string[] = [];
  const pureData = toPureUint8Array(dataBuffer);

  const cMapPath = path.resolve(process.cwd(), 'node_modules/pdfjs-dist/cmaps') + path.sep;
  const cMapUrl = fs.existsSync(cMapPath) ? pathToFileURL(cMapPath).href : undefined;
  const standardFontsPath = path.resolve(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts') + path.sep;
  const standardFontDataUrl = fs.existsSync(standardFontsPath) ? pathToFileURL(standardFontsPath).href : undefined;

  let doc: any = null;
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: pureData,
      cMapUrl,
      cMapPacked: true,
      standardFontDataUrl,
      useSystemFonts: true,
      disableFontFace: true,
      useWorkerFetch: false,
    });
    doc = await loadingTask.promise;
  } catch (err: any) {
    if (err?.name === 'PasswordException' || /password/i.test(err?.message || '')) {
      throw new ScannedPdfError('PDF_ENCRYPTED', 'This PDF is password-protected or encrypted. Please upload an unlocked PDF.');
    }
    throw new ScannedPdfError('INVALID_PDF_FORMAT', 'The uploaded file does not contain a valid or readable PDF structure.');
  }

  const numPages = doc.numPages || 1;
  const pagesToScan = Math.min(numPages, maxPages);
  if (numPages > maxPages) {
    warnings.push(`PDF has ${numPages} pages. OCR was capped to the first ${maxPages} pages for safety.`);
  }

  const pageTexts: string[] = [];
  const confidences: number[] = [];
  let totalImagesFound = 0;

  for (let pageNum = 1; pageNum <= pagesToScan; pageNum++) {
    const page = await doc.getPage(pageNum);
    const ops = await page.getOperatorList();

    const candidateImageOps: Array<{ fn: number; args: any[] }> = [];
    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i];
      if (
        fn === pdfjsLib.OPS.paintImageXObject ||
        fn === pdfjsLib.OPS.paintInlineImageXObject
      ) {
        candidateImageOps.push({ fn, args: ops.argsArray[i] });
      }
    }

    if (candidateImageOps.length === 0) {
      continue;
    }

    for (const op of candidateImageOps) {
      let imgObj: any = null;

      if (op.fn === pdfjsLib.OPS.paintImageXObject) {
        const imgName = op.args[0];
        imgObj = await new Promise((resolve) => {
          if (page.objs && typeof (page.objs as any).get === 'function') {
            (page.objs as any).get(imgName, (res: any) => resolve(res));
          } else {
            resolve(null);
          }
        });
      } else if (op.fn === pdfjsLib.OPS.paintInlineImageXObject) {
        imgObj = op.args[0];
      }

      if (!imgObj || !imgObj.data || !imgObj.width || !imgObj.height) {
        continue;
      }

      const { width, height, data } = imgObj;

      // Reject dimension bombs
      if (width > maxResolution || height > maxResolution) {
        warnings.push(`Image on page ${pageNum} (${width}x${height}) exceeded ${maxResolution}px limit and was skipped.`);
        continue;
      }

      // Skip non-page images (small logos, icons, stamps)
      if (width < minImageSize && height < minImageSize) {
        continue;
      }

      totalImagesFound++;

      try {
        const bmpBuffer = rawPixelsToBmp(width, height, data, imgObj.kind);
        const ocr = await performOcrOnImageBuffer(bmpBuffer);

        if (ocr.text && ocr.text.trim().length > 0) {
          pageTexts.push(ocr.text.trim());
          if (ocr.confidence > 0) {
            confidences.push(ocr.confidence);
          }
        }
      } catch (ocrErr: any) {
        warnings.push(`OCR failed on page ${pageNum} image: ${ocrErr?.message || String(ocrErr)}`);
      }
    }
  }

  const combinedText = pageTexts.join('\n\n').trim();
  const avgConf = confidences.length > 0
    ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length)
    : 0;

  return {
    text: combinedText,
    charCount: combinedText.length,
    numPages,
    ocrPagesProcessed: pagesToScan,
    averageConfidence: avgConf,
    diagnostics: {
      imagesExtracted: totalImagesFound,
      pagesChecked: pagesToScan,
      warnings
    }
  };
}
