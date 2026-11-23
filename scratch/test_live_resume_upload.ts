import fs from 'fs';
import path from 'path';

async function testLiveResumeUpload() {
  const fixturesDir = path.resolve(process.cwd(), "scratch", "upload_fixtures");
  const validPdfPath = path.join(fixturesDir, "valid_resume.pdf");
  const validDocxPath = path.join(fixturesDir, "valid_resume.docx");

  console.log("Checking fixtures...");
  console.log("valid_resume.pdf exists:", fs.existsSync(validPdfPath));
  console.log("valid_resume.docx exists:", fs.existsSync(validDocxPath));

  const guestToken = "guest_test_token_123";

  // Test DOCX
  if (fs.existsSync(validDocxPath)) {
    console.log("\nTesting /api/resume/extract-docx...");
    const docxBuf = fs.readFileSync(validDocxPath);
    const docxBase64 = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${docxBuf.toString('base64')}`;
    const t0 = Date.now();
    try {
      const res = await fetch("http://127.0.0.1:3000/api/resume/extract-docx", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${guestToken}`
        },
        body: JSON.stringify({ docxBase64, filename: "valid_resume.docx" })
      });
      const data = await res.json();
      console.log(`DOCX extract result status: ${res.status} in ${Date.now() - t0}ms:`, {
        success: data.success,
        charCount: data.charCount,
        error: data.error
      });
      if (data.text) {
        console.log("Extracted DOCX text sample:", data.text.substring(0, 150));
        
        // Test /api/resume/parse with the extracted text
        console.log("\nTesting /api/resume/parse with DOCX text...");
        const t1 = Date.now();
        const parseRes = await fetch("http://127.0.0.1:3000/api/resume/parse", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${guestToken}`
          },
          body: JSON.stringify({ resumeText: data.text })
        });
        const parseData = await parseRes.json();
        console.log(`Parse result status: ${parseRes.status} in ${Date.now() - t1}ms:`, {
          candidate_name: parseData.candidate_name,
          skillsCount: parseData.skills?.length,
          parser_source: parseData.parser_source,
          error: parseData.error
        });
      }
    } catch (e: any) {
      console.error("DOCX error:", e.message);
    }
  }

  // Test PDF
  if (fs.existsSync(validPdfPath)) {
    console.log("\nTesting /api/resume/extract-pdf...");
    const pdfBuf = fs.readFileSync(validPdfPath);
    const pdfBase64 = `data:application/pdf;base64,${pdfBuf.toString('base64')}`;
    const t0 = Date.now();
    try {
      const res = await fetch("http://127.0.0.1:3000/api/resume/extract-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${guestToken}`
        },
        body: JSON.stringify({ pdfBase64, filename: "valid_resume.pdf" })
      });
      const data = await res.json();
      console.log(`PDF extract result status: ${res.status} in ${Date.now() - t0}ms:`, {
        success: data.success,
        charCount: data.charCount,
        numPages: data.numPages,
        error: data.error
      });
      if (data.text) {
        console.log("Extracted PDF text sample:", data.text.substring(0, 150));
        
        // Test /api/resume/parse with the extracted text
        console.log("\nTesting /api/resume/parse with PDF text...");
        const t1 = Date.now();
        const parseRes = await fetch("http://127.0.0.1:3000/api/resume/parse", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${guestToken}`
          },
          body: JSON.stringify({ resumeText: data.text })
        });
        const parseData = await parseRes.json();
        console.log(`Parse result status: ${parseRes.status} in ${Date.now() - t1}ms:`, {
          candidate_name: parseData.candidate_name,
          skillsCount: parseData.skills?.length,
          parser_source: parseData.parser_source,
          error: parseData.error
        });
      }
    } catch (e: any) {
      console.error("PDF error:", e.message);
    }
  }
}

testLiveResumeUpload().catch(console.error);
