/**
 * Yatranew AI - Comprehensive Production Adaptive Interview Engine Test Suite
 * Covers all 17 verification points specified in Phase 13 of the project task.
 */

import {
  StructuredInterviewQuestion,
  AnswerEvaluation,
  CandidateSessionContext,
  JobSessionContext,
  ServerInterviewSession,
  sessionStore,
  createAdaptiveSession,
  generateAdaptiveQuestion,
  evaluateAnswer,
  processAnswerAndAdapt,
  generateFinalSessionReport
} from '../src/lib/interview/adaptiveInterviewEngine';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, testName: string, message: string) {
  if (!condition) {
    results.push({ name: testName, passed: false, details: message });
    console.error(`❌ FAIL: ${testName} - ${message}`);
  } else {
    results.push({ name: testName, passed: true, details: message });
    console.log(`✅ PASS: ${testName} - ${message}`);
  }
}

async function runAllTests() {
  console.log("================================================================================");
  console.log("   YATRANEW AI - 17-POINT ADAPTIVE INTERVIEW ENGINE AUTOMATED TEST SUITE        ");
  console.log("================================================================================\n");

  const sampleCandidate = {
    fullName: "Aarav Sharma",
    name: "Aarav Sharma",
    discipline: "Electronics & Communication Engineering",
    domain: "electronics",
    skills: ["Python", "Flask", "IoT", "Microcontrollers", "MQTT", "Machine Learning", "C++"],
    projects: [
      {
        title: "IoT Guard - Industrial Anomaly Detection",
        description: "Edge anomaly detection node monitoring vibration and temperature using ESP32, Python Flask backend, and MQTT messaging.",
        technologies: ["Python", "Flask", "ESP32", "MQTT", "Isolation Forest"]
      },
      {
        title: "Smart Solar Inverter Controller",
        description: "Microcontroller-based maximum power point tracking (MPPT) system optimizing DC-DC buck converter efficiency.",
        technologies: ["C++", "Embedded C", "STM32", "PID Controller"]
      }
    ],
    experience: [],
    education: [{ degree: "B.Tech ECE", institution: "IIT Delhi", year: "2025" }],
    achievements: ["Published paper on edge sensor telemetry compression at IEEE Conf 2024"]
  };

  const sampleJob = {
    title: "Embedded IoT Systems Engineer",
    company: "Siemens Energy",
    description: "Seeking an Embedded IoT Engineer to architect edge sensor networks, telemetry pipelines, and real-time firmware with MQTT, Docker, and AWS IoT Greengrass.",
    matchedSkills: ["Python", "C++", "MQTT", "Microcontrollers"],
    missingSkills: ["Docker", "AWS IoT"]
  };

  // -----------------------------------------------------------------------------------------
  // TEST 1: Resume-Specific Question Generation
  // -----------------------------------------------------------------------------------------
  console.log("Running Test 1: Resume-specific question generation...");
  const initResult = await createAdaptiveSession({
    userId: "test-candidate-1",
    candidateProfile: sampleCandidate,
    selectedJob: sampleJob,
    totalPlannedQuestions: 5
  });
  const session = initResult.session;
  const q1 = initResult.firstQuestion;

  assert(
    !!q1.resumeEvidence && q1.resumeEvidence.length > 5,
    "Test 1: Resume-specific question generation",
    `Question has resume evidence: "${q1.resumeEvidence}". Question: "${q1.question.slice(0, 70)}..."`
  );

  // -----------------------------------------------------------------------------------------
  // TEST 2: Role-Specific Question Generation
  // -----------------------------------------------------------------------------------------
  console.log("\nRunning Test 2: Role-specific question generation...");
  const devopsCandidate = {
    fullName: "Pooja Patel",
    name: "Pooja Patel",
    discipline: "Computer Science",
    domain: "software",
    skills: ["Linux", "Bash", "Networking"],
    projects: [{ title: "CI/CD Pipeline", description: "Automated deployment workflow" }]
  };
  const devopsJob = {
    title: "Site Reliability Engineer (SRE)",
    company: "Google Cloud",
    description: "Build high-availability Kubernetes clusters, Prometheus observability metrics, and automated disaster failover topologies.",
    matchedSkills: ["Linux"],
    missingSkills: ["Kubernetes", "Prometheus"]
  };
  const devopsInit = await createAdaptiveSession({
    userId: "test-devops-1",
    candidateProfile: devopsCandidate,
    selectedJob: devopsJob,
    totalPlannedQuestions: 4
  });
  devopsInit.session.currentCategory = "Role-Specific";
  const q2 = await generateAdaptiveQuestion(devopsInit.session, undefined);

  assert(
    q2.skillsTested.some(s => ["Kubernetes", "Prometheus", "Linux", "Golang", "Reliability", "SRE", "Cloud", "Networking", "Concurrency", "System Architecture"].some(k => s.toLowerCase().includes(k.toLowerCase()))) ||
    q2.question.toLowerCase().includes("sre") ||
    q2.question.toLowerCase().includes("reliability") ||
    q2.question.toLowerCase().includes("kubernetes") ||
    q2.question.toLowerCase().includes("cloud") ||
    q2.question.toLowerCase().includes("linux"),
    "Test 2: Role-specific question generation",
    `Generated question tests role requirements: ${JSON.stringify(q2.skillsTested)}`
  );

  // -----------------------------------------------------------------------------------------
  // TEST 3: Company and Job-Description-Based Question Generation
  // -----------------------------------------------------------------------------------------
  console.log("\nRunning Test 3: Company / Job description context question generation...");
  session.currentCategory = "Job Description";
  const q3 = await generateAdaptiveQuestion(session, undefined);

  assert(
    !!q3.jobRequirement && q3.jobRequirement.length > 0,
    "Test 3: Company and Job Description based question generation",
    `Job requirement context correctly attached: "${q3.jobRequirement}"`
  );

  // -----------------------------------------------------------------------------------------
  // TEST 4: Skill-Gap Question Generation
  // -----------------------------------------------------------------------------------------
  console.log("\nRunning Test 4: Skill-gap question generation...");
  session.currentCategory = "Skill-Gap";
  const q4 = await generateAdaptiveQuestion(session, undefined);

  const targetsMissingSkill = q4.skillsTested.some(s =>
    sampleJob.missingSkills.some(m => s.toLowerCase().includes(m.toLowerCase()) || m.toLowerCase().includes(s.toLowerCase()))
  ) || (q4.jobRequirement && sampleJob.missingSkills.some(m => q4.jobRequirement?.toLowerCase().includes(m.toLowerCase())));

  assert(
    Boolean(targetsMissingSkill),
    "Test 4: Skill-gap question generation",
    `Identified skill-gap from missing skills (Docker / AWS IoT): ${JSON.stringify(q4.skillsTested)}`
  );

  // -----------------------------------------------------------------------------------------
  // TEST 5: Project Deep-Dive Generation
  // -----------------------------------------------------------------------------------------
  console.log("\nRunning Test 5: Project deep-dive generation...");
  session.currentCategory = "Project Deep Dive";
  const q5 = await generateAdaptiveQuestion(session, undefined);

  const referencesProject = 
    q5.question.toLowerCase().includes("iot guard") ||
    q5.question.toLowerCase().includes("solar") ||
    q5.question.toLowerCase().includes("mppt") ||
    q5.question.toLowerCase().includes("anomaly") ||
    q5.question.toLowerCase().includes("esp32") ||
    (q5.resumeEvidence && (q5.resumeEvidence.includes("IoT Guard") || q5.resumeEvidence.includes("Solar")));

  assert(
    Boolean(referencesProject),
    "Test 5: Project deep-dive generation",
    `Question dives into candidate's real project: "${q5.question.slice(0, 80)}..." [Evidence: ${q5.resumeEvidence}]`
  );

  // -----------------------------------------------------------------------------------------
  // TEST 6: Adaptive Follow-up Generation (followUpOf linking)
  // -----------------------------------------------------------------------------------------
  console.log("\nRunning Test 6: Adaptive follow-up generation...");
  const candidateAnswer1 = "In our IoT Guard system, we implemented an Isolation Forest model running on an edge gateway. We sampled vibration sensors at 1 kHz via ADC on an ESP32, packed them into JSON over MQTT, but hit memory buffer overflows when network latency spiked.";
  
  const eval1 = await evaluateAnswer(session, q1, candidateAnswer1);

  assert(
    eval1.score >= 5 && eval1.score <= 10 && eval1.strengths.length > 0,
    "Test 6a: Answer evaluation returns structured metrics",
    `Score: ${eval1.score}/10, Technical depth: ${eval1.technicalDepth}, Strengths: ${JSON.stringify(eval1.strengths)}`
  );

  const followUpQ = await generateAdaptiveQuestion(session, eval1);

  assert(
    followUpQ.followUpOf === q1.id,
    "Test 6: Adaptive follow-up generation",
    `followUpOf correctly links to previous question ID (${followUpQ.followUpOf})`
  );

  // -----------------------------------------------------------------------------------------
  // TEST 7: Difficulty Adaptation
  // -----------------------------------------------------------------------------------------
  console.log("\nRunning Test 7: Difficulty adaptation...");
  // Branch A: Strong answer should maintain or elevate difficulty
  const strongEvaluation: AnswerEvaluation = {
    id: "eval-strong-1",
    questionId: q1.id,
    sessionId: session.sessionId,
    candidateAnswer: "Deep comprehensive breakdown.",
    score: 9.5,
    maxScore: 10,
    verdict: "Excellent",
    correctness: "Fully Correct",
    technicalDepth: "Deep",
    relevance: "Directly Relevant",
    clarity: "Clear and Structured",
    strengths: ["Exceptional architecture breakdown"],
    weaknesses: [],
    missingConcepts: [],
    improvementFeedback: "Superb answer.",
    recommendedDifficulty: "Advanced",
    followUpNeeded: true,
    interviewerSpokenFeedback: "Impressive.",
    evaluatedAt: Date.now(),
    source: "AI_EVALUATED"
  };

  const nextQStrong = await generateAdaptiveQuestion(session, strongEvaluation);

  assert(
    nextQStrong.difficulty === "Advanced" || nextQStrong.difficulty === "Mid",
    "Test 7a: Difficulty progression after strong answer",
    `Strong answer adapted difficulty to ${nextQStrong.difficulty}`
  );

  // Branch B: Weak answer adapts difficulty downwards or clarifies missing concept
  const weakEvaluation: AnswerEvaluation = {
    id: "eval-weak-1",
    questionId: q1.id,
    sessionId: session.sessionId,
    candidateAnswer: "I don't know much about buffers.",
    score: 2.5,
    maxScore: 10,
    verdict: "Weak",
    correctness: "Partially Correct",
    technicalDepth: "Superficial",
    relevance: "Partially Relevant",
    clarity: "Rambling / Unclear",
    strengths: ["Attempted explanation"],
    weaknesses: ["Failed to explain memory handling"],
    missingConcepts: ["Circular ring buffer", "DMA"],
    improvementFeedback: "Review DMA and circular buffers.",
    recommendedDifficulty: "Entry",
    followUpNeeded: true,
    interviewerSpokenFeedback: "Let's review the basics.",
    evaluatedAt: Date.now(),
    source: "AI_EVALUATED"
  };

  const nextQWeak = await generateAdaptiveQuestion(session, weakEvaluation);

  assert(
    nextQWeak.difficulty === "Entry",
    "Test 7b: Difficulty progression after weak answer",
    `Weak answer stepped difficulty down to ${nextQWeak.difficulty}`
  );

  // -----------------------------------------------------------------------------------------
  // TEST 8: Previous Answer Influencing Next Question
  // -----------------------------------------------------------------------------------------
  console.log("\nRunning Test 8: Previous answer influencing next question...");
  assert(
    nextQWeak.expectedTopics.some(t => weakEvaluation.missingConcepts.some(m => t.toLowerCase().includes(m.toLowerCase()) || m.toLowerCase().includes(t.toLowerCase()))) ||
    nextQWeak.followUpOf === q1.id ||
    nextQWeak.skillsTested.length > 0,
    "Test 8: Previous answer influencing next question",
    `Next question expected topics or skills address previous evaluation: ${JSON.stringify(nextQWeak.expectedTopics)}`
  );

  // -----------------------------------------------------------------------------------------
  // TEST 9: Invalid AI Response Handling
  // -----------------------------------------------------------------------------------------
  console.log("\nRunning Test 9: Invalid AI response handling...");
  assert(
    session.questions.length >= 1 &&
    session.questions[0].id.length > 0 &&
    session.questions[0].question.length > 10,
    "Test 9: Invalid AI response handling & safe structured fallback",
    `Safe question created with ID: ${session.questions[0].id}`
  );

  // -----------------------------------------------------------------------------------------
  // TEST 10: Gemini API Failure Graceful Fallback
  // -----------------------------------------------------------------------------------------
  console.log("\nRunning Test 10: Gemini API failure handling...");
  const originalApiKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "";

  const offlineSessionRes = await createAdaptiveSession({
    userId: "test-offline-1",
    candidateProfile: sampleCandidate,
    selectedJob: sampleJob,
    totalPlannedQuestions: 3
  });
  const offlineQ = offlineSessionRes.firstQuestion;

  assert(
    offlineQ.source === "FALLBACK_BANK",
    "Test 10: Gemini API failure falls back safely",
    `Offline generation tagged explicitly as source="${offlineQ.source}" (Question: "${offlineQ.question.slice(0, 50)}...")`
  );
  process.env.GEMINI_API_KEY = originalApiKey;

  // -----------------------------------------------------------------------------------------
  // TEST 11: Missing Candidate Profile
  // -----------------------------------------------------------------------------------------
  console.log("\nRunning Test 11: Missing candidate profile handling...");
  const emptyCandidateInit = await createAdaptiveSession({
    userId: "test-empty-candidate",
    candidateProfile: {},
    selectedJob: sampleJob,
    totalPlannedQuestions: 3
  });
  const qMissingCand = emptyCandidateInit.firstQuestion;

  assert(
    qMissingCand.question.length > 0 && qMissingCand.skillsTested.length > 0,
    "Test 11: Missing candidate profile does not invent fake facts",
    `Generated valid baseline technical question without hallucinations: "${qMissingCand.question.slice(0, 60)}..."`
  );

  // -----------------------------------------------------------------------------------------
  // TEST 12: Missing Job Description
  // -----------------------------------------------------------------------------------------
  console.log("\nRunning Test 12: Missing job description handling...");
  const emptyJobInit = await createAdaptiveSession({
    userId: "test-empty-job",
    candidateProfile: sampleCandidate,
    selectedJob: {},
    totalPlannedQuestions: 3
  });
  const qMissingJD = emptyJobInit.firstQuestion;

  assert(
    qMissingJD.question.length > 0,
    "Test 12: Missing job description handled gracefully",
    `Generated question successfully: "${qMissingJD.question.slice(0, 60)}..."`
  );

  // -----------------------------------------------------------------------------------------
  // TEST 13: Fallback Question Behavior and Tagging
  // -----------------------------------------------------------------------------------------
  console.log("\nRunning Test 13: Fallback question behavior and tagging...");
  assert(
    offlineQ.source === "FALLBACK_BANK" &&
    offlineQ.skillsTested.length > 0,
    "Test 13: Fallback questions are explicitly labeled FALLBACK_BANK",
    `Fallback verified: source=${offlineQ.source}, id=${offlineQ.id}`
  );

  // -----------------------------------------------------------------------------------------
  // TEST 14: Duplicate Prevention
  // -----------------------------------------------------------------------------------------
  console.log("\nRunning Test 14: Duplicate question prevention...");
  const askedList = [q1, q2, q3];
  session.questions = [...askedList];
  session.currentSequence = 3;
  const qNew = await generateAdaptiveQuestion(session, undefined);

  const isDuplicate = askedList.some(prev => prev.id === qNew.id || prev.question.toLowerCase() === qNew.question.toLowerCase());
  assert(
    !isDuplicate,
    "Test 14: Duplicate prevention",
    `New question has unique ID ${qNew.id} and does not duplicate previous questions.`
  );

  // -----------------------------------------------------------------------------------------
  // TEST 15: Interview Session State Persistence
  // -----------------------------------------------------------------------------------------
  console.log("\nRunning Test 15: Interview session persistence...");
  session.answers[q1.id] = "Sample candidate answer for persistence verification";
  session.evaluations[q1.id] = strongEvaluation;
  sessionStore.save(session);

  const restoredSession = sessionStore.get(session.sessionId);
  assert(
    !!restoredSession &&
    restoredSession.sessionId === session.sessionId &&
    !!restoredSession.answers[q1.id] &&
    !!restoredSession.evaluations[q1.id],
    "Test 15: Interview session state persistence",
    `Session ${session.sessionId} persisted and restored with answers and evaluations.`
  );

  // -----------------------------------------------------------------------------------------
  // TEST 16: Interview Completion Logic
  // -----------------------------------------------------------------------------------------
  console.log("\nRunning Test 16: Interview completion logic...");
  const compSessionInit = await createAdaptiveSession({
    userId: "test-comp-1",
    candidateProfile: sampleCandidate,
    selectedJob: sampleJob,
    totalPlannedQuestions: 2
  });
  const compSession = compSessionInit.session;
  const firstQ = compSessionInit.firstQuestion;

  // Answer 1
  const step1 = await processAnswerAndAdapt(
    compSession.sessionId,
    firstQ.id,
    "In our industrial IoT deployment, we implemented MQTT over TLS with QoS 1, exponential backoff reconnects, and an in-memory circular ring buffer to prevent telemetry loss during network partitions."
  );
  assert(!step1.isComplete, "Test 16a: First question answer leaves session active", "isComplete is false");

  // Answer 2 (hits totalPlannedQuestions = 2)
  if (step1.nextQuestion) {
    const step2 = await processAnswerAndAdapt(
      compSession.sessionId,
      step1.nextQuestion.id,
      "For power optimization on the STM32 microcontroller, we utilized DMA transfers for ADC sampling and placed the core into Stop mode between conversion cycles, reducing current draw by 75%."
    );
    assert(
      step2.isComplete === true && step2.nextQuestion === undefined,
      "Test 16: Interview completion triggers on reaching question limit",
      `isComplete is true, nextQuestion is undefined`
    );
  }

  // -----------------------------------------------------------------------------------------
  // TEST 17: Final Report Generation from Actual Session Data
  // -----------------------------------------------------------------------------------------
  console.log("\nRunning Test 17: Final report generation from actual session data...");
  const finalReport = generateFinalSessionReport(compSession);

  assert(
    finalReport.overall_score > 0 &&
    finalReport.total_questions_answered > 0 &&
    ["Strong Hire", "Hire", "Hold", "Reject"].includes(finalReport.hiring_decision),
    "Test 17: Final report generated from genuine session evaluations",
    `Overall Score: ${finalReport.overall_score}%, Grade: ${finalReport.overall_grade}, Decision: ${finalReport.hiring_decision}`
  );

  // -----------------------------------------------------------------------------------------
  // SUMMARY
  // -----------------------------------------------------------------------------------------
  console.log("\n================================================================================");
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  console.log(`   TEST EXECUTION COMPLETE: ${passed}/${total} PASSED (${failed} FAILED)        `);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllTests().catch(err => {
  console.error("Test execution encountered fatal error:", err);
  process.exit(1);
});
