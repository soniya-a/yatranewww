import { test, expect } from "@playwright/test";
import { buildCanonicalProfile } from "../src/lib/profile/candidateProfileBuilder";
import { determinePrimaryTargetRole } from "../src/lib/jobs/liveJobMatcher";

// ─────────────────────────────────────────────────────────────────────────────
// 1. CANONICAL CLASSIFICATION & DATA CONTRACT TESTS
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Phase 0: Canonical Candidate Profile & Non-Contamination", () => {
  test("Civil engineering resume is classified as civil, never falls back to SWE", () => {
    const civilText = `
      John Doe - Civil Structural Engineer
      Experience in STAAD.Pro, ETABS, RCC beam and column design adhering to IS 456.
      Conducted geotechnical soil testing, total station surveying, and site engineering for reinforced concrete structures.
    `;
    const profile = buildCanonicalProfile(
      { skills: ["STAAD.Pro", "ETABS", "RCC", "AutoCAD Civil 3D", "Structural Analysis"], matchingRoles: ["Structural Engineer"] },
      { technical_skills: [{ name: "STAAD.Pro", proficiency: "4/5" }, { name: "RCC", proficiency: "5/5" }], role_matches: ["Structural Engineer", "Civil Site Engineer"] },
      civilText
    );

    expect(profile.domain).toBe("civil");
    expect(profile.primaryRole).not.toBe("Software Engineer");
    expect(profile.primaryRole).not.toBe("Web Developer Intern");
    expect(profile.primaryRole?.toLowerCase()).toContain("engineer");
    expect(profile.classificationStatus).toBe("verified");
    expect(determinePrimaryTargetRole(profile)).not.toBe("Software Engineer");
  });

  test("Mechanical engineering resume is classified as mechanical, never falls back to SWE", () => {
    const mechText = `
      Jane Smith - Mechanical Design Engineer
      Hands-on expertise in SolidWorks parametric modeling, ANSYS FEA stress simulation, and GD&T ASME Y14.5.
      Designed thermal HVAC systems, sheet metal enclosures, and injection molded plastics.
    `;
    const profile = buildCanonicalProfile(
      { skills: ["SolidWorks", "ANSYS", "GD&T", "FEA", "HVAC"], matchingRoles: ["Mechanical Design Engineer"] },
      { technical_skills: [{ name: "SolidWorks", proficiency: "5/5" }, { name: "ANSYS", proficiency: "4/5" }], role_matches: ["Mechanical Design Engineer"] },
      mechText
    );

    expect(profile.domain).toBe("mechanical");
    expect(profile.primaryRole).not.toBe("Software Engineer");
    expect(profile.primaryRole).not.toBe("Web Developer Intern");
    expect(determinePrimaryTargetRole(profile)).toBe("Mechanical Design Engineer");
  });

  test("Architecture resume is classified as architecture, never falls back to SWE", () => {
    const archText = `
      Alex Rivera - Architectural Designer
      Specialized in Revit Architecture BIM Level 2 workflows, SketchUp 3D modeling, Lumion rendering, and spatial planning.
      Designed commercial facades and interior space layouts.
    `;
    const profile = buildCanonicalProfile(
      { skills: ["Revit", "BIM", "SketchUp", "Lumion", "Architectural Design"], matchingRoles: ["Architectural Designer"] },
      { technical_skills: [{ name: "Revit", proficiency: "5/5" }], role_matches: ["Architectural Designer"] },
      archText
    );

    expect(profile.domain).toBe("architecture");
    expect(profile.primaryRole).not.toBe("Software Engineer");
    expect(determinePrimaryTargetRole(profile)).toBe("Architectural Designer");
  });

  test("Electronics / Embedded resume is classified as electronics, never falls back to SWE", () => {
    const eceText = `
      Rajesh Kumar - Embedded Systems & VLSI Engineer
      Proficient in Verilog HDL, FPGA programming on Xilinx Vivado, PCB layout in Altium Designer, and STM32 Microcontroller C programming.
    `;
    const profile = buildCanonicalProfile(
      { skills: ["Verilog", "FPGA", "Altium", "Embedded C", "Microcontroller"], matchingRoles: ["Electronics Engineer"] },
      { technical_skills: [{ name: "Verilog", proficiency: "4/5" }], role_matches: ["Electronics Engineer"] },
      eceText
    );

    expect(profile.domain).toBe("electronics");
    expect(profile.primaryRole).not.toBe("Software Engineer");
    expect(determinePrimaryTargetRole(profile)).toBe("Electronics Engineer");
  });

  test("Unclassified / low confidence resume explicitly marks needs_review and null primaryRole", () => {
    const genericText = `
      Alex Person
      Enthusiastic graduate interested in problem solving and general operations.
      Good communication and team management skills.
    `;
    const profile = buildCanonicalProfile(
      { skills: ["Communication", "Teamwork"], matchingRoles: [] },
      { technical_skills: [], role_matches: [] },
      genericText
    );

    expect(profile.domain).toBe("unclassified");
    expect(profile.primaryRole).toBeNull();
    expect(profile.classificationStatus).toBe("needs_review");
    expect(profile.classificationConfidence).toBe("low");
    expect(determinePrimaryTargetRole(profile)).not.toBe("Software Engineer");
    expect(determinePrimaryTargetRole(profile)).toBe("Graduate Engineer Trainee");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. LIVE JOBS DECOUPLING & STABILITY TESTS
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Phase 0: LiveJobsView Decoupling & Network Stability", () => {
  test("Mouse movements, hovers, and scrolling produce ZERO additional job searches", async ({ page }) => {
    // Intercept and monitor /api/jobs/search network requests
    let searchRequestCount = 0;
    const interceptedRequests: any[] = [];

    await page.route("**/api/jobs/search", async (route) => {
      searchRequestCount++;
      interceptedRequests.push({
        postData: route.request().postDataJSON(),
        url: route.request().url(),
      });

      // Provide mock response so test runs fast and deterministically
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          total: 2,
          jobs: [
            {
              id: "test-job-1",
              title: "Graduate Engineer Trainee",
              company: "Tata Engineering",
              location: "Bangalore, India",
              description: "Seeking graduate engineer trainee for technical operations and project planning.",
              category: "engineering",
              source: "adzuna",
              sourceJobId: "123",
              sourceUrl: "https://example.com/123",
              url: "https://example.com/123",
              postedAt: new Date().toISOString(),
              fetchedAt: new Date().toISOString(),
              salaryMin: 400000,
              salaryMax: 600000,
            },
            {
              id: "test-job-2",
              title: "Associate Engineer",
              company: "L&T Engineering",
              location: "Mumbai, India",
              description: "Design and technical analysis engineering position.",
              category: "engineering",
              source: "adzuna",
              sourceJobId: "124",
              sourceUrl: "https://example.com/124",
              url: "https://example.com/124",
              postedAt: new Date().toISOString(),
              fetchedAt: new Date().toISOString(),
              salaryMin: 450000,
              salaryMax: 700000,
            }
          ]
        }),
      });
    });

    // 1. Set guest authentication session before navigating
    await page.addInitScript(() => {
      localStorage.setItem("guest_session", "true");
      localStorage.setItem("guest_email", "student@yatra.edu");
      localStorage.setItem("guest_uid", "guest-student-1");
    });

    // 2. Navigate to the app
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // 2. Navigate to Live Jobs tab
    const liveJobsTab = page.locator('button:has-text("Live Jobs")').first();
    await expect(liveJobsTab).toBeVisible({ timeout: 10000 });
    await liveJobsTab.click();

    // 3. Wait for initial job search to settle
    await page.waitForTimeout(1000);
    const initialRequests = searchRequestCount;
    expect(initialRequests).toBeGreaterThanOrEqual(1);

    // Verify job cards rendered
    const jobCard = page.locator('h3:has-text("Graduate Engineer Trainee")').first();
    await expect(jobCard).toBeVisible({ timeout: 5000 });

    // 4. ACTION: Move mouse rapidly 25 times across the viewport
    for (let i = 0; i < 25; i++) {
      await page.mouse.move(100 + (i * 15), 200 + ((i % 5) * 40));
    }

    // 5. ACTION: Hover over job card and interactive elements
    await jobCard.hover();
    await page.waitForTimeout(200);

    const sortSelect = page.locator('select').first();
    if (await sortSelect.isVisible()) {
      await sortSelect.hover();
      await page.waitForTimeout(100);
    }

    // 6. ACTION: Scroll up and down
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(200);
    await page.mouse.wheel(0, -400);
    await page.waitForTimeout(500);

    // 7. ASSERTION: Mouse movement, hovers, and scroll caused 0 additional searches!
    expect(searchRequestCount).toBe(initialRequests);

    // 8. MEANINGFUL CHANGE: Change location to trigger exactly 1 logical new search
    const locationInput = page.locator('input[placeholder*="location" i], input[value*="India"]').first();
    if (await locationInput.isVisible()) {
      await locationInput.fill("Hyderabad");
      
      const searchButton = page.locator('button[type="submit"]').first();
      await searchButton.click();

      // Wait for search to complete
      await page.waitForTimeout(800);

      // Exactly 1 additional search was triggered by the location change
      expect(searchRequestCount).toBe(initialRequests + 1);
    }
  });
});
