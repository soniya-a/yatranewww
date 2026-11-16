import fs from 'fs';
import path from 'path';
import { extractTextFromScannedPdf } from '../src/lib/resume/scannedPdfOcr';

async function main() {
  console.log('--- 1. Testing Scanned PDF Fixture ---');
  const scannedBuf = fs.readFileSync('scratch/upload_fixtures/scanned_resume.pdf');
  const scannedRes = await extractTextFromScannedPdf(scannedBuf);
  console.log('Scanned PDF OCR Output:');
  console.log('  Char count:', scannedRes.charCount);
  console.log('  Num pages:', scannedRes.numPages);
  console.log('  Pages processed:', scannedRes.ocrPagesProcessed);
  console.log('  Average confidence:', scannedRes.averageConfidence);
  console.log('  Images extracted:', scannedRes.diagnostics.imagesExtracted);
  console.log('  Warnings:', scannedRes.diagnostics.warnings);
  console.log('  Preview (first 250 chars):\n ', scannedRes.text.slice(0, 250));

  console.log('\n--- 2. Testing Empty PDF Fixture (0 images, 0 text) ---');
  const emptyBuf = fs.readFileSync('scratch/upload_fixtures/empty_resume.pdf');
  const emptyRes = await extractTextFromScannedPdf(emptyBuf);
  console.log('Empty PDF OCR Output:');
  console.log('  Char count:', emptyRes.charCount);
  console.log('  Images extracted:', emptyRes.diagnostics.imagesExtracted);

  console.log('\n--- 3. Testing Corrupted / Invalid PDF Fixture ---');
  const fakeBuf = fs.readFileSync('scratch/upload_fixtures/fake_resume.pdf');
  try {
    await extractTextFromScannedPdf(fakeBuf);
    console.error('Expected error but none thrown');
  } catch (err: any) {
    console.log('Successfully caught error:', err.code, '-', err.message);
  }
}

main().catch(console.error);
