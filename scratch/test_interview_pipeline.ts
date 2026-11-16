async function main() {
  console.log('--- Phase 4 Interview Pipeline Verification ---');

  // 1. Generate Canonical Question Set
  console.log('\n1. Testing POST /api/interview/generate-canonical-set');
  const genRes = await fetch('http://localhost:3000/api/interview/generate-canonical-set', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      company: 'Tech Mahindra',
      role: 'AI/ML Software Engineer',
      candidateSkills: 'Python, PyTorch, LLMs, NLP, PostgreSQL, React.js',
      user_id: 'test-user-001'
    })
  });

  const genData = await genRes.json();
  console.log('Generate status:', genRes.status);
  console.log('Set ID:', genData.set_id);
  console.log('Company:', genData.company);
  console.log('Role:', genData.role);
  console.log('Provider:', genData.provider);
  console.log('Questions count:', genData.questions?.length);
  if (genData.questions && genData.questions.length > 0) {
    console.log('First 3 questions:');
    genData.questions.slice(0, 3).forEach((q: any, i: number) => {
      console.log(`  [${i + 1}] (${q.round || q.round_name}) ${q.question_text || q.question}`);
    });
  }

  const setId = genData.set_id;
  if (!setId) {
    console.error('FAILED: No set_id returned');
    return;
  }

  // 2. Retrieve Canonical Question Set by ID
  console.log(`\n2. Testing GET /api/interview/question-set/${setId}`);
  const getRes = await fetch(`http://localhost:3000/api/interview/question-set/${setId}`);
  const getData = await getRes.json();
  console.log('Retrieve status:', getRes.status);
  console.log('Retrieved questions match:', getData.questions?.length === genData.questions?.length);

  // 3. Score an answer via POST /api/interview/answer/score
  console.log('\n3. Testing POST /api/interview/answer/score');
  const activeQ = genData.questions[0];
  const payload = { user_id: 'guest-user-123' };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mockToken = `header.${payloadB64}.signature`;

  const scoreRes = await fetch('http://localhost:3000/api/interview/answer/score', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${mockToken}`
    },
    body: JSON.stringify({
      company: 'Tech Mahindra',
      role: 'AI/ML Software Engineer',
      round: activeQ.round || 'Technical Round',
      question: activeQ.question_text || activeQ.question,
      answer: 'I have hands-on experience building AI pipelines with Python, PostgreSQL, and LLM APIs for automated resume analysis and real-time inference.'
    })
  });

  const scoreData = await scoreRes.json();
  console.log('Score status:', scoreRes.status);
  console.log('Score response:', scoreData);

  // 4. Save interview session progress
  console.log('\n4. Testing POST /api/interview/session/save');
  const sessId = `SES_TEST_${Date.now()}`;
  const saveRes = await fetch('http://localhost:3000/api/interview/session/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessId,
      question_set_id: setId,
      current_question_id: activeQ.question_id || 'Q001',
      current_question_order: 1,
      answers: {
        [activeQ.question_id || 'Q001']: 'I have hands-on experience building AI pipelines...'
      },
      is_completed: false
    })
  });
  const saveData = await saveRes.json();
  console.log('Save session status:', saveRes.status);
  console.log('Save result:', saveData);

  // 5. Retrieve interview session by set ID
  console.log(`\n5. Testing GET /api/interview/session/by-set/${setId}`);
  const sessBySetRes = await fetch(`http://localhost:3000/api/interview/session/by-set/${setId}`);
  const sessBySetData = await sessBySetRes.json();
  console.log('Session by set status:', sessBySetRes.status);
  console.log('Retrieved session ID:', sessBySetData?.session_id);
  console.log('Answers stored:', Object.keys(sessBySetData?.answers || {}).length);
}

main().catch(err => {
  console.error('Pipeline test error:', err);
  process.exit(1);
});
