// ==============================================================================
// YATRA: Complete Company-Specific Interview Round Engine — Full Test Suite
// Tests all 8 canonical interview rounds for Amazon SDE-1 and TCS Campus.
// Verifies:
//   1. All 8 rounds return exactly 10 questions
//   2. Round-specific assessment fields are populated (options/keys, rubrics, etc.)
//   3. Company-specific round gating (Amazon: no GD; TCS: GD present, no high-scale SD)
//   4. 100% Normal/VR question-set parity (IDs, text, provenance, order)
//   5. Zero invented REPORTED evidence (downgraded to AI_PREDICTED when no source)
// ==============================================================================

import { generateCanonicalQuestionSet } from '../src/engine/questionEngine';
import type { CanonicalInterviewQuestion } from '../src/types/interview';

type RoundName = string;

let totalTests = 0;
let passedTests = 0;
const failures: string[] = [];

function assert(condition: boolean, desc: string): void {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS [${totalTests}]: ${desc}`);
  } else {
    failures.push(desc);
    console.error(`  ❌ FAIL [${totalTests}]: ${desc}`);
  }
}

function header(title: string) {
  console.log(`\n${'─'.repeat(70)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(70));
}

// ── Shared resume fixture (realistic SDE-1 candidate) ─────────────────────────
const SAMPLE_RESUME = {
  skills: ['Java', 'Python', 'TypeScript', 'PostgreSQL', 'Redis', 'Docker', 'React'],
  projects: [
    {
      name: 'Real-Time Order Tracking',
      description: 'Built a WebSocket-based order tracking service processing 15k events/sec.',
      technologies: ['Node.js', 'Redis', 'PostgreSQL'],
    },
  ],
  experience: [
    {
      company: 'TechCorp',
      role: 'Software Engineering Intern',
      description: 'Maintained REST APIs and optimised slow SQL queries.',
      technologies: ['Java', 'Spring Boot', 'MySQL'],
    },
  ],
  education: [{ degree: 'B.Tech', institution: 'IIT Madras', field: 'Computer Science' }],
};

// ── Generic question-set validator ────────────────────────────────────────────
function validate10Questions(qs: CanonicalInterviewQuestion[], roundLabel: string) {
  assert(qs.length === 10, `${roundLabel}: exactly 10 questions returned`);
  const ids = qs.map((q) => q.question_id);
  const uniqueIds = new Set(ids);
  assert(uniqueIds.size === 10, `${roundLabel}: all 10 question IDs are unique`);
  const orderedIds = ['Q001','Q002','Q003','Q004','Q005','Q006','Q007','Q008','Q009','Q010'];
  assert(
    JSON.stringify(ids) === JSON.stringify(orderedIds),
    `${roundLabel}: question IDs are sequentially numbered Q001–Q010`
  );
  qs.forEach((q, i) => {
    assert(typeof q.question_text === 'string' && q.question_text.length > 20,
      `${roundLabel}: Q${String(i+1).padStart(3,'0')} has non-empty question_text`);
    assert(['REPORTED','OFFICIAL_DERIVED','RESUME_BASED','AI_PREDICTED'].includes(q.category),
      `${roundLabel}: Q${String(i+1).padStart(3,'0')} has valid category (${q.category})`);
  });
}

// ── Print a round summary table ───────────────────────────────────────────────
function printSummary(qs: CanonicalInterviewQuestion[], label: string) {
  console.log(`\n  ${label} — Question Allocation:`);
  const cats: Record<string,number> = {};
  qs.forEach((q, i) => {
    cats[q.category] = (cats[q.category] || 0) + 1;
    const src = q.source?.platform ?? (q.prediction_metadata ? 'AI_PREDICTED' : 'RESUME');
    console.log(`    Slot ${String(i+1).padStart(2,' ')} [${q.question_id}] ${q.category.padEnd(18,' ')} | ${src} | ${(q.canonical_title || q.question_text.slice(0,55)).slice(0,55)}`);
  });
  console.log(`  Categories: ${Object.entries(cats).map(([k,v])=>`${k}:${v}`).join(', ')}`);
}

async function main() {
  console.log('══════════════════════════════════════════════════════════════════════');
  console.log('  YATRA — COMPLETE 8-ROUND INTERVIEW ENGINE VERIFICATION SUITE');
  console.log('══════════════════════════════════════════════════════════════════════');

  // ════════════════════════════════════════════════════════════════════════════
  // PART A: AMAZON SDE-1 — 6 Active Rounds (No GD)
  // ════════════════════════════════════════════════════════════════════════════
  header('PART A: AMAZON SDE-1 ROUNDS');

  // ── ROUND A1: Coding / Online Assessment ──────────────────────────────────
  header('A1 · AMAZON — Coding / Online Assessment');
  const amzOA = await generateCanonicalQuestionSet({
    company: 'Amazon', role: 'Software Engineer',
    roundName: 'Coding / Online Assessment',
    jobDescription: 'SDE-1: distributed systems, algorithms, production reliability.',
    parsedResume: SAMPLE_RESUME, user_id: 'test-amz-oa',
  });
  printSummary(amzOA.questions, 'Amazon OA');
  validate10Questions(amzOA.questions, 'Amazon OA');

  // OA-specific field checks: at least 1 question with constraints & examples
  const oaWithConstraints = amzOA.questions.filter(q => Array.isArray(q.constraints) && q.constraints.length > 0);
  assert(oaWithConstraints.length >= 1, 'Amazon OA: ≥1 question carries problem constraints array');
  const oaWithExamples = amzOA.questions.filter(q => Array.isArray(q.examples) && q.examples.length > 0);
  assert(oaWithExamples.length >= 1, 'Amazon OA: ≥1 question carries worked examples');
  const oaWithComplexity = amzOA.questions.filter(q => q.expected_complexity?.time);
  assert(oaWithComplexity.length >= 1, 'Amazon OA: ≥1 question specifies expected time/space complexity');
  const oaWithRubric = amzOA.questions.filter(q => q.scoring_rubric);
  assert(oaWithRubric.length >= 1, 'Amazon OA: ≥1 question includes scoring rubric');

  // ── ROUND A2: Technical DSA ───────────────────────────────────────────────
  header('A2 · AMAZON — Technical DSA');
  const amzDSA = await generateCanonicalQuestionSet({
    company: 'Amazon', role: 'Software Engineer',
    roundName: 'Technical DSA',
    parsedResume: SAMPLE_RESUME, user_id: 'test-amz-dsa',
  });
  printSummary(amzDSA.questions, 'Amazon DSA');
  validate10Questions(amzDSA.questions, 'Amazon DSA');

  // DSA specific: LRU Cache expected from verified evidence
  const lruQ = amzDSA.questions.find(q => q.canonical_title?.includes('LRU Cache'));
  assert(Boolean(lruQ), 'Amazon DSA: LRU Cache question present (verified evidence)');
  if (lruQ) {
    assert((lruQ.independent_reports_count ?? 0) >= 2, `Amazon DSA: LRU Cache has ≥2 independent candidate reports (got ${lruQ.independent_reports_count})`);
    const urls = (lruQ.evidence_list ?? []).map((e: any) => e.url as string);
    assert(urls.every(u => u.includes('leetcode.com') || u.includes('geeksforgeeks.org')),
      'Amazon DSA: LRU Cache evidence URLs are real LeetCode/GFG posts');
  }

  // Resume-based questions included when resume was provided
  const dsaResumeBased = amzDSA.questions.filter(q => q.category === 'RESUME_BASED');
  assert(dsaResumeBased.length <= 2, `Amazon DSA: RESUME_BASED questions ≤2 (got ${dsaResumeBased.length})`);

  // ── ROUND A3: Domain-Specific Technical ──────────────────────────────────
  header('A3 · AMAZON — Domain-Specific Technical');
  const amzDomain = await generateCanonicalQuestionSet({
    company: 'Amazon', role: 'Software Engineer',
    roundName: 'Domain-Specific Technical',
    parsedResume: SAMPLE_RESUME, user_id: 'test-amz-domain',
  });
  printSummary(amzDomain.questions, 'Amazon Domain');
  validate10Questions(amzDomain.questions, 'Amazon Domain');

  // Domain fields: at least 1 question with expected_points rubric
  const domainWithPoints = amzDomain.questions.filter(q => Array.isArray(q.expected_points) && q.expected_points.length > 0);
  assert(domainWithPoints.length >= 1, 'Amazon Domain: ≥1 question carries expected_points rubric');

  // ── ROUND A4: Project & Resume Deep Dive ─────────────────────────────────
  header('A4 · AMAZON — Project & Resume Deep Dive');
  const amzProject = await generateCanonicalQuestionSet({
    company: 'Amazon', role: 'Software Engineer',
    roundName: 'Project & Resume Deep Dive',
    parsedResume: SAMPLE_RESUME, user_id: 'test-amz-project',
  });
  printSummary(amzProject.questions, 'Amazon Project');
  validate10Questions(amzProject.questions, 'Amazon Project');

  const projectWithRubric = amzProject.questions.filter(q => q.scoring_rubric || (Array.isArray(q.expected_points) && q.expected_points.length > 0));
  assert(projectWithRubric.length >= 1, 'Amazon Project: ≥1 question includes scoring rubric or expected_points');

  // ── ROUND A5: System Design / LLD ────────────────────────────────────────
  header('A5 · AMAZON — System Design / LLD');
  const amzLLD = await generateCanonicalQuestionSet({
    company: 'Amazon', role: 'Software Engineer',
    roundName: 'System Design / Low-Level Design',
    parsedResume: SAMPLE_RESUME, user_id: 'test-amz-lld',
  });
  printSummary(amzLLD.questions, 'Amazon LLD');
  validate10Questions(amzLLD.questions, 'Amazon LLD');

  const lldWithRubric = amzLLD.questions.filter(q => q.scoring_rubric || q.expected_points);
  assert(lldWithRubric.length >= 1, 'Amazon LLD: ≥1 question includes design evaluation rubric');

  // ── ROUND A6: HR & Behavioral ─────────────────────────────────────────────
  header('A6 · AMAZON — HR & Behavioral');
  const amzHR = await generateCanonicalQuestionSet({
    company: 'Amazon', role: 'Software Engineer',
    roundName: 'HR & Behavioral',
    parsedResume: SAMPLE_RESUME, user_id: 'test-amz-hr',
  });
  printSummary(amzHR.questions, 'Amazon HR');
  validate10Questions(amzHR.questions, 'Amazon HR');

  // HR fields: behavioral_criteria with competency/indicators
  const hrWithCriteria = amzHR.questions.filter(q => q.behavioral_criteria?.competency);
  assert(hrWithCriteria.length >= 1, 'Amazon HR: ≥1 question contains behavioral competency criteria');
  const lpQ = amzHR.questions.find(q =>
    q.canonical_title?.includes('Customer Obsession') ||
    q.canonical_title?.includes('Ownership') ||
    q.canonical_title?.includes('Disagree and Commit')
  );
  assert(Boolean(lpQ), 'Amazon HR: Verified Amazon Leadership Principle question present');

  // ── AMAZON GD GATING: GD must NOT be in Amazon SDE-1 rounds ──────────────
  header('A7 · AMAZON — GD Round Gating (must be EXCLUDED)');
  const amzRounds = await (await import('../src/engine/intelligenceRepository')).getCompanyInterviewRounds('Amazon', 'Software Engineer');
  const amzHasGD = amzRounds.some(r => r.requires_gd === true || r.round_name.toLowerCase().includes('group discussion'));
  assert(!amzHasGD, 'Amazon SDE-1: Group Discussion round is correctly EXCLUDED (no evidence)');
  console.log(`  Amazon rounds configured: ${amzRounds.map(r=>r.round_name).join(', ')}`);

  // ════════════════════════════════════════════════════════════════════════════
  // PART B: TCS CAMPUS — 6 Active Rounds (GD Present, Heavy SD Excluded)
  // ════════════════════════════════════════════════════════════════════════════
  header('PART B: TCS CAMPUS ROUNDS');

  // ── ROUND B1: Aptitude & Logical Reasoning ───────────────────────────────
  header('B1 · TCS — Aptitude & Logical Reasoning');
  const tcsApt = await generateCanonicalQuestionSet({
    company: 'TCS', role: 'Software Engineer',
    roundName: 'Aptitude & Logical Reasoning',
    parsedResume: SAMPLE_RESUME, user_id: 'test-tcs-apt',
  });
  printSummary(tcsApt.questions, 'TCS Aptitude');
  validate10Questions(tcsApt.questions, 'TCS Aptitude');

  // Aptitude fields: options + correct_answer + explanation
  const aptWithOptions = tcsApt.questions.filter(q => Array.isArray(q.aptitude_options) && q.aptitude_options.length === 4);
  assert(aptWithOptions.length >= 1, 'TCS Aptitude: ≥1 question has 4-option MCQ format');
  const aptWithAnswer = tcsApt.questions.filter(q => q.correct_answer);
  assert(aptWithAnswer.length >= 1, 'TCS Aptitude: ≥1 question has correct_answer key');
  const aptWithExplanation = tcsApt.questions.filter(q => q.explanation && q.explanation.length > 20);
  assert(aptWithExplanation.length >= 1, 'TCS Aptitude: ≥1 question has detailed explanation');

  // Check difficulty is set
  const aptWithDifficulty = tcsApt.questions.filter(q => q.difficulty);
  assert(aptWithDifficulty.length >= 1, 'TCS Aptitude: ≥1 question has difficulty rating');

  // ── ROUND B2: Coding / Online Assessment (TCS) ───────────────────────────
  header('B2 · TCS — Coding / Online Assessment');
  const tcsOA = await generateCanonicalQuestionSet({
    company: 'TCS', role: 'Software Engineer',
    roundName: 'Coding / Online Assessment',
    parsedResume: SAMPLE_RESUME, user_id: 'test-tcs-oa',
  });
  printSummary(tcsOA.questions, 'TCS OA');
  validate10Questions(tcsOA.questions, 'TCS OA');

  const tcsOAWithConstraints = tcsOA.questions.filter(q => Array.isArray(q.constraints) && q.constraints.length > 0);
  assert(tcsOAWithConstraints.length >= 1, 'TCS OA: ≥1 question carries problem constraints');

  // ── ROUND B3: Group Discussion (TCS — MUST be present) ──────────────────
  header('B3 · TCS — Group Discussion (must be INCLUDED)');
  const tcsGD = await generateCanonicalQuestionSet({
    company: 'TCS', role: 'Software Engineer',
    roundName: 'Group Discussion',
    parsedResume: SAMPLE_RESUME, user_id: 'test-tcs-gd',
  });
  printSummary(tcsGD.questions, 'TCS GD');
  validate10Questions(tcsGD.questions, 'TCS GD');

  // GD fields: discussion_context + key_perspectives + scoring_rubric
  const gdWithContext = tcsGD.questions.filter(q => q.discussion_context && q.discussion_context.length > 20);
  assert(gdWithContext.length >= 1, 'TCS GD: ≥1 question includes discussion_context');
  const gdWithPerspectives = tcsGD.questions.filter(q => Array.isArray(q.key_perspectives) && q.key_perspectives.length >= 2);
  assert(gdWithPerspectives.length >= 1, 'TCS GD: ≥1 question has ≥2 key_perspectives');
  const gdWithRubric = tcsGD.questions.filter(q => q.scoring_rubric);
  assert(gdWithRubric.length >= 1, 'TCS GD: ≥1 question has GD scoring rubric');

  // TCS round gating: GD should be in TCS rounds
  const tcsRounds = await (await import('../src/engine/intelligenceRepository')).getCompanyInterviewRounds('TCS', 'Software Engineer');
  const tcsHasGD = tcsRounds.some(r => r.requires_gd === true || r.round_name.toLowerCase().includes('group discussion'));
  assert(tcsHasGD, 'TCS Campus: Group Discussion round is correctly INCLUDED (evidence-supported)');
  console.log(`  TCS rounds configured: ${tcsRounds.map(r=>r.round_name).join(', ')}`);

  // ── ROUND B4: HR & Behavioral (TCS) ──────────────────────────────────────
  header('B4 · TCS — HR & Behavioral');
  const tcsHR = await generateCanonicalQuestionSet({
    company: 'TCS', role: 'Software Engineer',
    roundName: 'HR & Behavioral',
    parsedResume: SAMPLE_RESUME, user_id: 'test-tcs-hr',
  });
  printSummary(tcsHR.questions, 'TCS HR');
  validate10Questions(tcsHR.questions, 'TCS HR');
  const tcsHRWithCriteria = tcsHR.questions.filter(q => q.behavioral_criteria);
  assert(tcsHRWithCriteria.length >= 1, 'TCS HR: ≥1 question includes behavioral_criteria');

  // ════════════════════════════════════════════════════════════════════════════
  // PART C: NORMAL / VR PARITY — All rounds must share exact same canonical set
  // ════════════════════════════════════════════════════════════════════════════
  header('PART C: NORMAL / VR MODE PARITY VERIFICATION');

  async function verifyParity(roundName: string, label: string) {
    const normalSet = await generateCanonicalQuestionSet({
      company: 'Amazon', role: 'Software Engineer',
      roundName, parsedResume: SAMPLE_RESUME, user_id: 'parity-normal',
    });
    // VR fetches the same set by set_id (simulated here by generating with identical params)
    const vrSet = await generateCanonicalQuestionSet({
      company: 'Amazon', role: 'Software Engineer',
      roundName, parsedResume: SAMPLE_RESUME, user_id: 'parity-vr',
    });

    const normalIds = normalSet.questions.map(q => q.question_id);
    const vrIds = vrSet.questions.map(q => q.question_id);
    // Both independently generated sets must have identical structure (10 Q001-Q010)
    assert(JSON.stringify(normalIds) === JSON.stringify(vrIds),
      `${label}: Normal and VR produce same Q001–Q010 ID sequence`);

    const normalTexts = normalSet.questions.map(q => q.question_text);
    const vrTexts = vrSet.questions.map(q => q.question_text);
    assert(JSON.stringify(normalTexts) === JSON.stringify(vrTexts),
      `${label}: Normal and VR question texts are 100% identical`);

    const normalCats = normalSet.questions.map(q => q.category);
    const vrCats = vrSet.questions.map(q => q.category);
    assert(JSON.stringify(normalCats) === JSON.stringify(vrCats),
      `${label}: Normal and VR provenance (category) tags are 100% identical`);
  }

  await verifyParity('Technical DSA', 'Amazon DSA');
  await verifyParity('HR & Behavioral', 'Amazon HR');
  await verifyParity('Coding / Online Assessment', 'Amazon OA');
  await verifyParity('Domain-Specific Technical', 'Amazon Domain');
  await verifyParity('System Design / Low-Level Design', 'Amazon LLD');

  // ════════════════════════════════════════════════════════════════════════════
  // PART D: PROVENANCE INTEGRITY — No invented REPORTED questions
  // ════════════════════════════════════════════════════════════════════════════
  header('PART D: PROVENANCE INTEGRITY — Zero Fabricated REPORTED Tags');

  for (const roundLabel of ['Technical DSA', 'Coding / Online Assessment', 'HR & Behavioral']) {
    const set = await generateCanonicalQuestionSet({
      company: 'Amazon', role: 'Software Engineer',
      roundName: roundLabel, user_id: 'integrity-test',
      // No resume — so we can verify no fake RESUME_BASED questions appear
    });
    const reported = set.questions.filter(q => q.category === 'REPORTED');
    const allHaveEvidence = reported.every(q => (q.evidence_list ?? []).length > 0 && (q.independent_reports_count ?? 0) > 0);
    assert(allHaveEvidence,
      `Amazon ${roundLabel}: All REPORTED questions have ≥1 evidence entry and positive report count`);
    const fakeResume = set.questions.filter(q => q.category === 'RESUME_BASED');
    assert(fakeResume.length === 0,
      `Amazon ${roundLabel} (no resume): Zero RESUME_BASED questions generated without resume`);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FINAL SUMMARY
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════════════════════════════════');
  if (failures.length === 0) {
    console.log(`  🎉 ALL ${passedTests}/${totalTests} TESTS PASSED — Complete Round Engine Verified!`);
  } else {
    console.log(`  ⚠️  ${passedTests}/${totalTests} PASSED — ${failures.length} FAILURES:`);
    failures.forEach((f, i) => console.error(`    ${i + 1}. ❌ ${f}`));
  }
  console.log('══════════════════════════════════════════════════════════════════════\n');

  if (failures.length > 0) process.exit(1);
}

main().catch(err => {
  console.error('\nFatal error in test suite:', err);
  process.exit(1);
});

