import fs from 'fs';
import { extractTextFromPDF } from '../src/lib/pdfParser';
import { matchResumeToRegistry } from '../src/data/companiesRegistry';

async function main() {
  const buf = fs.readFileSync('public/assets/soniyaj resumee.pdf');
  const res = await extractTextFromPDF(buf);
  const match = matchResumeToRegistry(res.text);
  console.log('Category:', match.matchedCategory);
  console.log('Top companies:');
  match.companies.slice(0, 3).forEach(c => {
    console.log(`${c.company} (${c.role}) - ${c.matchScore}`);
    console.log(`  Reason: ${c.reason}`);
  });
}
main().catch(console.error);
