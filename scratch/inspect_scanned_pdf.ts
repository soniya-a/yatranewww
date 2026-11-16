import fs from 'fs';
import path from 'path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

async function main() {
  const filePath = path.resolve('scratch/upload_fixtures/scanned_resume.pdf');
  const buf = fs.readFileSync(filePath);
  const data = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);

  const doc = await pdfjsLib.getDocument({
    data,
    useSystemFonts: true,
    disableFontFace: true,
  }).promise;

  console.log('Num pages:', doc.numPages);
  const page = await doc.getPage(1);
  const textContent = await page.getTextContent();
  console.log('TextContent items length:', textContent.items.length);

  const ops = await page.getOperatorList();
  console.log('Operator count:', ops.fnArray.length);

  const paintOps = ops.fnArray
    .map((fn, idx) => ({ fn, args: ops.argsArray[idx] }))
    .filter(op => op.fn === pdfjsLib.OPS.paintImageXObject || op.fn === pdfjsLib.OPS.paintInlineImageXObject);

  console.log('PaintImage ops found:', paintOps.length);
  console.log('PaintImage details:', paintOps);

  for (const op of paintOps) {
    const imgName = op.args[0];
    console.log('Attempting to get image object:', imgName);
    
    // In pdfjs-dist, page.objs has get(id, callback)
    const imgObj = await new Promise((resolve) => {
      // Check if page.objs has get
      if (page.objs && typeof (page.objs as any).get === 'function') {
        (page.objs as any).get(imgName, (obj: any) => resolve(obj));
      } else {
        resolve(null);
      }
    });

    if (imgObj) {
      console.log('Image object retrieved:', {
        width: (imgObj as any).width,
        height: (imgObj as any).height,
        dataLength: (imgObj as any).data?.length,
        kind: (imgObj as any).kind,
        isBuffer: Buffer.isBuffer((imgObj as any).data)
      });
    } else {
      console.log('page.objs.get did not return object directly');
    }
  }
}

main().catch(console.error);
