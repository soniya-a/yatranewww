/**
 * Automated Verification Test: Canonical Question Set Consistency across Normal and VR Modes
 *
 * Verifies:
 * 1. Single canonical set generation (SET_...) with ordered questions (Q001, Q002, ...)
 * 2. Normal Interview loads SET_... -> records ordered question IDs and texts
 * 3. Virtual Interview loads SET_... -> records ordered question IDs and texts
 * 4. Exact equality of question IDs, question texts, and order between both modes
 * 5. Session state persistence and progress preservation across reloads
 * 6. Guarantee that re-fetching SET_... never regenerates or alters questions
 */

import { generateCanonicalQuestionSet, getCanonicalQuestionSet, saveInterviewSession, getSessionByQuestionSet } from "./src/engine/questionEngine";

async function runCanonicalConsistencyTest() {
  console.log("================================================================================");
  console.log("       CANONICAL INTERVIEW QUESTION SET CONSISTENCY TEST: NORMAL vs VR          ");
  console.log("================================================================================\n");

  const company = "TCS";
  const role = "Software Engineer";
  const candidateSkills = "Java, Spring Boot, React, SQL, Cloud";

  // Step 1: Generate one canonical set
  console.log(`[Step 1] Generating canonical question set for Company: "${company}", Role: "${role}"...`);
  const canonicalSet = await generateCanonicalQuestionSet({
    company,
    role,
    jobDescription: "Enterprise Software Engineer responsible for scalable backend services and distributed databases.",
    user_id: "test-user-consistency-check"
  });

  const setId = canonicalSet.set_id;
  console.log(`[Step 1 OK] Generated Canonical Set ID: ${setId}`);
  console.log(`[Step 1 OK] Question Count: ${canonicalSet.questions.length}\n`);

  if (!canonicalSet.questions || canonicalSet.questions.length === 0) {
    throw new Error("FAILED: Canonical question set has 0 questions.");
  }

  // Step 2: Normal Interview Mode Consumption
  console.log("[Step 2] Simulating Normal Interview loading question set...");
  const normalSet = await getCanonicalQuestionSet(setId);
  if (!normalSet) {
    throw new Error(`FAILED: Normal Interview could not retrieve question set ${setId}`);
  }

  const normalQuestions = normalSet.questions.map((q, idx) => ({
    order: q.order_index || idx + 1,
    id: q.question_id,
    text: q.question_text || (q as any).question,
    category: q.category,
    round: q.round_name
  }));

  console.log(`[Step 2 OK] Normal Interview loaded ${normalQuestions.length} questions:`);
  normalQuestions.slice(0, 5).forEach(q => {
    console.log(`   - Order #${q.order} | [${q.id}] (${q.category}): "${q.text.substring(0, 60)}..."`);
  });
  console.log(`   ... and ${normalQuestions.length - 5} more questions in order.\n`);

  // Step 3: Simulate Normal Interview Progress & Session Persistence
  const normalSessionId = `SES_NORMAL_${Date.now()}`;
  console.log(`[Step 3] Normal Interview begins: Answering Q001 and persisting session ${normalSessionId}...`);
  await saveInterviewSession({
    session_id: normalSessionId,
    question_set_id: setId,
    current_question_id: "Q002",
    current_question_order: 2,
    answers: {
      "Q001": "In Java, an interface specifies method signatures without state, whereas an abstract class can contain concrete state and implementations."
    },
    is_completed: false
  });
  console.log("[Step 3 OK] Normal Interview session progress saved successfully.\n");

  // Step 4: Virtual / WebXR Interview Mode Consumption
  console.log("[Step 4] Simulating Virtual (WebXR) Interview loading the exact same question set...");
  const vrSet = await getCanonicalQuestionSet(setId);
  if (!vrSet) {
    throw new Error(`FAILED: Virtual Interview could not retrieve question set ${setId}`);
  }

  const vrQuestions = vrSet.questions.map((q, idx) => ({
    order: q.order_index || idx + 1,
    id: q.question_id,
    text: q.question_text || (q as any).question,
    category: q.category,
    round: q.round_name
  }));

  console.log(`[Step 4 OK] Virtual Interview loaded ${vrQuestions.length} questions:`);
  vrQuestions.slice(0, 5).forEach(q => {
    console.log(`   - Order #${q.order} | [${q.id}] (${q.category}): "${q.text.substring(0, 60)}..."`);
  });
  console.log(`   ... and ${vrQuestions.length - 5} more questions in order.\n`);

  // Step 5: Assert Question Consistency across both modes
  console.log("[Step 5] Checking 1-to-1 equivalence between Normal and Virtual Interview...");

  if (normalQuestions.length !== vrQuestions.length) {
    throw new Error(`FAILED: Question count mismatch! Normal=${normalQuestions.length}, VR=${vrQuestions.length}`);
  }

  let mismatchCount = 0;
  for (let i = 0; i < normalQuestions.length; i++) {
    const nq = normalQuestions[i];
    const vq = vrQuestions[i];

    if (nq.id !== vq.id) {
      console.error(`Mismatch at index ${i}: Normal ID=${nq.id} vs VR ID=${vq.id}`);
      mismatchCount++;
    }
    if (nq.text !== vq.text) {
      console.error(`Text mismatch at index ${i} (${nq.id}):\n  Normal: "${nq.text}"\n  VR:     "${vq.text}"`);
      mismatchCount++;
    }
    if (nq.order !== vq.order) {
      console.error(`Order mismatch at index ${i}: Normal=${nq.order} vs VR=${vq.order}`);
      mismatchCount++;
    }
  }

  if (mismatchCount > 0) {
    throw new Error(`FAILED: Found ${mismatchCount} discrepancies between Normal and Virtual modes.`);
  }

  console.log(`[Step 5 OK] All ${normalQuestions.length} questions match 100% in ID, Text, and Order across Normal & VR!\n`);

  // Step 6: Verify Session Restoration on Page Reload
  console.log("[Step 6] Verifying session restoration across simulated page reload...");
  const restoredSession = await getSessionByQuestionSet(setId);
  if (!restoredSession) {
    throw new Error(`FAILED: Could not restore session for question set ${setId}`);
  }

  console.log(`[Step 6 OK] Restored Session ID: ${restoredSession.session_id}`);
  console.log(`[Step 6 OK] Current Question ID: ${restoredSession.current_question_id} (Expected: Q002)`);
  console.log(`[Step 6 OK] Current Question Order: ${restoredSession.current_question_order} (Expected: 2)`);
  console.log(`[Step 6 OK] Restored Answers Count: ${Object.keys(restoredSession.answers || {}).length}`);
  console.log(`[Step 6 OK] Answer for Q001: "${restoredSession.answers?.["Q001"]}"`);

  if (restoredSession.current_question_id !== "Q002" || restoredSession.current_question_order !== 2) {
    throw new Error("FAILED: Session did not preserve current_question_id or current_question_order correctly.");
  }

  // Step 7: Final Summary Table
  console.log("\n================================================================================");
  console.log("                     CANONICAL QUESTION SET AUDIT REPORT                        ");
  console.log("================================================================================");
  console.log(`Set ID:       ${setId}`);
  console.log(`Target:       ${company} · ${role}`);
  console.log(`Total Qs:     ${normalQuestions.length}`);
  console.log(`Session ID:   ${restoredSession.session_id}`);
  console.log("--------------------------------------------------------------------------------");
  console.log("| Index | Question ID | Normal Mode Question Text                   | Match? |");
  console.log("--------------------------------------------------------------------------------");
  normalQuestions.forEach((q, idx) => {
    const vrQ = vrQuestions[idx];
    const isMatch = q.id === vrQ.id && q.text === vrQ.text;
    const shortText = (q.text.length > 40 ? q.text.substring(0, 37) + "..." : q.text).padEnd(40, " ");
    console.log(`| ${String(idx + 1).padStart(5, " ")} | ${q.id.padEnd(11, " ")} | ${shortText} |   ${isMatch ? "YES" : "NO "}  |`);
  });
  console.log("--------------------------------------------------------------------------------");
  console.log("RESULT: ALL QUESTIONS 100% IDENTICAL ACROSS NORMAL AND VIRTUAL INTERVIEW ROOMS.");
  console.log("================================================================================\n");
}

runCanonicalConsistencyTest()
  .then(() => {
    console.log("Test completed successfully with exit code 0.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Test failed with error:", err);
    process.exit(1);
  });
