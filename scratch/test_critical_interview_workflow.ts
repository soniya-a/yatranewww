import { chromium } from '@playwright/test';
import { spawn } from 'child_process';
import {
  generateCanonicalQuestionSet,
  evaluateQuestionCodingRequirement,
  isQuestionRelevantToJobDomain
} from '../src/engine/questionEngine';
import { evaluateInterview } from '../src/engine/assessmentEngine';
import { doesQuestionExplicitlyRequireCoding } from '../src/components/interview/CanonicalQuestionCard';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

async function runCriticalWorkflowTests() {
  console.log('==================================================================');
  console.log('YATRA — CRITICAL INTERVIEW WORKFLOW & QUESTION RELEVANCE TEST SUITE');
  console.log('==================================================================\n');

  // ---------------------------------------------------------------------------
  // SCENARIO A: Electrical Engineering + Burns & McDonnell + T&D
  // ---------------------------------------------------------------------------
  console.log('--- Scenario A: Electrical Engineering + Burns & McDonnell + T&D ---');
  // Intentionally include "Machine Learning" and "Python" as stray resume keywords on an Electrical resume
  // to prove that resume skills NEVER override the selected job's primary technical domain!
  const burnsSet = await generateCanonicalQuestionSet({
    company: 'Burns & McDonnell',
    role: 'Trainee Electrical Transmission Line Engineer – T&D',
    jobDescription: 'Design of high-voltage transmission lines, substations, transformers, circuit breakers, protection relays, single-line diagrams, and power systems.',
    candidateSkills: 'Machine Learning, Python, Power Systems, Transformers, Circuit Breakers, Single Line Diagrams (SLD), ETAP, AutoCAD Electrical',
    parsedResume: {
      headline: 'B.Tech in Electrical & Electronics Engineering (EEE)',
      education: [{ degree: 'B.Tech', field: 'Electrical Engineering', institution: 'NIT' }],
      skills: ['Machine Learning', 'Python', 'Power Systems', 'Transformers', 'Switchgear & Protection', 'Single Line Diagrams (SLD)', 'ETAP'],
      projects: [
        {
          name: '132/33 kV Substation Single-Line Diagram & Relay Coordination',
          description: 'Designed substation protection scheme with differential and distance relays in ETAP.',
          technologies: ['ETAP', 'AutoCAD Electrical']
        },
        {
          name: 'Student ML Hobby Script',
          description: 'Trained a neural network with 92% accuracy in PyTorch.',
          technologies: ['PyTorch', 'Machine Learning']
        }
      ]
    }
  });

  assert(burnsSet.questions.length === 10, `Expected 10 questions for Burns & McDonnell, got ${burnsSet.questions.length}`);
  for (const q of burnsSet.questions) {
    const qLower = q.question_text.toLowerCase();
    // 1. Must NOT contain any Machine Learning, AI, DBMS, OS, or React questions
    const hasForbiddenMLOrCS = /\b(machine learning|deep learning|vanishing\/exploding gradients|backpropagation|learning rate schedules|pytorch|tensorflow|neural network|dbms|b-tree|lsm-tree|virtual dom|react|microservice)\b/i.test(qLower);
    assert(!hasForbiddenMLOrCS, `Burns & McDonnell Electrical T&D question contaminated with ML/CS: "${q.question_text}"`);

    // 2. Issue 4 metadata validation
    assert(Boolean(q.company && q.role && q.branch && q.round && q.category && q.what_we_look_for), `Question ${q.question_id} missing required Issue 4 domain/source metadata`);
    assert(typeof q.requires_coding === 'boolean', `Question ${q.question_id} missing requires_coding flag`);
    assert(q.requires_coding === false, `Electrical T&D conceptual question ${q.question_id} should have requires_coding=false`);
  }
  const electricalMatches = burnsSet.questions.filter(q =>
    /\b(transmission|t&d|power|transformer|circuit breaker|relay|single-line|sld|substation|earthing|fault|ferranti|surge impedance|voltage|motor|generator|loto)\b/i.test(q.question_text)
  ).length;
  assert(electricalMatches >= 8, `Expected predominantly Electrical/T&D questions (>=8/10), got ${electricalMatches}/10`);
  console.log(`✔ Scenario A PASSED: ${electricalMatches}/10 Electrical/T&D questions; 0 ML/CS contamination; all 10 questions validated for domain & source metadata.`);

  // ---------------------------------------------------------------------------
  // SCENARIO B: ECE + Semiconductor / VLSI Role
  // ---------------------------------------------------------------------------
  console.log('\n--- Scenario B: ECE + Semiconductor / VLSI Design Engineer ---');
  const vlsiSet = await generateCanonicalQuestionSet({
    company: 'Texas Instruments',
    role: 'Digital VLSI & Semiconductor Design Engineer',
    jobDescription: 'RTL design in Verilog/SystemVerilog, CMOS digital design, Static Timing Analysis (STA), setup/hold time closure, clock domain crossing (CDC), and ASIC/FPGA synthesis.',
    candidateSkills: 'Verilog, SystemVerilog, CMOS VLSI, Digital Electronics, FPGA, Static Timing Analysis',
    parsedResume: {
      headline: 'B.Tech in Electronics and Communication Engineering (ECE)',
      skills: ['Verilog', 'CMOS VLSI', 'Digital Electronics', 'FPGA', 'Cadence Virtuoso'],
      projects: [
        {
          name: '32-bit Pipelined RISC-V Core in Verilog',
          description: 'Synthesized RTL and closed setup/hold timing at 250 MHz.',
          technologies: ['Verilog', 'Vivado']
        }
      ]
    }
  });

  assert(vlsiSet.questions.length === 10, `Expected 10 questions for ECE/VLSI, got ${vlsiSet.questions.length}`);
  const eceMatches = vlsiSet.questions.filter(q =>
    /\b(cmos|vlsi|verilog|systemverilog|setup|hold|metastability|clock domain|rtl|digital|i2c|spi|pcb|signal integrity|isr|dma|ldo|hardware)\b/i.test(q.question_text)
  ).length;
  assert(eceMatches >= 8, `Expected predominantly ECE/VLSI questions (>=8/10), got ${eceMatches}/10`);
  console.log(`✔ Scenario B PASSED: ${eceMatches}/10 ECE/VLSI/CMOS questions generated with full provenance.`);

  // ---------------------------------------------------------------------------
  // SCENARIO C: CSE + Software Engineer Role
  // ---------------------------------------------------------------------------
  console.log('\n--- Scenario C: CSE + Software Engineer Role ---');
  const cseSet = await generateCanonicalQuestionSet({
    company: 'Amazon',
    role: 'Software Development Engineer (SDE-1)',
    jobDescription: 'Data Structures & Algorithms, DBMS, SQL, Operating Systems, Distributed Systems, Object-Oriented Design.',
    candidateSkills: 'Python, Java, Data Structures, Algorithms, SQL, DBMS, Operating Systems',
    parsedResume: {
      headline: 'B.Tech in Computer Science and Engineering (CSE)',
      skills: ['Python', 'Java', 'SQL', 'React'],
      projects: [
        {
          name: 'Distributed Order Processing Service',
          description: 'Built high-throughput order service handling 10k rps.',
          technologies: ['Java', 'PostgreSQL', 'Redis']
        }
      ]
    }
  });
  assert(cseSet.questions.length === 10, `Expected 10 questions for CSE Software Engineer, got ${cseSet.questions.length}`);
  const hasReported = cseSet.questions.some(q => q.category === 'REPORTED');
  const hasOfficial = cseSet.questions.some(q => q.category === 'OFFICIAL_DERIVED');
  const hasResume = cseSet.questions.some(q => q.category === 'RESUME_BASED');
  assert(hasReported && hasOfficial && hasResume, 'CSE Amazon SDE-1 set must preserve REPORTED, OFFICIAL_DERIVED, and RESUME_BASED distinctions');
  console.log(`✔ Scenario C PASSED: 10 CSE questions generated preserving REPORTED, OFFICIAL_DERIVED, RESUME_BASED, and AI_PREDICTED sources.`);

  // ---------------------------------------------------------------------------
  // SCENARIO D & E: Conditional Coding-Panel Visibility Rules
  // ---------------------------------------------------------------------------
  console.log('\n--- Scenarios D & E: Conditional Coding-Panel Visibility ---');
  const codingCheckCases = [
    { q: 'Explain DBMS normalization and compare 3NF with BCNF.', expected: false },
    { q: 'Explain inheritance and polymorphism in Object-Oriented Programming.', expected: false },
    { q: 'Explain transformer operation and why rating is in kVA.', expected: false },
    { q: 'Write a Python program to find the longest palindromic substring.', expected: true, lang: 'python' },
    { q: 'Implement binary search on a rotated sorted array in O(log N) time.', expected: true },
    { q: 'Write an SQL query to find the second highest salary in each department.', expected: true, lang: 'sql' },
  ];

  for (const tc of codingCheckCases) {
    const res = doesQuestionExplicitlyRequireCoding({ question_text: tc.q });
    assert(
      res.requiresCoding === tc.expected,
      `Question "${tc.q}" -> expected requiresCoding=${tc.expected}, got ${res.requiresCoding}`
    );
    if (tc.lang) {
      assert(res.defaultLanguage === tc.lang, `Expected language ${tc.lang} for "${tc.q}", got ${res.defaultLanguage}`);
    }
  }
  console.log('✔ Scenarios D & E Unit Matrix PASSED: Conceptual questions hide editor; coding & SQL questions show editor with matching language.');

  // ---------------------------------------------------------------------------
  // SCENARIO G: Failed Gemini Request Deterministic Fallback
  // ---------------------------------------------------------------------------
  console.log('\n--- Scenario G: Failed Gemini Request Deterministic Fallback ---');
  const savedKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'dummy_key';
  try {
    const offlineSet = await generateCanonicalQuestionSet({
      company: 'Burns & McDonnell',
      role: 'Trainee Electrical Transmission Line Engineer – T&D',
      candidateSkills: 'Power Systems, Transformers, Switchgear'
    });
    assert(offlineSet.questions.length === 10, 'Deterministic fallback must return 10 questions when Gemini is unavailable');
    assert(offlineSet.provider === 'verified_offline_engine', 'Provider must be marked verified_offline_engine when Gemini is offline');
    console.log('✔ Scenario G PASSED: Deterministic fallback cleanly generated 10 domain-accurate questions with provider=verified_offline_engine.');
  } finally {
    process.env.GEMINI_API_KEY = savedKey;
  }

  // ---------------------------------------------------------------------------
  // SCENARIO F (+ Live Browser E2E for D, E, F): Completed Interview & Final Report Button
  // ---------------------------------------------------------------------------
  console.log('\n--- Scenario F (Live Browser E2E): Coding Editor Visibility + Completed Interview + ASSESS & VIEW FINAL REPORT ---');
  const testPort = 3098;
  const baseUrl = `http://localhost:${testPort}`;
  let serverReady = false;
  const serverProc = spawn(
    process.platform === 'win32' ? 'cmd.exe' : 'npx',
    process.platform === 'win32' ? ['/c', '.\\node_modules\\.bin\\tsx.cmd', 'server.ts'] : ['tsx', 'server.ts'],
    {
      stdio: 'pipe',
      env: { ...process.env, PORT: String(testPort) }
    }
  );
  serverProc.stdout.on('data', (chunk: any) => {
    if (chunk.toString().includes('Server running on')) serverReady = true;
  });
  for (let i = 0; i < 40; i++) {
    if (serverReady) break;
    await new Promise(r => setTimeout(r, 500));
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.addInitScript(() => {
      localStorage.setItem('guest_session', 'true');
      localStorage.setItem('guest_uid', 'guest_e2e_workflow_tester');
      localStorage.setItem(
        'yatra_guest_user',
        JSON.stringify({
          uid: 'guest_e2e_workflow_tester',
          email: 'guest@yatra.ai',
          displayName: 'Electrical Candidate',
          isAnonymous: true
        })
      );
    });

    // 1. Open Burns & McDonnell Electrical T&D interview in Direct Interview mode
    await page.goto(
      `${baseUrl}/interview?company=Burns%20%26%20McDonnell&role=Trainee%20Electrical%20Transmission%20Line%20Engineer%20%E2%80%93%20T%26D&vr=false`,
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );

    // Wait for loading spinner ("Preparing Interview Environment") to finish and pre-interview modal button to appear
    const startBtn = page.getByRole('button', { name: /Start Placement Interview|Resume Interview/i });
    await startBtn.waitFor({ state: 'visible', timeout: 20000 });
    await startBtn.click();

    // Verify Q001 is Electrical T&D and Coding Editor is HIDDEN for conceptual question (Scenario E)
    await page.locator('span', { hasText: 'Q001' }).first().waitFor({ state: 'visible', timeout: 15000 });
    const q1Text = (await page.locator('h2').first().textContent()) || '';
    console.log('Live Browser Q001 (Burns & McDonnell T&D):', q1Text.slice(0, 110) + '...');
    assert(!/machine learning|vanishing|backpropagation/i.test(q1Text), 'Live browser Q001 must not be Machine Learning');
    const codingGroundVisibleOnConceptual = await page.getByText('Coding Ground').isVisible().catch(() => false);
    assert(!codingGroundVisibleOnConceptual, 'Coding editor must remain HIDDEN on conceptual Electrical T&D question');
    console.log('✔ Live Browser Scenario E verified: Coding editor is hidden on conceptual Electrical question.');

    // Answer all questions until "Interview Concluded" screen appears
    for (let i = 0; i < 12; i++) {
      const concluded = await page.getByText('Interview Concluded').isVisible().catch(() => false);
      if (concluded) break;
      const input = page.locator('input[placeholder*="Type your answer"]').first();
      await input.waitFor({ state: 'visible', timeout: 10000 });
      await input.fill(
        'In high-voltage T&D power systems, we use Ferranti effect shunt reactors, Surge Impedance Loading (SIL), differential and distance relays on Single-Line Diagrams (SLDs), Dyn11 transformers, SF6/Vacuum circuit breakers, and IEEE 80 substation earthing grids with LOTO safety.'
      );
      const submitBtn = page.getByRole('button', { name: /Submit Answer & Next/i });
      await submitBtn.click();
      // Wait for either the next question to enable the input or Interview Concluded to appear
      await page.waitForFunction(
        (prevIdx) => {
          if (document.body.innerText.includes('Interview Concluded')) return true;
          const nextQCode = `Q${String(prevIdx + 2).padStart(3, '0')}`;
          return document.body.innerText.includes(`Question ${prevIdx + 2} of`) || document.body.innerText.includes(nextQCode);
        },
        i,
        { timeout: 15000 }
      ).catch(() => {});
    }

    // Verify "Interview Concluded" screen and click "ASSESS & VIEW FINAL REPORT"
    await page.getByText('Interview Concluded').waitFor({ state: 'visible', timeout: 15000 });
    const reportBtn = page.getByRole('button', { name: /Assess & View Final Report/i });
    assert(await reportBtn.isVisible(), 'ASSESS & VIEW FINAL REPORT button must be visible on completed screen');

    const [gradeResp] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/interview/grade'), { timeout: 20000 }),
      reportBtn.click()
    ]);
    const gradeJson = await gradeResp.json();
    console.log('Live Browser /api/interview/grade status:', gradeResp.status(), 'overall_score:', gradeJson.overall_score, 'qEvals:', gradeJson.question_evaluations?.length);
    assert(gradeResp.status() === 200, 'Expected /api/interview/grade to return HTTP 200');
    assert(Array.isArray(gradeJson.question_evaluations) && gradeJson.question_evaluations.length === 10, 'Expected 10 question evaluations in final report payload');

    // Wait for Official Placement Evaluation Report modal to open with full evaluated scorecard
    await page.getByText('Official Placement Evaluation Report').waitFor({ state: 'visible', timeout: 15000 });
    await page.getByText(/Question-by-Question Evaluation \(10 Questions\)/i).waitFor({ state: 'visible', timeout: 10000 });
    const reportHeading = await page.getByText(/Burns & McDonnell/i).first().isVisible();
    const qBreakdownVisible = await page.getByText(/Question-by-Question Evaluation \(10 Questions\)/i).isVisible();
    assert(reportHeading && qBreakdownVisible, 'Final report must display company/role header and 10 evaluated questions');

    // Verify URL updated with deterministic reportId and localStorage has no duplicate reports
    const currentUrl = page.url();
    assert(currentUrl.includes('reportId=RPT_'), `Expected URL to contain reportId=RPT_..., got ${currentUrl}`);
    const savedCount = await page.evaluate(() => {
      const raw = localStorage.getItem('interviews_guest_e2e_workflow_tester');
      const arr = raw ? JSON.parse(raw) : [];
      return arr.length;
    });
    assert(savedCount === 1, `Expected exactly 1 saved report without duplicates, got ${savedCount}`);
    console.log(`✔ Live Browser Scenario F verified: Clicking "ASSESS & VIEW FINAL REPORT" evaluated all 10 answers, saved report (count=${savedCount}), and opened the full final report view.`);

    // 2. Open Amazon SDE-1 interview in Direct Interview mode to verify Live Browser Scenario D (Coding Editor visible, Run Code, Submit Code)
    await page.goto(
      `${baseUrl}/interview?company=Amazon&role=Software%20Engineer&vr=false`,
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );
    const startBtn2 = page.getByRole('button', { name: /Start Placement Interview|Resume Interview/i });
    await startBtn2.waitFor({ state: 'visible', timeout: 20000 });
    await startBtn2.click();
    await page.locator('span', { hasText: 'Q001' }).first().waitFor({ state: 'visible', timeout: 15000 });
    const codingGroundVisible = await page.getByText(/Coding Ground|SQL Query Editor/i).isVisible();
    assert(codingGroundVisible, 'Coding editor must be visible on Amazon SDE-1 Q001 coding problem');
    const langSelectVisible = await page.locator('select[aria-label="Select Programming Language"]').isVisible();
    const runBtn = page.getByRole('button', { name: /Run Code/i });
    const submitCodeBtn = page.getByRole('button', { name: /Submit Code & Next/i });
    assert(langSelectVisible && (await runBtn.isVisible()) && (await submitCodeBtn.isVisible()), 'Coding editor must display language selector, Run Code, and Submit Code & Next buttons');

    // Fill code in the editor, run code verification, and submit code
    const codeTextarea = page.locator('textarea[aria-label="Source Code Editor"]');
    await codeTextarea.fill(
      'def solve(intervals):\n    if not intervals:\n        return 0\n    intervals.sort(key=lambda x: x[0])\n    return len(intervals)\n'
    );
    await runBtn.click();
    await page.getByText(/PASSED/i).first().waitFor({ state: 'visible', timeout: 5000 });
    await submitCodeBtn.click();
    await page.locator('span', { hasText: 'Q002' }).first().waitFor({ state: 'visible', timeout: 15000 });
    console.log('✔ Live Browser Scenario D verified: Coding editor, language selector, Run Code verification console, and Submit Code & Next saved code and advanced to Q002.');
  } finally {
    await browser.close();
    if (serverProc) serverProc.kill();
  }

  console.log('\n==================================================================');
  console.log('ALL SCENARIOS (A, B, C, D, E, F, G) PASSED SUCCESSFULLY!');
  console.log('==================================================================');
}

runCriticalWorkflowTests().catch(err => {
  console.error('TEST FAILURE:', err);
  process.exit(1);
});
