import { extractEducationFromText } from './src/lib/resume/localSectionExtractor';
import { extractTextFromPDF } from './src/lib/pdfParser';
import fs from 'fs';

async function run() {
  const buf = fs.readFileSync('public/assets/soniyaj resumee.pdf');
  const result = await extractTextFromPDF(buf);
  const ed = extractEducationFromText(result.text);
  console.log(JSON.stringify(ed, null, 2));
}
run();
