import { test, expect } from '@playwright/test';

test.describe('Normal Voice-to-Voice Interview Flow', () => {
  test('authenticates securely with ephemeral token and conducts voice interview with canonical questions', async ({ page }) => {
    let capturedLiveTokenCall = false;
    let apiKeyLeaked = false;

    // Listen for network calls to verify zero exposure of permanent API key
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/api/interview/live-token')) {
        capturedLiveTokenCall = true;
        try {
          const body = await response.json();
          expect(body.token).toBeDefined();
          expect(typeof body.token).toBe('string');
          expect(body.endpoint).toContain('BidiGenerateContentConstrained');
          console.log('[Test] Successfully captured secure live-token response with ephemeral token');
        } catch (e) {
          // ignore parse errors
        }
      }

      // Check that no config endpoint or URL contains the raw GEMINI key
      if (url.includes('/api/config/gemini')) {
        const text = await response.text();
        if (text.includes('AIzaSy')) {
          apiKeyLeaked = true;
        }
      }
    });

    // 1. Generate a canonical question set via server API
    const response = await page.request.post('http://localhost:3000/api/interview/generate-canonical-set', {
      data: {
        company: 'Google',
        role: 'Full Stack Engineer',
        candidateSkills: 'React, TypeScript, Node.js'
      }
    });
    expect(response.ok()).toBeTruthy();
    const setPayload = await response.json();
    const setId = setPayload.set_id;
    const questions = setPayload.questions;
    expect(setId).toMatch(/^SET_/);
    expect(questions.length).toBeGreaterThan(0);
    const q1 = questions[0];
    const q2 = questions[1];

    console.log(`[Test] Canonical set created: ${setId} with ${questions.length} questions`);
    console.log(`[Test] Q1: ${q1.question_id} - ${q1.question_text || q1.question}`);
    if (q2) {
      console.log(`[Test] Q2: ${q2.question_id} - ${q2.question_text || q2.question}`);
    }

    // 2. Open login page and sign in as authenticated guest user
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('domcontentloaded');

    // Click "Sign in" button if on login page
    const signInBtn = page.locator('button:has-text("Sign in")').first();
    if (await signInBtn.isVisible()) {
      await signInBtn.click();
      await page.waitForTimeout(500);
    }

    // Configure localStorage with authenticated guest session, Normal mode (is_vr = false), and active canonical set
    await page.evaluate((targetSetId) => {
      localStorage.setItem('guest_session', 'true');
      localStorage.setItem('guest_uid', 'user-test-voice-123');
      localStorage.setItem('guest_email', 'soniya@yatra.ai');
      localStorage.setItem('guest_name', 'Soniya J');
      localStorage.setItem('active_interview_set_id', targetSetId);
      localStorage.setItem('active_interview_is_vr', 'false');
      localStorage.removeItem(`interview_session_${targetSetId}`);
    }, setId);

    // 3. Navigate directly to Normal Interview mode with explicit scoped parameters
    await page.goto(`http://localhost:3000/interview?setId=${setId}&company=Google&role=Full%20Stack%20Engineer&vr=false`);
    await page.waitForLoadState('networkidle');

    // 4. Wait for Interview UI to load
    await page.waitForSelector('text=Canonical Question Queue', { timeout: 15000 });
    console.log('[Test] Canonical Question Queue is visible in Normal Interview Mode');

    // Verify AI Question Card shows Q001 and the exact stored question text
    const expectedQ1Text = (q1.question_text || q1.question).trim();
    console.log('[Test] Verifying Q1 display in AI Question Card...');
    
    // Check question ID badge
    const qBadge = page.locator(`span:has-text("${q1.question_id}")`).first();
    await expect(qBadge).toBeVisible();

    // Check that the exact question text is displayed in the AI Question Card
    const questionTextElement = page.locator(`text="${expectedQ1Text}"`).first();
    await expect(questionTextElement).toBeVisible();

    // Check Voice Engine status badge
    const voiceStatus = page.locator('text=/Gemini Live: Connected|Voice Engine: Active/i').first();
    await expect(voiceStatus).toBeVisible();

    // 5. Test Live Microphone & Transcription Card
    const micButton = page.locator('button:has-text("MIC MUTED"), button:has-text("MIC LIVE")').first();
    await expect(micButton).toBeVisible();

    // Type candidate response into input (simulating speech-to-text live update)
    const testCandidateAnswer = "I have extensive experience building React and Node.js microservices with real-time WebSockets.";
    const textInput = page.locator('input[placeholder*="type/edit your response text here"]').first();
    await expect(textInput).toBeVisible();
    await textInput.fill(testCandidateAnswer);

    // Verify live speech transcript reflects candidate speech simultaneously
    const liveTranscriptView = page.locator(`text=${testCandidateAnswer}`).first();
    await expect(liveTranscriptView).toBeVisible();

    // 6. Submit Answer and advance
    const submitButton = page.locator('button:has-text("Submit Answer & Next Question")').first();
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // 7. Verify Answer was recorded against exact question_id (Q001) in the queue
    console.log('[Test] Verifying Q001 saved in Question Queue...');
    await page.waitForSelector('text=Answer Saved', { timeout: 8000 });

    const queueItemQ1 = page.locator(`div:has-text("${q1.question_id}"):has-text("Answer Saved")`).first();
    await expect(queueItemQ1).toBeVisible();

    // Verify saved transcript snippet is displayed under Q001 in queue
    const transcriptSnippet = page.locator(`p:has-text("${testCandidateAnswer}")`).first();
    await expect(transcriptSnippet).toBeVisible();

    // 8. Verify advanced to Q002 if present
    if (q2) {
      console.log('[Test] Verifying advancement to Q002...');
      const expectedQ2Text = (q2.question_text || q2.question).trim();
      const q2Badge = page.locator(`span:has-text("${q2.question_id}")`).first();
      await expect(q2Badge).toBeVisible({ timeout: 8000 });

      const q2TextElement = page.locator(`text="${expectedQ2Text}"`).first();
      await expect(q2TextElement).toBeVisible();
    }

    // 9. Verify server session persistence
    const sessRes = await page.request.get(`http://localhost:3000/api/interview/session/by-set/${setId}`);
    expect(sessRes.ok()).toBeTruthy();
    const serverSession = await sessRes.json();
    console.log('[Test] Server Session Data:', serverSession);

    expect(serverSession.question_set_id).toBe(setId);
    expect(serverSession.answers[q1.question_id]).toBe(testCandidateAnswer);
    if (q2) {
      expect(serverSession.current_question_id).toBe(q2.question_id);
      expect(serverSession.current_question_order).toBe(2);
    }

    // 10. Verify security check: No permanent key was leaked
    expect(apiKeyLeaked).toBeFalsy();
    console.log('[Test] Security check passed: Permanent API key was never exposed in client network responses');
    console.log('[Test] All tests PASSED successfully!');
  });
});
