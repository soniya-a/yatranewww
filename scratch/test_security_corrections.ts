import fs from 'fs';
import path from 'path';
import { supabase, clearUserSessionData } from '../src/lib/supabase';
import { getAssessmentReport } from '../src/engine/assessmentEngine';

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

async function runSecurityCorrectionsVerification() {
  console.log('\n================================================================');
  console.log('  YATRA: AUTHENTICATION SECURITY CORRECTION VERIFICATION SUITE  ');
  console.log('================================================================\n');

  // ── TEST 1: Source Code Audit — No Hardcoded Credentials in Login.tsx ───────────
  console.log('[Phase 1] Login.tsx Credential Hardcoding Audit');
  const projectRoot = process.cwd();
  const loginSrc = fs.readFileSync(path.resolve(projectRoot, 'src/pages/Login.tsx'), 'utf-8');

  assert(!loginSrc.includes('soniya@yatra.ai'), 'Login.tsx contains NO default soniya@yatra.ai');
  assert(!loginSrc.includes('WelcomeYatra2026!'), 'Login.tsx contains NO WelcomeYatra2026! fallback');
  assert(!loginSrc.includes('••••••••'), 'Login.tsx contains NO bullet placeholder password fallback');
  assert(loginSrc.includes('const [emailOrUser, setEmailOrUser] = useState("");'), 'emailOrUser initialized to empty string');
  assert(loginSrc.includes('const [password, setPassword] = useState("");'), 'password initialized to empty string');
  assert(loginSrc.includes('Please enter your email address.'), 'Validates empty email before submission');
  assert(loginSrc.includes('Please enter your password.'), 'Validates empty password before submission');
  assert(loginSrc.includes('Password must be at least 6 characters long.'), 'Validates min password length on signup');

  // ── TEST 2: Source Code Audit — No Fake Tokens in App.tsx ───────────────────────
  console.log('\n[Phase 2] App.tsx Guest Token & Session Audit');
  const appSrc = fs.readFileSync(path.resolve(projectRoot, 'src/App.tsx'), 'utf-8');

  assert(!appSrc.includes('header.${payloadB64}.signature'), 'App.tsx contains NO fabricated header.payload.signature tokens');
  assert(!appSrc.includes('soniya@yatra.ai'), 'App.tsx contains NO hardcoded soniya@yatra.ai fallbacks');
  assert(!appSrc.includes('jsoniyasonu0410@gmail.com'), 'App.tsx contains NO hardcoded gmail inputs');
  assert(appSrc.includes('const [user, setUser] = useState<AppUser | null>(null);'), 'user state initializes strictly to null (no auto-guest login)');
  assert(appSrc.includes('signInAnonymously()'), 'Guest authentication delegates to official supabase.auth.signInAnonymously()');
  assert(appSrc.includes('Guest/Anonymous authentication is not enabled'), 'Displays clean notification if anonymous auth is disabled on Supabase');

  // ── TEST 3: User Session Cache Purge Functionality ──────────────────────────────
  console.log('\n[Phase 3] Logout & Account Switching Cache Purge');
  const mockStorage: Record<string, string> = {
    'guest_session': 'true',
    'guest_uid': 'guest-test-123',
    'yatra_candidate_profile': '{"name":"User A"}',
    'yatra_parse_result': '{"skills":["Python"]}',
    'roadmaps_user_123': '[{"id":"rm-1"}]',
    'interviews_user_123': '[{"id":"int-1"}]',
    'unrelated_global_setting': 'dark_mode'
  };

  // Mock localStorage for node test
  (globalThis as any).localStorage = {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, val: string) => { mockStorage[key] = val; },
    removeItem: (key: string) => { delete mockStorage[key]; },
    key: (index: number) => Object.keys(mockStorage)[index] || null,
    get length() { return Object.keys(mockStorage).length; }
  };
  (globalThis as any).window = { localStorage: (globalThis as any).localStorage };

  clearUserSessionData();

  assert(!mockStorage['guest_session'], 'clearUserSessionData removed guest_session');
  assert(!mockStorage['guest_uid'], 'clearUserSessionData removed guest_uid');
  assert(!mockStorage['yatra_candidate_profile'], 'clearUserSessionData removed cached candidate profile');
  assert(!mockStorage['yatra_parse_result'], 'clearUserSessionData removed cached resume parse');
  assert(!mockStorage['roadmaps_user_123'], 'clearUserSessionData removed user-specific roadmaps_*');
  assert(!mockStorage['interviews_user_123'], 'clearUserSessionData removed user-specific interviews_*');

  // ── TEST 4: Cross-User Data Isolation Verification ──────────────────────────────
  console.log('\n[Phase 4] Cross-User Data Isolation');
  const { saveInterviewSession, getInterviewSession } = await import('../src/engine/questionEngine');
  await saveInterviewSession({
    session_id: 'SES_ISOLATION_AAA',
    candidate_id: 'user_uuid_AAA_111',
    user_id: 'user_uuid_AAA_111',
    company: 'Amazon',
    role: 'SDE-1',
    round: 'Technical DSA',
    status: 'in_progress',
    created_at: new Date().toISOString()
  } as any, { requesterUid: 'user_uuid_AAA_111' });

  let ownerCanAccess = false;
  try {
    const res = await getInterviewSession('SES_ISOLATION_AAA', { requesterUid: 'user_uuid_AAA_111' });
    if (res && res.session_id === 'SES_ISOLATION_AAA') {
      ownerCanAccess = true;
    }
  } catch (err: any) {
    console.error('Owner error:', err.message);
  }
  assert(ownerCanAccess, 'Owner user_uuid_AAA_111 can read their session');

  let otherBlocked = false;
  try {
    await getInterviewSession('SES_ISOLATION_AAA', { requesterUid: 'user_uuid_BBB_222' });
  } catch (err: any) {
    if (err.message.includes('FORBIDDEN') || err.message.includes('permission')) {
      otherBlocked = true;
    }
  }
  assert(otherBlocked, 'Different user user_uuid_BBB_222 is strictly BLOCKED with FORBIDDEN exception');

  // ── TEST 5: Live / Network Database Connection Status ───────────────────────────
  console.log('\n[Phase 5] Supabase Auth API & Live Network Connectivity Check');
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'security_audit_test_nonexistent@yatra.ai',
      password: 'WrongPassword123!'
    });

    if (error) {
      if (error.message.includes('fetch failed') || (error as any).cause?.code === 'ENOTFOUND') {
        console.log('  [NOTICE] Live Supabase network call: fetch failed (Offline / Sandboxed environment).');
        console.log('           Live API rejection test skipped gracefully per user rule:');
        console.log('           "Do not mark live security tests PASS if the database connection is unavailable."');
      } else {
        assert(
          error.message.includes('Invalid login credentials') || error.message.includes('credentials'),
          'Live Supabase rejected invalid password with official authentication error',
          error.message
        );
      }
    } else {
      console.error('  [FAIL] Unexpected success with invalid credentials');
      failed++;
    }
  } catch (netErr: any) {
    console.log(`  [NOTICE] Network request status: ${netErr?.message || netErr}`);
  }

  // ── TEST 6: Codebase Switch-Case Warning Fix Verification ───────────────────────
  console.log('\n[Phase 6] Build Warning Audit');
  const assessmentEngineSrc = fs.readFileSync(path.resolve(projectRoot, 'src/engine/assessmentEngine.ts'), 'utf-8');
  const dsaMatches = assessmentEngineSrc.match(/case 'Technical DSA':/g) || [];
  assert(dsaMatches.length === 1, `assessmentEngine.ts has exactly 1 Technical DSA case (found ${dsaMatches.length})`);

  console.log('\n================================================================');
  console.log(`  VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityCorrectionsVerification();
