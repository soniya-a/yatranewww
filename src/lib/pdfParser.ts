import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

export interface PDFExtractionResult {
  text: string;
  numPages: number;
  charCount: number;
  parser: string;
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

/**
 * Extracts full text from a PDF Buffer or Uint8Array using pdfjs-dist.
 * Preserves page ordering and layout whitespace for section detection.
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

  const pdfDocument = await loadingTask.promise;
  const numPages = pdfDocument.numPages;
  const pageTexts: string[] = [];

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
      continue;
    }

    // Sort items by Y descending (top to bottom), then by X ascending (left to right)
    items.sort((a, b) => {
      const yDiff = b.y - a.y;
      if (Math.abs(yDiff) > 3) {
        return yDiff; // Higher Y first (top of page)
      }
      return a.x - b.x; // Lower X first (left to right)
    });

    let pageText = '';
    let lastY: number | null = null;
    let lastXEnd: number | null = null;

    for (const item of items) {
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

    if (trimmedPage.length > 0) {
      pageTexts.push(trimmedPage);
    }
  }

  const fullText = pageTexts.join('\n\n').trim();

  return {
    text: fullText,
    numPages,
    charCount: fullText.length,
    parser: `pdfjs-dist@${pdfjsLib.version || '6.3.289'}`
  };
}
