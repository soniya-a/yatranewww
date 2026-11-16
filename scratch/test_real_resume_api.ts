import fs from 'fs';
import path from 'path';

async function main() {
  const filePath = path.resolve('public/assets/soniyaj resumee.pdf');
  const fileBuf = fs.readFileSync(filePath);
  const pdfBase64 = fileBuf.toString('base64');

  console.log('--- 1. Testing /api/resume/extract-pdf ---');
  const extractRes = await fetch('http://localhost:3000/api/resume/extract-pdf', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer mock-token'
    },
    body: JSON.stringify({
      pdfBase64,
      filename: 'soniyaj resumee.pdf'
    })
  });

  const extractData = await extractRes.json();
  console.log('Extract status:', extractRes.status);
  console.log('Extract success:', extractData.success);
  console.log('Parser used:', extractData.diagnostics?.parser);
  console.log('Char count:', extractData.diagnostics?.extractedCharacterCount);

  if (!extractData.text) {
    console.error('No text extracted!', extractData);
    return;
  }

  console.log('\n--- 2. Testing /api/resume/parse ---');
  const parseRes = await fetch('http://localhost:3000/api/resume/parse', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer mock-token'
    },
    body: JSON.stringify({
      resumeText: extractData.text
    })
  });

  const parseData = await parseRes.json();
  console.log('Parse status:', parseRes.status);
  console.log('\n--- Extracted Candidate Profile ---');
  console.log('Name:', parseData.profile?.name || parseData.candidate_name);
  console.log('Email:', parseData.profile?.email);
  console.log('Phone:', parseData.profile?.phone);
  console.log('Location:', parseData.profile?.location);
  console.log('Headline:', parseData.profile?.headline);
  console.log('LinkedIn:', parseData.profile?.linkedin);
  console.log('GitHub:', parseData.profile?.github);
  console.log('Portfolio:', parseData.profile?.portfolio);

  console.log('\n--- Extracted Education ---');
  console.log(JSON.stringify(parseData.education, null, 2));

  console.log('\n--- Extracted Experience ---');
  console.log(JSON.stringify(parseData.experience, null, 2));

  console.log('\n--- Extracted Projects ---');
  console.log(JSON.stringify(parseData.projects, null, 2));

  console.log('\n--- Extracted Skills ---');
  console.log('Skills count:', parseData.skills?.length);
  console.log('Skills sample:', parseData.skills?.slice(0, 15));

  console.log('\n--- Matching Roles & Companies ---');
  console.log('Matching Roles:', parseData.matchingRoles);
  console.log('Matching Companies:', parseData.matchingCompanies);
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
