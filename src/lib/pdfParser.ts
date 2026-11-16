import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';
import { reorderPageItemsColumnAware } from './resume/columnDetector';
import { rawPixelsToBmp } from './resume/scannedPdfOcr';
import { performOcrOnImageBuffer } from './resume/ocrFallback';

export interface PDFExtractionResult {
  text: string;
  numPages: number;
  charCount: number;
  parser: string;
  hasOcr?: boolean;
}

function toPureUint8Array(input: Buffer | Uint8Array | ArrayBuffer): Uint8Array {
  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }
  const view = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  const pure = new Uint8Array(input.byteLength);
  pure.set(view);
  return pure;
}

interface TextItemWithPos {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

async function extractOcrFromPageIfImage(page: any): Promise<string> {
  try {
    const ops = await page.getOperatorList();
    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i];
      if (
        fn === pdfjsLib.OPS.paintImageXObject ||
        fn === pdfjsLib.OPS.paintInlineImageXObject
      ) {
        let imgObj: any = null;
        if (fn === pdfjsLib.OPS.paintImageXObject) {
          const imgName = ops.argsArray[i][0];
          imgObj = await new Promise((resolve) => {
            if (page.objs && typeof (page.objs as any).get === 'function') {
              (page.objs as any).get(imgName, (res: any) => resolve(res));
            } else {
              resolve(null);
            }
          });
        } else {
          imgObj = ops.argsArray[i][0];
        }

        if (imgObj && imgObj.data && imgObj.width >= 200 && imgObj.height >= 200) {
          const bmpBuffer = rawPixelsToBmp(imgObj.width, imgObj.height, imgObj.data, imgObj.kind);
          const ocr = await performOcrOnImageBuffer(bmpBuffer);
          if (ocr.text && ocr.text.trim().length > 0) {
            return ocr.text.trim();
          }
        }
      }
    }
  } catch (err) {
    console.warn("[PDF Page OCR Warning]:", err);
  }
  return "";
}

/**
 * Extracts full text from a PDF Buffer or Uint8Array using pdfjs-dist.
 * Preserves page ordering and layout whitespace for section detection.
 * Automatically falls back to OCR on any page containing only scanned images.
 */
export async function extractTextFromPDF(dataBuffer: Buffer | Uint8Array | ArrayBuffer): Promise<PDFExtractionResult> {
  const data = toPureUint8Array(dataBuffer);

  const cMapPath = path.resolve(process.cwd(), 'node_modules/pdfjs-dist/cmaps') + path.sep;
  const cMapUrl = fs.existsSync(cMapPath) ? pathToFileURL(cMapPath).href : undefined;
  const standardFontsPath = path.resolve(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts') + path.sep;
  const standardFontDataUrl = fs.existsSync(standardFontsPath) ? pathToFileURL(standardFontsPath).href : undefined;

  const loadingTask = pdfjsLib.getDocument({
    data,
    cMapUrl,
    cMapPacked: true,
    standardFontDataUrl,
    useSystemFonts: true,
    disableFontFace: true,
    useWorkerFetch: false,
  });

  let pdfDocument: any;
  try {
    pdfDocument = await loadingTask.promise;
  } catch (err: any) {
    if (err?.name === 'PasswordException' || /password/i.test(err?.message || '')) {
      const pwdErr = new Error('This PDF is password-protected or encrypted. Please upload an unlocked PDF.');
      (pwdErr as any).code = 'PDF_ENCRYPTED';
      throw pwdErr;
    }
    throw err;
  }

  const numPages = pdfDocument.numPages;
  const pageTexts: string[] = [];
  let hasOcr = false;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const textContent = await page.getTextContent();

    const items: TextItemWithPos[] = [];

    for (const item of textContent.items as any[]) {
      if ('str' in item && typeof item.str === 'string') {
        const str = item.str;
        const transform = item.transform || [1, 0, 0, 1, 0, 0];
        const x = transform[4] || 0;
        const y = transform[5] || 0;
        const width = item.width || 0;
        const height = item.height || 10;

        items.push({ str, x, y, width, height });
      }
    }

    if (items.length === 0) {
      // Check if page contains embedded image(s) that can be OCR'd
      const ocrPageText = await extractOcrFromPageIfImage(page);
      if (ocrPageText.length > 0) {
        pageTexts.push(ocrPageText);
        hasOcr = true;
      }
      continue;
    }

    // Apply column-aware reordering (detects 2-column or sidebar layouts)
    const sortedItems = reorderPageItemsColumnAware(items);

    let pageText = '';
    let lastY: number | null = null;
    let lastXEnd: number | null = null;

    for (const item of sortedItems) {
      const { str, x, y, width } = item;

      if (lastY === null) {
        pageText += str;
      } else {
        const yDiff = lastY - y; // positive if moving downwards

        if (Math.abs(yDiff) > 5) {
          // Significant vertical move: new line or paragraph
          if (yDiff > 18) {
            // Larger gap: paragraph break
            if (!pageText.endsWith('\n\n')) {
              pageText += pageText.endsWith('\n') ? '\n' : '\n\n';
            }
          } else {
            // Normal line break
            if (!pageText.endsWith('\n')) {
              pageText += '\n';
            }
          }
          pageText += str;
        } else {
          // Same horizontal line: check if horizontal space is needed
          const xGap = lastXEnd !== null ? x - lastXEnd : 0;
          if (
            xGap > 2 &&
            !pageText.endsWith(' ') &&
            !pageText.endsWith('\n') &&
            !str.startsWith(' ')
          ) {
            pageText += ' ';
          }
          pageText += str;
        }
      }

      lastY = y;
      lastXEnd = x + width;
    }

    let trimmedPage = pageText.trim();
    if (trimmedPage.length === 0 && textContent.items.length > 0) {
      const fallbackStrings = (textContent.items as any[])
        .filter(item => 'str' in item && typeof item.str === 'string' && item.str.trim().length > 0)
        .map(item => item.str.trim());
      if (fallbackStrings.length > 0) {
        trimmedPage = fallbackStrings.join(' ');
      }
    }

    if (trimmedPage.length === 0) {
      // Selectable items produced no usable text; try OCR on page image
      const ocrPageText = await extractOcrFromPageIfImage(page);
      if (ocrPageText.length > 0) {
        trimmedPage = ocrPageText;
        hasOcr = true;
      }
    }

    if (trimmedPage.length > 0) {
      pageTexts.push(trimmedPage);
    }
  }

  const fullText = pageTexts.join('\n\n').trim();

  return {
    text: fullText,
    numPages,
    charCount: fullText.length,
    parser: hasOcr ? `pdfjs-dist@${pdfjsLib.version || '6.3.289'}+tesseract.js` : `pdfjs-dist@${pdfjsLib.version || '6.3.289'}`,
    hasOcr
  };
}
