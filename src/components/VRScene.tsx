import React, { memo, useEffect, useRef, useState } from 'react';

export const VRScene = memo(({
  cameraZ,
  selectedInterviewer,
  avatarState,
  company = "Google",
  role = "Web Developer Intern",
  round = 1,
}: any) => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const [sceneHTML, setSceneHTML] = useState('');

  useEffect(() => {
    // If we need to dynamically update camera or models, we can do it via DOM API here
    const rig = document.getElementById('camera-rig');
    if (rig) {
      rig.setAttribute('position', `0 1.25 ${1.1 + (cameraZ || 1.5) - 1.5}`);
    }
  }, [cameraZ]);

  // Make mouths move when speaking
  useEffect(() => {
    const mouth1 = document.getElementById('interviewer-1-mouth');
    const mouth2 = document.getElementById('interviewer-2-mouth');
    const isSpeaking = avatarState === 'speaking';
    
    if (mouth1) {
      if (isSpeaking) {
        mouth1.setAttribute('animation', 'property: scale; to: 1 6 1; dir: alternate; dur: 120; loop: true');
      } else {
        mouth1.removeAttribute('animation');
        mouth1.setAttribute('scale', '1 1 1');
      }
    }
    if (mouth2) {
      if (isSpeaking) {
        mouth2.setAttribute('animation', 'property: scale; to: 1 6 1; dir: alternate; dur: 140; loop: true');
      } else {
        mouth2.removeAttribute('animation');
        mouth2.setAttribute('scale', '1 1 1');
      }
    }
  }, [avatarState]);

  // Update screen text dynamically
  useEffect(() => {
    const titleText = document.getElementById('screen-title-text');
    const subtitleText = document.getElementById('screen-subtitle-text');
    const roundText = document.getElementById('screen-round-text');
    
    if (titleText) titleText.setAttribute('value', 'InterviewVerse');
    if (subtitleText) subtitleText.setAttribute('value', `${company} · ${role}`);
    if (roundText) roundText.setAttribute('value', `Self Introduction · Round ${round}`);
  }, [company, role, round]);

  // Set scene HTML once to avoid re-mounting a-scene
  useEffect(() => {
    if (sceneHTML) return;
    setSceneHTML(`
      <a-scene 
        embedded 
        vr-mode-ui="enabled: true"
        class="absolute inset-0 w-full h-full z-0"
      >
        <a-sky color="#f3f4f6"></a-sky>

        <!-- Dynamic Camera Rig -->
        <a-entity id="camera-rig" position="0 1.25 1.1">
          <a-camera position="0 0 0" look-controls="pointerLockEnabled: false" wasd-controls="enabled: false">
            <a-cursor color="#475569" scale="0.6 0.6 0.6" opacity="0.7"></a-cursor>
          </a-camera>
        </a-entity>

        <!-- Floor -->
        <a-plane position="0 0 0" rotation="-90 0 0" width="12" height="12" color="#1e293b"></a-plane>
        <!-- Ceiling -->
        <a-plane position="0 3.2 0" rotation="90 0 0" width="12" height="12" color="#f8fafc"></a-plane>

        <!-- Recessed Lights -->
        <a-plane position="-2 3.19 -2" rotation="90 0 0" width="1.1" height="1.1" color="#ffffff" material="shader: flat; emissive: #ffffff; emissiveIntensity: 1.0"></a-plane>
        <a-plane position="2 3.19 -2" rotation="90 0 0" width="1.1" height="1.1" color="#ffffff" material="shader: flat; emissive: #ffffff; emissiveIntensity: 1.0"></a-plane>
        <a-plane position="-2 3.19 1" rotation="90 0 0" width="1.1" height="1.1" color="#ffffff" material="shader: flat; emissive: #ffffff; emissiveIntensity: 0.8"></a-plane>
        <a-plane position="2 3.19 1" rotation="90 0 0" width="1.1" height="1.1" color="#ffffff" material="shader: flat; emissive: #ffffff; emissiveIntensity: 0.8"></a-plane>

        <!-- Back Walls -->
        <a-box position="-3.2 1.6 -4.2" width="2.8" height="3.2" depth="0.1" color="#f8fafc"></a-box>
        <a-box position="3.2 1.6 -4.2" width="2.8" height="3.2" depth="0.1" color="#f8fafc"></a-box>
        <!-- Feature wood area -->
        <a-box position="0 1.6 -4.2" width="3.6" height="3.2" depth="0.1" color="#d1bfae" material="roughness: 0.8"></a-box>

        <!-- BIG SCREEN OF WORLD BEHIND INTERVIEWERS -->
        <a-box position="0 2.0 -4.12" width="3.4" height="1.8" depth="0.05" color="#1e293b"></a-box>
        <a-plane position="0 2.0 -4.09" width="3.3" height="1.7" color="#0f172a" material="shader: flat; opacity: 0.98"></a-plane>
        
        <!-- Screen Text -->
        <a-text id="screen-title-text" value="InterviewVerse" position="-1.5 2.5 -4.08" color="#f8fafc" scale="0.6 0.6 0.6" font="mozillavr"></a-text>
        <a-text id="screen-subtitle-text" value="Google · Web Developer Intern" position="-1.5 2.1 -4.08" color="#94a3b8" scale="0.4 0.4 0.4"></a-text>
        <a-text id="screen-round-text" value="Self Introduction · Round 1" position="-1.5 1.8 -4.08" color="#38bdf8" scale="0.35 0.35 0.35"></a-text>

        <!-- Left Wall Window (Glass Architecture) -->
        <!-- Glass Pane -->
        <a-box position="-4.8 1.6 0" width="0.05" height="3.2" depth="8.4" color="#e0f2fe" material="opacity: 0.2; transparent: true; roughness: 0.05; metalness: 0.9"></a-box>
        
        <!-- Framing/Mullions for the glass -->
        <a-box position="-4.78 1.6 2" width="0.1" height="3.2" depth="0.1" color="#334155" material="metalness: 0.5; roughness: 0.5"></a-box>
        <a-box position="-4.78 1.6 -2" width="0.1" height="3.2" depth="0.1" color="#334155" material="metalness: 0.5; roughness: 0.5"></a-box>
        <a-box position="-4.78 1.6 0" width="0.1" height="3.2" depth="0.1" color="#334155" material="metalness: 0.5; roughness: 0.5"></a-box>
        
        <!-- Suggestion of premium office behind (blurred/abstracted) -->
        <!-- Back wall of the corridor (light and bright) -->
        <a-plane position="-7.0 1.6 0" rotation="0 90 0" width="10" height="3.2" color="#f1f5f9" material="shader: flat"></a-plane>
        
        <!-- Distant Abstract Workstations -->
        <a-box position="-6.0 0.4 3" width="1.5" height="0.8" depth="2" color="#cbd5e1" material="roughness: 0.9"></a-box>
        <a-box position="-6.0 0.4 -1" width="1.5" height="0.8" depth="2" color="#cbd5e1" material="roughness: 0.9"></a-box>
        
        <!-- Ambient Daylight coming from the corridor -->
        <a-light type="area" position="-6.5 2 0" intensity="0.5" color="#ffffff" width="4" height="2"></a-light>
        
        <!-- Abstract Ficus/Office Plants -->
        <a-entity position="-5.5 0.5 -3">
            <a-sphere radius="0.4" position="0 0.6 0" color="#166534" material="opacity: 0.9; roughness: 0.8"></a-sphere>
            <a-sphere radius="0.3" position="-0.2 0.8 0.2" color="#15803d" material="opacity: 0.8; roughness: 0.8"></a-sphere>
            <a-sphere radius="0.35" position="0.2 0.5 -0.2" color="#16a34a" material="opacity: 0.7; roughness: 0.8"></a-sphere>
            <a-cylinder radius="0.05" height="0.6" position="0 0 0" color="#78350f"></a-cylinder>
            <a-cylinder radius="0.4" height="0.3" position="0 -0.15 0" color="#e5e7eb"></a-cylinder> <!-- Modern Planter -->
        </a-entity>
        
        <a-entity position="-5.5 0.5 1.5">
            <a-sphere radius="0.5" position="0 0.7 0" color="#15803d" material="opacity: 0.85; roughness: 0.8"></a-sphere>
            <a-cylinder radius="0.06" height="0.7" position="0 0 0" color="#78350f"></a-cylinder>
            <a-cylinder radius="0.35" height="0.4" position="0 -0.2 0" color="#334155"></a-cylinder> <!-- Dark Planter -->
        </a-entity>

        <!-- Right Wall TV -->
        <a-box position="4.8 1.6 0" width="0.1" height="3.2" depth="8.4" color="#f8fafc"></a-box>
        <a-box position="4.74 1.8 -1.2" width="0.04" height="1.2" depth="2.0" color="#334155"></a-box>
        <a-plane position="4.71 1.8 -1.2" rotation="0 -90 0" width="1.9" height="1.1" color="#0f172a"></a-plane>

        <!-- THE CENTRAL EXECUTIVE CONFERENCE TABLE -->
        <a-entity id="conference-table">
          <a-box position="0 0.72 -1.1" width="2.2" height="0.04" depth="1.9" color="#8b7355" material="roughness: 0.6; metalness: 0.1"></a-box>
          <!-- Bases -->
          <a-cylinder position="-0.7 0.36 -1.6" radius="0.04" height="0.7" color="#475569"></a-cylinder>
          <a-cylinder position="0.7 0.36 -1.6" radius="0.04" height="0.7" color="#475569"></a-cylinder>
          <a-cylinder position="-0.7 0.36 -0.5" radius="0.04" height="0.7" color="#475569"></a-cylinder>
          <a-cylinder position="0.7 0.36 -0.5" radius="0.04" height="0.7" color="#475569"></a-cylinder>
        </a-entity>

        <!-- LAPTOPS ON TABLE -->
        <a-entity position="-0.55 0.76 -1.6" rotation="0 15 0">
          <a-box position="0 0 0" width="0.4" height="0.02" depth="0.3" color="#e2e8f0" material="metalness: 0.6"></a-box>
          <a-box position="0 0.15 -0.14" width="0.4" height="0.3" depth="0.02" color="#e2e8f0" rotation="-15 0 0" material="metalness: 0.6">
            <a-plane position="0 0 0.015" width="0.38" height="0.28" color="#0f172a" material="shader: flat"></a-plane>
          </a-box>
        </a-entity>

        <a-entity position="0.55 0.76 -1.6" rotation="0 -15 0">
          <a-box position="0 0 0" width="0.4" height="0.02" depth="0.3" color="#334155" material="metalness: 0.6"></a-box>
          <a-box position="0 0.15 -0.14" width="0.4" height="0.3" depth="0.02" color="#334155" rotation="-15 0 0" material="metalness: 0.6">
            <a-plane position="0 0 0.015" width="0.38" height="0.28" color="#0f172a" material="shader: flat"></a-plane>
          </a-box>
        </a-entity>

        <!-- Chairs -->
        ${[
          { p: "-0.55 0 -2.25", r: "0 0 0" },
          { p: "0.55 0 -2.25", r: "0 0 0" }
        ].map(pos => `
          <a-entity position="${pos.p}" rotation="${pos.r}">
            <a-cylinder position="0 0.22 0" radius="0.03" height="0.35" color="#334155"></a-cylinder>
            <a-box position="0 0.42 0" width="0.55" height="0.08" depth="0.52" color="#1e293b"></a-box>
            <a-box position="0 0.82 -0.22" width="0.52" height="0.7" depth="0.06" color="#1e293b" rotation="5 0 0"></a-box>
            <a-box position="-0.28 0.6 0" width="0.04" height="0.15" depth="0.4" color="#475569"></a-box>
            <a-box position="0.28 0.6 0" width="0.04" height="0.15" depth="0.4" color="#475569"></a-box>
          </a-entity>
        `).join('')}

        <!-- INTERVIEWER 1: Left Female -->
        <a-entity position="-0.55 0 -2.1" rotation="0 0 0">
          <!-- Torso -->
          <a-box position="0 0.72 0" width="0.42" height="0.55" depth="0.22" color="#1e293b" material="roughness: 0.8"></a-box>
          <!-- Neck -->
          <a-cylinder position="0 1.02 0" radius="0.045" height="0.1" color="#fed7aa"></a-cylinder>
          
          <!-- Head -->
          <a-sphere position="0 1.18 0" radius="0.12" color="#fed7aa"></a-sphere>
          
          <!-- Hair Stylized -->
          <a-sphere position="0 1.21 -0.02" radius="0.125" color="#171717"></a-sphere>
          <a-box position="0 1.12 -0.08" width="0.25" height="0.25" depth="0.1" color="#171717"></a-box>
          
          <!-- Eyes -->
          <a-box position="-0.04 1.19 0.11" width="0.025" height="0.01" depth="0.01" color="#000000"></a-box>
          <a-box position="0.04 1.19 0.11" width="0.025" height="0.01" depth="0.01" color="#000000"></a-box>

          <!-- Animated Mouth -->
          <a-box id="interviewer-1-mouth" position="0 1.11 0.115" width="0.03" height="0.005" depth="0.01" color="#4c1d95"></a-box>
        </a-entity>

        <!-- INTERVIEWER 2: Right Male -->
        <a-entity position="0.55 0 -2.1" rotation="0 0 0">
          <!-- Torso -->
          <a-box position="0 0.72 0" width="0.46" height="0.56" depth="0.24" color="#334155" material="roughness: 0.8"></a-box>
          <!-- Shirt collar -->
          <a-box position="0 0.8 0.12" width="0.1" height="0.25" depth="0.01" color="#f8fafc"></a-box>
          <!-- Neck -->
          <a-cylinder position="0 1.03 0" radius="0.05" height="0.1" color="#fcd34d"></a-cylinder>
          
          <!-- Head -->
          <a-sphere position="0 1.2 0" radius="0.125" color="#fcd34d"></a-sphere>
          
          <!-- Hair Stylized -->
          <a-sphere position="0 1.24 -0.01" radius="0.12" color="#451a03"></a-sphere>
          
          <!-- Glasses -->
          <a-box position="0 1.21 0.12" width="0.12" height="0.03" depth="0.01" color="#0f172a" material="opacity: 0.8; transparent: true"></a-box>
          
          <!-- Animated Mouth -->
          <a-box id="interviewer-2-mouth" position="0 1.12 0.12" width="0.035" height="0.005" depth="0.01" color="#78350f"></a-box>
        </a-entity>

        <!-- LIGHTING & LAMPS -->
        <a-light type="ambient" color="#ffffff" intensity="0.85"></a-light>
        <a-light type="directional" color="#ffffff" intensity="0.4" position="-5 3 2"></a-light>
        <a-light type="spot" color="#ffffff" intensity="0.5" position="0 3.1 -1.2" target="#conference-table" angle="45" penumbra="0.8"></a-light>

        ${[-0.6, 0.6].map((xPos) => `
          <a-entity position="${xPos} 2.6 -1.2">
            <a-cylinder position="0 0.3 0" radius="0.004" height="0.6" color="#475569"></a-cylinder>
            <a-cylinder position="0 0 0" radius="0.06" height="0.03" color="#1e293b"></a-cylinder>
            <a-sphere position="0 -0.015 0" radius="0.04" color="#ffffff" material="shader: flat; emissive: #ffffff; emissiveIntensity: 1.0"></a-sphere>
            <a-light type="point" color="#ffffff" intensity="0.25" distance="4"></a-light>
          </a-entity>
        `).join('')}

      </a-scene>
    `);
  }, []);

  if (!sceneHTML) return null;

  return (
    <div 
      ref={sceneRef}
      className="absolute inset-0 w-full h-full z-0"
      dangerouslySetInnerHTML={{ __html: sceneHTML }}
    />
  );
}, (prevProps, nextProps) => {
  return prevProps.cameraZ === nextProps.cameraZ && 
         prevProps.selectedInterviewer?.id === nextProps.selectedInterviewer?.id &&
         prevProps.avatarState === nextProps.avatarState &&
         prevProps.company === nextProps.company &&
         prevProps.role === nextProps.role &&
         prevProps.round === nextProps.round;
});

