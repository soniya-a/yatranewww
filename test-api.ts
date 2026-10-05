import fs from 'fs';
import { extractTextFromPDF } from './src/lib/pdfParser';
import { extractEducationFromText } from './src/lib/resume/localSectionExtractor';
import { ResumeIntelligenceSchema } from './src/lib/resume/resumeSchema';

async function run() {
  const buf = fs.readFileSync('public/assets/soniyaj resumee.pdf');
  const result = await extractTextFromPDF(buf);
  const resumeText = result.text;
  
  // Simulate Gemini parsing failure by giving an empty object
  const parsedData = { education: [] }; 
  const extractedEdu = Array.isArray(parsedData?.education) ? parsedData.education : [];
  const finalEdu = extractedEdu.length > 0 ? extractedEdu : extractEducationFromText(resumeText);
  
  const intelligenceCandidate = {
    profile: {},
    skills: [],
    experience: [],
    education: finalEdu,
    projects: [],
    certifications: [],
    achievements: []
  };

  const zodValidation = ResumeIntelligenceSchema.safeParse(intelligenceCandidate);
  const validatedIntelligence = zodValidation.success ? zodValidation.data : intelligenceCandidate;
  
  console.log(JSON.stringify(validatedIntelligence.education, null, 2));
}

run();
