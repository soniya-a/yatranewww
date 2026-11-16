// ==============================================================================
// YATRA: End-to-End Interview Assessment Scorecard Integration Verification Suite
// ==============================================================================

import 'dotenv/config';
import { evaluateInterview, getAssessmentReport, getAssessmentReportBySession } from '../src/engine/assessmentEngine';
import { generateCanonicalQuestionSet } from '../src/engine/questionEngine';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail: string = '') {
  if (condition) {
    console.log(`  [PASS] ${testName}${detail ? ` - ${detail}` : ''}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
    failed++;
  }
}

async function runAssessmentScorecardTests() {
  console.log('\n================================================================');
  console.log('  YATRA: ASSESSMENT SCORECARD INTEGRATION VERIFICATION  ');
  console.log('================================================================\n');

  // Generate canonical sets for testing
  const amazonDsaSet = await generateCanonicalQuestionSet({
    company: 'Amazon',
    role: 'Software Engineer',
    roundName: 'Technical DSA',
    candidateSkills: ['Data Structures', 'Python', 'Algorithms'],
    user_id: 'test-user-alpha'
  });

  const tcsAptitudeSet = await generateCanonicalQuestionSet({
    company: 'TCS',
    role: 'Ninja Developer',
    roundName: 'Aptitude & Logical Reasoning',
    candidateSkills: ['Mathematics', 'Quantitative Reasoning'],
    user_id: 'test-user-alpha'
  });

  // ── TEST 1: Aptitude Correct vs Incorrect Scoring ───────────────────────────
  console.log('[Test 1] Aptitude MCQ Scoring: Correct vs Incorrect Answers');
  const aptitudeAnswers = {
    Q001: 'B) 13 and 2/3 days by computing the LCM of 12 and 16',
    Q002: 'Wrong random answer completely unrelated to quantitative derivation',
    Q003: 'Calculation shown: LCM of 12 and 16 is 48 units, but chose wrong final letter option'
  };

  const aptReport = await evaluateInterview({
    reportId: 'RPT_APTITUDE_TEST',
    sessionId: 'SES_APTITUDE_TEST',
    questionSetId: tcsAptitudeSet.set_id,
    userId: 'test-user-alpha',
    company: 'TCS',
    role: 'Ninja Developer',
    answers: aptitudeAnswers,
    interviewMode: 'normal'
  });

  const q1 = aptReport.question_evaluations.find(q => q.question_id === 'Q001');
  const q2 = aptReport.question_evaluations.find(q => q.question_id === 'Q002');
  const q3 = aptReport.question_evaluations.find(q => q.question_id === 'Q003');

  assert(q1?.score === 100, 'Aptitude correct answer receives score 100');
  assert(q1?.verdict === 'Excellent', 'Aptitude correct answer verdict is Excellent');
  assert(q2?.score === 0, 'Aptitude incorrect answer receives score 0');
  assert(q2?.missing_concepts.length! > 0, 'Aptitude incorrect answer includes missing concepts explanation');
  assert(q3?.score === 35, 'Aptitude partial formula work receives exactly 35% partial credit');

  // Verify that Aptitude round does NOT force communication dimension
  const aptScorecard = Object.values(aptReport.round_scorecards)[0];
  assert(aptScorecard.dimensions.communication === undefined, 'Objective MCQ Aptitude scorecard does not force communication score');

  // ── TEST 2: Unanswered Questions Explicitly Marked ──────────────────────────
  console.log('\n[Test 2] Unanswered / Skipped Questions Handling');
  const qUnanswered = aptReport.question_evaluations.find(q => q.question_id === 'Q004');
  assert(qUnanswered?.is_answered === false, 'Skipped question is marked is_answered: false');
  assert(qUnanswered?.score === 0, 'Skipped question receives score 0');
  assert(qUnanswered?.verdict === 'Unanswered', 'Skipped question verdict is Unanswered');
  assert(qUnanswered?.missing_concepts.length! > 0, 'Skipped question lists expected core concepts');

  // ── TEST 3: Coding Solution Evaluation ──────────────────────────────────────
  console.log('\n[Test 3] Coding & Technical Solution Evaluation');
  const dsaAnswers = {
    Q001: 'I implement the LRU Cache using a doubly linked list combined with a hash map. The get operation is O(1) time complexity and put is O(1) time complexity. For edge cases, we handle capacity 0 and null keys.'
  };
  const dsaCodeAnswers = {
    Q001: 'class Node { key: number; val: number; prev: Node; next: Node; }\nclass LRUCache { get(key) { ... } put(key, val) { ... } }'
  };

  const dsaReport = await evaluateInterview({
    reportId: 'RPT_DSA_TEST',
    sessionId: 'SES_DSA_TEST',
    questionSetId: amazonDsaSet.set_id,
    userId: 'test-user-alpha',
    company: 'Amazon',
    role: 'Software Engineer',
    answers: dsaAnswers,
    codeAnswers: dsaCodeAnswers,
    interviewMode: 'normal'
  });

  const dsaQ1 = dsaReport.question_evaluations.find(q => q.question_id === 'Q001');
  assert(dsaQ1?.score! >= 75, 'Comprehensive coding answer receives high score based on algorithm, complexity, constraints');
  assert(dsaQ1?.rubric_breakdown.length! >= 3, 'Coding evaluation contains rubric breakdown');
  assert(dsaQ1?.strengths.length! > 0, 'Coding evaluation includes identified strengths');

  // ── TEST 4: Round-by-Round Scorecard Dimensions ─────────────────────────────
  console.log('\n[Test 4] Round-by-Round Scorecard Dimensions');
  const dsaScorecard = Object.values(dsaReport.round_scorecards)[0];
  assert(typeof dsaScorecard.dimensions.correctness === 'number', 'Scorecard contains correctness dimension');
  assert(typeof dsaScorecard.dimensions.technical_depth === 'number', 'Scorecard contains technical_depth dimension');
  assert(typeof dsaScorecard.dimensions.problem_solving === 'number', 'Scorecard contains problem_solving dimension');
  assert(typeof dsaScorecard.dimensions.communication === 'number', 'Technical round includes communication dimension');
  assert(Array.isArray(dsaScorecard.improvement_suggestions), 'Scorecard includes actionable improvement suggestions');

  // ── TEST 5: Hiring Summary & Decision Calibration ───────────────────────────
  console.log('\n[Test 5] Hiring Summary & Decision Calibration');
  assert(['A+', 'A', 'B+', 'B', 'C', 'D'].includes(dsaReport.overall_grade), 'Report overall_grade is calibrated');
  assert(['Strong Hire', 'Hire', 'Lean Hire', 'Hold', 'Reject'].includes(dsaReport.hiring_decision), 'Report hiring_decision is calibrated');
  assert(dsaReport.hiring_summary.includes('Amazon Software Engineer'), 'Hiring summary references company and role');
  assert(dsaReport.recommended_roadmap.length >= 1, 'Recommended learning roadmap contains actionable items with timeline');

  // ── TEST 6: Report Retrieval & Ownership Security ───────────────────────────
  console.log('\n[Test 6] Report Retrieval & Zero-Trust Ownership Security');
  const retrievedReport = await getAssessmentReport('RPT_DSA_TEST', { requesterUid: 'test-user-alpha' });
  assert(retrievedReport?.id === 'RPT_DSA_TEST', 'Owner can retrieve report by reportId');

  let accessBlocked = false;
  try {
    // Other user attempts to retrieve User Alpha's report
    await getAssessmentReport('RPT_DSA_TEST', { requesterUid: 'unauthorized-user-beta' });
  } catch (err: any) {
    if (err.message.includes('FORBIDDEN')) accessBlocked = true;
  }
  assert(accessBlocked, 'Cross-user report access is blocked with FORBIDDEN exception');

  // ── TEST 7: Normal / VR Mode Evaluation Parity ──────────────────────────────
  console.log('\n[Test 7] Normal vs VR Mode Evaluation Parity');
  const normalReport = await evaluateInterview({
    reportId: 'RPT_PARITY_NORMAL',
    sessionId: 'SES_PARITY',
    questionSetId: amazonDsaSet.set_id,
    userId: 'test-user-alpha',
    company: 'Amazon',
    role: 'Software Engineer',
    answers: dsaAnswers,
    codeAnswers: dsaCodeAnswers,
    interviewMode: 'normal'
  });

  const vrReport = await evaluateInterview({
    reportId: 'RPT_PARITY_VR',
    sessionId: 'SES_PARITY',
    questionSetId: amazonDsaSet.set_id,
    userId: 'test-user-alpha',
    company: 'Amazon',
    role: 'Software Engineer',
    answers: dsaAnswers,
    codeAnswers: dsaCodeAnswers,
    interviewMode: 'vr'
  });

  assert(normalReport.overall_score === vrReport.overall_score, 'Normal and VR modes have identical overall score');
  assert(normalReport.overall_grade === vrReport.overall_grade, 'Normal and VR modes have identical overall grade');
  assert(normalReport.hiring_decision === vrReport.hiring_decision, 'Normal and VR modes have identical hiring decision');

  const normalScores = normalReport.question_evaluations.map(q => q.score);
  const vrScores = vrReport.question_evaluations.map(q => q.score);
  assert(JSON.stringify(normalScores) === JSON.stringify(vrScores), 'Normal and VR modes have 100% identical question scores');

  console.log('\n================================================================');
  console.log(`  VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED  `);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runAssessmentScorecardTests().catch(err => {
  console.error('Fatal assessment test error:', err);
  process.exit(1);
});

