/**
 * Live HTTP Endpoints Consistency Test
 * Tests /api/interview/generate-canonical-set, /api/interview/question-set/:setId,
 * and /api/interview/session/save & by-set/:setId over HTTP on localhost:3000.
 */

async function runHttpConsistencyTest() {
  console.log("=== Testing Canonical Question Flow over HTTP (localhost:3000) ===");

  const baseUrl = "http://localhost:3000";

  // 1. Generate Canonical Set via HTTP POST
  console.log("1. Generating canonical set via POST /api/interview/generate-canonical-set...");
  const genRes = await fetch(`${baseUrl}/api/interview/generate-canonical-set`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      company: "TCS",
      role: "Software Engineer",
      candidateSkills: "Java, Spring Boot, MySQL"
    })
  });

  if (!genRes.ok) {
    throw new Error(`Failed to generate canonical set: HTTP ${genRes.status}`);
  }

  const generated = await genRes.json();
  const setId = generated.set_id;
  console.log(`-> Received set_id: ${setId} with ${generated.questions.length} questions`);

  // 2. Normal Interview: Fetch via GET /api/interview/question-set/:setId
  console.log(`2. Normal Interview loads: GET /api/interview/question-set/${setId}...`);
  const normalRes = await fetch(`${baseUrl}/api/interview/question-set/${setId}`);
  if (!normalRes.ok) throw new Error(`Normal fetch failed: HTTP ${normalRes.status}`);
  const normalData = await normalRes.json();
  const normalQuestions = normalData.questions.map((q: any) => ({
    id: q.question_id,
    order: q.order_index,
    text: q.question_text || q.question
  }));

  // 3. Normal Interview answers Q001 and saves session
  console.log("3. Normal Interview answers Q001 and saves progress...");
  const sessId = `SES_HTTP_${Date.now()}`;
  const saveRes = await fetch(`${baseUrl}/api/interview/session/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessId,
      question_set_id: setId,
      current_question_id: "Q002",
      current_question_order: 2,
      answers: { Q001: "Normal interview test answer" },
      is_completed: false
    })
  });
  if (!saveRes.ok) throw new Error(`Session save failed: HTTP ${saveRes.status}`);

  // 4. Virtual (WebXR) Interview: Fetch via GET /api/interview/question-set/:setId
  console.log(`4. Virtual (WebXR) Interview loads: GET /api/interview/question-set/${setId}...`);
  const vrRes = await fetch(`${baseUrl}/api/interview/question-set/${setId}`);
  if (!vrRes.ok) throw new Error(`VR fetch failed: HTTP ${vrRes.status}`);
  const vrData = await vrRes.json();
  const vrQuestions = vrData.questions.map((q: any) => ({
    id: q.question_id,
    order: q.order_index,
    text: q.question_text || q.question
  }));

  // 5. Virtual Interview restores session
  console.log(`5. Virtual Interview checks session: GET /api/interview/session/by-set/${setId}...`);
  const getSessRes = await fetch(`${baseUrl}/api/interview/session/by-set/${setId}`);
  if (!getSessRes.ok) throw new Error(`Session fetch failed: HTTP ${getSessRes.status}`);
  const restoredSession = await getSessRes.json();

  // 6. Assertions
  console.log("6. Verifying strict 1-to-1 question equality...");
  if (normalQuestions.length !== vrQuestions.length) {
    throw new Error(`Length mismatch: ${normalQuestions.length} vs ${vrQuestions.length}`);
  }

  for (let i = 0; i < normalQuestions.length; i++) {
    const n = normalQuestions[i];
    const v = vrQuestions[i];
    if (n.id !== v.id || n.text !== v.text || n.order !== v.order) {
      throw new Error(`Mismatch at index ${i}: Normal (${n.id}) vs VR (${v.id})`);
    }
  }

  if (restoredSession.current_question_id !== "Q002" || restoredSession.current_question_order !== 2) {
    throw new Error(`Session state incorrect: ${JSON.stringify(restoredSession)}`);
  }

  console.log(`-> SUCCESS! Both Normal and VR modes consumed identical question IDs and texts in order.`);
  console.log(`-> Restored session verified: current_question_id = ${restoredSession.current_question_id}`);
}

runHttpConsistencyTest()
  .then(() => {
    console.log("HTTP consistency test passed successfully.");
    process.exit(0);
  })
  .catch(err => {
    console.error("HTTP consistency test failed:", err);
    process.exit(1);
  });
