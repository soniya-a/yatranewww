import { matchResumeToRegistry } from '../src/data/companiesRegistry';
import { generateCanonicalQuestionSet, getCanonicalQuestionSet } from '../src/engine/questionEngine';
import { evaluateInterview, getAssessmentReport } from '../src/engine/assessmentEngine';
import { extractTextFromPDF } from '../src/lib/pdfParser';
import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';

const SAMPLE_RESUMES = [
  {
    branch: 'ECE',
    expectedCategory: 'ece',
    selectedRole: 'Embedded Systems Engineer',
    text: `ARJUN NAIR
B.Tech in Electronics and Communication Engineering (ECE) — NIT Calicut (CGPA: 8.8)
Email: arjun.ece@nitc.ac.in | Location: Bangalore, India
SKILLS: Embedded C, STM32 Microcontrollers, ARM Cortex, FreeRTOS, I2C, SPI, UART, Verilog, FPGA, PCB Design, Altium, Oscilloscope Debugging
PROJECTS:
- Real-Time CAN Bus & I2C Sensor Telemetry Node: Designed bare-metal and FreeRTOS firmware on STM32F4 using DMA and interrupt service routines (ISRs).
- FPGA High-Speed UART Transceiver: Implemented synthesizable Verilog RTL with two-flop clock-domain crossing synchronizers on Xilinx Vivado.`
  },
  {
    branch: 'Mechanical',
    expectedCategory: 'mechanical',
    selectedRole: 'Mechanical Design Engineer',
    text: `ROHAN DESHMUKH
B.Tech in Mechanical Engineering — COEP Pune (CGPA: 8.6)
Email: rohan.mech@coep.ac.in | Location: Pune, India
SKILLS: SolidWorks, AutoCAD, CATIA, ANSYS, Finite Element Analysis (FEA), GD&T, Thermodynamics, Heat Transfer, Fluid Mechanics, CNC Machining, FMEA
PROJECTS:
- Planetary Gearbox Housing FEA & GD&T Optimization: Modeled 3D assembly in SolidWorks and executed static structural and thermal stress simulations in ANSYS.
- Centrifugal Pump Impeller Cavitation Analysis: Computed NPSH margins and head losses using CFD.`
  },
  {
    branch: 'Civil',
    expectedCategory: 'civil',
    selectedRole: 'Civil Site Engineer',
    text: `PRIYA SHARMA
B.Tech in Civil Engineering / M.Tech in Structural Engineering — IIT Madras
Email: priya.civil@iitm.ac.in | Location: Chennai, India
SKILLS: STAAD.Pro, ETABS, AutoCAD Civil 3D, Reinforced Concrete Design (RCC), IS 456, Geotechnical Engineering, Soil Mechanics, Foundation Design, Surveying
PROJECTS:
- G+12 Seismic Resistant RCC Commercial Tower: Modeled shear walls and continuous beams in ETABS under IS 456 and IS 1893 seismic load combinations.
- Deep Pile Foundation Design: Evaluated borehole soil logs, skin friction, and settlement limits.`
  },
  {
    branch: 'CSE',
    expectedCategory: 'technical',
    selectedRole: 'Software Engineer',
    text: `KARTHIK VERMA
B.Tech in Computer Science and Engineering (CSE) — IIIT Hyderabad
Email: karthik.cse@iiit.ac.in | Location: Hyderabad, India
SKILLS: TypeScript, React, Node.js, Java, Spring Boot, PostgreSQL, Redis, Docker, Kubernetes, AWS, Microservices, REST API
PROJECTS:
- Distributed Order Processing Gateway: Engineered idempotent microservices using Node.js, PostgreSQL, and Redis rate limiting.`
  },
  {
    branch: 'Electrical',
    expectedCategory: 'electrical',
    selectedRole: 'Electrical Engineer',
    text: `SNEHA KULKARNI
B.Tech in Electrical and Electronics Engineering (EEE) — VJTI Mumbai
Email: sneha.eee@vjti.ac.in | Location: Mumbai, India
SKILLS: Power Systems, Switchgear, Transformers, PLC Programming, SCADA, ETAP, Single Line Diagram (SLD), Relay Coordination, High Voltage, MATLAB Simulink, Motor Drives
PROJECTS:
- 33/11kV Substation Relay Coordination & Load Flow: Modeled SLD in ETAP and configured Time-Current Characteristic (TCC) overcurrent and differential protection relays.
- Industrial VFD Motor Control via PLC-SCADA: Programmed Siemens ladder logic with hardwired E-Stop safety interlocks.`
  },
  {
    branch: 'AI/ML',
    expectedCategory: 'aiml',
    selectedRole: 'Applied AI Engineer',
    text: `ANANYA RAO
M.Tech in Artificial Intelligence & Machine Learning — IISc Bangalore
Email: ananya.ai@iisc.ac.in | Location: Bangalore, India
SKILLS: Python, PyTorch, TensorFlow, Deep Learning, Transformer, Large Language Model (LLM), HuggingFace, Computer Vision, NLP, Vector Database, Fine-Tuning, LoRA
PROJECTS:
- Low-Latency Enterprise RAG & Transformer Pipeline: Fine-tuned Llama-3 with QLoRA and built hybrid dense-vector + BM25 retrieval with cross-encoder reranking.`
  }
];

async function runAudit() {
  console.log('===================================================================');
  console.log('  YATRA PRE-DEMO INTERVIEW WORKFLOW AUDIT & PRACTICAL VERIFICATION ');
  console.log('===================================================================\n');

  // 0. Verify PDF Parser on real PDF asset on disk
  const samplePdfPath = path.resolve(process.cwd(), 'public', 'assets', 'soniyaj resumee.pdf');
  if (fs.existsSync(samplePdfPath)) {
    const pdfBuf = fs.readFileSync(samplePdfPath);
    const extractedPdfRes: any = await extractTextFromPDF(pdfBuf);
    const pdfText = typeof extractedPdfRes === 'string' ? extractedPdfRes : (extractedPdfRes?.text || '');
    console.log(`[PDF Extraction Test] Extracted ${pdfText.length} chars from 'soniyaj resumee.pdf'. Status: ${pdfText.length > 50 ? 'PASS' : 'FAIL'}`);
  }
  console.log(`[DOCX Parser Availability] mammoth.extractRawText function loaded: ${typeof mammoth.extractRawText === 'function' ? 'PASS' : 'FAIL'}\n`);

  // 1. PRIORITY 1: Test all 6 engineering branches
  console.log('--- PRIORITY 1: 6-BRANCH RESUME MATCHING & DOMAIN QUESTION VERIFICATION ---');
  for (const sample of SAMPLE_RESUMES) {
    const regMatch = matchResumeToRegistry(sample.text);
    const topCompany = regMatch.companies[0]?.company || 'Enterprise Corp';
    const matchedCat = regMatch.matchedCategory;

    if (matchedCat !== sample.expectedCategory) {
      throw new Error(`Branch mismatch for ${sample.branch}: expected '${sample.expectedCategory}', got '${matchedCat}'`);
    }

    const qSet = await generateCanonicalQuestionSet({
      company: topCompany,
      role: sample.selectedRole,
      candidateSkills: sample.text,
      parsedResume: {
        skills: sample.text.match(/SKILLS:\s*([^\n]+)/)?.[1]?.split(',').map(s => s.trim()) || [],
        projects: [{ name: `${sample.branch} Capstone Project`, description: 'Domain engineering implementation', tech: [] }],
        experience: [{ role: `${sample.branch} Intern`, company: topCompany }]
      },
      user_id: `demo_${sample.branch.toLowerCase()}`
    });

    // Verify Direct & VR parity via getCanonicalQuestionSet(set_id)
    const vrSet = await getCanonicalQuestionSet(qSet.set_id);
    if (!vrSet || vrSet.questions.length !== qSet.questions.length) {
      throw new Error(`Direct/VR canonical set parity failed for ${sample.branch}`);
    }

    // For non-CS/non-AI branches (ECE, Mechanical, Civil, Electrical), ensure no unrelated DBMS / web / SQL questions leaked
    if (['ECE', 'Mechanical', 'Civil', 'Electrical'].includes(sample.branch)) {
      for (const q of qSet.questions) {
        if (/microservice|database schema migration|payment processing queue|react profiler|virtual dom/i.test(q.question_text)) {
          throw new Error(`Unrelated CS/DBMS question leaked into ${sample.branch} (${sample.selectedRole}): "${q.question_text}"`);
        }
        // Verify no fabricated REPORTED category for unverified companies
        if (q.category === 'REPORTED' && (!q.evidence_list || q.evidence_list.length === 0)) {
          throw new Error(`Fabricated REPORTED question without evidence in ${sample.branch}`);
        }
      }
    }

    console.log(`✔ [${sample.branch}] -> Category: '${matchedCat}' | Matched Company: ${topCompany} | Role: ${sample.selectedRole}`);
    console.log(`  Rounds: ${qSet.rounds.map(r => r.round_name).join(' -> ')}`);
    console.log(`  Q001 (${qSet.questions[0].category}): ${qSet.questions[0].question_text.slice(0, 110)}...`);
    console.log(`  Q003 (${qSet.questions[2].category}): ${qSet.questions[2].question_text.slice(0, 110)}...\n`);
  }

  // 2. PRACTICAL END-TO-END INTERVIEW WORKFLOW & REPORT VERIFICATION
  console.log('--- PRACTICAL END-TO-END INTERVIEW & FINAL REPORT VERIFICATION ---');
  const eceSample = SAMPLE_RESUMES[0]; // ECE + Embedded Systems Engineer at Texas Instruments
  const match = matchResumeToRegistry(eceSample.text);
  const selectedCompany = match.companies[0].company; // Texas Instruments
  const selectedRole = 'Embedded Systems Engineer';

  const activeSet = await generateCanonicalQuestionSet({
    company: selectedCompany,
    role: selectedRole,
    candidateSkills: 'Embedded C, STM32, FreeRTOS, I2C, SPI, Verilog, FPGA, PCB Design',
    parsedResume: {
      skills: ['Embedded C', 'STM32 Microcontrollers', 'FreeRTOS', 'I2C', 'SPI', 'Verilog', 'PCB Design'],
      projects: [{ name: 'Real-Time CAN Bus & I2C Sensor Telemetry Node', description: 'Built on STM32F4 with FreeRTOS and DMA', tech: ['Embedded C', 'STM32', 'FreeRTOS'] }],
      experience: []
    },
    user_id: 'practical_demo_user'
  });

  console.log(`Generated Canonical Question Set: ${activeSet.set_id} (${activeSet.questions.length} questions)`);
  activeSet.questions.forEach(q => {
    console.log(`  ${q.question_id} [${q.round}] (${q.category}): ${q.question_text.slice(0, 90)}...`);
  });

  // Find specific questions in the 10-question set to test each scenario:
  // Q001: Resume project question -> Answer CORRECTLY with strong technical depth
  // Q002: Resume skill question -> Answer PARTIALLY CORRECTLY
  // Q003: Domain question -> Answer INCORRECTLY (wrong explanation)
  // Q004: Domain question -> Say "I don't know"
  // Q005: Domain question -> Submit deliberately incorrect coding stub in codeAnswers
  // Q006..Q010: Leave UNANSWERED

  const answers: Record<string, string> = {
    Q001: 'In our Real-Time CAN Bus & I2C Sensor Telemetry Node project built with Embedded C and STM32, our primary bottleneck was interrupt latency and bus contention at 1MHz sampling. Because polling blocked lower-priority tasks, we configured circular DMA buffers with half-transfer interrupts and used FreeRTOS priority inheritance mutexes to prevent priority inversion, reducing CPU overhead by 45%.',
    Q002: 'For signal integrity on mixed-signal PCBs, we used a continuous ground plane and placed decoupling capacitors near the IC power pins.',
    Q003: 'We just increased the font size of the CSS stylesheet and restarted the browser server.',
    Q004: "I don't know"
  };

  const codeAnswers: Record<string, string> = {
    Q005: 'function configureISR() {\n  // TODO: broken stub\n  return -1;\n}'
  };

  const behaviorLogs = [
    { timestamp: Date.now() - 120000, marker: 'CAMERA_CONNECTED', confidence: 1.0, details: 'Candidate camera stream active' },
    { timestamp: Date.now() - 115000, marker: 'SCREEN_SHARE_STARTED', confidence: 1.0, details: 'Screen sharing started via getDisplayMedia' },
    { timestamp: Date.now() - 100000, marker: 'FACE_PRESENT', confidence: 0.99, details: 'Single face verified in frame' },
    { timestamp: Date.now() - 80000, marker: 'HEAD_LEFT', confidence: 0.72, details: 'Observed gaze/head shift left (normal movement telemetry)' },
    { timestamp: Date.now() - 60000, marker: 'FACE_MISSING', confidence: 1.0, durationMs: 3200, details: 'No face detected in camera frame' },
    { timestamp: Date.now() - 56800, marker: 'FACE_RESTORED', confidence: 1.0, durationMs: 3200, details: 'Face returned to frame after 3s' },
    { timestamp: Date.now() - 40000, marker: 'TAB_HIDDEN', confidence: 1.0, details: 'Candidate switched away from interview browser tab' },
    { timestamp: Date.now() - 35000, marker: 'TAB_VISIBLE', confidence: 1.0, durationMs: 5000, details: 'Candidate returned to interview tab after 5s' }
  ];

  const report = await evaluateInterview({
    questionSetId: activeSet.set_id,
    userId: 'practical_demo_user',
    sessionToken: 'demo_token_123',
    company: selectedCompany,
    role: selectedRole,
    answers,
    codeAnswers,
    behaviorLogs,
    proctoringTelemetry: {
      cameraPermission: 'granted',
      screenSharePermission: 'granted',
      screenShareActive: true
    },
    interviewMode: 'normal'
  });

  console.log('\n--- FINAL REPORT INSPECTION ---');
  console.log('Report ID:', report.id);
  console.log('Overall Score:', report.overall_score, '| Grade:', report.overall_grade, '| Decision:', report.hiring_decision);
  console.log('Summary Metrics:', JSON.stringify(report.summary_metrics, null, 2));

  for (const qe of report.question_evaluations.slice(0, 6)) {
    console.log(`\n[${qe.question_id}] Status: ${qe.answer_status?.toUpperCase()} | Score: ${qe.score}/100 (+${qe.marks_awarded} / -${qe.marks_deducted})`);
    console.log(`  Candidate Response: ${qe.candidate_answer ? `"${qe.candidate_answer.slice(0, 90)}"` : '(Unanswered)'}`);
    if (qe.submitted_code) console.log(`  Submitted Code: ${qe.submitted_code.replace(/\n/g, ' ')}`);
    if (qe.code_evaluation_note) console.log(`  Code Eval Note: ${qe.code_evaluation_note}`);
    console.log(`  Expected Concepts: ${qe.expected_answer_summary?.slice(0, 100)}`);
    console.log(`  What Was Missed: ${qe.missing_concepts.join('; ') || 'None'}`);
  }

  console.log('\nProctoring Report Observed Events:', JSON.stringify({
    camera_permission: report.proctoring_report?.observed_events.camera_permission,
    screen_share_permission: report.proctoring_report?.observed_events.screen_share_permission,
    face_present_checks: report.proctoring_report?.observed_events.face_present_checks,
    face_missing_count: report.proctoring_report?.observed_events.face_missing_count,
    face_missing_duration_ms: report.proctoring_report?.observed_events.face_missing_duration_ms,
    head_movement_count: report.proctoring_report?.observed_events.head_movement_count,
    tab_switch_count: report.proctoring_report?.observed_events.tab_switch_count,
    tab_hidden_duration_ms: report.proctoring_report?.observed_events.tab_hidden_duration_ms
  }, null, 2));
  console.log('Proctoring Interpretation:', JSON.stringify(report.proctoring_report?.interpretation, null, 2));

  // Assertions on report accuracy
  const q1 = report.question_evaluations[0];
  const q3 = report.question_evaluations[2];
  const q4 = report.question_evaluations[3];
  const q5 = report.question_evaluations[4];
  const q6 = report.question_evaluations[5];

  if (q1.answer_status !== 'correct' || q1.score < 70) {
    throw new Error(`Expected Q001 to be scored as 'correct' (>=70), got ${q1.answer_status} (${q1.score})`);
  }
  if (q3.answer_status !== 'incorrect' || q3.score >= 35) {
    throw new Error(`Expected Q003 (wrong answer) to be 'incorrect' (<35), got ${q3.answer_status} (${q3.score})`);
  }
  if (q4.candidate_answer !== "I don't know" || q4.score !== 0 || q4.marks_awarded !== 0 || q4.marks_deducted !== 100 || q4.answer_status !== 'incorrect') {
    throw new Error(`Expected Q004 ("I don't know") to preserve transcript and award 0 marks, got: ${JSON.stringify(q4)}`);
  }
  if (!q5.submitted_code || q5.score >= 35 || q5.answer_status !== 'incorrect') {
    throw new Error(`Expected Q005 (broken coding stub) to be 'incorrect' (<35), got ${q5.answer_status} (${q5.score})`);
  }
  if (q6.is_answered !== false || q6.answer_status !== 'unanswered' || q6.score !== 0) {
    throw new Error(`Expected Q006 to be 'unanswered' with 0 score, got ${q6.answer_status} (${q6.score})`);
  }

  console.log('\n✔ ALL PRACTICAL END-TO-END ASSERTIONS PASSED!');
}

runAudit().catch(err => {
  console.error('AUDIT FAILED:', err);
  process.exit(1);
});
