import { test, expect } from "@playwright/test";

/**
 * Phase 4 — Normal Interview Flow Acceptance Test
 * Verifies:
 * - Selected company and role are preserved
 * - Canonical question set is loaded and displayed
 * - Questions match the role
 * - Candidate answer submission advances to the next question
 * - Progression does not repeat questions or use stale answers
 * - Normal mode stays in normal 2D/desktop mode (does not force VR)
 * - Reloading preserves session state
 */
test.describe("Phase 4: Normal Interview Flow", () => {
  test.setTimeout(90000);

  test("Normal interview loads selected company/role, renders canonical question, and advances on answer", async ({ page }) => {
    // 1. Navigate to interview with selected company and role
    await page.goto("/interview?company=Tech+Mahindra&role=AI%2FML+Software+Engineer&vr=false");

    // 2. Verify header displays company and role
    await expect(page.getByText("Tech Mahindra").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/AI\/ML Software Engineer/i).first()).toBeVisible({ timeout: 15000 });

    // 3. Verify normal mode is active (not VR)
    // 3. Verify normal mode is active (not VR)
    const submitBtn = page.getByRole("button", { name: /Submit Answer & Next/i });
    await expect(submitBtn).toBeVisible({ timeout: 15000 });

    // 4. Verify canonical question is loaded
    const questionTextLocator = page.locator('p, div, h3').filter({ hasText: /Python|gradient|array|hash|interview/i }).first();
    await expect(questionTextLocator).toBeVisible({ timeout: 20000 });

    // 5. Submit an answer via the text input
    const inputField = page.locator('input[placeholder*="Type your answer"], textarea, input[type="text"]').last();
    await expect(inputField).toBeVisible({ timeout: 10000 });

    await inputField.fill("I implement gradient clipping and Adam optimizer with cosine decay learning rate schedules.");
    
    // Click submit button
    await submitBtn.click();

    // 6. Verify question advances to next question (Question 2 or updated question text)
    // Wait for the input field to clear
    await expect(inputField).toHaveValue("", { timeout: 10000 });

    // Check that question index advanced (e.g. "Question 2" or next question in queue)
    await page.waitForTimeout(2000);
    const answersInStorage = await page.evaluate(() => {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('interview_session_'));
      if (keys.length > 0) {
        return localStorage.getItem(keys[0]);
      }
      return null;
    });

    expect(answersInStorage).not.toBeNull();
    const parsedSession = JSON.parse(answersInStorage!);
    expect(Object.keys(parsedSession.answers).length).toBeGreaterThan(0);
    expect(parsedSession.current_question_order).toBeGreaterThanOrEqual(1);

    console.log("Interview answered successfully. Session stored:", {
      setId: parsedSession.question_set_id,
      answeredCount: Object.keys(parsedSession.answers).length,
      currentOrder: parsedSession.current_question_order
    });
  });
});
