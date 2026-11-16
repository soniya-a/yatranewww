import fs from 'fs';
import { performOcrOnImageBuffer } from '../src/lib/resume/ocrFallback';

async function test() {
  const buf = fs.readFileSync('public/assets/resume_sheet.jpg');
  console.log('Testing OCR on resume_sheet.jpg (' + buf.length + ' bytes)...');
  const start = Date.now();
  const res = await performOcrOnImageBuffer(buf);
  console.log('OCR took:', Date.now() - start, 'ms');
  console.log('Confidence:', res.confidence);
  console.log('Text length:', res.text.length);
  console.log('Text preview:\n', res.text.slice(0, 500));
}

test().catch(console.error);
