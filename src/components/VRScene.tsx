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

  // The interviewer remains seated silently in one fixed position without forward/backward movement, oscillation or gestures
  useEffect(() => {
    const avatarEl = document.getElementById('mr-vinodh-avatar');
    if (!avatarEl) return;
    avatarEl.setAttribute('scale', '1 1 1');
    avatarEl.setAttribute('position', '0 1.39 0.02');
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
          renderer="antialias: true; colorManagement: true; physicallyCorrectLights: false; alpha: false"
          class="absolute inset-0 w-full h-full z-0"
        >
          {/* ASSET MANAGEMENT SYSTEM */}
          <a-assets timeout="10000">
            <img id="img-skyline" src="/assets/city_skyline.jpg" crossOrigin="anonymous" />
            <img id="img-vinodh" src="/avatars/mr-vinodh.png" crossOrigin="anonymous" />
            <img id="img-tablet" src="/assets/tablet_notes.jpg" crossOrigin="anonymous" />
            <img id="img-resume" src="/assets/resume_sheet.jpg" crossOrigin="anonymous" />
            <img id="img-nameplate" src="/assets/nameplate_vinodh.png" crossOrigin="anonymous" />
            <img id="img-art-city" src="/yatra_hero.jpg" crossOrigin="anonymous" />
            <img id="img-art-arch" src="/yatra_roadmap.jpg" crossOrigin="anonymous" />
          </a-assets>

          {/* BRIGHT DAYLIGHT SKY DOME (Ensures zero grey/black voids anywhere in 360° VR view) */}
          <a-sky color="#dbeafe"></a-sky>

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

          {/* ═══════════════════════════════════════════════════════════════
              BRIGHT NATURAL DAYLIGHT & SOFT WHITE INTERIOR LIGHTING
          ═══════════════════════════════════════════════════════════════ */}
          <a-light type="ambient" color="#ffffff" intensity="1.15"></a-light>
          <a-light type="hemisphere" color="#ffffff" groundColor="#cbd5e1" intensity="0.65"></a-light>
          {/* Natural white daylight from panoramic window */}
          <a-light type="directional" color="#ffffff" intensity="0.85" position="0 4.0 -3.5"></a-light>
          {/* Soft white interior ceiling light illuminating interviewer, walls, and desk */}
          <a-light type="directional" color="#fffdf9" intensity="0.75" position="0 3.5 2.5"></a-light>
          <a-light type="point" color="#ffffff" intensity="0.55" position="-2.2 2.8 -0.8"></a-light>
          <a-light type="point" color="#ffffff" intensity="0.55" position="2.2 2.8 -0.8"></a-light>

          {/* ═══════════════════════════════════════════════════════════════
              GENUINE 3D OFFICE ROOM GEOMETRY (Bright Corporate Executive Suite)
          ═══════════════════════════════════════════════════════════════ */}
          {/* Floor: Bright Warm Executive Stone-Slate Carpet (#64748b) with Designer Under-Desk Area Rug */}
          <a-plane position="0 0 0" rotation="-90 0 0" width="28" height="28" color="#64748b" material="roughness: 0.85; metalness: 0.05"></a-plane>
          <a-plane position="0 0.012 -0.75" rotation="-90 0 0" width="4.6" height="3.6" color="#cbd5e1" material="roughness: 0.8"></a-plane>
          <a-plane position="0 0.022 -0.75" rotation="-90 0 0" width="4.3" height="3.3" color="#e2e8f0" material="roughness: 0.85"></a-plane>

          {/* Ceiling: Crisp Pure White Executive Ceiling (#ffffff) */}
          <a-plane position="0 3.2 0" rotation="90 0 0" width="8.6" height="8.0" color="#ffffff" material="roughness: 0.7"></a-plane>

          {/* Architectural Drop-Ceiling LED Daylight Panels */}
          <a-plane position="-1.5 3.19 -1.0" rotation="90 0 0" width="1.6" height="0.6" color="#ffffff" material="shader: flat"></a-plane>
          <a-box position="-1.5 3.195 -1.0" width="1.64" height="0.02" depth="0.64" color="#cbd5e1" material="metalness: 0.5"></a-box>
          <a-plane position="1.5 3.19 -1.0" rotation="90 0 0" width="1.6" height="0.6" color="#ffffff" material="shader: flat"></a-plane>
          <a-box position="1.5 3.195 -1.0" width="1.64" height="0.02" depth="0.64" color="#cbd5e1" material="metalness: 0.5"></a-box>
          <a-plane position="-1.5 3.19 1.4" rotation="90 0 0" width="1.6" height="0.6" color="#ffffff" material="shader: flat"></a-plane>
          <a-box position="-1.5 3.195 1.4" width="1.64" height="0.02" depth="0.64" color="#cbd5e1" material="metalness: 0.5"></a-box>
          <a-plane position="1.5 3.19 1.4" rotation="90 0 0" width="1.6" height="0.6" color="#ffffff" material="shader: flat"></a-plane>
          <a-box position="1.5 3.195 1.4" width="1.64" height="0.02" depth="0.64" color="#cbd5e1" material="metalness: 0.5"></a-box>

          {/* Front Wall (behind candidate, enclosing office in warm corporate alabaster) */}
          <a-box position="0 1.6 4.2" width="8.6" height="3.2" depth="0.1" color="#f8fafc" material="roughness: 0.75"></a-box>
          <a-box position="0 1.35 4.14" width="1.5" height="2.6" depth="0.04" color="#7a4f31" material="roughness: 0.55"></a-box>
          <a-box position="0 0.06 4.15" width="8.4" height="0.12" depth="0.03" color="#7a4f31" material="roughness: 0.55"></a-box>

          {/* Clean Warm-Walnut Corner Trim Columns (Sealing all 4 room corners without dark/black blocks) */}
          <a-box position="-4.16 1.6 -3.76" width="0.12" height="3.2" depth="0.12" color="#7a4f31" material="roughness: 0.5; metalness: 0.1"></a-box>
          <a-box position="4.16 1.6 -3.76" width="0.12" height="3.2" depth="0.12" color="#7a4f31" material="roughness: 0.5; metalness: 0.1"></a-box>
          <a-box position="-4.16 1.6 4.16" width="0.12" height="3.2" depth="0.12" color="#7a4f31" material="roughness: 0.5; metalness: 0.1"></a-box>
          <a-box position="4.16 1.6 4.16" width="0.12" height="3.2" depth="0.12" color="#7a4f31" material="roughness: 0.5; metalness: 0.1"></a-box>

          {/* ═══════════════════════════════════════════════════════════════
              RIGHT WALL: WARM VERTICAL WALNUT WOOD SLAT ARCHITECTURE & FRAMED CITY PHOTOGRAPHY
          ═══════════════════════════════════════════════════════════════ */}
          <a-box position="4.2 1.6 0" width="0.1" height="3.2" depth="8.4" color="#6d4427" material="roughness: 0.6"></a-box>
          <a-box position="4.15 0.06 0" width="0.04" height="0.12" depth="8.4" color="#5c371d" material="roughness: 0.5"></a-box>

          {/* Vertical Warm Walnut Slat Ribs */}
          {Array.from({ length: 42 }).map((_, i) => {
            const zPos = -3.7 + i * 0.18;
            return (
              <a-box 
                key={`slat-${i}`} 
                position={`4.14 1.6 ${zPos.toFixed(2)}`} 
                width="0.04" 
                height="3.2" 
                depth="0.09" 
                color="#8a5a38" 
                material="roughness: 0.5; metalness: 0.05"
              ></a-box>
            );
          })}

          {/* Framed Modern World-City Photography on Right Walnut Wall (No black rectangles) */}
          <a-entity position="4.09 1.72 -1.1" rotation="0 -90 0">
            {/* Warm Brushed Bronze/Walnut Gallery Frame */}
            <a-box position="0 0 0" width="1.65" height="1.15" depth="0.03" color="#5c371d" material="roughness: 0.4; metalness: 0.2"></a-box>
            {/* Crisp White Museum Matboard */}
            <a-plane position="0 0 0.017" width="1.52" height="1.02" color="#ffffff" material="shader: flat"></a-plane>
            {/* Inner Gold Accent Bevel */}
            <a-plane position="0 0 0.019" width="1.36" height="0.86" color="#d97706" material="shader: flat"></a-plane>
            {/* World-City Panoramic Skyline Photography Print */}
            <a-plane position="0 0 0.021" width="1.33" height="0.83" src="#img-skyline" material="shader: flat"></a-plane>
          </a-entity>

          {/* Second Framed Corporate Architectural Artwork on Right Walnut Wall */}
          <a-entity position="4.09 1.72 1.1" rotation="0 -90 0">
            <a-box position="0 0 0" width="1.45" height="1.15" depth="0.03" color="#5c371d" material="roughness: 0.4; metalness: 0.2"></a-box>
            <a-plane position="0 0 0.017" width="1.32" height="1.02" color="#ffffff" material="shader: flat"></a-plane>
            <a-plane position="0 0 0.019" width="1.18" height="0.88" color="#d97706" material="shader: flat"></a-plane>
            <a-plane position="0 0 0.021" width="1.15" height="0.85" src="#img-art-city" material="shader: flat"></a-plane>
          </a-entity>

          {/* ═══════════════════════════════════════════════════════════════
              LEFT WALL: FINISHED CORPORATE GALLERY WALL, FRAMED ARTWORK & INDOOR PLANT
              (Replaces unfinished grey hallway slab and floating blue panel)
          ═══════════════════════════════════════════════════════════════ */}
          {/* Main Finished Warm Alabaster Corporate Wall */}
          <a-box position="-4.2 1.6 0" width="0.1" height="3.2" depth="8.4" color="#f8fafc" material="roughness: 0.7"></a-box>
          {/* Lower Warm Walnut Wainscot Trim Panel & Baseboard */}
          <a-box position="-4.14 0.42 0" width="0.03" height="0.84" depth="8.2" color="#8a5a38" material="roughness: 0.55"></a-box>
          <a-box position="-4.13 0.85 0" width="0.05" height="0.04" depth="8.2" color="#5c371d" material="roughness: 0.45"></a-box>
          <a-box position="-4.13 0.06 0" width="0.05" height="0.12" depth="8.2" color="#5c371d" material="roughness: 0.45"></a-box>
          {/* Upper Crown Molding Trim */}
          <a-box position="-4.13 3.14 0" width="0.05" height="0.08" depth="8.2" color="#e2e8f0" material="roughness: 0.6"></a-box>

          {/* Framed Architectural Artwork 1 on Left Wall (Flush-mounted, no floating panels) */}
          <a-entity position="-4.12 1.82 -1.45" rotation="0 90 0">
            <a-box position="0 0 0" width="1.65" height="1.12" depth="0.03" color="#5c371d" material="roughness: 0.4; metalness: 0.2"></a-box>
            <a-plane position="0 0 0.017" width="1.52" height="0.99" color="#ffffff" material="shader: flat"></a-plane>
            <a-plane position="0 0 0.019" width="1.38" height="0.85" color="#0284c7" material="shader: flat"></a-plane>
            <a-plane position="0 0 0.021" width="1.35" height="0.82" src="#img-skyline" material="shader: flat"></a-plane>
          </a-entity>

          {/* Framed Corporate Horizon Painting 2 on Left Wall (Flush-mounted) */}
          <a-entity position="-4.12 1.82 0.75" rotation="0 90 0">
            <a-box position="0 0 0" width="1.55" height="1.12" depth="0.03" color="#5c371d" material="roughness: 0.4; metalness: 0.2"></a-box>
            <a-plane position="0 0 0.017" width="1.42" height="0.99" color="#ffffff" material="shader: flat"></a-plane>
            {/* Subtle Modern Architectural Horizon Canvas (Warm Ivory, Sky Blue, Gold & Sandstone) */}
            <a-plane position="0 0.16 0.019" width="1.28" height="0.52" color="#bae6fd" material="shader: flat"></a-plane>
            <a-plane position="0 -0.22 0.019" width="1.28" height="0.28" color="#fde68a" material="shader: flat"></a-plane>
            <a-plane position="-0.32 -0.02 0.021" width="0.22" height="0.48" color="#64748b" material="shader: flat"></a-plane>
            <a-plane position="-0.05 0.04 0.021" width="0.26" height="0.60" color="#475569" material="shader: flat"></a-plane>
            <a-plane position="0.26 -0.06 0.021" width="0.24" height="0.40" color="#94a3b8" material="shader: flat"></a-plane>
          </a-entity>

          {/* INDOOR EXECUTIVE POTTED PLANT (Left Corner, matching Reference Image) */}
          <a-entity position="-2.8 0 -2.6">
            <a-cylinder position="0 0.25 0" radius="0.24" height="0.5" color="#f8fafc" material="roughness: 0.2; metalness: 0.1"></a-cylinder>
            <a-cylinder position="0 0.02 0" radius="0.26" height="0.04" color="#cbd5e1"></a-cylinder>
            <a-cylinder position="0 0.48 0" radius="0.22" height="0.02" color="#5c371d"></a-cylinder>
            <a-cylinder position="0 0.7 0" radius="0.02" height="0.45" color="#7a4f31" rotation="5 0 8"></a-cylinder>
            <a-cylinder position="-0.04 0.9 0.02" radius="0.016" height="0.4" color="#15803d" rotation="15 20 -12"></a-cylinder>
            <a-cylinder position="0.04 0.85 -0.03" radius="0.016" height="0.38" color="#15803d" rotation="-12 -30 18"></a-cylinder>
            <a-sphere position="0 1.05 0" radius="0.3" scale="1.4 0.25 1.1" color="#16a34a" material="roughness: 0.6" rotation="20 15 10"></a-sphere>
            <a-sphere position="-0.15 1.25 0.05" radius="0.28" scale="1.3 0.2 1.2" color="#22c55e" material="roughness: 0.6" rotation="10 -25 -15"></a-sphere>
            <a-sphere position="0.12 1.18 -0.08" radius="0.26" scale="1.2 0.2 1.1" color="#15803d" material="roughness: 0.6" rotation="-25 35 15"></a-sphere>
            <a-sphere position="0 1.38 0" radius="0.24" scale="1.1 0.2 1.0" color="#4ade80" material="roughness: 0.6" rotation="5 0 5"></a-sphere>
          </a-entity>

          {/* ═══════════════════════════════════════════════════════════════
              REAR WALL: FLOOR-TO-CEILING GLASS & UNOBSTRUCTED CITY SKYLINE
              (All dark opaque blocks removed; realistic modern cityscape clearly visible)
          ═══════════════════════════════════════════════════════════════ */}
          {/* Slim Brushed-Aluminum Window Mullions (#475569) */}
          <a-box position="0 0.04 -3.76" width="8.4" height="0.08" depth="0.12" color="#475569" material="metalness: 0.6; roughness: 0.3"></a-box>
          {[-3.5, -2.1, -0.7, 0.7, 2.1, 3.5].map((x, idx) => (
            <a-box 
              key={`rear-mullion-${idx}`} 
              position={`${x} 1.6 -3.78`} 
              width="0.05" 
              height="3.2" 
              depth="0.08" 
              color="#475569" 
              material="metalness: 0.6; roughness: 0.3"
            ></a-box>
          ))}
          <a-box position="0 3.16 -3.78" width="8.4" height="0.08" depth="0.10" color="#475569" material="metalness: 0.6; roughness: 0.3"></a-box>

          {/* Ultra-Clear Daylight Glass Pane */}
          <a-box position="0 1.6 -3.76" width="8.4" height="3.2" depth="0.01" color="#ffffff" material="opacity: 0.04; transparent: true; shader: flat"></a-box>

          {/* UNOBSTRUCTED 180° WRAP-AROUND CITY SKYLINE PANORAMA (Visible across entire window & when moving VR headset) */}
          {/* Center High-Resolution Cityscape Panorama (Fills entire rear glass floor-to-ceiling) */}
          <a-plane 
            id="city-skyline-center"
            src="#img-skyline"
            position="0 2.65 -7.2" 
            width="24" 
            height="13.5" 
            material="shader: flat"
          ></a-plane>
          {/* Left Wrap-Around Cityscape Wing (Maintains city view when looking right-to-left) */}
          <a-plane 
            id="city-skyline-left"
            src="#img-skyline"
            position="-18.5 2.65 -4.2" 
            rotation="0 35 0"
            width="20" 
            height="13.5" 
            material="shader: flat"
          ></a-plane>
          {/* Right Wrap-Around Cityscape Wing (Maintains city view when looking left-to-right) */}
          <a-plane 
            id="city-skyline-right"
            src="#img-skyline"
            position="18.5 2.65 -4.2" 
            rotation="0 -35 0"
            width="20" 
            height="13.5" 
            material="shader: flat"
          ></a-plane>
          {/* Bright Daylight Horizon Ground Apron below skyline */}
          <a-plane position="0 -3.8 -7.0" rotation="-90 0 0" width="60" height="25" color="#cbd5e1" material="shader: flat"></a-plane>

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
              position="0 0.773 -0.15" 
              rotation="-90 0 0" 
              width="1.12" 
              height="0.65" 
              color="#18181b" 
              material="roughness: 0.85; metalness: 0.1"
            ></a-plane>

            {/* 2. Candidate Flat Resume Paper Stack (Left of desk mat, real A4 scale) */}
            <a-entity position="-0.65 0.783 -0.15" rotation="-90 0 4">
              <a-box position="0 0 -0.006" width="0.22" height="0.30" depth="0.010" color="#e2e8f0"></a-box>
              <a-plane position="0 0 0.002" width="0.22" height="0.30" src="#img-resume" material="shader: flat"></a-plane>
            </a-entity>

            {/* 3. The Digital Tablet (Center of Desk Mat) */}
            <a-entity position="-0.02 0.784 -0.15" rotation="-90 0 0">
              <a-box position="0 0 -0.004" width="0.24" height="0.33" depth="0.008" color="#09090b" material="metalness: 0.8; roughness: 0.2"></a-box>
              <a-plane position="0 0 0.002" width="0.22" height="0.31" src="#img-tablet" material="shader: flat"></a-plane>
            </a-entity>

            {/* 4. Spiral Notepad & Stylus Pen (Right of Tablet on Desk Mat, real scale) */}
            <a-entity position="0.26 0.784 -0.15" rotation="-90 0 4">
              <a-box position="0 0 -0.005" width="0.16" height="0.24" depth="0.01" color="#f8fafc"></a-box>
              <a-plane position="0 0 0.002" width="0.15" height="0.23" color="#ffffff">
                <a-plane position="0 0.08 0.002" width="0.13" height="0.008" color="#38bdf8"></a-plane>
                <a-plane position="0 0.04 0.002" width="0.13" height="0.004" color="#cbd5e1"></a-plane>
                <a-plane position="0 0.00 0.002" width="0.13" height="0.004" color="#cbd5e1"></a-plane>
                <a-plane position="0 -0.04 0.002" width="0.13" height="0.004" color="#cbd5e1"></a-plane>
                <a-plane position="0 -0.08 0.002" width="0.13" height="0.004" color="#cbd5e1"></a-plane>
              </a-plane>
              <a-cylinder position="0 0.12 0.005" radius="0.006" height="0.14" rotation="0 0 90" color="#94a3b8" material="metalness: 0.9"></a-cylinder>
            </a-entity>
            <a-cylinder position="0.38 0.785 -0.15" radius="0.004" height="0.15" rotation="90 0 5" color="#f8fafc" material="roughness: 0.3; metalness: 0.4"></a-cylinder>

            {/* 5. Realistic Open Executive Laptop (Interviewer-Side Desk, Left of Interviewer) */}
            <a-entity id="interviewer-laptop" position="-0.72 0.774 -0.82" rotation="0 132 0">
              {/* Sleek Brushed-Silver Aluminum Keyboard Base Chassis */}
              <a-box position="0 0.007 0" width="0.36" height="0.014" depth="0.25" color="#cbd5e1" material="metalness: 0.75; roughness: 0.25"></a-box>
              {/* Recessed Matte-Charcoal Keyboard Deck */}
              <a-plane position="0 0.015 -0.015" rotation="-90 0 0" width="0.31" height="0.125" color="#1e293b" material="roughness: 0.8"></a-plane>
              {/* Precision Glass Trackpad */}
              <a-plane position="0 0.015 0.075" rotation="-90 0 0" width="0.105" height="0.062" color="#94a3b8" material="metalness: 0.5; roughness: 0.3"></a-plane>
              {/* Cylindrical Dark Metallic Hinge Bar */}
              <a-cylinder position="0 0.016 -0.12" radius="0.006" height="0.28" rotation="0 0 90" color="#334155" material="metalness: 0.8; roughness: 0.2"></a-cylinder>
              {/* Open Upright Tilted 15-inch Laptop Display Assembly (Rising clearly above keyboard base) */}
              <a-entity position="0 0.016 -0.12" rotation="-18 0 0">
                {/* Brushed Aluminum Display Back Cover */}
                <a-box position="0 0.115 0" width="0.36" height="0.23" depth="0.008" color="#e2e8f0" material="metalness: 0.78; roughness: 0.22"></a-box>
                {/* Brushed Rim Trim around Display Lid */}
                <a-box position="0 0.115 0" width="0.364" height="0.234" depth="0.006" color="#94a3b8" material="metalness: 0.85; roughness: 0.2"></a-box>
                {/* Glowing Metallic Emblem on Lid Back (Visible from candidate side) */}
                <a-circle position="0 0.115 -0.005" rotation="0 180 0" radius="0.022" color="#ffffff" material="shader: flat"></a-circle>
                {/* Thin Dark Bezel Frame on Screen Front (Facing Interviewer & Angled Side Profile) */}
                <a-plane position="0 0.115 0.005" width="0.346" height="0.216" color="#0f172a" material="roughness: 0.4"></a-plane>
                {/* Illuminated High-Res Dashboard Screen Facing Interviewer */}
                <a-plane position="0 0.115 0.006" width="0.33" height="0.20" src="#img-tablet" material="shader: flat"></a-plane>
              </a-entity>
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

            {/* SEATED MR. VINODH AVATAR FIGURE (Fixed position, zero oscillation or movement) */}
            <a-entity 
              id="mr-vinodh-avatar" 
              position="0 1.39 0.02"
              scale="1 1 1"
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
