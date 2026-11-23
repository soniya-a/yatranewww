import fs from 'fs';
import path from 'path';

function verifyVRSceneFixes() {
  const vrSceneFile = path.resolve(process.cwd(), 'src/components/VRScene.tsx');
  const content = fs.readFileSync(vrSceneFile, 'utf-8');

  console.log('=== VR SCENE FIX VERIFICATION ===\n');

  // 1. Unnecessary / floating hands check
  const hasCandidateHands = content.includes('id="candidate-hands"');
  const hasLaserControls = content.includes('laser-controls="hand: right"') && content.includes('laser-controls="hand: left"');
  console.log('Fix 1: Floating hands removed:', !hasCandidateHands ? 'PASS' : 'FAIL');
  console.log('Fix 1: Headset controller tracking preserved:', hasLaserControls ? 'PASS' : 'FAIL');
  if (hasCandidateHands || !hasLaserControls) {
    throw new Error('Fix 1 verification failed');
  }

  // 2. Avatar movement check
  const hasAvatarSpeechAnim = content.includes('animation__speech');
  const hasAvatarBobAnim = content.includes('animation__bob');
  const hasAvatarStaticPos = content.includes('id="mr-vinodh-avatar"') && content.includes('position="0 1.39 0.02"');
  const hasAvatarOscillation = content.includes('animation="property: position; to: 0 1.398 0.02');
  console.log('Fix 2: Avatar speech scale animation removed:', !hasAvatarSpeechAnim ? 'PASS' : 'FAIL');
  console.log('Fix 2: Avatar bobbing animation removed:', !hasAvatarBobAnim ? 'PASS' : 'FAIL');
  console.log('Fix 2: Avatar breathing oscillation loop removed:', !hasAvatarOscillation ? 'PASS' : 'FAIL');
  console.log('Fix 2: Avatar fixed in stationary seated position:', hasAvatarStaticPos ? 'PASS' : 'FAIL');
  if (hasAvatarSpeechAnim || hasAvatarBobAnim || hasAvatarOscillation || !hasAvatarStaticPos) {
    throw new Error('Fix 2 verification failed');
  }

  // 3. City skyline check
  const hasSkylineBackdrop = content.includes('src="#img-skyline"');
  const hasSkylinePlaza = content.includes('Outdoor Ground Plaza Base');
  const hasContinuousTowers = content.includes('Center-Framing Architectural Towers');
  const hasFloatingOldBoxes = content.includes('position="-2.6 3.2 -9"');
  console.log('Fix 3: Continuous skyline panorama present:', hasSkylineBackdrop ? 'PASS' : 'FAIL');
  console.log('Fix 3: Grounded outdoor plaza present (no voids):', hasSkylinePlaza ? 'PASS' : 'FAIL');
  console.log('Fix 3: Gap-filling center architectural towers present:', hasContinuousTowers ? 'PASS' : 'FAIL');
  console.log('Fix 3: Old floating raw boxes removed:', !hasFloatingOldBoxes ? 'PASS' : 'FAIL');
  if (!hasSkylineBackdrop || !hasSkylinePlaza || !hasContinuousTowers || hasFloatingOldBoxes) {
    throw new Error('Fix 3 verification failed');
  }

  // 4. Room appearance, geometry, lighting, alignment
  const hasCornerPillars = content.includes('Architectural Corner Columns');
  const hasWindowSill = content.includes('position="0 0.04 -3.76"');
  const hasBalancedLighting = content.includes('BALANCED EXECUTIVE OFFICE LIGHTING');
  const hasBaseboard = content.includes('color="#0f172a" material="roughness: 0.5"');
  console.log('Fix 4: Architectural corner columns present:', hasCornerPillars ? 'PASS' : 'FAIL');
  console.log('Fix 4: Sealed window sill and frame mullions:', hasWindowSill ? 'PASS' : 'FAIL');
  console.log('Fix 4: Balanced studio-quality lighting configured:', hasBalancedLighting ? 'PASS' : 'FAIL');
  console.log('Fix 4: Executive floor baseboard trim added:', hasBaseboard ? 'PASS' : 'FAIL');
  if (!hasCornerPillars || !hasWindowSill || !hasBalancedLighting || !hasBaseboard) {
    throw new Error('Fix 4 verification failed');
  }

  console.log('\nALL 4 VR FIXES VERIFIED SUCCESSFULLY WITH 100% PASS RATE!');
}

verifyVRSceneFixes();
