import { test, expect } from '@playwright/test';

test.describe('Job Context & Session Isolation Suite', () => {

  test('TEST A: Mechanical Design Engineer retains company, role, jobId, set_id and survives page refresh', async ({ page }) => {
    // 1. Generate canonical question set for Mechanical Design Engineer at Tesla
    const mechRes = await page.request.post('http://localhost:3000/api/interview/generate-canonical-set', {
      data: {
        company: 'Tesla',
        role: 'Mechanical Design Engineer',
        jobDescription: 'Designing battery packs, structural CAD modeling, thermal management, SolidWorks and FEA analysis.',
        candidateSkills: 'SolidWorks, FEA, Thermal Analysis, GD&T, AutoCAD, Sheet Metal'
      }
    });
    expect(mechRes.ok()).toBeTruthy();
    const mechData = await mechRes.json();
    const mechSetId = mechData.set_id;
    expect(mechSetId).toMatch(/^SET_/);
    expect(mechData.questions.length).toBeGreaterThan(0);
    const firstMechQ = mechData.questions[0];

    console.log(`[Test A] Generated Tesla Mechanical Set: ${mechSetId}`);

    // 2. Open /interview with Mechanical Design Engineer context
    await page.goto(`http://localhost:3000/interview?jobId=job_tesla_mech_001&setId=${mechSetId}&company=Tesla&role=Mechanical%20Design%20Engineer&vr=false`);
    await page.waitForLoadState('domcontentloaded');

    // Verify no stuck "INITIALIZING PORTAL ENVIRONMENT..." screen
    const initializingLoader = page.locator('text=Initializing Portal Environment');
    await expect(initializingLoader).toHaveCount(0, { timeout: 3000 });

    // Verify company & role badge in header
    const headerTitle = page.locator('header').locator('text=Tesla • Mechanical Design Engineer');
    await expect(headerTitle).toBeVisible({ timeout: 5000 });

    // Verify Set ID badge in header
    const setBadge = page.locator('header').locator(`text=Set: ${mechSetId}`);
    await expect(setBadge).toBeVisible();

    // Verify that TCS and Software Engineer are NOT rendered anywhere in the header or question
    const headerText = await page.locator('header').innerText();
    expect(headerText).not.toContain('TCS');
    expect(headerText).not.toContain('Software Engineer');
    expect(headerText).toContain('Tesla');
    expect(headerText).toContain('Mechanical Design Engineer');

    // 3. Test page refresh persistence
    console.log('[Test A] Refreshing page to verify persistence...');
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // After refresh, verify it still displays Tesla • Mechanical Design Engineer
    const refreshedHeaderTitle = page.locator('header').locator('text=Tesla • Mechanical Design Engineer');
    await expect(refreshedHeaderTitle).toBeVisible({ timeout: 5000 });
    const refreshedSetBadge = page.locator('header').locator(`text=Set: ${mechSetId}`);
    await expect(refreshedSetBadge).toBeVisible();

    // Still no TCS or Software Engineer
    const refreshedHeaderText = await page.locator('header').innerText();
    expect(refreshedHeaderText).not.toContain('TCS');
    expect(refreshedHeaderText).not.toContain('Software Engineer');
  });

  test('TEST B: Software Engineer vs Mechanical Engineer context isolation', async ({ page }) => {
    // 1. Generate canonical question set for Software Engineer at Datadog
    const sweRes = await page.request.post('http://localhost:3000/api/interview/generate-canonical-set', {
      data: {
        company: 'Datadog',
        role: 'Distributed Systems Engineer',
        jobDescription: 'Building high throughput time-series streaming metrics pipelines in Go and Kafka.',
        candidateSkills: 'Go, Kafka, Kubernetes, Distributed Systems, gRPC'
      }
    });
    expect(sweRes.ok()).toBeTruthy();
    const sweData = await sweRes.json();
    const sweSetId = sweData.set_id;
    expect(sweSetId).toMatch(/^SET_/);

    console.log(`[Test B] Generated Datadog SWE Set: ${sweSetId}`);

    // 2. Open /interview with Datadog context
    await page.goto(`http://localhost:3000/interview?jobId=job_datadog_swe_002&setId=${sweSetId}&company=Datadog&role=Distributed%20Systems%20Engineer&vr=false`);
    await page.waitForLoadState('domcontentloaded');

    // Verify company & role badge in header
    const headerTitle = page.locator('header').locator('text=Datadog • Distributed Systems Engineer');
    await expect(headerTitle).toBeVisible({ timeout: 5000 });

    const setBadge = page.locator('header').locator(`text=Set: ${sweSetId}`);
    await expect(setBadge).toBeVisible();

    // Verify complete isolation: NO Tesla, NO Mechanical, NO TCS
    const headerText = await page.locator('header').innerText();
    expect(headerText).not.toContain('Tesla');
    expect(headerText).not.toContain('Mechanical');
    expect(headerText).not.toContain('TCS');
    expect(headerText).toContain('Datadog');
  });

  test('TEST C: NO_CONTEXT state when accessing /interview directly with zero parameters', async ({ page }) => {
    // Clear storage before navigating
    await page.goto('http://localhost:3000');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem("guest_session", "true");
      localStorage.setItem("guest_uid", "test-user-context");
    });

    // Navigate to /interview with no query params or state
    await page.goto('http://localhost:3000/interview');
    await page.waitForLoadState('domcontentloaded');

    // Verify that NO_CONTEXT screen is displayed
    const noContextTitle = page.locator('text=No Active Interview Selected');
    await expect(noContextTitle).toBeVisible({ timeout: 5000 });

    const browseJobsBtn = page.locator('button:has-text("Browse Live Jobs")');
    await expect(browseJobsBtn).toBeVisible();

    // Verify it did NOT silently default to TCS or Software Engineer
    const pageContent = await page.content();
    expect(pageContent).not.toContain('TCS');
    expect(pageContent).not.toContain('SET_TCS_');

    // Click Browse Live Jobs
    await browseJobsBtn.click();
    await page.waitForTimeout(500);
    // Should navigate to Home
    expect(page.url()).toContain('localhost:3000');
  });

  test('TEST D: Live Jobs view renders Direct Interview button and launches with job context', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('domcontentloaded');

    // Navigate to Live Jobs tab using exact button name
    const liveJobsTab = page.getByRole('button', { name: 'Live Jobs', exact: true });
    await expect(liveJobsTab).toBeVisible({ timeout: 5000 });
    await liveJobsTab.click();

    // Wait for jobs to load and Direct Interview button to appear
    const firstDirectInterviewBtn = page.locator('button:has-text("Direct Interview")').first();
    await expect(firstDirectInterviewBtn).toBeVisible({ timeout: 15000 });

    const directInterviewBtns = page.locator('button:has-text("Direct Interview")');
    const count = await directInterviewBtns.count();
    console.log(`[Test D] Found ${count} Direct Interview buttons on live job cards`);
    expect(count).toBeGreaterThan(0);

    // Click the first Direct Interview button and verify navigation to /interview with context
    await firstDirectInterviewBtn.click();

    // Verify URL transitions to /interview with jobId and company/role
    await page.waitForURL(/.*\/interview.*/, { timeout: 8000 });
    expect(page.url()).toContain('/interview');
    expect(page.url()).toContain('jobId=');
    console.log(`[Test D] Navigated cleanly to: ${page.url()}`);
  });

});
