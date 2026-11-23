import { chromium } from '@playwright/test';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

async function verifyVROfficePolish() {
  console.log('=== 1. STATIC & ASSET INTEGRITY VERIFICATION ===');
  const vrPath = path.resolve(process.cwd(), 'src/components/VRScene.tsx');
  const code = fs.readFileSync(vrPath, 'utf-8');

  const requiredAssets = [
    'public/assets/city_skyline.jpg',
    'public/avatars/mr-vinodh.png',
    'public/assets/tablet_notes.jpg',
    'public/assets/resume_sheet.jpg',
    'public/assets/nameplate_vinodh.png',
    'public/yatra_hero.jpg',
    'public/yatra_roadmap.jpg'
  ];
  for (const rel of requiredAssets) {
    const full = path.resolve(process.cwd(), rel);
    if (!fs.existsSync(full)) {
      throw new Error(`Missing required asset: ${rel}`);
    }
  }
  console.log('✔ All 7 VR texture & photography assets verified on disk.');

  // Check removal of dark opaque blocks, floating blue panel, and standing acrylic resume holder
  if (code.includes('Left Skyscraper District') || code.includes('position="-2.9 3.2 -8.6"')) {
    throw new Error('Dark opaque skyscraper blocks still present in VRScene.tsx');
  }
  if (code.includes('position="-5.3 1.8 -1.2"')) {
    throw new Error('Floating blue panel still present in VRScene.tsx');
  }
  if (code.includes('Standing Acrylic Resume Holder')) {
    throw new Error('Left-side standing acrylic resume holder was not removed');
  }
  if (!code.includes('id="interviewer-laptop"')) {
    throw new Error('Interviewer-side open laptop (#interviewer-laptop) missing');
  }
  console.log('✔ Dark skyline blocks, floating blue panel, and standing resume holder removed; interviewer laptop added.');

  console.log('\n=== 2. LIVE BROWSER 3D SCENE & WEBGL RENDERING VERIFICATION ===');
  // Check if server is already running on 3000, or spawn it
  let serverProc: any = null;
  let serverReady = false;
  try {
    const ping = await fetch('http://localhost:3000/api/esco/status').catch(() => null);
    if (ping && ping.ok) {
      serverReady = true;
    }
  } catch {}

  if (!serverReady) {
    serverProc = spawn(
      process.platform === 'win32' ? 'cmd.exe' : 'npx',
      process.platform === 'win32' ? ['/c', '.\\node_modules\\.bin\\tsx.cmd', 'server.ts'] : ['tsx', 'server.ts'],
      { stdio: 'pipe' }
    );
    serverProc.stdout.on('data', (chunk: any) => {
      if (chunk.toString().includes('Server running on')) {
        serverReady = true;
      }
    });
    for (let i = 0; i < 40; i++) {
      if (serverReady) break;
      await new Promise(r => setTimeout(r, 500));
    }
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    // Serve local A-Frame bundle when offline/sandboxed so 3D WebGL canvas initializes
    const localAframePath = path.resolve(process.cwd(), 'node_modules/aframe/dist/aframe-master.min.js');
    await page.route('**/*aframe*.js', async route => {
      await route.fulfill({
        path: localAframePath,
        contentType: 'application/javascript'
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('guest_session', 'true');
      localStorage.setItem('guest_uid', 'vr-polish-verifier');
    });

    await page.goto('http://localhost:3000/interview?company=Google&role=Software%20Engineer&vr=true', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Wait for A-Frame scene and 3D WebGL canvas to mount and finish loading
    await page.waitForSelector('a-scene', { timeout: 20000 });
    await page.waitForFunction(() => {
      const s: any = document.querySelector('a-scene');
      return Boolean(s && s.hasLoaded && s.canvas);
    }, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // Dismiss pre-interview modal if visible so the full 3D VR canvas is unobstructed
    const startBtn = page.getByRole('button', { name: /Start Placement Interview|Resume Interview/i });
    if (await startBtn.isVisible({ timeout: 6000 }).catch(() => false)) {
      await startBtn.click();
      await page.waitForTimeout(1200);
    }

    // Inspect live A-Frame 3D entities in the rendered DOM & Three.js scene graph
    const sceneAudit = await page.evaluate(() => {
      const sceneEl: any = document.querySelector('a-scene');
      const skyEl = document.querySelector('a-sky');
      const skylineCenter = document.getElementById('city-skyline-center');
      const skylineLeft = document.getElementById('city-skyline-left');
      const skylineRight = document.getElementById('city-skyline-right');
      const laptopEl = document.getElementById('interviewer-laptop');
      const avatarEl = document.getElementById('mr-vinodh-avatar');
      const deskEl = document.getElementById('executive-desk');
      const ambientLight = document.querySelector('a-light[type="ambient"]');
      const hemiLight = document.querySelector('a-light[type="hemisphere"]');

      return {
        hasScene: Boolean(sceneEl),
        hasCanvas: Boolean(sceneEl?.canvas),
        skyColor: skyEl?.getAttribute('color'),
        skylinePanels: {
          center: Boolean(skylineCenter) && skylineCenter?.getAttribute('src') === '#img-skyline',
          leftWing: Boolean(skylineLeft) && skylineLeft?.getAttribute('src') === '#img-skyline',
          rightWing: Boolean(skylineRight) && skylineRight?.getAttribute('src') === '#img-skyline'
        },
        hasInterviewerLaptop: Boolean(laptopEl),
        laptopPos: laptopEl?.getAttribute('position'),
        laptopChildCount: laptopEl?.children?.length || 0,
        hasAvatar: Boolean(avatarEl),
        avatarPos: avatarEl?.getAttribute('position'),
        hasDesk: Boolean(deskEl),
        ambientIntensity: ambientLight?.getAttribute('intensity'),
        hemiIntensity: hemiLight?.getAttribute('intensity'),
        webxrUiEnabled: sceneEl?.getAttribute('vr-mode-ui')
      };
    });

    console.log('Rendered 3D Scene Graph Audit:', JSON.stringify(sceneAudit, null, 2));

    if (!sceneAudit.hasScene || !sceneAudit.skylinePanels.center || !sceneAudit.skylinePanels.leftWing || !sceneAudit.skylinePanels.rightWing) {
      throw new Error('City skyline panoramic wrap-around panels failed to mount in live DOM');
    }
    if (!sceneAudit.hasInterviewerLaptop || sceneAudit.laptopChildCount < 4) {
      throw new Error('Interviewer open laptop entity failed to render properly');
    }

    // Capture verification screenshots of the live rendered VR office (Center view, Left Wall view, Right Wall view)
    const screenshotPath = path.resolve(process.cwd(), 'scratch', 'vr_office_polished_preview.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`✔ Live VR Office Center screenshot captured: ${screenshotPath}`);

    // Rotate camera slightly left (+35 deg yaw) to inspect Left Wall Artwork & interviewer laptop + left skyline
    await page.evaluate(() => {
      const cam: any = document.querySelector('a-camera');
      if (cam && cam.components && cam.components['look-controls']) {
        cam.components['look-controls'].yawObject.rotation.y = 0.58;
      } else if (cam) {
        cam.setAttribute('rotation', '0 33 0');
      }
    });
    await page.waitForTimeout(500);
    const leftShotPath = path.resolve(process.cwd(), 'scratch', 'vr_office_left_wall_preview.png');
    await page.screenshot({ path: leftShotPath });
    console.log(`✔ Live VR Office Left Wall screenshot captured: ${leftShotPath}`);

    // Rotate camera slightly right (-35 deg yaw) to inspect Right Walnut Wall Artwork & right skyline
    await page.evaluate(() => {
      const cam: any = document.querySelector('a-camera');
      if (cam && cam.components && cam.components['look-controls']) {
        cam.components['look-controls'].yawObject.rotation.y = -0.58;
      } else if (cam) {
        cam.setAttribute('rotation', '0 -33 0');
      }
    });
    await page.waitForTimeout(500);
    const rightShotPath = path.resolve(process.cwd(), 'scratch', 'vr_office_right_wall_preview.png');
    await page.screenshot({ path: rightShotPath });
    console.log(`✔ Live VR Office Right Wall screenshot captured: ${rightShotPath}`);
  } finally {
    await browser.close();
    if (serverProc) serverProc.kill();
  }
}

verifyVROfficePolish().catch(err => {
  console.error('VR Verification Error:', err);
  process.exit(1);
});
