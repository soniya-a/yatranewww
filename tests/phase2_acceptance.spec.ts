import { test, expect, Page } from "@playwright/test";
import path from "path";

/**
 * Phase 2 — Real User Resume Acceptance Tests
 * Validates real PDF parsing, anti-hallucination, edge cases (empty PDF, oversized),
 * duplicate file selection, and stale data prevention.
 */
const REAL_RESUME = path.resolve(process.cwd(), "public", "assets", "soniyaj resumee.pdf");
const EMPTY_PDF = path.resolve(process.cwd(), "scratch", "upload_fixtures", "empty_resume.pdf");
const OVERSIZED_PDF = path.resolve(process.cwd(), "scratch", "upload_fixtures", "oversized_resume.pdf");

async function openCleanResumeTab(page: Page) {
  await page.goto("/?tab=resume");
  await expect(page.getByRole("heading", { name: "Resume Intelligence", level: 2 })).toBeVisible({ timeout: 20000 });
  await page.evaluate(() => {
    localStorage.removeItem("yatra_parse_result");
    localStorage.removeItem("yatra_candidate_profile");
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Resume Intelligence", level: 2 })).toBeVisible({ timeout: 20000 });
}

test.describe("Phase 2: Real Resume Acceptance Suite", () => {
  test.setTimeout(180000);

  test("1. Real User Resume (PDF) upload extracts accurate details with zero hallucinations", async ({ page }) => {
    await openCleanResumeTab(page);

    // Track network requests
    const networkErrors: string[] = [];
    page.on("requestfailed", (req) => networkErrors.push(`${req.method()} ${req.url()}: ${req.failure()?.errorText}`));
    page.on("pageerror", (err) => networkErrors.push(`PageError: ${err.message}`));

    // Upload real user resume
    await page.setInputFiles('input[type="file"]', REAL_RESUME);

    // Wait for parse completion (localStorage updated)
    await expect.poll(async () => page.evaluate(() => localStorage.getItem("yatra_parse_result")), { timeout: 90000 }).not.toBeNull();

    const storedResult = await page.evaluate(() => {
      const raw = localStorage.getItem("yatra_parse_result");
      return raw ? JSON.parse(raw) : null;
    });

    expect(storedResult).not.toBeNull();
    // 1. Name verification
    const candidateName = storedResult.profile?.name || storedResult.candidate_name;
    expect(candidateName?.toUpperCase()).toContain("SONIYA");

    // 2. Contact details verification
    expect(storedResult.profile?.email).toBe("jsoniyasonu0410@gmail.com");
    expect(storedResult.profile?.phone).toContain("8073024064");
    expect(storedResult.profile?.location).toContain("Mysore");

    // 3. Education verification: ECE at Maharaja Institute of Technology Mysore
    expect(storedResult.education).toBeDefined();
    expect(storedResult.education.length).toBeGreaterThan(0);
    const eduText = JSON.stringify(storedResult.education);
    expect(eduText).toMatch(/Electronics and Communication/i);
    expect(eduText).toMatch(/Maharaja Institute of Technology/i);

    // 4. Experience verification: Mindsetcraft Labs
    expect(storedResult.experience).toBeDefined();
    expect(storedResult.experience.length).toBeGreaterThan(0);
    const expText = JSON.stringify(storedResult.experience);
    expect(expText).toMatch(/Mindsetcraft Labs/i);
    expect(expText).toMatch(/Industrial IoT/i);

    // 5. Projects verification: InterviewVerse AI & RaghBodha
    expect(storedResult.projects).toBeDefined();
    expect(storedResult.projects.length).toBeGreaterThan(0);
    const projText = JSON.stringify(storedResult.projects);
    expect(projText).toMatch(/InterviewVerse AI/i);

    // 6. Anti-hallucination verification: no fabricated portfolio link or non-existent degree
    expect(storedResult.profile?.portfolio).toBeNull();
    expect(networkErrors.length).toBe(0);

    // 7. Verify UI rendered items
    await expect(page.getByText("SONIYA J").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("jsoniyasonu0410@gmail.com").first()).toBeVisible({ timeout: 10000 });
  });

  test("2. Empty / scanned PDF produces actionable error and does NOT invent data", async ({ page }) => {
    await openCleanResumeTab(page);

    await page.setInputFiles('input[type="file"]', EMPTY_PDF);

    // Expect actionable error message from 422 PDF_TEXT_EMPTY
    await expect(page.getByText(/We couldn't read any text from this PDF|scanned images|non-selectable text/i).first()).toBeVisible({ timeout: 15000 });

    // Verify localStorage has no profile stored
    const stored = await page.evaluate(() => localStorage.getItem("yatra_parse_result"));
    expect(stored).toBeNull();
  });

  test("3. Oversized file (>10MB) is rejected immediately with clear error", async ({ page }) => {
    await openCleanResumeTab(page);

    await page.setInputFiles('input[type="file"]', OVERSIZED_PDF);

    // Expect file size error
    await expect(page.getByText(/larger than 10 MB/i).first()).toBeVisible({ timeout: 10000 });

    // Verify localStorage has no profile stored
    const stored = await page.evaluate(() => localStorage.getItem("yatra_parse_result"));
    expect(stored).toBeNull();
  });

  test("4. Duplicate file selection: selecting the same file consecutively triggers upload", async ({ page }) => {
    await openCleanResumeTab(page);

    // Upload first time
    await page.setInputFiles('input[type="file"]', REAL_RESUME);
    await expect.poll(async () => page.evaluate(() => localStorage.getItem("yatra_parse_result")), { timeout: 90000 }).not.toBeNull();

    // Clear state
    await page.evaluate(() => {
      localStorage.removeItem("yatra_parse_result");
    });

    // Select the EXACT same file again immediately
    await page.setInputFiles('input[type="file"]', REAL_RESUME);

    // Must trigger upload and populate localStorage again
    await expect.poll(async () => page.evaluate(() => localStorage.getItem("yatra_parse_result")), { timeout: 90000 }).not.toBeNull();
    const stored = await page.evaluate(() => localStorage.getItem("yatra_parse_result"));
    expect(stored).toBeTruthy();
  });
});
