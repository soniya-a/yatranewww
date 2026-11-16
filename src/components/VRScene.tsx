import React, { memo, useEffect, useRef, useState, useMemo } from 'react';

interface VRSceneProps {
  cameraZ?: number;
  cameraRigPos?: string;
  avatarState?: 'idle' | 'speaking' | 'listening' | 'thinking' | 'concerned' | 'error';
  targetCompany?: string;
  targetRole?: string;
  questions?: any[];
  currentQuestionIndex?: number;
  selectedInterviewer?: any;
  daylight?: any;
  enterVRMode?: () => void;
  enterARMode?: () => void;
  [key: string]: any;
}

export const VRScene = memo(({
  cameraZ = 1.5,
  avatarState = 'idle',
  questions = [],
  currentQuestionIndex = 0,
}: VRSceneProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSceneMounted, setIsSceneMounted] = useState(false);

  // Derive active question data dynamically
  const activeQuestion = questions && questions[currentQuestionIndex];
  const questionId = activeQuestion?.question_id || `Q${String(currentQuestionIndex + 1).padStart(3, '0')}`;
  const rawQuestionText = activeQuestion?.question_text || activeQuestion?.question || "TELL ME ABOUT A TIME YOU LED A PROJECT.";
  // Clean uppercase format matching the reference image's floating glass bubble
  const formattedQuestionText = useMemo(() => {
    let text = String(rawQuestionText).trim();
    if (!text) text = "TELL ME ABOUT A TIME YOU LED A PROJECT.";
    return text.toUpperCase();
  }, [rawQuestionText]);

  // Provenance label badge for 3D floating display
  const provenanceBadge = useMemo(() => {
    if (!activeQuestion) return `${questionId} · CANONICAL QUESTION`;
    const cat = activeQuestion.category || 'AI_PREDICTED';
    const round = activeQuestion.round ? `${activeQuestion.round.toUpperCase()} · ` : '';
    if (cat === 'REPORTED') {
      const platform = activeQuestion.source?.platform ? ` (${activeQuestion.source.platform.toUpperCase()})` : '';
      return `${questionId} · ${round}REPORTED${platform}`;
    }
    if (cat === 'RESUME_BASED') {
      return `${questionId} · ${round}VERIFIED RESUME CLAIM`;
    }
    if (cat === 'OFFICIAL_DERIVED') {
      return `${questionId} · ${round}OFFICIAL PREPARATION GUIDE`;
    }
    return `${questionId} · ${round}AI PREDICTED`;
  }, [activeQuestion, questionId]);

  // Update dynamic camera rig zoom
  useEffect(() => {
    if (!isSceneMounted) return;
    const rig = document.getElementById('camera-rig');
    if (rig) {
      // Base candidate seated position matching reference image perspective: x=0, y=1.18, z=0.45
      const zOffset = (cameraZ || 1.5) - 1.5;
      rig.setAttribute('position', `0 1.18 ${0.45 + zOffset * 0.35}`);
    }
  }, [cameraZ, isSceneMounted]);

  // Update floating question text & provenance badge dynamically without re-mounting the 3D scene
  useEffect(() => {
    if (!isSceneMounted) return;
    const qBadge = document.getElementById('floating-q-badge');
    if (qBadge) {
      qBadge.setAttribute('value', provenanceBadge);
    }
    const qText = document.getElementById('floating-q-text');
    if (qText) {
      qText.setAttribute('value', formattedQuestionText);
    }
  }, [provenanceBadge, formattedQuestionText, isSceneMounted]);

  // Update Mr. Vinodh's avatar speaking animation and visual focus dynamically
  useEffect(() => {
    const avatarEl = document.getElementById('mr-vinodh-avatar');
    const speechIndicator = document.getElementById('speech-indicator');
    if (!avatarEl) return;

    if (avatarState === 'speaking') {
      avatarEl.setAttribute('animation__speech', 'property: scale; to: 1.025 1.025 1.025; dir: alternate; dur: 380; loop: true; easing: easeInOutQuad');
      avatarEl.setAttribute('animation__bob', 'property: position; to: 0 1.405 0.02; dir: alternate; dur: 380; loop: true; easing: easeInOutQuad');
      if (speechIndicator) speechIndicator.setAttribute('visible', 'true');
    } else if (avatarState === 'listening') {
      avatarEl.removeAttribute('animation__speech');
      avatarEl.removeAttribute('animation__bob');
      avatarEl.setAttribute('scale', '0.99 0.99 0.99');
      avatarEl.setAttribute('position', '0 1.385 0.02');
      if (speechIndicator) speechIndicator.setAttribute('visible', 'false');
    } else {
      avatarEl.removeAttribute('animation__speech');
      avatarEl.removeAttribute('animation__bob');
      avatarEl.setAttribute('scale', '1 1 1');
      avatarEl.setAttribute('position', '0 1.39 0.02');
      if (speechIndicator) speechIndicator.setAttribute('visible', 'false');
    }
  }, [avatarState]);

  // Mount 3D Scene once and clean up WebGL on unmount to prevent leaks
  useEffect(() => {
    setIsSceneMounted(true);

    return () => {
      try {
        const sceneEl = document.querySelector('a-scene');
        if (sceneEl) {
          if (typeof (sceneEl as any).pause === 'function') {
            (sceneEl as any).pause();
          }
          const renderer = (sceneEl as any).renderer;
          if (renderer && typeof renderer.dispose === 'function') {
            renderer.dispose();
            if (renderer.forceContextLoss) {
              renderer.forceContextLoss();
            }
          }
        }
      } catch (err) {
        console.warn('[VRScene] Cleanup note:', err);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 w-full h-full z-0 select-none overflow-hidden"
    >
      {isSceneMounted && (
        <a-scene
          embedded
          vr-mode-ui="enabled: true"
          renderer="antialias: true; colorManagement: true; physicallyCorrectLights: true; alpha: false"
          class="absolute inset-0 w-full h-full z-0"
        >
          {/* ASSET MANAGEMENT SYSTEM */}
          <a-assets timeout="10000">
            <img id="img-skyline" src="/assets/city_skyline.jpg" crossOrigin="anonymous" />
            <img id="img-vinodh" src="/avatars/mr-vinodh.png" crossOrigin="anonymous" />
            <img id="img-tablet" src="/assets/tablet_notes.jpg" crossOrigin="anonymous" />
            <img id="img-resume" src="/assets/resume_sheet.jpg" crossOrigin="anonymous" />
            <img id="img-nameplate" src="/assets/nameplate_vinodh.png" crossOrigin="anonymous" />
          </a-assets>

          {/* DYNAMIC CANDIDATE SEATED CAMERA RIG */}
          {/* DYNAMIC CANDIDATE SEATED CAMERA RIG (Matches Reference Perspective) */}
          <a-entity id="camera-rig" position="0 1.18 0.45">
            <a-camera 
              position="0 0 0" 
              rotation="-6 0 0"
              look-controls="pointerLockEnabled: false; reverseMouseDrag: false; touchEnabled: true"
              wasd-controls="enabled: false"
            >
              <a-cursor 
                color="#38bdf8" 
                scale="0.35 0.35 0.35" 
                opacity="0.45" 
                fuse="false"
              ></a-cursor>
            </a-camera>

            {/* WebXR Headset Controller Support */}
            <a-entity laser-controls="hand: right"></a-entity>
            <a-entity laser-controls="hand: left"></a-entity>
          </a-entity>

          {/* CANDIDATE SEATED CHAIR BASE (Visible when candidate looks downward) */}
          <a-entity position="0 0 0.45">
            <a-cylinder position="0 0.22 0" radius="0.035" height="0.44" color="#18181b" material="metalness: 0.8; roughness: 0.3"></a-cylinder>
            <a-box position="0 0.45 0" width="0.58" height="0.07" depth="0.52" color="#09090b" material="roughness: 0.7"></a-box>
          </a-entity>

          {/* CANDIDATE FIRST-PERSON VR HANDS & SUIT SLEEVES (Resting Naturally Over Desk Mat) */}
          <a-entity id="candidate-hands" position="0 0 0">
            {/* Left Forearm & Hand: Angled inward toward tablet on desk mat */}
            <a-entity position="-0.26 0.772 -0.05">
              {/* Suit Sleeve (Charcoal Navy Business Suit) */}
              <a-cylinder position="-0.04 -0.01 0.07" radius="0.046" height="0.16" rotation="75 35 -15" color="#1e293b" material="roughness: 0.85"></a-cylinder>
              {/* Crisp White Shirt Cuff */}
              <a-cylinder position="-0.02 0.005 0.028" radius="0.042" height="0.025" rotation="75 35 -15" color="#ffffff" material="roughness: 0.5"></a-cylinder>
              {/* Wrist & Palm */}
              <a-box position="0 0.012 0" width="0.08" height="0.020" depth="0.10" color="#dcb295" rotation="10 25 -10" material="roughness: 0.8"></a-box>
              {/* Thumb */}
              <a-cylinder position="0.045 0.014 -0.01" radius="0.008" height="0.05" rotation="15 65 10" color="#dcb295"></a-cylinder>
              {/* Fingers extended gently over desk mat */}
              <a-cylinder position="-0.025 0.01 -0.065" radius="0.007" height="0.05" rotation="80 20 -10" color="#dcb295"></a-cylinder>
              <a-cylinder position="-0.008 0.01 -0.072" radius="0.007" height="0.055" rotation="80 22 -10" color="#dcb295"></a-cylinder>
              <a-cylinder position="0.008 0.01 -0.068" radius="0.007" height="0.052" rotation="80 25 -10" color="#dcb295"></a-cylinder>
              <a-cylinder position="0.025 0.01 -0.06" radius="0.006" height="0.045" rotation="80 28 -10" color="#dcb295"></a-cylinder>
            </a-entity>

            {/* Right Forearm & Hand: Mirrored naturally opposite left hand */}
            <a-entity position="0.26 0.772 -0.05">
              {/* Suit Sleeve (Charcoal Navy Business Suit) */}
              <a-cylinder position="0.04 -0.01 0.07" radius="0.046" height="0.16" rotation="75 -35 15" color="#1e293b" material="roughness: 0.85"></a-cylinder>
              {/* Crisp White Shirt Cuff */}
              <a-cylinder position="0.02 0.005 0.028" radius="0.042" height="0.025" rotation="75 -35 15" color="#ffffff" material="roughness: 0.5"></a-cylinder>
              {/* Wrist & Palm */}
              <a-box position="0 0.012 0" width="0.08" height="0.020" depth="0.10" color="#dcb295" rotation="10 -25 10" material="roughness: 0.8"></a-box>
              {/* Thumb */}
              <a-cylinder position="-0.045 0.014 -0.01" radius="0.008" height="0.05" rotation="15 -65 -10" color="#dcb295"></a-cylinder>
              {/* Fingers extended gently over desk mat */}
              <a-cylinder position="0.025 0.01 -0.065" radius="0.007" height="0.05" rotation="80 -20 10" color="#dcb295"></a-cylinder>
              <a-cylinder position="0.008 0.01 -0.072" radius="0.007" height="0.055" rotation="80 -22 10" color="#dcb295"></a-cylinder>
              <a-cylinder position="-0.008 0.01 -0.068" radius="0.007" height="0.052" rotation="80 -25 10" color="#dcb295"></a-cylinder>
              <a-cylinder position="-0.025 0.01 -0.06" radius="0.006" height="0.045" rotation="80 -28 10" color="#dcb295"></a-cylinder>
            </a-entity>
          </a-entity>

          {/* ═══════════════════════════════════════════════════════════════
              LIGHTING & REALISTIC EXECUTIVE OFFICE AMBIENCE
          ═══════════════════════════════════════════════════════════════ */}
          <a-light type="ambient" color="#f8fafc" intensity="0.95"></a-light>
          <a-light type="directional" color="#ffffff" intensity="0.9" position="-3 5 -2"></a-light>
          <a-light type="directional" color="#fffbf5" intensity="0.6" position="3 4 2"></a-light>

          {/* ═══════════════════════════════════════════════════════════════
              GENUINE 3D OFFICE ROOM GEOMETRY (Enclosed Seamless Office)
          ═══════════════════════════════════════════════════════════════ */}
          {/* Floor: Dark Executive Carpet (#1e293b / slate charcoal - Expanded 28x28) */}
          <a-plane position="0 0 0" rotation="-90 0 0" width="28" height="28" color="#1e293b" material="roughness: 0.95; metalness: 0.05"></a-plane>

          {/* Ceiling: Clean Executive White (#f8fafc - Expanded 28x28) */}
          <a-plane position="0 3.2 0" rotation="90 0 0" width="28" height="28" color="#f1f5f9" material="roughness: 0.9"></a-plane>

          {/* Architectural Drop-Ceiling LED Lighting Panels */}
          <a-plane position="-1.5 3.19 -1.0" rotation="90 0 0" width="1.6" height="0.6" color="#ffffff" material="shader: flat; opacity: 0.95"></a-plane>
          <a-box position="-1.5 3.195 -1.0" width="1.64" height="0.02" depth="0.64" color="#334155" material="metalness: 0.8"></a-box>
          <a-plane position="1.5 3.19 -1.0" rotation="90 0 0" width="1.6" height="0.6" color="#ffffff" material="shader: flat; opacity: 0.95"></a-plane>
          <a-box position="1.5 3.195 -1.0" width="1.64" height="0.02" depth="0.64" color="#334155" material="metalness: 0.8"></a-box>
          <a-plane position="-1.5 3.19 1.4" rotation="90 0 0" width="1.6" height="0.6" color="#ffffff" material="shader: flat; opacity: 0.95"></a-plane>
          <a-box position="-1.5 3.195 1.4" width="1.64" height="0.02" depth="0.64" color="#334155" material="metalness: 0.8"></a-box>
          <a-plane position="1.5 3.19 1.4" rotation="90 0 0" width="1.6" height="0.6" color="#ffffff" material="shader: flat; opacity: 0.95"></a-plane>
          <a-box position="1.5 3.195 1.4" width="1.64" height="0.02" depth="0.64" color="#334155" material="metalness: 0.8"></a-box>

          {/* Front Wall (behind candidate, enclosing office) */}
          <a-box position="0 1.6 4.2" width="12" height="3.2" depth="0.1" color="#f1f5f9" material="roughness: 0.9"></a-box>
          <a-box position="0 1.6 4.14" width="1.6" height="2.4" depth="0.04" color="#334155" material="metalness: 0.5"></a-box>
          <a-box position="0 1.6 4.14" width="1.45" height="2.25" depth="0.02" color="#cbd5e1" material="opacity: 0.45; transparent: true"></a-box>

          {/* ═══════════════════════════════════════════════════════════════
              RIGHT WALL: WARM VERTICAL WALNUT WOOD SLAT ARCHITECTURE
          ═══════════════════════════════════════════════════════════════ */}
          <a-box position="4.2 1.6 0" width="0.1" height="3.2" depth="8.4" color="#422513" material="roughness: 0.7"></a-box>

          {/* Vertical Walnut Slat Ribs */}
          {Array.from({ length: 42 }).map((_, i) => {
            const zPos = -3.7 + i * 0.18;
            return (
              <a-box 
                key={`slat-${i}`} 
                position={`4.14 1.6 ${zPos.toFixed(2)}`} 
                width="0.04" 
                height="3.2" 
                depth="0.09" 
                color="#6d4427" 
                material="roughness: 0.55; metalness: 0.05"
              ></a-box>
            );
          })}

          {/* Framed Executive Artwork on Right Walnut Wall */}
          <a-entity position="4.08 1.8 -0.8" rotation="0 -90 0">
            <a-box position="0 0 0" width="1.3" height="1.6" depth="0.03" color="#0f172a" material="metalness: 0.8; roughness: 0.3"></a-box>
            <a-plane position="0 0 0.018" width="1.18" height="1.48" color="#f8fafc"></a-plane>
            <a-plane position="0 0 0.02" width="0.95" height="1.2" color="#1e293b" material="shader: flat">
              <a-ring position="0 0 0.005" radius-inner="0.25" radius-outer="0.26" color="#38bdf8"></a-ring>
              <a-plane position="0 0 0.006" width="0.6" height="0.01" color="#f59e0b" rotation="0 0 35"></a-plane>
            </a-plane>
          </a-entity>

          {/* ═══════════════════════════════════════════════════════════════
              LEFT WALL: FLOOR-TO-CEILING GLASS ARCHITECTURE & INDOOR PLANT
          ═══════════════════════════════════════════════════════════════ */}
          <a-box position="-4.2 1.6 0" width="0.04" height="3.2" depth="8.4" color="#e0f2fe" material="opacity: 0.18; transparent: true; roughness: 0.05; metalness: 0.9"></a-box>
          {[-3.0, -1.5, 0, 1.5, 3.0].map((z, idx) => (
            <a-box 
              key={`left-mullion-${idx}`} 
              position={`-4.18 1.6 ${z}`} 
              width="0.08" 
              height="3.2" 
              depth="0.08" 
              color="#18181b" 
              material="metalness: 0.8; roughness: 0.3"
            ></a-box>
          ))}

          {/* Executive Hallway Interior (Seen through left glass partition) */}
          <a-box position="-6.4 1.6 0" width="0.1" height="3.2" depth="12" color="#e2e8f0" material="roughness: 0.9"></a-box>
          <a-plane position="-5.3 1.8 -1.2" rotation="0 90 0" width="1.2" height="1.5" color="#0284c7" material="shader: flat"></a-plane>

          {/* INDOOR EXECUTIVE POTTED PLANT (Left Corner, matching Reference Image) */}
          <a-entity position="-2.6 0 -0.9">
            <a-cylinder position="0 0.25 0" radius="0.24" height="0.5" color="#f8fafc" material="roughness: 0.2; metalness: 0.1"></a-cylinder>
            <a-cylinder position="0 0.02 0" radius="0.26" height="0.04" color="#0f172a"></a-cylinder>
            <a-cylinder position="0 0.48 0" radius="0.22" height="0.02" color="#26170e"></a-cylinder>
            <a-cylinder position="0 0.7 0" radius="0.02" height="0.45" color="#451a03" rotation="5 0 8"></a-cylinder>
            <a-cylinder position="-0.04 0.9 0.02" radius="0.016" height="0.4" color="#15803d" rotation="15 20 -12"></a-cylinder>
            <a-cylinder position="0.04 0.85 -0.03" radius="0.016" height="0.38" color="#15803d" rotation="-12 -30 18"></a-cylinder>
            <a-sphere position="0 1.05 0" radius="0.3" scale="1.4 0.25 1.1" color="#15803d" material="roughness: 0.7" rotation="20 15 10"></a-sphere>
            <a-sphere position="-0.15 1.25 0.05" radius="0.28" scale="1.3 0.2 1.2" color="#16a34a" material="roughness: 0.7" rotation="10 -25 -15"></a-sphere>
            <a-sphere position="0.12 1.18 -0.08" radius="0.26" scale="1.2 0.2 1.1" color="#166534" material="roughness: 0.7" rotation="-25 35 15"></a-sphere>
            <a-sphere position="0 1.38 0" radius="0.24" scale="1.1 0.2 1.0" color="#22c55e" material="roughness: 0.7" rotation="5 0 5"></a-sphere>
          </a-entity>

          {/* ═══════════════════════════════════════════════════════════════
              REAR WALL: FLOOR-TO-CEILING GLASS & CITY SKYLINE
          ═══════════════════════════════════════════════════════════════ */}
          {/* Main Window Mullions (Dark Charcoal Steel #18181b) */}
          {[-3.4, -2.1, -0.7, 0.7, 2.1, 3.4].map((x, idx) => (
            <a-box 
              key={`rear-mullion-${idx}`} 
              position={`${x} 1.6 -3.78`} 
              width="0.08" 
              height="3.2" 
              depth="0.1" 
              color="#18181b" 
              material="metalness: 0.85; roughness: 0.25"
            ></a-box>
          ))}
          <a-box position="0 1.05 -3.78" width="8.4" height="0.07" depth="0.09" color="#18181b" material="metalness: 0.85; roughness: 0.25"></a-box>
          <a-box position="0 2.35 -3.78" width="8.4" height="0.07" depth="0.09" color="#18181b" material="metalness: 0.85; roughness: 0.25"></a-box>
          <a-box position="0 3.16 -3.78" width="8.4" height="0.08" depth="0.1" color="#18181b" material="metalness: 0.85; roughness: 0.25"></a-box>

          {/* Transparent Glass Pane */}
          <a-box position="0 1.6 -3.76" width="8.4" height="3.2" depth="0.02" color="#e0f2fe" material="opacity: 0.12; transparent: true; metalness: 0.95; roughness: 0.05"></a-box>

          {/* OUTDOOR CITY SKYLINE PANORAMA BACKDROP (Anchored behind windows) */}
          <a-plane 
            src="#img-skyline"
            position="0 3.2 -13.0" 
            width="36" 
            height="16" 
            material="shader: flat"
          ></a-plane>

          {/* OUTDOOR 3D SKYSCRAPER GEOMETRY BLOCKS (Creating True Depth Parallax) */}
          <a-box position="-5.5 4.5 -10" width="2.8" height="12" depth="3.5" color="#cbd5e1" material="roughness: 0.85"></a-box>
          <a-box position="-2.6 3.2 -9" width="2.0" height="8.5" depth="2.5" color="#94a3b8" material="roughness: 0.7"></a-box>
          <a-box position="3.2 3.8 -9.5" width="2.4" height="9.5" depth="3.0" color="#cbd5e1" material="roughness: 0.8"></a-box>
          <a-box position="6.0 5.0 -11" width="3.0" height="12" depth="3.8" color="#64748b" material="roughness: 0.75"></a-box>

          {/* ═══════════════════════════════════════════════════════════════
              THE EXECUTIVE WOODEN DESK (Matches Reference Image Proportions)
          ═══════════════════════════════════════════════════════════════ */}
          <a-entity id="executive-desk" position="0 0 0">
            {/* Top Walnut Desktop Surface */}
            <a-box position="0 0.74 -0.6" width="2.5" height="0.06" depth="1.35" color="#7a4f31" material="roughness: 0.55; metalness: 0.08"></a-box>
            <a-box position="0 0.768 -0.6" width="2.46" height="0.008" depth="1.31" color="#8a5a38" material="roughness: 0.5; metalness: 0.05"></a-box>

            {/* Heavy-gauge Dark Steel Pedestal Supports (Left & Right) */}
            <a-box position="-1.08 0.37 -0.6" width="0.1" height="0.74" depth="1.15" color="#18181b" material="metalness: 0.8; roughness: 0.3"></a-box>
            <a-box position="1.08 0.37 -0.6" width="0.1" height="0.74" depth="1.15" color="#18181b" material="metalness: 0.8; roughness: 0.3"></a-box>
            <a-box position="0 0.42 -1.18" width="2.16" height="0.58" depth="0.025" color="#5c371d" material="roughness: 0.6"></a-box>

            {/* ── DESK SURFACE ITEMS (Exact 1-to-1 Match to Reference Image) ── */}

            {/* 1. Black Desk Mat (Center Front) */}
            <a-plane 
              position="0 0.772 -0.15" 
              rotation="-90 0 0" 
              width="1.12" 
              height="0.65" 
              color="#18181b" 
              material="roughness: 0.85; metalness: 0.1"
            ></a-plane>

            {/* 2. Candidate Flat Resume Paper Stack (Left of desk mat, real A4 scale) */}
            <a-entity position="-0.65 0.776 -0.15" rotation="-90 0 4">
              <a-box position="0 0 -0.006" width="0.22" height="0.30" depth="0.012" color="#e2e8f0"></a-box>
              <a-plane width="0.22" height="0.30" src="#img-resume" material="shader: flat"></a-plane>
            </a-entity>

            {/* 3. The Digital Tablet (Center of Desk Mat) */}
            <a-entity position="-0.02 0.776 -0.15" rotation="-90 0 0">
              <a-box position="0 0 -0.004" width="0.24" height="0.33" depth="0.008" color="#09090b" material="metalness: 0.8; roughness: 0.2"></a-box>
              <a-plane position="0 0 0.001" width="0.22" height="0.31" src="#img-tablet" material="shader: flat"></a-plane>
            </a-entity>

            {/* 4. Spiral Notepad & Stylus Pen (Right of Tablet on Desk Mat, real scale) */}
            <a-entity position="0.26 0.776 -0.15" rotation="-90 0 4">
              <a-box position="0 0 -0.005" width="0.16" height="0.24" depth="0.01" color="#f8fafc"></a-box>
              <a-plane position="0 0 0.001" width="0.15" height="0.23" color="#ffffff">
                <a-plane position="0 0.08 0.001" width="0.13" height="0.008" color="#38bdf8"></a-plane>
                <a-plane position="0 0.04 0.001" width="0.13" height="0.004" color="#cbd5e1"></a-plane>
                <a-plane position="0 0.00 0.001" width="0.13" height="0.004" color="#cbd5e1"></a-plane>
                <a-plane position="0 -0.04 0.001" width="0.13" height="0.004" color="#cbd5e1"></a-plane>
                <a-plane position="0 -0.08 0.001" width="0.13" height="0.004" color="#cbd5e1"></a-plane>
              </a-plane>
              <a-cylinder position="0 0.12 0.005" radius="0.006" height="0.14" rotation="0 0 90" color="#94a3b8" material="metalness: 0.9"></a-cylinder>
            </a-entity>
            <a-cylinder position="0.38 0.782 -0.15" radius="0.004" height="0.15" rotation="90 0 5" color="#f8fafc" material="roughness: 0.3; metalness: 0.4"></a-cylinder>

            {/* 5. Standing Acrylic Resume Holder (On Left Side of Desk) */}
            <a-entity position="-0.85 0.77 -0.72" rotation="0 22 0">
              <a-box position="0 0.008 0" width="0.26" height="0.012" depth="0.12" color="#e0f2fe" material="opacity: 0.35; transparent: true; roughness: 0.1"></a-box>
              <a-box position="0 0.16 -0.04" width="0.26" height="0.32" depth="0.008" rotation="-12 0 0" color="#e0f2fe" material="opacity: 0.35; transparent: true; roughness: 0.1"></a-box>
              <a-plane position="0 0.17 -0.03" rotation="-12 0 0" width="0.24" height="0.32" src="#img-resume" material="shader: flat"></a-plane>
            </a-entity>

            {/* 6. INTERVIEWER NAMEPLATE: MR. VINODH — HIRING MANAGER */}
            <a-entity position="0.68 0.77 -0.85" rotation="0 -22 0">
              <a-box position="0 0.035 0" width="0.54" height="0.07" depth="0.08" color="#311b0e" material="roughness: 0.5; metalness: 0.1"></a-box>
              <a-plane 
                position="0 0.035 0.042" 
                width="0.52" 
                height="0.065" 
                src="#img-nameplate" 
                material="shader: flat"
              ></a-plane>
            </a-entity>

          </a-entity>

          {/* ═══════════════════════════════════════════════════════════════
              MR. VINODH: SEATED 3D INTERVIEWER (Facing Candidate Across Desk)
          ═══════════════════════════════════════════════════════════════ */}
          <a-entity id="interviewer-vinodh-group" position="0 0 -1.72">
            {/* Executive Leather Ergonomic Chair (Positioned strictly BEHIND avatar body) */}
            <a-entity id="executive-chair" position="0 0 -0.05">
              {/* Ergonomic High-Back Cushion (rises behind his shoulders) */}
              <a-box position="0 1.25 -0.08" width="0.84" height="0.70" depth="0.06" color="#09090b" material="roughness: 0.7; metalness: 0.1"></a-box>
              {/* Headrest (visible just behind/beside his head, like the reference) */}
              <a-box position="0 1.84 -0.09" width="0.46" height="0.22" depth="0.06" color="#09090b" material="roughness: 0.7"></a-box>
              {/* Chair back spine connecting back and headrest */}
              <a-box position="0 1.62 -0.09" width="0.14" height="0.3" depth="0.05" color="#18181b" material="roughness: 0.6"></a-box>
              {/* Seat cushion (tucked back under hips behind avatar plane) */}
              <a-box position="0 0.42 -0.16" width="0.66" height="0.08" depth="0.26" color="#09090b" material="roughness: 0.7"></a-box>
              {/* Armrests (flanking sides behind avatar plane) */}
              <a-box position="-0.38 0.68 -0.12" width="0.04" height="0.04" depth="0.22" color="#e2e8f0" material="metalness: 0.85; roughness: 0.2"></a-box>
              <a-box position="0.38 0.68 -0.12" width="0.04" height="0.04" depth="0.22" color="#e2e8f0" material="metalness: 0.85; roughness: 0.2"></a-box>
              {/* Central Chrome Base Pillar */}
              <a-cylinder position="0 0.20 -0.16" radius="0.035" height="0.4" color="#e2e8f0" material="metalness: 0.9; roughness: 0.1"></a-cylinder>
            </a-entity>

            {/* SEATED MR. VINODH AVATAR FIGURE */}
            <a-entity 
              id="mr-vinodh-avatar" 
              position="0 1.39 0.02"
              animation="property: position; to: 0 1.398 0.02; dir: alternate; dur: 3200; easing: easeInOutSine; loop: true"
            >
              <a-image 
                src="#img-vinodh" 
                position="0 0 0" 
                width="1.5" 
                height="1.5" 
                material="shader: flat; transparent: true; alphaTest: 0.12"
              ></a-image>

              {/* Dynamic Speech Glow Visualizer */}
              <a-ring 
                id="speech-indicator" 
                visible="false"
                position="0 0.42 -0.01" 
                radius-inner="0.3" 
                radius-outer="0.32" 
                color="#38bdf8" 
                material="shader: flat; opacity: 0.75"
                animation="property: scale; to: 1.05 1.05 1.05; dir: alternate; dur: 380; loop: true"
              ></a-ring>
            </a-entity>
          </a-entity>

          {/* ═══════════════════════════════════════════════════════════════
              FLOATING INTERVIEW QUESTION DISPLAY (Matches Reference Image)
          ═══════════════════════════════════════════════════════════════ */}
          <a-entity id="floating-question-display" position="0 2.36 -1.72" rotation="12 0 0" scale="0.85 0.85 0.85">
            {/* Translucent Curved Glassmorphism Bubble with Cyan Glow */}
            <a-plane 
              width="2.6" 
              height="0.68" 
              color="#0f172a" 
              material="shader: flat; opacity: 0.88; transparent: true"
            ></a-plane>

            {/* Glowing Accent Border Frame */}
            <a-plane position="0 0.34 0.002" width="2.6" height="0.012" color="#38bdf8" material="shader: flat"></a-plane>
            <a-plane position="0 -0.34 0.002" width="2.6" height="0.012" color="#38bdf8" material="shader: flat"></a-plane>
            <a-plane position="-1.3 0 0.002" width="0.012" height="0.68" color="#38bdf8" material="shader: flat"></a-plane>
            <a-plane position="1.3 0 0.002" width="0.012" height="0.68" color="#38bdf8" material="shader: flat"></a-plane>

            {/* Provenance Badge Pill */}
            <a-text
              id="floating-q-badge"
              value={provenanceBadge}
              position="0 0.22 0.01"
              align="center"
              color="#38bdf8"
              scale="0.22 0.22 0.22"
              width="7.2"
              wrap-count="56"
              font="kelsonsans"
            ></a-text>

            {/* Main Bold Question Text: e.g. "TELL ME ABOUT A TIME YOU LED A PROJECT." */}
            <a-text 
              id="floating-q-text"
              value={formattedQuestionText}
              position="0 -0.04 0.01" 
              align="center" 
              color="#ffffff" 
              scale="0.30 0.30 0.30" 
              width="7.2"
              wrap-count="48"
              font="kelsonsans"
            ></a-text>
          </a-entity>

        </a-scene>
      )}
    </div>
  );
}, (prev, next) => {
  return (
    prev.cameraZ === next.cameraZ &&
    prev.avatarState === next.avatarState &&
    prev.currentQuestionIndex === next.currentQuestionIndex &&
    prev.questions?.length === next.questions?.length
  );
});
