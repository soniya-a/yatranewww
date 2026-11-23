import {
  GEMINI_PRIMARY_MODEL,
  GEMINI_LIVE_AUDIO_MODEL,
  executeGeminiWithRetry,
  isGeminiPermanentError,
  isGeminiTransientError,
  checkIsQuotaError,
  tripGeminiCircuitBreaker,
  resetGeminiCircuitBreaker,
  isGeminiCircuitBreakerActive
} from '../src/lib/geminiConfig';
import { generateCanonicalQuestionSet, getCanonicalQuestionSet } from '../src/engine/questionEngine';

async function runTests() {
  console.log('=== TEST 1: Model Constants Verification ===');
  console.log('GEMINI_PRIMARY_MODEL:', GEMINI_PRIMARY_MODEL);
  console.log('GEMINI_LIVE_AUDIO_MODEL:', GEMINI_LIVE_AUDIO_MODEL);
  if (GEMINI_PRIMARY_MODEL !== 'gemini-3.6-flash') {
    throw new Error(`Expected gemini-3.6-flash, got ${GEMINI_PRIMARY_MODEL}`);
  }
  console.log('✔ Test 1 PASSED: Primary model verified as gemini-3.6-flash.\n');

  console.log('=== TEST 2: Error Classification Verification ===');
  const err404 = { status: 404, message: 'models/gemini-3.8-flash is not found for API version v1alpha' };
  const err503 = { status: 503, message: 'The model is overloaded. Please try again later.' };
  const err429 = { status: 429, message: 'Resource has been exhausted (e.g. check quota).' };
  const errRandom = { status: 500, message: 'Internal Server Error' };

  console.log('404 isPermanent:', isGeminiPermanentError(err404), '(expected: true)');
  console.log('404 isTransient:', isGeminiTransientError(err404), '(expected: false)');
  console.log('503 isPermanent:', isGeminiPermanentError(err503), '(expected: false)');
  console.log('503 isTransient:', isGeminiTransientError(err503), '(expected: true)');
  console.log('429 isPermanent:', isGeminiPermanentError(err429), '(expected: false)');
  console.log('429 isTransient:', isGeminiTransientError(err429), '(expected: true)');

  if (!isGeminiPermanentError(err404) || isGeminiTransientError(err404)) {
    throw new Error('404 classification failed');
  }
  if (isGeminiPermanentError(err503) || !isGeminiTransientError(err503)) {
    throw new Error('503 classification failed');
  }
  if (isGeminiPermanentError(err429) || !isGeminiTransientError(err429)) {
    throw new Error('429 classification failed');
  }
  console.log('✔ Test 2 PASSED: Error classifications verified.\n');

  console.log('=== TEST 3: Fail-Fast on Permanent 404 Error (No Retries) ===');
  let calls404 = 0;
  try {
    await executeGeminiWithRetry(async () => {
      calls404++;
      throw err404;
    }, { maxRetries: 3, initialDelayMs: 50 });
    throw new Error('Expected 404 call to throw');
  } catch (e: any) {
    console.log(`404 call count: ${calls404} (expected: 1 - fail immediately)`);
    if (calls404 !== 1) {
      throw new Error(`Failed to fail-fast on 404. Made ${calls404} calls.`);
    }
  }
  console.log('✔ Test 3 PASSED: Permanent errors fail fast with zero retries.\n');

  console.log('=== TEST 4: Exponential Backoff & Retry on 503 Service Unavailable ===');
  let calls503 = 0;
  const retryResult = await executeGeminiWithRetry(async () => {
    calls503++;
    if (calls503 < 3) {
      throw err503;
    }
    return { success: true, attempts: calls503 };
  }, { maxRetries: 3, initialDelayMs: 100, jitter: false });

  console.log('Retry result:', retryResult);
  if (calls503 !== 3 || !retryResult.success) {
    throw new Error(`Retry logic failed. Total attempts: ${calls503}`);
  }
  console.log('✔ Test 4 PASSED: Transient 503 errors retried with exponential backoff and succeeded.\n');

  console.log('=== TEST 5: Canonical Question Set Engine (Direct & VR Shared) ===');
  const canonicalSet = await generateCanonicalQuestionSet({
    company: 'Larsen & Toubro',
    role: 'Apprentice – B.Tech in Civil / M.Tech in Structural Engineering',
    candidateSkills: ['STAAD.Pro', 'AutoCAD Civil 3D', 'Structural Analysis', 'Concrete Design (IS 456)'],
    roundName: 'Technical Interview',
    user_id: 'test_user_789'
  });

  console.log('Canonical Set ID:', canonicalSet.set_id);
  console.log('Company:', canonicalSet.company);
  console.log('Role:', canonicalSet.role);
  console.log('Total Questions:', canonicalSet.questions.length);
  console.log('Sample Questions:');
  canonicalSet.questions.slice(0, 2).forEach((q, idx) => {
    console.log(`  [${idx + 1}] (${q.round}) ${q.question_text.substring(0, 100)}...`);
  });

  // Verify retrieval of canonical set by ID (used by both Normal and VR modes)
  const retrievedSet = await getCanonicalQuestionSet(canonicalSet.set_id);
  if (!retrievedSet || retrievedSet.set_id !== canonicalSet.set_id) {
    throw new Error('Canonical question set retrieval failed');
  }
  console.log('Retrieved question count identically:', retrievedSet.questions.length);
  console.log('✔ Test 5 PASSED: Canonical question set generated and shared for Direct & VR modes.\n');

  console.log('ALL TESTS COMPLETED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
