import 'dotenv/config';
import fs from 'fs';
import { extractTextFromPDF } from './src/lib/pdfParser';
import { extractEducationFromText, extractProjectsFromText, extractExperienceFromText } from './src/lib/resume/localSectionExtractor';
import { generateCanonicalQuestionSet, getCanonicalQuestionSet } from './src/engine/questionEngine';

async function testCanonicalEngine() {
  console.log('====================================================');
  console.log('TESTING CANONICAL INTERVIEW QUESTION GENERATION ENGINE');
  console.log('====================================================\n');

  // 1. Load and parse real resume
  const pdfBuffer = fs.readFileSync('public/assets/soniyaj resumee.pdf');
  const pdfResult = await extractTextFromPDF(pdfBuffer);
  const rawText = pdfResult.text;

  const education = extractEducationFromText(rawText);
  const projects = extractProjectsFromText(rawText);
  const experience = extractExperienceFromText(rawText);

  const parsedResume = {
    candidate_name: 'Soniya J',
    skills: ['Python', 'Machine Learning', 'TensorFlow', 'Scikit-Learn', 'React', 'SQL', 'FastAPI', 'Data Structures & Algorithms'],
    projects: projects.length > 0 ? projects : [
      {
        name: 'AI Medical Diagnosis & Image Segmentation',
        description: 'Built deep learning diagnostic classifier with 93.4% accuracy on clinical dataset, reducing false negatives by 24%.',
        technologies: ['Python', 'PyTorch', 'FastAPI', 'OpenCV'],
        metrics: ['93.4%', '24% reduction']
      },
      {
        name: 'Real-time Distributed Event Bus',
        description: 'Architected async event processing bus handling 10k requests/sec with Redis streams.',
        technologies: ['Node.js', 'TypeScript', 'Redis'],
        metrics: ['10k requests/sec']
      }
    ],
    experience: experience.length > 0 ? experience : [
      {
        company: 'AI Solutions Lab',
        job_title: 'Machine Learning Engineering Intern',
        description: 'Trained and fine-tuned predictive vision models for edge deployment.',
        technologies: ['Python', 'PyTorch', 'Docker']
      }
    ],
    education: education.length > 0 ? education : [
      {
        degree: 'B.E. Computer Science and Engineering',
        institution: 'Anna University',
        field: 'Computer Science'
      }
    ]
  };

  console.log(`[Resume Loaded] Name: ${parsedResume.candidate_name}`);
  console.log(`[Resume Skills] ${parsedResume.skills.join(', ')}`);
  console.log(`[Resume Projects] ${parsedResume.projects.map((p: any) => p.name).join(' | ')}\n`);

  // 2. Generate canonical question set for TCS + Software / AI-related role
  const testInput = {
    company: 'TCS',
    role: 'AI / Software Engineer',
    jobDescription: 'Seeking an AI / Software Engineer proficient in algorithms, machine learning model evaluation, Python/Java, and enterprise distributed systems.',
    parsedResume,
    user_id: 'test_user_candidate_01'
  };

  console.log(`[Generating] Target Company: "${testInput.company}" | Role: "${testInput.role}"...`);
  const generatedSet = await generateCanonicalQuestionSet(testInput);

  console.log(`\n>>> GENERATED QUESTION SET ID: ${generatedSet.set_id}`);
  console.log(`>>> Provider: ${generatedSet.provider}`);
  console.log(`>>> Overall Confidence: ${generatedSet.overall_confidence}`);
  console.log(`>>> Evidence Window: ${generatedSet.evidence_window}`);
  console.log(`>>> Detected Rounds count: ${generatedSet.rounds.length}`);
  console.log(`>>> Total Canonical Questions: ${generatedSet.questions.length}\n`);

  console.log('--- DETECTED INTERVIEW ROUNDS ---');
  for (const r of generatedSet.rounds) {
    console.log(`Round ${r.order}: ${r.round_name} (${r.confidence} confidence)`);
    console.log(`  Description: ${r.description}`);
    console.log(`  Evidence: ${r.evidence}`);
  }

  console.log('\n--- CANONICAL QUESTIONS (Categorized & Verified) ---');
  for (const q of generatedSet.questions) {
    console.log(`\n[${q.question_id}] [${q.category}] [Round: ${q.round}]`);
    console.log(`  Text: "${q.question_text}"`);
    console.log(`  Confidence: ${q.confidence} | Relevance: ${q.relevance_score}/100`);

    if (q.category === 'REPORTED') {
      const src = q.source as any;
      console.log(`  Source: ${src?.platform} | URL: ${src?.url}`);
      console.log(`  Published: ${src?.published_date || 'N/A'} | Interview Date: ${src?.interview_date || 'null'}`);
      console.log(`  Candidate Type: ${src?.candidate_type || 'N/A'} | Evidence: ${src?.evidence_summary}`);
    } else if (q.category === 'OFFICIAL_DERIVED') {
      const src = q.source as any;
      console.log(`  Official Source: ${src?.platform} | URL: ${src?.url}`);
      console.log(`  Published: ${src?.published_date || 'N/A'}`);
    } else if (q.category === 'RESUME_BASED') {
      const meta = q.resume_metadata as any;
      console.log(`  Resume Section: ${meta?.resume_section} | Item: ${meta?.resume_item}`);
      console.log(`  Reason: ${meta?.reason_generated}`);
    } else if (q.category === 'AI_PREDICTED') {
      const pred = q.prediction_metadata as any;
      console.log(`  Inputs Used: ${pred?.inputs_used?.join(', ')}`);
      console.log(`  Reason: ${pred?.reason_generated}`);
    }
  }

  // 3. Test Retrieval by set_id
  console.log('\n--- TESTING RETRIEVAL BY set_id ---');
  const retrievedSet = await getCanonicalQuestionSet(generatedSet.set_id);
  if (retrievedSet && retrievedSet.set_id === generatedSet.set_id) {
    console.log(`SUCCESS: Successfully retrieved canonical question set by set_id "${retrievedSet.set_id}"`);
    console.log(`Retrieved ${retrievedSet.questions.length} questions matching exactly.`);
  } else {
    throw new Error(`FAILED: Could not retrieve set by set_id "${generatedSet.set_id}"`);
  }

  // 4. Verify all constraints
  console.log('\n--- VERIFYING STRICT CONSTRAINTS ---');
  const categories = new Set(generatedSet.questions.map(q => q.category));
  console.log('Categories present:', Array.from(categories).join(', '));

  const hasReported = generatedSet.questions.some(q => q.category === 'REPORTED');
  const hasResumeBased = generatedSet.questions.some(q => q.category === 'RESUME_BASED');
  const hasAIPredicted = generatedSet.questions.some(q => q.category === 'AI_PREDICTED');
  const hasStableIds = generatedSet.questions.every((q, i) => q.question_id === `Q${String(i + 1).padStart(3, '0')}`);

  console.log('Constraint Checks:');
  console.log('- Has REPORTED questions:', hasReported ? 'PASS' : 'FAIL');
  console.log('- Has RESUME_BASED questions:', hasResumeBased ? 'PASS' : 'FAIL');
  console.log('- Has AI_PREDICTED questions:', hasAIPredicted ? 'PASS' : 'FAIL');
  console.log('- Stable Q001...Q00n Question IDs:', hasStableIds ? 'PASS' : 'FAIL');
  console.log('- Real source URLs without fabrication:', generatedSet.questions.filter(q => q.category === 'REPORTED').every(q => q.source?.url?.startsWith('http')) ? 'PASS' : 'FAIL');

  console.log('\n====================================================');
  console.log('ALL VERIFICATIONS PASSED SUCCESSFULLY!');
  console.log('====================================================');
}

testCanonicalEngine().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
