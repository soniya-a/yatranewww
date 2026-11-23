import fs from 'fs';
import http from 'http';

function postRequest(path: string, bodyObj: any): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(bodyObj);
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': 'Bearer guest_test_verification_user'
      },
      timeout: 15000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 0, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode || 0, data });
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout on ${path}`));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING RESUME EXTRACTION & PARSING VERIFICATION ===\n');

  // Test 1: Real PDF Extraction & Parse
  console.log('[Test 1] Testing Real PDF Document (soniyaj resumee.pdf)...');
  const pdfBuffer = fs.readFileSync('D:/YATRA/Yatranew/dist/assets/soniyaj resumee.pdf');
  const pdfBase64 = 'data:application/pdf;base64,' + pdfBuffer.toString('base64');
  
  const pdfExtract = await postRequest('/api/resume/extract-pdf', {
    pdfBase64,
    filename: 'soniyaj resumee.pdf'
  });
  console.log('PDF Extract Status:', pdfExtract.status, 'Chars:', pdfExtract.data?.charCount, 'Pages:', pdfExtract.data?.numPages);
  if (pdfExtract.status !== 200 || !pdfExtract.data?.text) {
    throw new Error('PDF extraction failed');
  }

  const pdfParse = await postRequest('/api/resume/parse', {
    resumeText: pdfExtract.data.text
  });
  console.log('PDF Parse Status:', pdfParse.status, 'Candidate:', pdfParse.data?.candidate_name, 'Skills:', pdfParse.data?.skills?.length, 'Roles:', pdfParse.data?.matchingRoles?.slice(0, 2));
  if (pdfParse.status !== 200 || !pdfParse.data?.skills?.length) {
    throw new Error('PDF parsing failed');
  }

  // Test 2: Word DOCX Document Extraction & Parse
  console.log('\n[Test 2] Testing Word DOCX Document (single-paragraph.docx)...');
  const docxBuffer = fs.readFileSync('D:/YATRA/Yatranew/node_modules/mammoth/test/test-data/single-paragraph.docx');
  const docxBase64 = 'data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,' + docxBuffer.toString('base64');

  const docxExtract = await postRequest('/api/resume/extract-docx', {
    docxBase64,
    filename: 'sample_resume.docx'
  });
  console.log('DOCX Extract Status:', docxExtract.status, 'Text:', docxExtract.data?.text);
  if (docxExtract.status !== 200 || !docxExtract.data?.text) {
    throw new Error('DOCX extraction failed');
  }

  // Test 3: Binary Word .doc Fallback Extraction
  console.log('\n[Test 3] Testing Legacy Word (.doc / non-zip binary stream)...');
  const mockDocBuffer = Buffer.from('\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1Root Entry\x00\x00\x00Alex Morgan\x00Lead Software Engineer with React, TypeScript, GraphQL, Python, AWS, and PostgreSQL experience.\x00\x00');
  const docBase64 = 'data:application/msword;base64,' + mockDocBuffer.toString('base64');

  const docExtract = await postRequest('/api/resume/extract-docx', {
    docxBase64: docBase64,
    filename: 'legacy_resume.doc'
  });
  console.log('Legacy .doc Extract Status:', docExtract.status, 'Format:', docExtract.data?.format, 'Chars:', docExtract.data?.charCount);
  if (docExtract.status !== 200 || !docExtract.data?.text) {
    throw new Error('Legacy .doc extraction failed');
  }

  const docParse = await postRequest('/api/resume/parse', {
    resumeText: docExtract.data.text
  });
  console.log('Legacy .doc Parse Status:', docParse.status, 'Candidate:', docParse.data?.candidate_name, 'Skills:', docParse.data?.skills);
  if (docParse.status !== 200 || !docParse.data?.skills?.length) {
    throw new Error('Legacy .doc parsing failed');
  }

  console.log('\n=== ALL RESUME TESTS PASSED WITH 100% SUCCESS ===');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
