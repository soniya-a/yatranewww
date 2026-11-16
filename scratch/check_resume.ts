import fs from 'fs';
import path from 'path';
import { extractTextFromPDF } from '../src/lib/pdfParser';

async function main() {
  const resumePath = path.resolve('public/assets/soniyaj resumee.pdf');
  if (!fs.existsSync(resumePath)) {
    console.error('File does not exist:', resumePath);
    return;
  }
  const buf = fs.readFileSync(resumePath);
  console.log('File size:', buf.length, 'bytes');
  const res = await extractTextFromPDF(buf);
  console.log('--- PARSER RESULT ---');
  console.log('Parser:', res.parser);
  console.log('Pages:', res.numPages);
  console.log('Characters:', res.charCount);
  console.log('--- EXTRACTED TEXT FULL ---');
  console.log(res.text);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
