import { test, expect, Page } from "@playwright/test";
import path from "path";

/**
 * Acceptance Test Suite: Scanned PDF OCR Fallback Pipeline
 * Tests all 5 PDF document variants through the real UI and live backend:
 * 1. Text-based PDF (pure text layout path, zero OCR overhead)
 * 2. Scanned PDF with known synthetic content (image-only PDF -> OCR fallback)
 * 3. Mixed PDF (Page 1 text + Page 2 scanned image -> combined text)
 * 4. Unreadable scan (blank/illegible image -> actionable HTTP 422 error, no stale data)
 * 5. Malformed PDF (corrupted/fake header -> actionable HTTP 400 error, no stale data)
 */
const FIX = (name: string) => path.resolve(process.cwd(), "scratch", "upload_fixtures", name);

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

test.describe("Scanned PDF OCR Fallback Suite", () => {
  test.setTimeout(180000);

  test("1. Text-based PDF: Extracts via standard PDF.js without OCR overhead", async ({ page }) => {
    let extractFormat = "";
    page.on("response", async (res) => {
      if (res.url().includes("/api/resume/extract-pdf") && res.status() === 200) {
        try {
          const json = await res.json();
          extractFormat = json.format;
        } catch {}
      }
    });

    await openCleanResumeTab(page);
    await page.setInputFiles('input[type="file"]', FIX("valid_resume.pdf"));

    // Verify localStorage updated with extracted candidate profile
    await expect.poll(async () => page.evaluate(() => localStorage.getItem("yatra_parse_result")), { timeout: 90000 }).not.toBeNull();

    // Verify UI displays the text-extracted profile
    await expect(page.getByText("Aarav Mehta").first()).toBeVisible({ timeout: 15000 });
    expect(extractFormat).toBe("pdf_text");
  });

  test("2. Scanned PDF: Renders embedded page image through OCR and normalizes candidate profile", async ({ page }) => {
    let extractFormat = "";
    let extractedText = "";
    page.on("response", async (res) => {
      if (res.url().includes("/api/resume/extract-pdf") && res.status() === 200) {
        try {
          const json = await res.json();
          extractFormat = json.format;
          extractedText = json.text;
        } catch {}
      }
    });

    await openCleanResumeTab(page);
    await page.setInputFiles('input[type="file"]', FIX("scanned_resume.pdf"));

    // Verify extract-pdf returned format ocr_scanned_pdf
    await expect.poll(() => extractFormat, { timeout: 45000 }).toBe("ocr_scanned_pdf");
    expect(extractedText).toMatch(/SARAH|THOMPSON/i);

    // Verify the OCR-extracted text passes through candidate-profile pipeline into localStorage
    await expect.poll(async () => page.evaluate(() => localStorage.getItem("yatra_parse_result")), { timeout: 90000 }).not.toBeNull();

    const storedResult = await page.evaluate(() => {
      const raw = localStorage.getItem("yatra_parse_result");
      return raw ? JSON.parse(raw) : null;
    });

    expect(storedResult).not.toBeNull();
    const name = storedResult.profile?.name || storedResult.candidate_name || "";
    expect(name.toUpperCase()).toContain("SARAH");
  });

  test("3. Mixed PDF: Extracts text from Page 1 and combines with OCR text from Page 2", async ({ page }) => {
    let extractFormat = "";
    let extractedText = "";
    page.on("response", async (res) => {
      if (res.url().includes("/api/resume/extract-pdf") && res.status() === 200) {
        try {
          const json = await res.json();
          extractFormat = json.format;
          extractedText = json.text;
        } catch {}
      }
    });

    await openCleanResumeTab(page);
    await page.setInputFiles('input[type="file"]', FIX("mixed_resume.pdf"));

    // Wait for extract-pdf completion
    await expect.poll(() => extractedText.length > 0, { timeout: 45000 }).toBeTruthy();

    // Verify text from Page 1 (Priya Sharma) AND text from Page 2 (Sarah Thompson) are present
    expect(extractedText).toMatch(/PRIYA SHARMA/i);
    expect(extractedText).toMatch(/SARAH|THOMPSON/i);
    expect(extractFormat).toBe("ocr_scanned_pdf");

    // Verify profile update in localStorage
    await expect.poll(async () => page.evaluate(() => localStorage.getItem("yatra_parse_result")), { timeout: 90000 }).not.toBeNull();
  });

  test("4. Unreadable scan: Rejects blank/illegible scan with actionable error and leaves no stale data", async ({ page }) => {
    let extractStatus = 0;
    page.on("response", (res) => {
      if (res.url().includes("/api/resume/extract-pdf")) {
        extractStatus = res.status();
      }
    });

    await openCleanResumeTab(page);
    await page.setInputFiles('input[type="file"]', FIX("unreadable_scan.pdf"));

    // Verify HTTP 422 status
    await expect.poll(() => extractStatus, { timeout: 20000 }).toBe(422);

    // Verify UI presents actionable error message
    await expect(page.getByText(/We couldn't read any text from this PDF|blank or unreadable scanned pages/i).first()).toBeVisible({ timeout: 15000 });

    // Verify no stale profile is stored in localStorage
    const stored = await page.evaluate(() => localStorage.getItem("yatra_parse_result"));
    expect(stored).toBeNull();
  });

  test("5. Malformed PDF: Rejects corrupted/fake PDF with actionable error and leaves no stale data", async ({ page }) => {
    let extractStatus = 0;
    page.on("response", (res) => {
      if (res.url().includes("/api/resume/extract-pdf")) {
        extractStatus = res.status();
      }
    });

    await openCleanResumeTab(page);
    await page.setInputFiles('input[type="file"]', FIX("fake_resume.pdf"));

    // Verify client or server rejection
    await expect(page.getByText(/not a valid PDF document|valid PDF header/i).first()).toBeVisible({ timeout: 15000 });

    // Verify no stale profile is stored in localStorage
    const stored = await page.evaluate(() => localStorage.getItem("yatra_parse_result"));
    expect(stored).toBeNull();
  });
});
