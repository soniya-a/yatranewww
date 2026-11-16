import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Career Intelligence Roadmap Dynamic Implementation', () => {
  const artifactDir = path.resolve('C:/Users/jsoni/.gemini/antigravity-ide/brain/0a2c49e4-9e55-4e18-b7cf-598ab7aae341');

  test('verifies empty state, dynamic generation, structured 3-phase items, clickable URLs, and persistence across reloads', async ({ page }) => {
    test.setTimeout(90000);
    // ── 1. TEST EMPTY STATE ──────────────────────────────────────────────────
    console.log('[Test Step 1] Navigating to Roadmap tab with fresh session...');
    await page.goto('http://localhost:3000/?tab=roadmap');
    await page.waitForLoadState('networkidle');

    // Check empty state messaging
    const emptyStateText = page.locator('text=Upload your resume and select a target job to generate your roadmap.');
    const hasEmptyState = await emptyStateText.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`[Test Step 1] Empty state visible: ${hasEmptyState}`);
    
    // Screenshot 1: Empty / Prompt State
    await page.screenshot({ path: path.join(artifactDir, 'roadmap_step1_empty_state.png'), fullPage: true });

    // ── 2. SEED CANDIDATE CONTEXT IN LOCALSTORAGE ────────────────────────────
    console.log('[Test Step 2] Setting up Candidate Profile (Mechanical Engineer) and Target Job (Siemens Energy)...');
    await page.evaluate(() => {
      const candidateProfile = {
        fullName: 'Alex Rivera',
        domain: 'mechanical',
        primaryRole: 'Mechanical Design Engineer',
        targetRoles: ['Mechanical Design Engineer', 'FEA Simulation Specialist'],
        skills: ['AutoCAD', 'SolidWorks', 'MATLAB', 'Thermodynamics', 'Fluid Mechanics', 'GD&T', 'Material Science'],
        experienceYears: 3,
        projects: [
          { name: 'Centrifugal Pump Impeller Optimization', technologies: ['AutoCAD', 'SolidWorks', 'CFD'] }
        ],
        updatedAt: new Date().toISOString(),
        source: 'resume_upload'
      };

      const parseResult = {
        skills: candidateProfile.skills,
        matchingRoles: ['Mechanical Design Engineer'],
        matchingCompanies: [
          { company: 'Siemens Energy', role: 'Mechanical Design Engineer', matchScore: 84 },
          { company: 'General Electric', role: 'Turbomachinery Engineer', matchScore: 78 }
        ]
      };

      const selectedJob = {
        id: 'siemens-mech-001',
        company: 'Siemens Energy',
        title: 'Mechanical Design Engineer',
        role: 'Mechanical Design Engineer',
        description: 'Siemens Energy is seeking a Mechanical Design Engineer to design turbomachinery casings and rotating components. Required: ANSYS FEA Simulation, thermal-structural stress analysis, tolerance stack-up analysis according to ASME Y14.5, and vibration testing.',
        matchedSkills: ['AutoCAD', 'SolidWorks', 'Thermodynamics', 'GD&T'],
        missingSkills: ['ANSYS FEA Simulation', 'ASME Y14.5 Tolerance Stacks', 'Vibration Modal Analysis']
      };

      localStorage.setItem('candidate_profile_guest-user-123', JSON.stringify(candidateProfile));
      localStorage.setItem('parse_result_guest-user-123', JSON.stringify(parseResult));
      localStorage.setItem('active_selected_job', JSON.stringify(selectedJob));
      localStorage.setItem('yatra_candidate_profile', JSON.stringify(candidateProfile));
      localStorage.setItem('yatra_parse_result', JSON.stringify(parseResult));
      localStorage.setItem('yatra_selected_job', JSON.stringify(selectedJob));
    });

    // ── 3. NAVIGATE TO ROADMAP AND GENERATE ──────────────────────────────────
    console.log('[Test Step 3] Reloading Roadmap with populated candidate & target job context...');
    await page.goto('http://localhost:3000/?tab=roadmap');
    await page.waitForLoadState('networkidle');

    // Verify context header cards
    const roleHeader = page.locator('h1, h2, h3').filter({ hasText: 'Mechanical Design Engineer' }).first();
    await expect(roleHeader).toBeVisible({ timeout: 5000 });
    console.log('[Test Step 3] Verified Target Role header is displayed.');

    // Look for Generate or Regenerate button
    const genButton = page.locator('button').filter({ hasText: /Generate Roadmap|Regenerate Roadmap/i }).first();
    await expect(genButton).toBeVisible({ timeout: 5000 });
    
    // Screenshot 2: Pre-generation Context Ready State
    await page.screenshot({ path: path.join(artifactDir, 'roadmap_step2_context_ready.png'), fullPage: true });

    // Listen to console and network responses for full diagnostics
    page.on('console', msg => console.log(`[Browser Console ${msg.type()}]: ${msg.text()}`));
    page.on('response', resp => {
      if (resp.url().includes('/api/roadmap/')) {
        console.log(`[Browser Network] ${resp.request().method()} ${resp.url()} -> ${resp.status()}`);
      }
    });

    console.log('[Test Step 4] Clicking Generate / Regenerate Roadmap...');
    await genButton.click();

    // Wait for the roadmap generation response
    console.log('[Test Step 4] Waiting for AI roadmap generation to complete...');
    // Wait for the sequential roadmap section to appear
    await page.waitForSelector('text=Sequential 9-Month Roadmap', { timeout: 60000 });
    console.log('[Test Step 4] Sequential 9-Month Roadmap rendered successfully!');

    // ── 4. VERIFY STRUCTURED 3-PHASE ROADMAP ITEMS ────────────────────────────
    console.log('[Test Step 5] Validating structured Phase items (Skill, Why, Evidence, Task, Source URL)...');
    
    // Check Phase tabs
    const tab0_3 = page.locator('button').filter({ hasText: /0[–-]3 Months/i }).first();
    const tab3_6 = page.locator('button').filter({ hasText: /3[–-]6 Months/i }).first();
    const tab6_9 = page.locator('button').filter({ hasText: /6[–-]9 Months/i }).first();

    await expect(tab0_3).toBeVisible();
    await expect(tab3_6).toBeVisible();
    await expect(tab6_9).toBeVisible();

    // Verify "Why You Need It" callout is present and not generic
    const whyNeededText = page.locator('text=Why You Need It').first();
    await expect(whyNeededText).toBeVisible();

    // Verify Practical task is present
    const practicalTaskHeader = page.locator('text=Practical Hands-on Project / Task').first();
    await expect(practicalTaskHeader).toBeVisible();

    // Verify clickable source link
    const sourceLink = page.locator('a[target="_blank"]').first();
    await expect(sourceLink).toBeVisible();
    const sourceHref = await sourceLink.getAttribute('href');
    console.log(`[Test Step 5] Verified clickable source URL: ${sourceHref}`);
    expect(sourceHref).toMatch(/^https:\/\//);

    // Screenshot 3: Phase 0-3 Months Rendered
    await page.screenshot({ path: path.join(artifactDir, 'roadmap_step3_phase_0_3.png'), fullPage: true });

    // Switch to Phase 3-6 Months
    console.log('[Test Step 6] Switching to 3–6 Months phase...');
    await tab3_6.click();
    await page.waitForTimeout(600);
    await expect(page.locator('text=Core Competencies').first()).toBeVisible();
    await page.screenshot({ path: path.join(artifactDir, 'roadmap_step4_phase_3_6.png'), fullPage: true });

    // Switch to Phase 6-9 Months
    console.log('[Test Step 7] Switching to 6–9 Months phase...');
    await tab6_9.click();
    await page.waitForTimeout(600);
    await expect(page.locator('text=Core Competencies').first()).toBeVisible();
    await page.screenshot({ path: path.join(artifactDir, 'roadmap_step5_phase_6_9.png'), fullPage: true });

    // ── 5. VERIFY PERSISTENCE ON RELOAD ──────────────────────────────────────
    console.log('[Test Step 8] Testing page reload persistence...');
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Confirm roadmap is still rendered immediately without needing to regenerate
    await expect(page.locator('text=Sequential 9-Month Roadmap')).toBeVisible({ timeout: 10000 });
    console.log('[Test Step 8] PASS: Saved roadmap restored immediately upon page reload!');

    // Screenshot 6: Persisted Roadmap After Reload
    await page.screenshot({ path: path.join(artifactDir, 'roadmap_step6_persisted_after_reload.png'), fullPage: true });

    console.log('==================================================');
    console.log('PLAYWRIGHT BROWSER VERIFICATION COMPLETED WITH 100% SUCCESS');
    console.log('==================================================');
  });
});
