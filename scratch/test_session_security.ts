import {
  saveInterviewSession,
  getInterviewSession,
  getSessionByQuestionSet
} from '../src/engine/questionEngine';

async function runSessionSecurityAudit() {
  console.log('================================================================');
  console.log('🔒 YATRA ZERO-TRUST SESSION SECURITY AUDIT');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, desc: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`✅ PASS [Test ${totalTests}]: ${desc}`);
    } else {
      console.error(`❌ FAIL [Test ${totalTests}]: ${desc}`);
      throw new Error(`Test failed: ${desc}`);
    }
  }

  const questionSetId = `test_set_sec_${Date.now()}`;

  // ── TEST 1: Authenticated User A creates session ───────────────────────────
  console.log('--- TEST GROUP 1: AUTHENTICATED USER SESSIONS ---');
  const userA_Uid = 'auth_usr_candidate_alice_101';
  const userB_Uid = 'auth_usr_candidate_bob_202';

  const userASession = await saveInterviewSession(
    {
      question_set_id: questionSetId,
      user_id: userA_Uid,
      current_question_id: 'Q001',
      answers: { '0_0': 'My solution uses a HashMap with doubly linked list' }
    },
    { requesterUid: userA_Uid }
  );

  assert(userASession.user_id === userA_Uid, 'User A session saved with correct authenticated user_id');
  assert(Boolean(userASession.session_id), 'User A session has valid session_id');

  // ── TEST 2: User B tries to read User A's session -> MUST BE DENIED (403) ───
  let userBDenied = false;
  try {
    await getInterviewSession(userASession.session_id, { requesterUid: userB_Uid });
  } catch (e: any) {
    if (e.message && e.message.startsWith('FORBIDDEN')) {
      userBDenied = true;
    }
  }
  assert(userBDenied, "Cross-user read denial: User B cannot read User A's session (FORBIDDEN 403)");

  // ── TEST 3: Unauthenticated caller tries to read User A's session -> MUST BE DENIED (403)
  let unauthDenied = false;
  try {
    await getInterviewSession(userASession.session_id, {});
  } catch (e: any) {
    if (e.message && e.message.startsWith('FORBIDDEN')) {
      unauthDenied = true;
    }
  }
  assert(unauthDenied, "Zero-trust enforcement: Unauthenticated caller cannot read User A's session");

  // ── TEST 4: User B tries to overwrite/modify User A's session -> MUST BE DENIED (403)
  let userBWriteDenied = false;
  try {
    await saveInterviewSession(
      {
        session_id: userASession.session_id,
        question_set_id: questionSetId,
        answers: { '0_0': 'Hacked answer by Bob' }
      },
      { requesterUid: userB_Uid }
    );
  } catch (e: any) {
    if (e.message && e.message.startsWith('FORBIDDEN')) {
      userBWriteDenied = true;
    }
  }
  assert(userBWriteDenied, "Cross-user write denial: User B cannot modify User A's session (FORBIDDEN 403)");

  // ── TEST 5: User A can read and update their own session ─────────────────────
  const userARead = await getInterviewSession(userASession.session_id, { requesterUid: userA_Uid });
  assert(userARead !== null && userARead.user_id === userA_Uid, "User A can read their own session");

  const userAUpdate = await saveInterviewSession(
    {
      session_id: userASession.session_id,
      question_set_id: questionSetId,
      current_question_id: 'Q002',
      answers: { '0_0': 'Updated legitimate answer by Alice' }
    },
    { requesterUid: userA_Uid }
  );
  assert(userAUpdate.answers['0_0'] === 'Updated legitimate answer by Alice', "User A successfully updated their own session");

  // ── TEST GROUP 2: GUEST CANDIDATE SESSION TOKENS ──────────────────────────
  console.log('\n--- TEST GROUP 2: GUEST CANDIDATE HIGH-ENTROPY SESSIONS ---');
  const guestQuestionSetId = `test_guest_set_${Date.now()}`;

  // ── TEST 6: Guest 1 initializes a new session
  const guest1Session = await saveInterviewSession(
    {
      question_set_id: guestQuestionSetId,
      user_id: 'guest',
      current_question_id: 'Q001',
      answers: { '0_0': 'Guest initial answer' }
    }
  );

  const guest1Token = guest1Session.session_token;
  assert(Boolean(guest1Token && guest1Token.length === 64), 'Server generated 64-char high-entropy session_token for guest');

  // ── TEST 7: Guest 2 tries to read Guest 1 session without token -> MUST BE DENIED (403)
  let guestNoTokenDenied = false;
  try {
    await getInterviewSession(guest1Session.session_id, {});
  } catch (e: any) {
    if (e.message && e.message.startsWith('FORBIDDEN')) {
      guestNoTokenDenied = true;
    }
  }
  assert(guestNoTokenDenied, 'Zero-trust guest protection: Caller without token denied access to guest session');

  // ── TEST 8: Guest 2 tries to read Guest 1 session with wrong token -> MUST BE DENIED (403)
  let guestWrongTokenDenied = false;
  try {
    await getInterviewSession(guest1Session.session_id, { sessionToken: 'invalid_malicious_token_1234567890' });
  } catch (e: any) {
    if (e.message && e.message.startsWith('FORBIDDEN')) {
      guestWrongTokenDenied = true;
    }
  }
  assert(guestWrongTokenDenied, 'Guest isolation: Caller with forged token denied access to guest session');

  // ── TEST 9: Guest 1 with correct token succeeds ─────────────────────────────
  const guest1ValidRead = await getInterviewSession(guest1Session.session_id, { sessionToken: guest1Token });
  assert(guest1ValidRead !== null && guest1ValidRead.id === guest1Session.session_id, 'Guest 1 successfully retrieved their session using valid sessionToken');

  // ── TEST 10: Guest 1 updates session using valid token ─────────────────────
  const guest1Updated = await saveInterviewSession(
    {
      session_id: guest1Session.session_id,
      question_set_id: guestQuestionSetId,
      session_token: guest1Token,
      answers: { '0_0': 'Guest 1 refined answer' }
    },
    { sessionToken: guest1Token }
  );
  assert(guest1Updated.answers['0_0'] === 'Guest 1 refined answer', 'Guest 1 successfully updated their session with valid token');

  // ── TEST 11: getSessionByQuestionSet isolation ────────────────────────────
  console.log('\n--- TEST GROUP 3: BY-SET LOOKUP CREDENTIAL ISOLATION ---');
  // An attacker with no token should not retrieve guest 1's session
  const leakAttempt = await getSessionByQuestionSet(guestQuestionSetId, {});
  assert(leakAttempt === null, 'getSessionByQuestionSet returns null when no matching credentials are provided (no leakage)');

  // Guest 1 with valid token retrieves their session
  const validBySet = await getSessionByQuestionSet(guestQuestionSetId, { sessionToken: guest1Token });
  assert(validBySet !== null && validBySet.id === guest1Session.session_id, 'getSessionByQuestionSet retrieves guest session with matching token');

  // User B cannot retrieve User A's session by-set
  const userBBySet = await getSessionByQuestionSet(questionSetId, { requesterUid: userB_Uid });
  assert(userBBySet === null, 'getSessionByQuestionSet does not return User A session to User B');

  // User A retrieves their own session by-set
  const userABySet = await getSessionByQuestionSet(questionSetId, { requesterUid: userA_Uid });
  assert(userABySet !== null && userABySet.id === userASession.session_id, 'getSessionByQuestionSet returns session to legitimate authenticated user');

  console.log('\n================================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} ZERO-TRUST SECURITY TESTS PASSED!`);
  console.log('================================================================');
}

runSessionSecurityAudit().catch(err => {
  console.error('Fatal security audit failure:', err);
  process.exit(1);
});

