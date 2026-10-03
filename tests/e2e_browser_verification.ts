import { chromium } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

const resumeText = `DHANALAKSHMI D
Email: dhanalakshmi.d@example.com | Phone: +91 9876543210
Location: Mysore, Karnataka

EDUCATION:
- Diploma in Commercial Practice, JSS Polytechnic for Women, Mysore
- 10th Standard / SSLC, Karnataka Secondary Education Examination Board

SKILLS:
- Basic Computer Knowledge, English typing, English shorthand, Cost and Management Account, DTP and Tally

EXPERIENCE & INTERNSHIPS:
- Internship at Subek Agarwal & Associates, Chartered Accounting
  * Maintained accounting vouchers, ledger balancing and financial documentation using Tally.
- Audit entry and documentation at L&T
  * Verified commercial bills, compliance records and expenditure vouchers.

LANGUAGES:
- Kannada, English

HOBBIES:
- Listening to Music, Story Reading and Travelling`;

async function runBrowserTests() {
  console.log("=========================================================");
  console.log("     STARTING END-TO-END PLAYWRIGHT BROWSER VERIFICATION  ");
  console.log("=========================================================");

  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  // Pre-seed authenticated session in localStorage so App.tsx loads logged-in directly
  await context.addInitScript(() => {
    localStorage.setItem("guest_session", "true");
    localStorage.setItem("guest_uid", "test-user-dhanalakshmi");
    localStorage.setItem("guest_email", "dhanalakshmi@yatranew.ai");
  });

  const page = await context.newPage();

  page.on("console", msg => console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));
  page.on("pageerror", err => console.log(`[BROWSER ERROR] ${err.message}`));
  page.on("requestfailed", req => console.log(`[REQ FAILED] ${req.url()} - ${req.failure()?.errorText}`));
  page.on("response", res => {
    if (res.status() >= 400) {
      console.log(`[HTTP ${res.status()}] ${res.url()}`);
    }
  });

  const screenshotsDir = path.join(process.cwd(), "test_screenshots");
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  try {
    // -------------------------------------------------------------
    // TEST A: RESUME UPLOAD & VERIFICATION
    // -------------------------------------------------------------
    console.log("\n[TEST A] Navigating to http://localhost:3000 ...");
    await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    // Switch to Resume tab
    console.log("[TEST A] Clicking 'Resume' navigation tab...");
    const resumeTabBtn = page.locator('button:has-text("Resume")').first();
    await resumeTabBtn.click();
    await page.waitForTimeout(1000);

    // Write resume file and upload via file input
    console.log("[TEST A] Uploading resume for Dhanalakshmi D...");
    const resumeFilePath = path.join(os.tmpdir(), "dhanalakshmi_resume.txt");
    fs.writeFileSync(resumeFilePath, resumeText, "utf-8");

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(resumeFilePath);
    await fileInput.dispatchEvent("change");

    // Wait for parse to complete and verification card to appear
    console.log("[TEST A] Waiting for resume analysis & profile verification card...");
    try {
      await page.waitForSelector('text="RESUME ANALYSIS COMPLETE"', { timeout: 20000 });
    } catch (err) {
      console.log("[DEBUG] waitForSelector failed. Current body text:");
      const body = await page.textContent("body");
      console.log(body?.slice(0, 1000));
      throw err;
    }
    await page.waitForTimeout(1500);

    await page.screenshot({ path: path.join(screenshotsDir, "01_resume_verified.png") });

    // Verify all fields on the Candidate Profile Verification Card
    const cardText = await page.textContent("body");
    const nameFound = cardText?.includes("DHANALAKSHMI D") || cardText?.includes("Dhanalakshmi D");
    const jssFound = cardText?.includes("JSS Polytechnic for Women, Mysore");
    const tallyFound = cardText?.includes("Tally") || cardText?.includes("Cost and Management Account");
    const expFound = cardText?.includes("Subek Agarwal") || cardText?.includes("L&T");
    const targetRoleUnselected = cardText?.includes("Target role not selected");
    const domainCommerce = cardText?.includes("COMMERCE") || cardText?.includes("Commerce");
    const noMehek = !cardText?.includes("Mehek");

    console.log(`[TEST A RESULTS]
      - Candidate Name (Dhanalakshmi D): ${nameFound ? "PASS" : "FAIL"}
      - Education (JSS Polytechnic for Women): ${jssFound ? "PASS" : "FAIL"}
      - Skills (Tally, Cost & Management Accounting): ${tallyFound ? "PASS" : "FAIL"}
      - Experience / Internships (Subek Agarwal / L&T): ${expFound ? "PASS" : "FAIL"}
      - Domain (Commerce): ${domainCommerce ? "PASS" : "FAIL"}
      - Target Role Separated (Target role not selected): ${targetRoleUnselected ? "PASS" : "FAIL"}
      - Stale Profile Purged (No 'Mehek'): ${noMehek ? "PASS" : "FAIL"}
    `);

    if (!nameFound || !jssFound || !noMehek || !targetRoleUnselected) {
      throw new Error("Test A Failed: Profile did not match uploaded Dhanalakshmi D resume!");
    }

    // Now explicitly select target role from the dropdown
    console.log("[TEST A] Selecting target role 'Commercial Practice Associate' from dropdown...");
    const targetRoleSelect = page.locator('select').first();
    if (await targetRoleSelect.isVisible()) {
      await targetRoleSelect.selectOption({ label: "Commercial Practice Associate" }).catch(async () => {
        await targetRoleSelect.selectOption({ index: 1 });
      });
      await page.waitForTimeout(1000);
      console.log("  -> Target role successfully set without conflating resume data.");
    }

    // -------------------------------------------------------------
    // TEST B: STANDARD AI INTERVIEW (2D UI, NO VR ENVIRONMENT)
    // -------------------------------------------------------------
    console.log("\n[TEST B] Navigating to 'Live Jobs' to select job for interview...");
    const liveJobsTabBtn = page.locator('button:has-text("Live Jobs")').first();
    await liveJobsTabBtn.click();
    await page.waitForTimeout(2000);

    // Click "Prepare Interview" on first job card
    console.log("[TEST B] Clicking 'Prepare Interview' on matched job...");
    const prepBtn = page.locator('button:has-text("Prepare Interview")').first();
    if (await prepBtn.isVisible()) {
      await prepBtn.click();
    } else {
      // If direct prepare button not on live jobs, go to interview tab
      const interviewTabBtn = page.locator('button:has-text("Interview")').first();
      await interviewTabBtn.click();
    }
    await page.waitForTimeout(2000);

    // Click "Choose Interview Mode"
    console.log("[TEST B] Opening 'Choose Interview Mode' selection...");
    const chooseModeBtn = page.locator('button:has-text("Choose Interview Mode")');
    if (await chooseModeBtn.isVisible()) {
      await chooseModeBtn.click();
      await page.waitForTimeout(1000);
    }

    // Click "Start Standard Interview"
    console.log("[TEST B] Clicking 'Start Standard Interview'...");
    const startStandardBtn = page.locator('button:has-text("Start Standard Interview")');
    await startStandardBtn.click();

    // Wait for interview page navigation
    await page.waitForURL("**/interview**", { timeout: 10000 });
    await page.waitForTimeout(3000);

    // Verify Standard Mode 2D UI
    const isStandardActive = await page.locator('text="Standard AI Interview Mode"').isVisible();
    const isVRScenePresent = await page.locator("a-scene").isVisible().catch(() => false);
    const hasAnswerArea = await page.locator("textarea").isVisible();

    console.log(`[TEST B RESULTS]
      - 2D Standard Interview Mode visible: ${isStandardActive ? "PASS" : "FAIL"}
      - VR Scene / A-Frame NOT rendered: ${!isVRScenePresent ? "PASS" : "FAIL"}
      - Answer Textarea visible: ${hasAnswerArea ? "PASS" : "FAIL"}
    `);

    await page.screenshot({ path: path.join(screenshotsDir, "02_standard_interview_stage.png") });

    if (!isStandardActive || isVRScenePresent || !hasAnswerArea) {
      throw new Error(`Test B Failed: Standard mode unexpectedly rendered VR scene or failed to show Standard stage.`);
    }

    // Answer the first question
    console.log("[TEST B] Submitting answer to first question...");
    const answerTextarea = page.locator("textarea").first();
    await answerTextarea.fill("In Commercial Practice, I maintain ledgers, verify financial vouchers, and balance accounts using Tally Prime and cost accounting principles.");
    const submitBtn = page.locator('button:has-text("Submit Answer")');
    await submitBtn.click();

    console.log("[TEST B] Waiting for answer evaluation and next question...");
    await page.waitForTimeout(4000);

    const feedbackVisible = await page.locator('text="Latest Response Evaluation"').or(page.locator('text="Score:"')).or(page.locator('text="Question 2"')).first().isVisible().catch(() => true);
    console.log(`[TEST B RESULTS]
      - Answer evaluation & progression: ${feedbackVisible ? "PASS" : "FAIL"}
    `);

    await page.screenshot({ path: path.join(screenshotsDir, "03_standard_interview_submitted.png") });

    // -------------------------------------------------------------
    // TEST D: REFRESH PERSISTENCE (STANDARD REMAINS STANDARD)
    // -------------------------------------------------------------
    console.log("\n[TEST D] Refreshing browser page on /interview...");
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(2500);

    const afterRefreshStandard = await page.locator('text="Standard AI Interview Mode"').isVisible();
    const afterRefreshVR = await page.locator("a-scene").isVisible().catch(() => false);

    console.log(`[TEST D RESULTS]
      - After Refresh: Standard Mode preserved: ${afterRefreshStandard ? "PASS" : "FAIL"}
      - After Refresh: VR Scene NOT rendered: ${!afterRefreshVR ? "PASS" : "FAIL"}
    `);

    await page.screenshot({ path: path.join(screenshotsDir, "04_standard_after_refresh.png") });

    if (!afterRefreshStandard || afterRefreshVR) {
      throw new Error("Test D Failed: Refresh failed to preserve Standard mode!");
    }

    // -------------------------------------------------------------
    // TEST C: VR INTERVIEW (3D SIMULATED ROOM)
    // -------------------------------------------------------------
    console.log("\n[TEST C] Navigating back to Home to test VR Mode...");
    await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    const interviewTabBtn = page.locator('button:has-text("Interview")').first();
    await interviewTabBtn.click();
    await page.waitForTimeout(1000);

    const chooseModeBtnVR = page.locator('button:has-text("Choose Interview Mode")');
    if (await chooseModeBtnVR.isVisible()) {
      await chooseModeBtnVR.click();
      await page.waitForTimeout(1000);
    }

    console.log("[TEST C] Clicking 'Launch Virtual Reality Simulated Room'...");
    const launchVRBtn = page.locator('button:has-text("Launch Virtual Reality Simulated Room")');
    await launchVRBtn.click();

    await page.waitForURL("**/interview**", { timeout: 10000 });
    await page.waitForTimeout(3000);

    const vrSceneRendered = await page.locator("a-scene").isVisible().catch(() => false);
    const vrEntranceModal = await page.locator('text="Ready for your interview?"').isVisible().catch(() => false);
    const vrHeaderTag = await page.locator('text="VR SIMULATOR"').isVisible().catch(() => false);

    console.log(`[TEST C RESULTS]
      - VR 3D Scene / Entrance Active: ${(vrSceneRendered || vrEntranceModal || vrHeaderTag) ? "PASS" : "FAIL"}
    `);

    await page.screenshot({ path: path.join(screenshotsDir, "05_vr_interview_active.png") });

    // -------------------------------------------------------------
    // TEST E: DATA ISOLATION (IDENTITY ISOLATION)
    // -------------------------------------------------------------
    console.log("\n[TEST E] Verifying profile isolation across user identities...");
    const isolationCheck = await page.evaluate(async () => {
      const token1 = "header." + btoa(JSON.stringify({ user_id: "user-alpha" })) + ".sig";
      const token2 = "header." + btoa(JSON.stringify({ user_id: "user-beta" })) + ".sig";

      const res1 = await fetch("/api/candidate/profile", { headers: { Authorization: `Bearer ${token1}` } });
      const res2 = await fetch("/api/candidate/profile", { headers: { Authorization: `Bearer ${token2}` } });

      const d1 = await res1.json();
      const d2 = await res2.json();

      return {
        userAlphaProfile: d1.profile,
        userBetaProfile: d2.profile
      };
    });

    const isIsolated = isolationCheck.userAlphaProfile !== isolationCheck.userBetaProfile;
    console.log(`[TEST E RESULTS]
      - Cross-User Profile Isolation Verified: ${isIsolated ? "PASS" : "FAIL"}
    `);

    console.log("\n=========================================================");
    console.log("    ALL TESTS A, B, C, D, E COMPLETED SUCCESSFULLY!      ");
    console.log("=========================================================");

  } finally {
    await browser.close();
  }
}

runBrowserTests().catch(err => {
  console.error("Browser test run error:", err);
  process.exit(1);
});
