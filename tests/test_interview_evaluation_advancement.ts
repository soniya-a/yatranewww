import assert from "assert";
import fs from "fs";
import path from "path";
import { 
  createAdaptiveSession, 
  processAnswerAndAdapt, 
  sessionStore 
} from "../src/lib/interview/adaptiveInterviewEngine";

async function runTests() {
  console.log("=================================================================");
  console.log("RUNNING SUITE: INTERVIEW ANSWER SUBMISSION, EVALUATION & ADVANCEMENT");
  console.log("=================================================================\n");

  const commerceResume = `
    Dhanalakshmi D.
    Diploma in Commercial Practice, JSS Polytechnic for Women, Mysore
    Skills: Basic Computer Knowledge, English typing, English shorthand, Cost and Management Account, DTP, Tally ERP
    Internship: Subek Agarwal & Associates, Chartered Accounting
    Audit experience/entry at L&T
  `;

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 1: Role & Session Consistency for Commerce / Accounts Assistant
  // ─────────────────────────────────────────────────────────────────────────
  console.log("TEST 1: Verifying Candidate Profile & Target Role Consistency...");
  const candidateProfile = {
    id: "cand_dhana_1",
    fullName: "Dhanalakshmi D",
    name: "Dhanalakshmi D",
    domain: "commerce",
    skills: ["Tally ERP", "Cost and Management Account", "English shorthand", "English typing", "Basic Computer Knowledge"],
    targetRoles: ["Accounts Assistant"],
    experienceYears: 1,
    rawResumeText: commerceResume
  };

  const selectedJob = {
    id: "job_subek_1",
    title: "Accounts Assistant",
    company: "Subek Agarwal & Associates",
    description: "Handle Tally vouchers, ledger reconciliation, BRS, and statutory filing.",
    matchedSkills: ["Tally ERP", "Cost and Management Account"],
    missingSkills: []
  };

  const { session, firstQuestion } = await createAdaptiveSession({
    userId: "test-user-commerce",
    candidateProfile,
    candidateProfileId: candidateProfile.id,
    selectedJob,
    targetCompany: selectedJob.company,
    targetRole: selectedJob.title,
    mode: "STANDARD",
    totalPlannedQuestions: 5
  });

  assert.strictEqual(session.targetRole, "Accounts Assistant", "Target role must remain Accounts Assistant");
  assert.strictEqual(session.jobContext.company, "Subek Agarwal & Associates", "Company must be Subek Agarwal & Associates");
  assert.strictEqual(session.candidate.domain, "commerce", "Candidate domain must be commerce");
  assert(session.candidate.skills.includes("Tally ERP"), "Candidate skills must include Tally ERP");
  assert(firstQuestion.id, "First question must have an ID");
  assert.strictEqual(session.currentSequence, 1, "Initial sequence must be 1");
  assert.strictEqual(session.questions.length, 1, "Initial questions count must be 1");
  console.log("✓ TEST 1 PASSED: Role, company, and domain are preserved accurately without software engineer corruption.\n");

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 2: Successful Evaluation & Question Advancement (1/5 -> 2/5)
  // ─────────────────────────────────────────────────────────────────────────
  console.log("TEST 2: Verifying Submission, Answer Evaluation, and Question Advancement (1 -> 2)...");
  const q1Id = firstQuestion.id;
  const candAnswer1 = "In Tally ERP, I prepare bank reconciliation statements by comparing the company's cash book bank column with the bank passbook. I identify unpresented cheques, uncredited deposits, and enter adjusting journal vouchers for bank charges.";

  const result1 = await processAnswerAndAdapt(
    session.sessionId,
    q1Id,
    candAnswer1
  );

  assert.strictEqual(result1.evaluation.questionId, q1Id, "Evaluation must link to question 1 ID");
  assert.strictEqual(result1.session.answers[q1Id], candAnswer1, "Answer must be saved in session under question 1 ID");
  assert(result1.evaluation.score > 0, "Evaluation score must be positive");
  assert(result1.evaluation.strengths.length > 0, "Evaluation must identify strengths");
  assert(result1.evaluation.improvementFeedback.length > 0, "Evaluation must have improvement suggestions");
  assert(result1.nextQuestion, "Must generate next question");
  assert.strictEqual(result1.session.currentSequence, 2, "Sequence must advance from 1 to 2");
  assert.strictEqual(result1.session.questions.length, 2, "Questions list must contain 2 questions");
  assert.strictEqual(result1.isComplete, false, "Interview must not be marked complete after 1 of 5 questions");
  console.log(`✓ TEST 2 PASSED: Question 1 evaluated (Score: ${result1.evaluation.score}/10, Verdict: ${result1.evaluation.verdict}) and sequence advanced to ${result1.session.currentSequence}/5.\n`);

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 3: Duplicate Submission Idempotency Check
  // ─────────────────────────────────────────────────────────────────────────
  console.log("TEST 3: Verifying Duplicate Submission Idempotency...");
  const duplicateResult = await processAnswerAndAdapt(
    session.sessionId,
    q1Id,
    candAnswer1
  );

  assert.strictEqual(duplicateResult.session.currentSequence, 2, "Sequence must NOT advance again on duplicate submission");
  assert.strictEqual(duplicateResult.session.questions.length, 2, "Questions count must NOT increase on duplicate submission");
  assert.strictEqual(duplicateResult.evaluation.id, result1.evaluation.id, "Existing evaluation must be returned without re-evaluating");
  console.log("✓ TEST 3 PASSED: Resubmitting the same questionId is idempotent; sequence and questions remain stable.\n");

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 4: Gemini 429 Quota Exceeded Handling (Explicit Offline Labeling & Notice)
  // ─────────────────────────────────────────────────────────────────────────
  console.log("TEST 4: Verifying Gemini 429 Quota Exceeded Handling & Offline Labeling...");
  // Simulate Gemini client that throws a 429 RESOURCE_EXHAUSTED error
  const mockQuotaGemini: any = {
    models: {
      generateContent: async () => {
        const quotaErr: any = new Error("429 RESOURCE_EXHAUSTED: You have exceeded your quota.");
        quotaErr.status = 429;
        throw quotaErr;
      }
    }
  };

  const q2 = result1.nextQuestion!;
  const candAnswer2 = "During internal audits, I vouch physical invoices against day book entries, verify serial numbers, check GST computations, and confirm authorization signatures.";

  const result2 = await processAnswerAndAdapt(
    session.sessionId,
    q2.id,
    candAnswer2,
    mockQuotaGemini
  );

  assert.strictEqual(result2.evaluation.source, "OFFLINE_EVALUATION", "Source must be OFFLINE_EVALUATION");
  assert.strictEqual(result2.evaluation.evaluationMode, "OFFLINE", "Mode must be OFFLINE");
  assert.strictEqual(result2.evaluation.isQuotaExceeded, true, "isQuotaExceeded must be true");
  assert(result2.evaluation.notice?.includes("quota"), "Notice must clearly explain quota limitation");
  assert.strictEqual(result2.evaluation.notice, "AI evaluation temporarily unavailable due to API quota.");
  assert(!result2.evaluation.interviewerSpokenFeedback.includes("Solid technical explanation. Let's move forward."), 
    "Must NOT return generic fake praise when quota fails");
  assert(result2.evaluation.interviewerSpokenFeedback.includes("quota") || result2.evaluation.interviewerSpokenFeedback.includes("offline"),
    "Spoken feedback must transparently acknowledge quota or offline recording");
  assert.strictEqual(result2.session.currentSequence, 3, "Sequence must still advance cleanly to 3/5 in offline mode");
  console.log(`✓ TEST 4 PASSED: Quota 429 handled transparently:
     - Notice: "${result2.evaluation.notice}"
     - Source: "${result2.evaluation.source}"
     - Spoken Feedback: "${result2.evaluation.interviewerSpokenFeedback}"
     - Sequence advanced cleanly to ${result2.session.currentSequence}/5.\n`);

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 5: Session Persistence on Disk
  // ─────────────────────────────────────────────────────────────────────────
  console.log("TEST 5: Verifying Session Persistence on Disk...");
  const sessionDir = path.join(process.cwd(), ".interview_sessions");
  const sessionFile = path.join(sessionDir, `${session.sessionId}.json`);
  assert(fs.existsSync(sessionFile), `Session file must exist on disk at ${sessionFile}`);

  const diskData = JSON.parse(fs.readFileSync(sessionFile, "utf-8"));
  assert.strictEqual(diskData.sessionId, session.sessionId, "Disk session ID must match");
  assert.strictEqual(diskData.answers[q1Id], candAnswer1, "Question 1 answer must be saved to disk");
  assert.strictEqual(diskData.answers[q2.id], candAnswer2, "Question 2 answer must be saved to disk");
  assert(diskData.evaluations[q1Id], "Question 1 evaluation must be saved to disk");
  assert(diskData.evaluations[q2.id], "Question 2 evaluation must be saved to disk");
  assert.strictEqual(diskData.currentSequence, 3, "Disk session sequence must be 3");
  console.log("✓ TEST 5 PASSED: Session state, questions, answers, and evaluations persist reliably to filesystem.\n");

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 6: Resilient Resolution when questionId is missing in request
  // ─────────────────────────────────────────────────────────────────────────
  console.log("TEST 6: Verifying Resilient Resolution when questionId is missing...");
  const q3 = result2.nextQuestion!;
  const candAnswer3 = "To clear suspense account balances, I trace unposted entries, verify debit and credit ledger balances in the trial balance, and post correcting entries.";

  // Call without questionId (simulating previous bug where questionId was omitted)
  const result3 = await processAnswerAndAdapt(
    session.sessionId,
    "", // Empty questionId
    candAnswer3
  );

  assert.strictEqual(result3.evaluation.questionId, q3.id, "Engine must gracefully resolve to active question ID");
  assert.strictEqual(result3.session.answers[q3.id], candAnswer3, "Answer must be stored under resolved question ID");
  assert.strictEqual(result3.session.currentSequence, 4, "Sequence must advance from 3 to 4");
  console.log("✓ TEST 6 PASSED: Missing questionId resolves gracefully to current question without HTTP 400 rejection.\n");

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 7: Successful Gemini Evaluation (AI_EVALUATED with Rubric Metrics)
  // ─────────────────────────────────────────────────────────────────────────
  console.log("TEST 7: Verifying Successful Gemini AI Evaluation Output Contract...");
  const mockSuccessGemini: any = {
    models: {
      generateContent: async () => {
        return {
          text: JSON.stringify({
            score: 9,
            verdict: "Excellent",
            correctness: "Fully Correct",
            technicalDepth: "Deep",
            relevance: "Directly Relevant",
            clarity: "Clear and Structured",
            confidenceIndicators: "High",
            strengths: ["Flawless explanation of voucher workflow", "Accurate understanding of BRS timing differences"],
            weaknesses: ["Could briefly touch on ERP automation"],
            missingConcepts: ["ERP batch processing"],
            improvementFeedback: "Explore automated rule matching in enterprise ERP configurations.",
            recommendedDifficulty: "Advanced",
            followUpNeeded: false,
            interviewerSpokenFeedback: "Excellent breakdown of the accounting controls. Let's move to the next area."
          })
        };
      }
    }
  };

  const q4 = result3.nextQuestion!;
  const candAnswer4 = "In office administration, I take down board meeting proceedings in English shorthand at 100 wpm, transcribe them immediately into word documents with mail merge, and catalog all executive minutes.";

  const result4 = await processAnswerAndAdapt(
    session.sessionId,
    q4.id,
    candAnswer4,
    mockSuccessGemini
  );

  assert.strictEqual(result4.evaluation.source, "AI_EVALUATED", "Source must be AI_EVALUATED");
  assert.strictEqual(result4.evaluation.evaluationMode, "AI", "Mode must be AI");
  assert.strictEqual(result4.evaluation.score, 9, "Score must match Gemini evaluation");
  assert.strictEqual(result4.evaluation.verdict, "Excellent", "Verdict must match Gemini evaluation");
  assert.strictEqual(result4.evaluation.isQuotaExceeded, false, "isQuotaExceeded must be false");
  assert.strictEqual(result4.evaluation.strengths.length, 2, "Strengths must be parsed from AI response");
  assert.strictEqual(result4.evaluation.missingConcepts.length, 1, "Missing concepts must be parsed from AI response");
  assert.strictEqual(result4.session.currentSequence, 5, "Sequence must advance from 4 to 5");
  console.log(`✓ TEST 7 PASSED: Gemini AI evaluation succeeded:
     - Score: ${result4.evaluation.score}/10 (${result4.evaluation.verdict})
     - Source: ${result4.evaluation.source}
     - Strengths: ${result4.evaluation.strengths.join(", ")}
     - Sequence advanced to ${result4.session.currentSequence}/5.\n`);

  console.log("=================================================================");
  console.log("ALL 7 TESTS PASSED SUCCESSFULLY! 100% VERIFIED.");
  console.log("=================================================================");
}

runTests().catch(err => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});

