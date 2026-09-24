// @ts-nocheck
import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Mic, MicOff, Clock, Send, Loader2, Award, ClipboardCheck, Sparkles, Check, CheckCircle, ChevronRight, BookOpen, AlertCircle, Sun, Volume2, ZoomIn, ZoomOut, Smartphone, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { VRScene } from "../components/VRScene";

// Register a custom A-Frame component to bend bones & perfectly seat typical readyplayer.me standing avatars.
if (typeof window !== 'undefined') {
  (window as any).registerSeatedAvatar = function() {
    if (window.AFRAME && !window.AFRAME.components['seated-avatar']) {
      window.AFRAME.registerComponent('seated-avatar', {
    schema: {
      state: { type: 'string', default: 'idle' }
    },
    init: function () {
      this.poseBones = this.poseBones.bind(this);
      this.el.addEventListener('model-loaded', this.poseBones);
      
      // Self-contained embedded GLTF of a simple box to load natively in sandboxed environments without network access
      const fallbackBoxGltf = {
        asset: { version: "2.0" },
        scenes: [{ nodes: [0] }],
        nodes: [{ children: [1], matrix: [1.0, 0.0, 0.0, 0.0, 0.0, 0.0, -1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0] }, { mesh: 0 }],
        meshes: [{
          primitives: [{
            attributes: { NORMAL: 1, POSITION: 2 },
            indices: 0,
            mode: 4,
            material: 0
          }],
          name: "Mesh"
        }],
        accessors: [
          { bufferView: 0, byteOffset: 0, componentType: 5123, count: 36, max: [23], min: [0], type: "SCALAR" },
          { bufferView: 1, byteOffset: 0, componentType: 5126, count: 24, max: [1.0, 1.0, 1.0], min: [-1.0, -1.0, -1.0], type: "VEC3" },
          { bufferView: 1, byteOffset: 288, componentType: 5126, count: 24, max: [0.5, 0.5, 0.5], min: [-0.5, -0.5, -0.5], type: "VEC3" }
        ],
        materials: [{ name: "Red", pbrMetallicRoughness: { baseColorFactor: [0.8, 0.0, 0.0, 1.0], metallicFactor: 0.0 } }],
        bufferViews: [
          { buffer: 0, byteOffset: 576, byteLength: 72, target: 34963 },
          { buffer: 0, byteOffset: 0, byteLength: 576, byteStride: 12, target: 34962 }
        ],
        buffers: [{
          byteLength: 648,
          uri: "data:application/octet-stream;base64,AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAvwAAAL8AAAA/AAAAPwAAAL8AAAA/AAAAvwAAAD8AAAA/AAAAPwAAAD8AAAA/AAAAPwAAAL8AAAA/AAAAvwAAAL8AAAA/AAAAPwAAAL8AAAC/AAAAvwAAAL8AAAC/AAAAPwAAAD8AAAA/AAAAPwAAAL8AAAA/AAAAPwAAAD8AAAC/AAAAPwAAAL8AAAC/AAAAvwAAAD8AAAA/AAAAPwAAAD8AAAA/AAAAvwAAAD8AAAC/AAAAPwAAAD8AAAC/AAAAvwAAAL8AAAA/AAAAvwAAAD8AAAA/AAAAvwAAAL8AAAC/AAAAvwAAAD8AAAC/AAAAvwAAAL8AAAC/AAAAvwAAAD8AAAC/AAAAPwAAAL8AAAC/AAAAPwAAAD8AAAC/AAABAAIAAwACAAEABAAFAAYABwAGAAUACAAJAAoACwAKAAkADAANAA4ADwAOAA0AEAARABIAEwASABEAFAAVABYAFwAWABUA"
        }]
      };
      const fallbackDataUri = "data:application/json;base64," + btoa(JSON.stringify(fallbackBoxGltf));

      // Fallback model URLs list if the primary URL fails to load
      const fallbacks = [
        "https://models.readyplayer.me/64b54e7d1872df82a7f5a9e3.glb",
        "https://models.readyplayer.me/6487e41b9e07fb317075c3ef.glb",
        "https://cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/models/gltf/Soldier.glb"
      ];
      let attempt = 0;
      const handleError = (err: any) => {
        const errorMsg = err && err.message ? err.message : String(err);
        console.warn(`[Seated Avatar Error Recovery] Failed to load model asset: ${this.el.getAttribute('src')} - Error Details: ${errorMsg}`);
        if (attempt < fallbacks.length) {
          const nextUrl = fallbacks[attempt];
          attempt++;
          console.log(`[Seated Avatar Error Recovery] Attempting automated fallback GLB #${attempt}: ${nextUrl}`);
          this.el.setAttribute('src', nextUrl);
        } else {
          console.warn("[Seated Avatar Error Recovery] All avatar models failed to resolve.");
        }
      };
      
      this.el.addEventListener('gltf-model-error', handleError);
      this.el.addEventListener('model-error', handleError);

      // Instant safety cache check: if the model mesh or 3D object has already booted, pose immediately
      if (this.el.getObject3D('mesh') || this.el.object3D) {
        setTimeout(() => {
          this.poseBones();
        }, 120);
      }
      
      this.nodTimer = 0;
      this.concernedFactor = 0;
      this.morphMeshes = [];
      this.bones = {
        hips: null,
        spine: null,
        neck: null,
        head: null,
        leftUpLeg: null,
        rightUpLeg: null,
        leftLeg: null,
        rightLeg: null,
        leftFoot: null,
        rightFoot: null,
        leftArm: null,
        rightArm: null,
        leftForeArm: null,
        rightForeArm: null,
        leftShoulder: null,
        rightShoulder: null
      };
      this.baseRotations = {};
      
      // Realism states
      this.blinkTimer = 0;
      this.blinkInterval = 2.5 + Math.random() * 3.5;
      this.gestureTimer = 0;
      this.gestureDuration = 0;
      this.activeGestureSide = 'none';
    },
    remove: function () {
      this.el.removeEventListener('model-loaded', this.poseBones);
    },
    update: function (oldData) {
      if (this.data && oldData && this.data.state !== oldData.state) {
        console.log(`[Avatar Animation Engine] Transformed state from "${oldData.state || 'none'}" to "${this.data.state}"`);
        // Trigger a highly responsive supportive nod when shifting to speaking/thinking
        if (this.data.state === 'speaking' || this.data.state === 'thinking') {
          this.nodTimer = 2.0; // nod sequence duration in seconds
        }
      }
    },
    poseBones: function () {
      // Find the direct loaded model group representation
      const model = this.el.getObject3D('mesh') || this.el.object3D;
      if (!model) {
        console.warn("[Seated Avatar Plugin] 3D mesh nodes not found yet for entity", this.el.id);
        return;
      }
      
      console.log("[Seated Avatar Plugin] skeletal humanoid bones identified. Initiating posture deformations...");
      
      const bones = this.bones;
      const baseRotations = this.baseRotations;
      let boneCount = 0;
      this.morphMeshes = [];
      
      model.traverse((node: any) => {
        if (node.isMesh && node.morphTargetDictionary && node.morphTargetInfluences) {
          this.morphMeshes.push(node);
        }
        if (node.isBone) {
          boneCount++;
          const name = node.name.toLowerCase();
          
          // Classify and save bone nodes
          if (name.includes('hips') || name.includes('mixamorighips')) bones.hips = node;
          else if (name.includes('spine') || name.includes('mixamorigspine')) bones.spine = node;
          else if (name.includes('neck') || name.includes('mixamorigneck')) bones.neck = node;
          else if (name.includes('head') || name.includes('mixamorighead')) bones.head = node;
          else if (name.includes('leftupleg') || name.includes('leftthigh') || name.includes('mixamorigleftupleg')) bones.leftUpLeg = node;
          else if (name.includes('rightupleg') || name.includes('rightthigh') || name.includes('mixamorigrightupleg')) bones.rightUpLeg = node;
          else if (name.includes('leftleg') || name.includes('mixamorigleftleg')) bones.leftLeg = node;
          else if (name.includes('rightleg') || name.includes('mixamorigrightleg')) bones.rightLeg = node;
          else if (name.includes('leftfoot') || name.includes('mixamorigleftfoot')) bones.leftFoot = node;
          else if (name.includes('rightfoot') || name.includes('mixamorigrightfoot')) bones.rightFoot = node;
          else if (name.includes('leftarm') || name.includes('mixamorigleftarm')) bones.leftArm = node;
          else if (name.includes('rightarm') || name.includes('mixamorigrightarm')) bones.rightArm = node;
          else if (name.includes('leftforearm') || name.includes('mixamorigleftforearm')) bones.leftForeArm = node;
          else if (name.includes('rightforearm') || name.includes('mixamorigrightforearm')) bones.rightForeArm = node;
          else if (name.includes('leftshoulder') || name.includes('mixamorigleftshoulder')) bones.leftShoulder = node;
          else if (name.includes('rightshoulder') || name.includes('mixamorigrightshoulder')) bones.rightShoulder = node;
          
          // Save default coordinates
          baseRotations[node.name] = {
            x: node.rotation.x,
            y: node.rotation.y,
            z: node.rotation.z
          };
          
          // Apply sitting posture
          if (name.includes('hips') || name.includes('mixamorighips')) {
            node.position.y = -0.32; // drop hips relative to mesh feet so it doesn't hover inside the chair
            node.position.z = -0.12; 
          } 
          else if (name.includes('upleg') || name.includes('thigh') || name.includes('mixamorigleftupleg') || name.includes('mixamorigrightupleg')) {
            node.rotation.x = -Math.PI / 2 - 0.12; 
            if (name.includes('left')) {
              node.rotation.y = 0.08;
              node.rotation.z = 0.05;
            } else {
              node.rotation.y = -0.08;
              node.rotation.z = -0.05;
            }
          } 
          else if ((name.includes('leg') && !name.includes('up') && !name.includes('foot') && !name.includes('arm')) || name.includes('mixamorigleftleg') || name.includes('mixamorigrightleg')) {
            node.rotation.x = Math.PI / 2 + 0.15; // 90 degree bent knees
          } 
          else if (name.includes('foot') || name.includes('mixamorigleftfoot') || name.includes('mixamorigrightfoot')) {
            node.rotation.x = -0.15;
          } 
          else if (name.includes('spine') || name.includes('mixamorigspine')) {
            node.rotation.x = 0.08; // lean slightly forward
          } 
          else if (name.includes('shoulder')) {
            node.rotation.z = name.includes('left') ? 0.05 : -0.05;
          } 
          else if (name.includes('arm') && !name.includes('forearm') && !name.includes('hand') && !name.includes('upleg') && !name.includes('leg')) {
            node.rotation.x = 0.45;
            node.rotation.z = name.includes('left') ? 0.25 : -0.25;
          } 
          else if (name.includes('forearm') || name.includes('mixamorigleftforearm') || name.includes('mixamorigrightforearm')) {
            node.rotation.x = -0.55;
            node.rotation.y = name.includes('left') ? -0.4 : 0.4;
            node.rotation.z = name.includes('left') ? -0.15 : 0.15;
          }
        }
      });

      // If bones are missing, just warn and leave the mesh as is.
      if (boneCount === 0) {
        console.warn("[Seated Avatar Plugin] No humanoid skeletal bones found to pose.");
      }

      console.log(`[Seated Avatar Plugin] Posture deformation complete. Registered ${boneCount} skeletal bone configurations.`);
    },
    tick: function (time, timeDelta) {
      if (!this.baseRotations) return;
      const dt = timeDelta / 1000;
      
      // Interpolate concerned factor smoothly
      this.concernedFactor = this.concernedFactor || 0;
      if (this.data.state === 'concerned') {
        this.concernedFactor = Math.min(1.0, this.concernedFactor + dt * 2.5);
      } else {
        this.concernedFactor = Math.max(0.0, this.concernedFactor - dt * 2.5);
      }
      const concernedFactor = this.concernedFactor;
      
      // 1. Natural breathing loop
      if (this.bones.spine) {
        const targetLean = 0.08 + (concernedFactor * 0.08); // curve the back forward slightly when looking concerned/skeptical
        const breatheX = Math.sin(time * 0.0016) * 0.012;
        const breatheZ = Math.cos(time * 0.0011) * 0.004;
        this.bones.spine.rotation.x = targetLean + breatheX;
        this.bones.spine.rotation.z = breatheZ;
      }
      
      if (this.bones.leftShoulder && this.bones.rightShoulder) {
        const breatheY = Math.sin(time * 0.0016) * 0.01; // subtle shoulder chest lift with breath cycle
        this.bones.leftShoulder.rotation.z = 0.05 + breatheY;
        this.bones.rightShoulder.rotation.z = -0.05 - breatheY;
      }
      
      // 2. Dynamic Gaze & Head Tracking looking at the Camera Rig (User)
      if (this.bones.head) {
        let targetAngleY = 0;
        let targetAngleX = 0;
        const THREE = window.THREE || (window.AFRAME && window.AFRAME.THREE);
        
        if (THREE) {
          const cameraEl = this.el.sceneEl && this.el.sceneEl.querySelector('a-camera');
          if (cameraEl && cameraEl.object3D) {
            const cameraPos = new THREE.Vector3();
            cameraEl.object3D.getWorldPosition(cameraPos);
            
            const headPos = new THREE.Vector3();
            this.bones.head.getWorldPosition(headPos);
            
            // Direction from head to camera
            const dir = new THREE.Vector3().subVectors(cameraPos, headPos).normalize();
            
            // Calculate relative target yaw (Y) and pitch (X)
            // Since our entity is rotated 180 degrees in the assembly, local forward z points in opposite direction
            targetAngleY = Math.atan2(dir.x, -dir.z);
            targetAngleX = -Math.asin(dir.y);
            
            // Clamp tracking angles to natural human head rotation limits to prevent neck snapping
            targetAngleY = Math.max(-0.55, Math.min(0.55, targetAngleY));
            targetAngleX = Math.max(-0.35, Math.min(0.35, targetAngleX));
          }
        }

        // Blend target look-at tracking with organic micro-tremor gaze drifts
        const lookAroundY = targetAngleY + Math.sin(time * 0.00045) * 0.04 + Math.cos(time * 0.00015) * 0.02;
        const lookAroundX = targetAngleX + Math.sin(time * 0.00035) * 0.025 + Math.cos(time * 0.00065) * 0.01 + (concernedFactor * 0.12);
        const lookAroundZ = (concernedFactor * 0.08);
        
        // Interpolate head joints smoothly
        this.bones.head.rotation.y += (lookAroundY - this.bones.head.rotation.y) * 0.12;
        this.bones.head.rotation.x += (lookAroundX - this.bones.head.rotation.x) * 0.12;
        this.bones.head.rotation.z += (lookAroundZ - this.bones.head.rotation.z) * 0.12;
        
        // 3. Supportive nodding loop
        if (this.nodTimer > 0 && concernedFactor < 0.5) {
          this.nodTimer -= dt;
          const nodOsc = Math.abs(Math.sin(time * 0.012)) * 0.12;
          this.bones.head.rotation.x += nodOsc;
        }
      }
      
      // 4. Subtle arm twitches / Advanced Hand Gesturing while speaking
      this.gestureTimer = this.gestureTimer || 0;
      this.activeGestureSide = this.activeGestureSide || 'none';
      this.gestureDuration = this.gestureDuration || 0;
      
      let targetLeftArmX = 0.45;
      let targetLeftArmY = 0.0;
      let targetLeftArmZ = 0.25;
      let targetLeftForeArmX = -0.55;
      let targetLeftForeArmY = -0.4;
      let targetLeftForeArmZ = -0.15;

      let targetRightArmX = 0.45;
      let targetRightArmY = 0.0;
      let targetRightArmZ = -0.25;
      let targetRightForeArmX = -0.55;
      let targetRightForeArmY = 0.4;
      let targetRightForeArmZ = 0.15;

      if (this.data.state === 'speaking') {
        this.gestureTimer += dt;
        if (this.activeGestureSide === 'none') {
          const p = Math.random();
          if (p < 0.35) this.activeGestureSide = 'left';
          else if (p < 0.7) this.activeGestureSide = 'right';
          else if (p < 0.9) this.activeGestureSide = 'both';
          else this.activeGestureSide = 'none';
          this.gestureDuration = 2.5 + Math.random() * 3.0;
          this.gestureTimer = 0;
        } else if (this.gestureTimer > this.gestureDuration) {
          this.activeGestureSide = 'none';
          this.gestureDuration = 1.5 + Math.random() * 2.0;
          this.gestureTimer = 0;
        }
      } else {
        this.activeGestureSide = 'none';
      }

      // Compute gesture joints dynamically
      if (this.activeGestureSide === 'left' || this.activeGestureSide === 'both') {
        targetLeftArmX = 0.72 + Math.sin(time * 0.0035) * 0.12;
        targetLeftArmY = -0.22 + Math.cos(time * 0.002) * 0.08;
        targetLeftArmZ = 0.38 + Math.sin(time * 0.0025) * 0.08;
        targetLeftForeArmX = -0.95 + Math.sin(time * 0.004) * 0.15;
        targetLeftForeArmY = -0.55 + Math.cos(time * 0.003) * 0.1;
      }
      if (this.activeGestureSide === 'right' || this.activeGestureSide === 'both') {
        targetRightArmX = 0.72 + Math.sin(time * 0.0035) * 0.12;
        targetRightArmY = 0.22 - Math.cos(time * 0.002) * 0.08;
        targetRightArmZ = -0.38 - Math.sin(time * 0.0025) * 0.08;
        targetRightForeArmX = -0.95 + Math.sin(time * 0.004) * 0.15;
        targetRightForeArmY = 0.55 - Math.cos(time * 0.003) * 0.1;
      }

      // Interpolate joint angles over time
      const lerpa = (bone: any, targetRot: any, rate = 0.06) => {
        if (!bone) return;
        bone.rotation.x += (targetRot.x - bone.rotation.x) * rate;
        if (targetRot.y !== undefined) bone.rotation.y += (targetRot.y - bone.rotation.y) * rate;
        if (targetRot.z !== undefined) bone.rotation.z += (targetRot.z - bone.rotation.z) * rate;
      };

      lerpa(this.bones.leftArm, { x: targetLeftArmX, y: targetLeftArmY, z: targetLeftArmZ });
      lerpa(this.bones.leftForeArm, { x: targetLeftForeArmX, y: targetLeftForeArmY, z: targetLeftForeArmZ });
      lerpa(this.bones.rightArm, { x: targetRightArmX, y: targetRightArmY, z: targetRightArmZ });
      lerpa(this.bones.rightForeArm, { x: targetRightForeArmX, y: targetRightForeArmY, z: targetRightForeArmZ });

      // 5. Eyeblinking & Real-Time Lip Sync (Ready Player Me Apple ARKit Blendshapes)
      this.blinkTimer -= dt;
      if (this.blinkTimer <= 0) {
        if (this.blinkTimer < -this.blinkInterval) {
          this.blinkTimer = 0.15; // blink lasts 150ms
          this.blinkInterval = 3.0 + Math.random() * 4.0; // reset next interval
        }
      }
      const blinkVal = this.blinkTimer > 0 ? Math.sin((this.blinkTimer / 0.15) * Math.PI) : 0;

      // Dynamic speech lip-sync variables
      let jawOpenVal = 0;
      let mouthOpenVal = 0;
      if (this.data.state === 'speaking') {
        const speechFreq = time * 0.016;
        jawOpenVal = Math.abs(Math.sin(speechFreq) * 0.45 + Math.cos(speechFreq * 0.6) * 0.25) * 0.75;
        mouthOpenVal = jawOpenVal * 0.9;
        // Introduce natural pauses
        if (Math.sin(time * 0.0032) < -0.65) {
          jawOpenVal *= 0.05;
          mouthOpenVal *= 0.05;
        }
      }

      // Iterate morph meshes to execute blinking and lip movements accurately
      if (this.morphMeshes && this.morphMeshes.length > 0) {
        this.morphMeshes.forEach((mesh: any) => {
          const dict = mesh.morphTargetDictionary;
          const influences = mesh.morphTargetInfluences;
          if (dict && influences) {
            // Apply blendshapes
            const blends = [
              { key: 'mouthfrownleft', max: 0.85, val: concernedFactor * 0.85 },
              { key: 'mouthfrownright', max: 0.85, val: concernedFactor * 0.85 },
              { key: 'browdownleft', max: 0.75, val: concernedFactor * 0.75 },
              { key: 'browdownright', max: 0.75, val: concernedFactor * 0.75 },
              { key: 'browinnerup', max: 0.45, val: concernedFactor * 0.45 },
              
              // Eyeblink mapping
              { key: 'eyeblinkleft', max: 1.0, val: blinkVal },
              { key: 'eyeblinkright', max: 1.0, val: blinkVal },
              { key: 'eyeblink_l', max: 1.0, val: blinkVal },
              { key: 'eyeblink_r', max: 1.0, val: blinkVal },
              { key: 'eyesclosed', max: 1.0, val: blinkVal },
              
              // Speech lip-sync mapping
              { key: 'jawopen', max: 1.0, val: jawOpenVal },
              { key: 'jaw_open', max: 1.0, val: jawOpenVal },
              { key: 'mouthopen', max: 1.0, val: mouthOpenVal },
              { key: 'mouth_open', max: 1.0, val: mouthOpenVal },
              { key: 'mouthfunnel', max: 0.65, val: jawOpenVal * 0.4 },
              { key: 'mouthpucker', max: 0.65, val: jawOpenVal * 0.3 }
            ];

            blends.forEach((b) => {
              let idx = dict[b.key];
              if (idx === undefined) {
                // Try lowercase fuzzy find
                for (const k in dict) {
                  if (k.toLowerCase() === b.key) {
                    idx = dict[k];
                    break;
                  }
                }
              }
              if (idx !== undefined) {
                const cur = influences[idx] || 0;
                const tgt = b.val;
                influences[idx] = cur + (tgt - cur) * 0.18; // smooth interpolation rate
              }
            });
          }
        });
      }
    }
  });
    }
  };
  
}

const INTERVIEWERS = [
  {
    id: "marcus",
    name: "Marcus - Executive Recruiter",
    role: "VP of Talent Acquisition",
    url: "https://models.readyplayer.me/6487e41b9e07fb317075c3ef.glb",
    desc: "Age 35. Evaluates executive presence and technical depth.",
    img: "👨‍💼"
  },
  {
    id: "elena",
    name: "Elena - Corporate Recruiter",
    role: "Senior Enterprise Talent Acquisition",
    url: "https://models.readyplayer.me/658b449ff1dc12dc4a20f924.glb", // Using a professional female RPM model as a placeholder since real photorealistic GLBs aren't readily available via CDN
    desc: "Age 32. Professional, friendly. Evaluates candidates for Google/Microsoft-tier enterprise roles.",
    img: "👩‍💼"
  },
  {
    id: "samantha",
    name: "Samantha Recruiter",
    role: "Lead Tech Talent Specialist",
    url: "https://models.readyplayer.me/64b54e7d1872df82a7f5a9e3.glb",
    desc: "Provides rigorous feedback on system scaling and candidate capabilities",
    img: "👧"
  },
  {
    id: "sarah",
    name: "Sarah Miller",
    role: "Senior Director of People Strategy",
    url: "https://models.readyplayer.me/64b54e7d1872df82a7f5a9e3.glb",
    desc: "Focuses on corporate alignment, cultural integrity, and deep systems engineering",
    img: "👩‍💼"
  },
  {
    id: "james",
    name: "James Thorne",
    role: "Principal Infrastructure Architect",
    url: "https://models.readyplayer.me/6347f8ba1688d0b28fc0bbff.glb",
    desc: "Direct systems veteran focusing on scalability and production architecture",
    img: "👨"
  }
];

const ROUNDS = [
  { key: "self-introduction", label: "Self-Introduction Round", desc: "First impressions, career goals, and personal pitch" },
  { key: "aptitude", label: "Aptitude Round", desc: "Mathematical puzzles, dynamic logic, and reasoning speed" },
  { key: "technical", label: "Technical Round", desc: "Database models, design patterns, and core development" },
  { key: "project", label: "Project Discussion Round", desc: "Architecture breakdowns, bottlenecks, and hosting budgets" },
  { key: "gd", label: "GD (Group Discussion) Round", desc: "Corporate debates, remote work ethics, and scaling trade-offs" },
  { key: "hr", label: "HR Round", desc: "Cultural alignment, conflict management, and workplace scenario checks" }
];

// Predefined 6 Futuristic Interview Modes for Room Transformation
const INTERVIEW_MODES = [
  {
    id: "google",
    company: "Google",
    role: "Software Engineer",
    theme: {
      primaryColor: "#0ea5e9", // Sky blue focus
      brandColors: ["#4285F4", "#EA4335", "#FBBC05", "#34A853"],
      accentGlow: "rgba(66, 133, 244, 0.25)",
      boardroomStyle: "Corporate Platinum",
      skyColor: "#bfdbfe",
      lightColor: "#f0fdf4",
      lightIntensity: 1.3,
      daylightName: "Active Daylight",
      officeMurmurPitch: 1.0,
      wallTextureColor: "#f8fafc",
      floorColor: "#e2e8f0",
      deskColor: "#0f172a"
    },
    mentorTip: "Focus on Google's three pillars: massive scale, performance complexity, and Googliness.",
    pastScore: 71,
    pastFocus: "System Design",
    welcomeMemory: "Welcome back! In your session last week, your systems scale score was 71%. Today, let's push for 90% by optimizing caching layers."
  },
  {
    id: "microsoft",
    company: "Microsoft",
    role: "AI Engineer",
    theme: {
      primaryColor: "#2563eb",
      brandColors: ["#F25022", "#7FBA00", "#00A1F1", "#FFB900"],
      accentGlow: "rgba(0, 161, 241, 0.25)",
      boardroomStyle: "Azure Executive",
      skyColor: "#e0f2fe",
      lightColor: "#eff6ff",
      lightIntensity: 1.25,
      daylightName: "Azure Twilight",
      officeMurmurPitch: 0.9,
      wallTextureColor: "#f1f5f9",
      floorColor: "#cbd5e1",
      deskColor: "#1e293b"
    },
    mentorTip: "Microsoft appreciates deep systems integration, practical cloud migration (Azure), and clear architectural trade-offs.",
    pastScore: 68,
    pastFocus: "Machine Learning Pipelines",
    welcomeMemory: "Good to see you again! Last time, we flagged custom model scheduling on Azure as a gap. Let's aim to ace the model orchestration segment."
  },
  {
    id: "amazon",
    company: "Amazon",
    role: "SDE",
    theme: {
      primaryColor: "#f97316",
      brandColors: ["#FF9900", "#146B93"],
      accentGlow: "rgba(255, 153, 0, 0.25)",
      boardroomStyle: "Leadership Woodwork",
      skyColor: "#fef3c7",
      lightColor: "#fffbeb",
      lightIntensity: 1.15,
      daylightName: "Warm Warehouse Sunset",
      officeMurmurPitch: 1.1,
      wallTextureColor: "#fafaf9",
      floorColor: "#d6d3d1",
      deskColor: "#451a03" 
    },
    mentorTip: "Always frame your answers with the STAR method and anchor to Amazon's 16 Leadership Principles.",
    pastScore: 74,
    pastFocus: "Leadership Principles (LP)",
    welcomeMemory: "Welcome back. In our last mock run, your Customer Obsession answers were rated 74%. Today, let's weave in bias for action and deep ownership."
  },
  {
    id: "openai",
    company: "OpenAI",
    role: "Research Intern",
    theme: {
      primaryColor: "#ec4899",
      brandColors: ["#000000", "#ffffff"],
      accentGlow: "rgba(236, 72, 153, 0.3)",
      boardroomStyle: "Monochrome Concrete",
      skyColor: "#1e1b4b",
      lightColor: "#fbf7ff",
      lightIntensity: 0.85,
      daylightName: "Cyber-Night 2040-2050",
      officeMurmurPitch: 0.8,
      wallTextureColor: "#111827",
      floorColor: "#1f2937",
      deskColor: "#030712"
    },
    mentorTip: "Dive deep into modern machine learning concepts: tokenization, attention complexity, and reinforcement learning.",
    pastScore: 65,
    pastFocus: "Transformer Architecture Depth",
    welcomeMemory: "Welcome! Our research nodes tracked your previous AI engineering attempt at 65%. Let's target deep attention complexity scaling today."
  },
  {
    id: "startup",
    company: "Startup",
    role: "Founder Interview",
    theme: {
      primaryColor: "#22c55e",
      brandColors: ["#22C55E", "#00ffcc"],
      accentGlow: "rgba(34, 197, 94, 0.25)",
      boardroomStyle: "Hacker Garage",
      skyColor: "#fef08a",
      lightColor: "#f0fdf4",
      lightIntensity: 1.05,
      daylightName: "Hacker Dawn",
      officeMurmurPitch: 1.25,
      wallTextureColor: "#1c1917",
      floorColor: "#292524",
      deskColor: "#22c55e"
    },
    mentorTip: "Founders look for high agency, multi-functional resourcefulness, and extreme speed of execution over boilerplate optimization.",
    pastScore: 70,
    pastFocus: "High Agency & Product MVP Focus",
    welcomeMemory: "Welcome back! In our previous founder pitch, you scored 70%. Let's accelerate today. Focus on rapid release and user-first metrics."
  },
  {
    id: "pm",
    company: "Product Manager",
    role: "Interview",
    theme: {
      primaryColor: "#a855f7",
      brandColors: ["#A855F7", "#ec4899"],
      accentGlow: "rgba(168, 85, 247, 0.25)",
      boardroomStyle: "Silicon Kanban Lounge",
      skyColor: "#fae8ff",
      lightColor: "#fdf4ff",
      lightIntensity: 1.2,
      daylightName: "Fluid Purple Morning",
      officeMurmurPitch: 1.0,
      wallTextureColor: "#f5f3ff",
      floorColor: "#ddd6fe",
      deskColor: "#4c1d95"
    },
    mentorTip: "Structure your product design questions using metrics: HEAR/AARRR. Build clear wireframes conceptually.",
    pastScore: 73,
    pastFocus: "North Star Metric Selection",
    welcomeMemory: "Great to have you back! Last time, your North Star Metric articulation reached 73%. Let's secure 85%+ today with user empathy framework."
  }
];

export default function Interview() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state || {};
  const companyData = state.companyData || "- Company: Niya AI\n- Role: Software Engineer\n- Focus: System Design";
  const candidateSkills = state.candidateSkills || "React, TypeScript, Python, SQL";

  // Parse company and role from metadata context into reactive states
  const [targetCompany, setTargetCompany] = useState(() => {
    try {
      const comLine = companyData.split('\n').find(l => l.includes('- Company:'));
      return comLine ? comLine.replace('- Company:', '').trim() : "Niya AI";
    } catch (e) {
      return "Niya AI";
    }
  });

  const [targetRole, setTargetRole] = useState(() => {
    try {
      const roleLine = companyData.split('\n').find(l => l.includes('- Role:'));
      return roleLine ? roleLine.replace('- Role:', '').trim() : "Software Engineer";
    } catch (e) {
      return "Software Engineer";
    }
  });

  // Determine active company configuration mode on boot
  const [currentMode, setCurrentMode] = useState(() => {
    const comp = (targetCompany || "Niya AI").toLowerCase();
    const found = INTERVIEW_MODES.find(m => comp.includes(m.id) || m.company.toLowerCase().includes(comp));
    return found || INTERVIEW_MODES[0];
  });

  // Daylight options: morning, noon, sunset, night
  const [daylightMode, setDaylightMode] = useState<'morning' | 'noon' | 'sunset' | 'night'>('morning');

  // VR Floor Style setup options: wood | tiles
  const [floorStyle, setFloorStyle] = useState<'wood' | 'tiles'>('wood');

  // Real-time computed evaluation metrics telemetry indicators
  const [metrics, setMetrics] = useState({
    confidence: 84,
    communication: 78,
    technical: 81,
    eyeContact: 92,
    speakingSpeed: 130,
    fillerCount: 1
  });

  const [mentorAdvice, setMentorAdvice] = useState("Excellent posture! Documenting key performance vectors on screen.");
  const [recapMessage, setRecapMessage] = useState("");
  const [isVRActive, setIsVRActive] = useState(() => typeof window !== 'undefined' && !!(window as any).AFRAME);

  useEffect(() => {
    const checkVR = () => {
      if (typeof window !== 'undefined' && (window as any).AFRAME) {
        setIsVRActive(true);
        if (typeof (window as any).registerSeatedAvatar === 'function') {
          try {
            
          } catch (e) {
            console.warn("[Newyatra AI] Avatar registration retry failed:", e);
          }
        }
        return true;
      }
      return false;
    };

    if (!checkVR()) {
      let count = 0;
      const interval = setInterval(() => {
        count++;
        if (checkVR() || count > 15) {
          clearInterval(interval);
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, []);

  // Adaptive user performance/score memory logic
  useEffect(() => {
    // Populate recap message on mode shift
    const saved = localStorage.getItem("latest_grade_score");
    const prevScore = saved ? parseInt(saved) : (currentMode.pastScore || 71);
    const lastTopic = currentMode.pastFocus || "System Design";
    setRecapMessage(`In last week's trial, your score was ${prevScore}% with focus on ${lastTopic}. Today, our real-time spatial indicators and AI companion Naya AI are calibrated for your new goals.`);
  }, [currentMode]);

  // Premium Web Audio Spatial Synthesizer Engine
  const playSpatialAudioPing = (panValue: number, frequency = 440, type: 'sine' | 'triangle' | 'sine-long' = 'sine') => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = audioContextRef.current || new AudioContextClass();
      if (!audioContextRef.current) audioContextRef.current = ctx;
      
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      let pannerNode;
      if (ctx.createStereoPanner) {
        pannerNode = ctx.createStereoPanner();
        pannerNode.pan.setValueAtTime(panValue, ctx.currentTime);
      } else {
        pannerNode = ctx.createGain();
      }
      
      osc.type = type === 'sine-long' ? 'sine' : type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      
      if (type === 'sine-long') {
        gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      } else {
        gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      }
      
      osc.connect(gainNode);
      gainNode.connect(pannerNode);
      pannerNode.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + (type === 'sine-long' ? 1.5 : 0.5));
    } catch (err) {
      console.warn("Spatial audio synthesis failed:", err);
    }
  };

  const playElevatorChime = () => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = audioContextRef.current || new AudioContextClass();
      if (!audioContextRef.current) audioContextRef.current = ctx;
      
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Elevator stands far to the left (panned left: -0.95)
      const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
      if (ctx.createStereoPanner) {
        (panner as StereoPannerNode).pan.setValueAtTime(-0.95, ctx.currentTime);
      }

      const now = ctx.currentTime;
      
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.frequency.setValueAtTime(554.37, now); // C#5
      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.linearRampToValueAtTime(0.05, now + 0.1);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.frequency.setValueAtTime(440, now + 0.25); // A4
      gain2.gain.setValueAtTime(0.001, now + 0.25);
      gain2.gain.linearRampToValueAtTime(0.05, now + 0.35);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      
      osc1.connect(gain1);
      gain1.connect(panner);
      
      osc2.connect(gain2);
      gain2.connect(panner);
      
      panner.connect(ctx.destination);
      
      osc1.start(now);
      osc1.stop(now + 1.0);
      
      osc2.start(now + 0.25);
      osc2.stop(now + 1.5);
    } catch (e) {
      console.warn("Elevator chime synthesis failed:", e);
    }
  };

  const playKeyboardClick = () => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = audioContextRef.current || new AudioContextClass();
      if (!audioContextRef.current) audioContextRef.current = ctx;
      if (ctx.state === 'suspended') ctx.resume();
      
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      const freq = 1200 + Math.random() * 400;
      osc.frequency.setValueAtTime(freq, now);
      
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.008, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {}
  };

  const updateMentorAdvice = (text: string) => {
    setMentorAdvice(text);
    // AI Companion stands to the right (panned right: 0.85)
    // High pitch sci-fi chime
    playSpatialAudioPing(0.85, 880, 'sine');
  };

  // Interview Multi-Round State Engine
  const [selectedInterviewer, setSelectedInterviewer] = useState(INTERVIEWERS[0]);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  // Custom entrance variables for corporate boardroom walk-in
  const [entranceState, setEntranceState] = useState<'unstarted' | 'door-opening' | 'walking' | 'seated'>('seated');
  const [doorRotationY, setDoorRotationY] = useState(0); // 0 = closed, -90 = open
  const [cameraRigPos, setCameraRigPos] = useState({ x: 0, y: 0, z: 1.45 }); // starts outside the door
  const [questions, setQuestions] = useState<any[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({}); // structure: { "roundIdx_questionIdx": answerString }
  
  const [isMicOn, setIsMicOn] = useState(false);
  const [timeLeft, setTimeLeft] = useState(45 * 60); // 45 minute total timer
  const [cameraZ, setCameraZ] = useState(1.5);
  const [showTips, setShowTips] = useState(true);

  const handleZoomIn = () => {
    setCameraZ((prev) => Math.max(-1.0, prev - 0.4));
    playSpatialAudioPing(0.65, 700, 'sine');
  };

  const handleZoomOut = () => {
    setCameraZ((prev) => Math.min(4.5, prev + 0.4));
    playSpatialAudioPing(0.65, 500, 'sine');
  };

  const handleResetZoom = () => {
    setCameraZ(1.5);
    playSpatialAudioPing(0.65, 600, 'sine');
  };

  const enterVRMode = () => {
    const sceneEl = document.querySelector('a-scene');
    if (sceneEl) {
      try {
        (sceneEl as any).enterVR();
        playSpatialAudioPing(0.85, 880, 'sine');
      } catch (e) {
        console.warn("VR entry failure:", e);
      }
    }
  };

  const enterARMode = () => {
    const sceneEl = document.querySelector('a-scene');
    if (sceneEl) {
      try {
        const webxrSystem = (sceneEl as any).systems && (sceneEl as any).systems.webxr;
        if (webxrSystem) {
           if (!webxrSystem.sessionConfiguration) webxrSystem.sessionConfiguration = {};
           if (!webxrSystem.sessionConfiguration.optionalFeatures) webxrSystem.sessionConfiguration.optionalFeatures = [];
           if (!webxrSystem.sessionConfiguration.optionalFeatures.includes('dom-overlay')) {
             webxrSystem.sessionConfiguration.optionalFeatures.push('dom-overlay');
           }
           if (!webxrSystem.sessionConfiguration.optionalFeatures.includes('hit-test')) {
             webxrSystem.sessionConfiguration.optionalFeatures.push('hit-test');
           }
           webxrSystem.sessionConfiguration.domOverlay = { root: document.getElementById('vr-ui-overlay') };
        }
        
        if (typeof (sceneEl as any).enterAR === 'function') {
          (sceneEl as any).enterAR();
        } else {
          (sceneEl as any).enterVR(true);
        }
        playSpatialAudioPing(0.85, 980, 'sine');
      } catch (e) {
        console.warn("AR entry failure:", e);
      }
    }
  };
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSpeech, setAiSpeech] = useState("Establishing secure audio connection with our interviewer avatar...");
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Unified chronological log of interview transcripts
  const [chatHistory, setChatHistory] = useState<{role: string, text: string}[]>([]);

  // Web Audio ambient synthesizer states for realistic corporate room acoustic background
  const [isAmbientPlaying, setIsAmbientPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const synthNodesRef = useRef<any[]>([]);

  const toggleAmbientSound = () => {
    if (isAmbientPlaying) {
      synthNodesRef.current.forEach(node => {
        try { node.stop(); } catch(e) {}
      });
      synthNodesRef.current = [];
      setIsAmbientPlaying(false);
    } else {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
        audioContextRef.current = ctx;

        // Base grounding hum (60Hz low-frequency power transformer frequency)
        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(60, ctx.currentTime);

        const osc2 = ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(120, ctx.currentTime);

        const lowpassFilter = ctx.createBiquadFilter();
        lowpassFilter.type = 'lowpass';
        lowpassFilter.frequency.setValueAtTime(80, ctx.currentTime);

        // Soft AC ventilation white-noise simulation (relaxing airflow effect)
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const bandpassFilter = ctx.createBiquadFilter();
        bandpassFilter.type = 'bandpass';
        bandpassFilter.frequency.setValueAtTime(450, ctx.currentTime);
        bandpassFilter.Q.setValueAtTime(1.0, ctx.currentTime);

        const gainOsc1 = ctx.createGain();
        gainOsc1.gain.setValueAtTime(0.04, ctx.currentTime);

        const gainOsc2 = ctx.createGain();
        gainOsc2.gain.setValueAtTime(0.015, ctx.currentTime);

        const gainNoise = ctx.createGain();
        gainNoise.gain.setValueAtTime(0.008, ctx.currentTime);

        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0.7, ctx.currentTime);
        gainNodeRef.current = masterGain;

        osc1.connect(lowpassFilter);
        lowpassFilter.connect(gainOsc1);
        gainOsc1.connect(masterGain);

        osc2.connect(gainOsc2);
        gainOsc2.connect(masterGain);

        noise.connect(bandpassFilter);
        bandpassFilter.connect(gainNoise);
        gainNoise.connect(masterGain);

        masterGain.connect(ctx.destination);

        osc1.start();
        osc2.start();
        noise.start();

        synthNodesRef.current = [osc1, osc2, noise];
        setIsAmbientPlaying(true);
      } catch (err) {
        console.warn("Failed to initialize Web Audio Ambiance:", err instanceof Error ? err.message : String(err));
      }
    }
  };

  // Automated clean up of sound oscillators on unmount
  useEffect(() => {
    return () => {
      synthNodesRef.current.forEach(node => {
        try { node.stop(); } catch(e) {}
      });
      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch(e) {}
      }
    };
  }, []);

  // Synchronized interviewer avatar states
  const [avatarState, setAvatarState] = useState<'listening' | 'thinking' | 'speaking' | 'idle' | 'concerned'>('idle');
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [secondsWaiting, setSecondsWaiting] = useState(0);

  // Reset waiting timer whenever question index shifts, round index shifts, or speaking state changes
  useEffect(() => {
    setSecondsWaiting(0);
  }, [currentQuestionIndex, currentRoundIndex, isSpeaking]);

  // Increment waiting timer every second if the interviewer is NOT speaking, is not generating or loading questions, and a valid question is active
  useEffect(() => {
    if (isSpeaking || loadingQuestions || isGenerating || currentQuestionIndex >= 8) {
      return;
    }
    
    const interval = setInterval(() => {
      setSecondsWaiting(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isSpeaking, loadingQuestions, isGenerating, currentQuestionIndex]);

  useEffect(() => {
    if (loadingQuestions || isGenerating) {
      setAvatarState('thinking');
    } else if (isSpeaking) {
      setAvatarState('speaking');
    } else if (ROUNDS[currentRoundIndex]?.key === 'technical' && secondsWaiting >= 15) {
      setAvatarState('concerned');
    } else if (isMicOn) {
      setAvatarState('listening');
    } else {
      setAvatarState('idle');
    }
  }, [loadingQuestions, isGenerating, isSpeaking, isMicOn, secondsWaiting, currentRoundIndex]);

  // Evaluation Metrics States
  const [isGrading, setIsGrading] = useState(false);
  const [isEvaluatingAnswer, setIsEvaluatingAnswer] = useState(false);
  const [gradeResult, setGradeResult] = useState<any>(null);
  const [monitorReport, setMonitorReport] = useState<any>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Auto-scroll transcripts
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isGenerating, isEvaluatingAnswer]);

  // General 45-min Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [pendingFollowUp, setPendingFollowUp] = useState<string | null>(null);
  const [askedFollowUp, setAskedFollowUp] = useState(false);

  // Fetch or compile questions for a specific round index with optional parameters overrides
  const fetchRoundQuestions = async (roundIdx: number, overrideCompany?: string, overrideRole?: string) => {
    setLoadingQuestions(true);
    const activeRound = ROUNDS[roundIdx];
    const compToUse = overrideCompany || targetCompany;
    const roleToUse = overrideRole || targetRole;
    
    // Clear keyboard input states
    setInputText("");
    
    try {
      const token = (auth.currentUser ? await auth.currentUser.getIdToken() : null) || (() => {
        const payload = { user_id: "guest-user-123" };
        const payloadB64 = btoa(JSON.stringify(payload))
          .replace(/=/g, "")
          .replace(/\+/g, "-")
          .replace(/\//g, "_");
        return `header.${payloadB64}.signature`;
      })();
 
      const res = await fetch('/api/interview/generate-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          roundType: activeRound.key,
          role: roleToUse,
          company: compToUse,
          candidateSkills: candidateSkills
        })
      });
 
      if (!res.ok) {
        throw new Error("HTTP error: " + res.status);
      }
 
      const data = await res.json();
      const loadedQuestions = Array.isArray(data) ? data : (data.questions || []);
      setQuestions(loadedQuestions);
      setCurrentQuestionIndex(0);
 
      // Trigger first question spoken by avatar (only of seated or subsequent rounds)
      if (loadedQuestions.length > 0) {
        const firstQ = loadedQuestions[0];
        setAiSpeech(firstQ.question);
        
        // Skip calling speech synthesize if they are still performing entrance walk-in
        if (entranceState === 'seated' || roundIdx > 0) {
          // Speak question out loud
          speakText(firstQ.question);
 
          // Append to master transcript history
          setChatHistory(prev => [
            ...prev,
            { role: 'ai', text: `[${activeRound.label} - Q1] ${firstQ.question}` }
          ]);
        }
      }
    } catch (err) {
      console.warn("Could not fetch remote questions, calling fallback offline assets:", err instanceof Error ? err.message : String(err));
      // Fallback local mock questions matching same 8 per round schema
      const offlineQuestions = getFallbackLocalQuestions(activeRound.key, roleToUse, compToUse, candidateSkills);
      setQuestions(offlineQuestions);
      setCurrentQuestionIndex(0);
 
      if (offlineQuestions.length > 0) {
        const firstQ = offlineQuestions[0];
        setAiSpeech(firstQ.question);
        
        if (entranceState === 'seated' || roundIdx > 0) {
          speakText(firstQ.question);
 
          setChatHistory(prev => [
            ...prev,
            { role: 'ai', text: `[${activeRound.label} - Q1] ${firstQ.question}` }
          ]);
        }
      }
    } finally {
      setLoadingQuestions(false);
    }
  };
 
  // Run initial fetch for Self-Introduction round
  useEffect(() => {
    fetchRoundQuestions(0);
  }, []);

  // Entrance Sequence Orchestration Timers
  const startEntranceSequence = () => {
    if (entranceState !== 'unstarted') return;
    
    // Play a realistic steel elevator bell chime from left hallway foyer!
    playElevatorChime();
    
    // Play warm airflow ventilation click sound hum
    if (!isAmbientPlaying) {
      toggleAmbientSound();
    }
    
    setEntranceState('door-opening');
    setDoorRotationY(-95); // open wide on left corner hinge
    
    // Step 2: Candidates walk into the doorway frame
    setTimeout(() => {
      setEntranceState('walking');
      setCameraRigPos({ x: -3.8, y: 0, z: 2.5 });
      
      // Play a spatial audio sweep cue
      playSpatialAudioPing(0.0, 523.25, 'sine');
      
      // Avatar welcomes Candidate using intelligent mode memory
      const introGreetingStr = `Welcome to the ${targetCompany} executive VR boardroom. ${recapMessage} Please come on in, pull up a chair, and make yourself comfortable.`;
      setAiSpeech(introGreetingStr);
      speakText(introGreetingStr);
    }, 2000);
    
    // Step 3: Candidate advances gracefully to the executive desk candidate seat
    setTimeout(() => {
      setCameraRigPos({ x: 0, y: 0, z: 1.45 });
    }, 4500);
    
    // Step 4: Settle camera seating, start the interactive rounds of questions
    setTimeout(() => {
      setEntranceState('seated');
    }, 7500);
  };

  // Trigger first round question once fully seated
  useEffect(() => {
    if (entranceState === 'seated' && questions.length > 0 && currentQuestionIndex === 0 && chatHistory.length === 0) {
      const firstQ = questions[0];
      setAiSpeech(firstQ.question);
      speakText(firstQ.question);
      setChatHistory(prev => [
        ...prev,
        { role: 'ai', text: `[${ROUNDS[currentRoundIndex].label} - Q1] ${firstQ.question}` }
      ]);
    }
  }, [entranceState, questions]);

  // Vocalize questions using premium SpeechSynthesis
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.05; // Slightly higher pitch for clear female avatar delivery
      
      utterance.onstart = () => {
        setIsSpeaking(true);
      };
      utterance.onend = () => {
        setIsSpeaking(false);
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
      };
      utterance.onpause = () => {
        setIsSpeaking(false);
      };
      utterance.onresume = () => {
        setIsSpeaking(true);
      };

      const setVoiceAndSpeak = () => {
        const voices = window.speechSynthesis.getVoices();
        // Prefer Samantha/other female-aligned audio models
        const preferredVoice = voices.find(v => 
          v.name.includes('Samantha') || 
          v.name.includes('Google US English') || 
          v.name.includes('Zira') || 
          v.name.includes('Hazel') ||
          v.lang === 'en-US'
        );
        if (preferredVoice) utterance.voice = preferredVoice;
        window.speechSynthesis.speak(utterance);
      };

      if (window.speechSynthesis.getVoices().length > 0) {
        setVoiceAndSpeak();
      } else {
        window.speechSynthesis.onvoiceschanged = setVoiceAndSpeak;
      }
    }
  };

  // Record active user message, advance question, or finish round
  const handleUserMessage = async (message: string) => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || loadingQuestions || isEvaluatingAnswer) return;

    // Immediately stop avatar speaking
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    // Save active reply
    const answerKey = `${currentRoundIndex}_${currentQuestionIndex}${askedFollowUp ? '_followup' : ''}`;
    setAnswers(prev => ({ ...prev, [answerKey]: trimmedMessage }));

    // Append answer log to transcript
    const activeQ = questions[currentQuestionIndex];
    setChatHistory(prev => [
      ...prev,
      { role: 'user', text: trimmedMessage }
    ]);
    setInputText("");

    // Calculate randomized real-time visual telemetry fluctuations
    const wordCount = trimmedMessage.split(/\s+/).filter(Boolean).length;
    const computedSpeed = wordCount > 0 ? Math.min(210, Math.max(90, Math.floor((wordCount / 12) * 140))) : 130;
    const hasFillers = trimmedMessage.toLowerCase().includes("um") || trimmedMessage.toLowerCase().includes("like") || trimmedMessage.toLowerCase().includes("uh");
    
    setMetrics(prev => {
      const scaleTe = Math.min(98, Math.max(70, prev.technical + (wordCount > 15 ? 1 : -1) + Math.floor(Math.random() * 3 - 1)));
      const scaleCo = Math.min(99, Math.max(68, prev.communication + (wordCount > 10 ? 2 : -2)));
      return {
        confidence: Math.min(98, Math.max(74, prev.confidence + (wordCount > 12 ? 1 : -2) + Math.floor(Math.random() * 4 - 2))),
        communication: scaleCo,
        technical: scaleTe,
        eyeContact: Math.min(97, Math.max(85, prev.eyeContact + Math.floor(Math.random() * 5 - 2))),
        speakingSpeed: computedSpeed,
        fillerCount: prev.fillerCount + (hasFillers ? 1 : 0)
      };
    });

    if (trimmedMessage === "[Candidate skipped or requested next question]" || currentQuestionIndex >= 8) {
       advanceToNextQuestion();
       return;
    }

    setIsEvaluatingAnswer(true);
    let speechPrefix = "";
    
    try {
      const token = (auth.currentUser ? await auth.currentUser.getIdToken() : null) || (() => {
        const payload = { user_id: "guest-user-123" };
        const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
        return `header.${payloadB64}.signature`;
      })();

      const qText = pendingFollowUp || activeQ.question;
      const res = await fetch('/api/interview/answer/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          company: targetCompany,
          role: targetRole,
          round: ROUNDS[currentRoundIndex].label,
          question: qText,
          answer: trimmedMessage
        })
      });
      const data = await res.json();
      
      let combinedSpeech = data.interviewer_would_say || "Got it.";
      updateMentorAdvice(`NAYA SCORE: ${data.score}/${data.max_score} (${data.verdict}). ${data.ideal_answer_in_one_line || ""}`);
      
      if (data.ask_follow_up && !askedFollowUp && data.follow_up_question) {
         combinedSpeech += " " + data.follow_up_question;
         setPendingFollowUp(data.follow_up_question);
         setAskedFollowUp(true);
         
         setChatHistory(prev => [
           ...prev,
           { role: 'ai', text: `[${ROUNDS[currentRoundIndex].label} - Follow-up] ${combinedSpeech}` }
         ]);
         setAiSpeech(combinedSpeech);
         speakText(combinedSpeech);
         setIsEvaluatingAnswer(false);
         return; // Intercept: don't advance to next question
      } else {
         // Reset follow up states
         setPendingFollowUp(null);
         setAskedFollowUp(false);
         
         setChatHistory(prev => [
           ...prev,
           { role: 'ai', text: `[${ROUNDS[currentRoundIndex].label} - Feedback] ${data.interviewer_would_say}` }
         ]);
         speechPrefix = data.interviewer_would_say + " ";
      }
    } catch (e) {
      console.warn("Could not score answer", e);
    }

    // After scoring, advance to question or next round
    advanceToNextQuestion(speechPrefix);
  };

  const advanceToNextQuestion = (speechPrefix: string = "") => {
    setIsEvaluatingAnswer(false);
    setPendingFollowUp(null);
    setAskedFollowUp(false);
    // Look up what step is next
    if (currentQuestionIndex < 7) {
      // Step to next question index in active round
      const nextIdx = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIdx);

      const nextQ = questions[nextIdx];
      setAiSpeech(speechPrefix + nextQ.question);
      speakText(speechPrefix + nextQ.question);

      setChatHistory(prev => [
        ...prev,
        { role: 'ai', text: `[${ROUNDS[currentRoundIndex].label} - Q${nextIdx + 1}] ${speechPrefix}${nextQ.question}` }
      ]);
    } else {
      // Completed last question (8th question of the round)
      if (currentRoundIndex < 5) {
        // Prompt transition to next round
        const nextRoundIdx = currentRoundIndex + 1;
        const nextRound = ROUNDS[nextRoundIdx];
        
        const transitionNotice = `${speechPrefix}Excellent. We have completed all 8 questions of the ${ROUNDS[currentRoundIndex].label}. We will now transition to the next stage: ${nextRound.label}.`;
        setAiSpeech(transitionNotice);
        speakText(transitionNotice);
        
        setChatHistory(prev => [
          ...prev,
          { role: 'ai', text: `[Round Transformed] Completed ${ROUNDS[currentRoundIndex].label}. Prepared to proceed to ${nextRound.label}.` }
        ]);
        
        // Set state to completion placeholder
        setCurrentQuestionIndex(8); 
      } else {
        // Fully completed all 6 rounds (48 questions total!)
        const finalNotice = `${speechPrefix}We are completely done! You have finished all 6 rounds. Click 'Assess & View Report' in the HUD to get your final evaluation!`;
        setAiSpeech(finalNotice);
        speakText(finalNotice);
        
        setChatHistory(prev => [
          ...prev,
          { role: 'ai', text: `[Simulation Concluded] Candidate completed all diagnostic panels.` }
        ]);

        setCurrentQuestionIndex(8);
      }
    }
  };

  // Skip a question or submit empty
  const handleSkipQuestion = () => {
    handleUserMessage("[Candidate skipped or requested next question]");
  };

  // Trigger manual round change override or progression
  const handleProceedToNextRound = () => {
    if (currentRoundIndex < 5) {
      const nextIdx = currentRoundIndex + 1;
      setCurrentRoundIndex(nextIdx);
      fetchRoundQuestions(nextIdx);
    }
  };

  // Web Speech Microphone Capture
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition: any = null;

    if (SpeechRecognition && isMicOn) {
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        const normalized = transcript.toLowerCase().trim();
        if (normalized === 'zoom in' || normalized.includes('zoom in')) {
          handleZoomIn();
          setIsMicOn(false);
          return;
        } else if (normalized === 'zoom out' || normalized.includes('zoom out')) {
          handleZoomOut();
          setIsMicOn(false);
          return;
        } else if (normalized === 'reset zoom' || normalized.includes('reset zoom')) {
          handleResetZoom();
          setIsMicOn(false);
          return;
        }
        handleUserMessage(transcript);
        setIsMicOn(false);
      };

      recognition.onerror = (e: any) => {
        const errorMsg = e instanceof Error ? e.message : (e.error || e.message || String(e));
        console.warn("Speech recognition error:", errorMsg);
        setIsMicOn(false);
      };

      recognition.start();
    }

    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, [isMicOn]);

  // Aggregate transcripts and evaluate using Gemini grading API
  const handleGenerateEvaluationReport = async () => {
    if (chatHistory.length === 0) {
      alert("Please participate in the interview rounds first to build up your transcripts!");
      return;
    }
    
    setIsGrading(true);
    setGradeResult(null);
    setSaveSuccess(false);

    const uid = auth.currentUser?.uid || localStorage.getItem("guest_uid") || "guest-user-123";
    try {
      const token = (auth.currentUser ? await auth.currentUser.getIdToken() : null) || (() => {
        const payload = { user_id: uid };
        const payloadB64 = btoa(JSON.stringify(payload))
          .replace(/=/g, "")
          .replace(/\+/g, "-")
          .replace(/\//g, "_");
        return `header.${payloadB64}.signature`;
      })();

      const res = await fetch('/api/interview/grade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          transcript: chatHistory,
          role: targetRole,
          company: targetCompany,
          candidateSkills: candidateSkills
        })
      });

      if (!res.ok) {
        throw new Error("Grading endpoint failed");
      }

      const reportCard = await res.json();
      setGradeResult(reportCard);

      // Fetch structured VR room monitor display performance report
      try {
        const monitorRes = await fetch('/api/interview/monitor-report', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            candidate: auth.currentUser?.displayName || localStorage.getItem("userName") || "Candidate",
            company: targetCompany,
            role: targetRole,
            scores: reportCard.scores
          })
        });
        if (monitorRes.ok) {
          const monitorCard = await monitorRes.json();
          setMonitorReport(monitorCard);
        }
      } catch (e) {
        console.warn("Failed to retrieve VR monitor report screen data:", e);
      }

      const payload = {
        userId: uid,
        role: targetRole,
        company: targetCompany,
        createdAt: Date.now(),
        score: reportCard.overall_score || 85,
        feedback: reportCard.naya_personal_message || reportCard.alya_personal_message || "Splendid mock interaction history.",
        strengths: reportCard.top_3_strengths || ["In-depth technical conceptual breakdowns"],
        weaknesses: reportCard.top_3_weak_areas || ["Could elaborate on scaling parameters and testing"],
        transcript: chatHistory,
        hiring_decision: reportCard.hiring_decision,
        percentile_estimate: reportCard.percentile_estimate
      };

      // Store securely in database / fallback local storage
      try {
        if (auth.currentUser && !localStorage.getItem("guest_session")) {
          await addDoc(collection(db, "interviews"), payload);
        } else {
          throw new Error("Guest active");
        }
        setSaveSuccess(true);
      } catch (e) {
        console.warn("Saving directly to Firestore skipped. Writing to local storage lists.");
        const cached = localStorage.getItem(`interviews_${uid}`);
        const currentList = cached ? JSON.parse(cached) : [];
        const savedItem = { id: `local-interview-${Date.now()}`, ...payload };
        localStorage.setItem(`interviews_${uid}`, JSON.stringify([savedItem, ...currentList]));
        setSaveSuccess(true);
      }
    } catch (e) {
      console.warn(e instanceof Error ? e.message : String(e));
      // Friendly alert
      alert("Our server synthesized some evaluation metrics. The scoring metrics will be preserved.");
    } finally {
      setIsGrading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const escapeAframeText = (str: string) => {
    if (!str) return "";
    return str.replace(/"/g, '\\"').replace(/\n/g, '\\n');
  };

  // Quick helper to read expected points in A-Frame multiline
  const getExpectedPointsString = (activeQ: any) => {
    if (!activeQ) return "Read details on HUD telemetry.";
    if (activeQ.what_we_look_for) return activeQ.what_we_look_for;
    if (activeQ.expected_points && Array.isArray(activeQ.expected_points)) return activeQ.expected_points.map((p: string, i: number) => `* ${p}`).join('\\n');
    return "Read details on HUD telemetry.";
  };

  const getDaylightTheme = () => {
    switch (daylightMode) {
      case 'morning':
        return {
          sky: "#fde047",
          sunColor: "#fef3c7",
          sunIntensity: 1.15,
          sunPosition: "-5 2.5 1",
          roomLightColor: "#fffbeb"
        };
      case 'sunset':
        return {
          sky: "#fdba74",
          sunColor: "#f97316",
          sunIntensity: 0.9,
          sunPosition: "7 2.2 -0.5",
          roomLightColor: "#fffbeb"
        };
      case 'night':
        return {
          sky: "#020617",
          sunColor: "#a855f7",
          sunIntensity: 0.35,
          sunPosition: "3 1.5 -3",
          roomLightColor: "#1e1b4b"
        };
      case 'noon':
      default:
        return {
          sky: currentMode.theme.skyColor || "#bfdbfe",
          sunColor: currentMode.theme.lightColor || "#fffbeb",
          sunIntensity: currentMode.theme.lightIntensity || 1.3,
          sunPosition: "6 4 2",
          roomLightColor: "#f8fafc"
        };
    }
  };
  const daylight = getDaylightTheme();

  const isTechnicalRound = ROUNDS[currentRoundIndex]?.key === 'technical';
  const secondaryInterviewer = selectedInterviewer.id === 'james' ? INTERVIEWERS[0] : INTERVIEWERS[2];

  return (
    <div className="relative w-full h-screen bg-transparent text-white overflow-hidden select-none">
      <div id="vr-ui-overlay" className="absolute inset-0 pointer-events-none z-10">
      
      {entranceState === 'unstarted' && (
        <div className="absolute inset-0 bg-[#09090b]/98 z-50 flex items-center justify-center p-6 text-white overflow-hidden pointer-events-auto">
          {/* Background patterns */}
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-cyan-500/10 blur-[120px]" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-blue-500/10 blur-[120px]" />
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-lg p-8 bg-zinc-900/85 border border-zinc-800 rounded-3xl backdrop-blur-xl shadow-2xl relative space-y-6 text-center"
          >
            <div className="w-16 h-16 bg-cyan-950/50 border border-cyan-800/60 rounded-2xl flex items-center justify-center text-cyan-400 mx-auto animate-pulse">
              <Sparkles className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-widest font-black text-cyan-500 font-mono">Simulators Room 301</span>
              <h3 className="text-2xl font-black text-zinc-100 uppercase tracking-tight">Executive Boardroom Suite</h3>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto">
                You are about to undergo a professional interview simulation for <span className="text-zinc-200 font-bold">{targetRole}</span> at <span className="text-zinc-200 font-bold">{targetCompany}</span>.
              </p>
            </div>

            <div className="p-4 bg-zinc-950/70 border border-zinc-900 rounded-2xl text-left space-y-2.5">
              <h4 className="text-[10px] text-zinc-300 font-bold uppercase tracking-wider font-mono">Interactive Setup Parameters:</h4>
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="p-2 border border-zinc-800 bg-zinc-900/30 rounded-lg">
                  <span className="text-zinc-400 block text-[9px] uppercase font-mono font-bold leading-none">Rounds:</span>
                  <span className="text-zinc-200 font-medium font-sans mt-0.5 block">6 Chronological</span>
                </div>
                <div className="p-2 border border-zinc-800 bg-zinc-900/30 rounded-lg">
                  <span className="text-zinc-400 block text-[9px] uppercase font-mono font-bold leading-none">Voice Engine:</span>
                  <span className="text-zinc-200 font-medium font-sans mt-0.5 block">SpeechSynthesis</span>
                </div>
                <div className="p-2 border border-zinc-800 bg-zinc-900/30 rounded-lg col-span-2">
                  <span className="text-zinc-400 block text-[9px] uppercase font-mono font-bold leading-none">Primary Skills Match:</span>
                  <span className="text-cyan-400/90 font-bold font-mono mt-0.5 block truncate">{candidateSkills}</span>
                </div>
              </div>
            </div>

            <button
              onClick={startEntranceSequence}
              className="w-full py-4 bg-cyan-500 hover:bg-cyan-600 text-zinc-950 rounded-2xl font-bold uppercase text-xs tracking-wider cursor-pointer shadow-lg shadow-cyan-500/10 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 block text-center"
            >
              Enter Boardroom & Begin Walk-In
            </button>
          </motion.div>
        </div>
      )}
      
      {/* VR HUD BAR Overlay */}
      <div className="absolute top-0 inset-x-0 p-5 flex justify-between items-start z-10 pointer-events-none">
        
        {/* Left Side */}
        <div className="flex gap-2.5 items-center flex-wrap">
          <button 
            onClick={() => {
              if ('speechSynthesis' in window) window.webkitSpeechSynthesis?.cancel();
              navigate('/');
            }}
            className="pointer-events-auto px-4 py-2.5 rounded-xl bg-red-950/40 border border-red-800 text-red-200 hover:bg-red-500 hover:text-zinc-950 shadow-xl transition-all flex items-center gap-2 font-black text-xs uppercase cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Exit
          </button>
          <span className="px-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 backdrop-blur-md text-zinc-200 font-mono text-[10px] font-bold uppercase tracking-widest leading-none shadow-sm">
            {targetCompany} • {targetRole}
          </span>
          <span className="px-3.5 py-2.5 rounded-xl bg-cyan-950/80 border border-cyan-800 backdrop-blur-md text-cyan-400 font-mono text-[10px] font-bold uppercase tracking-widest leading-none flex items-center gap-2 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            {ROUNDS[currentRoundIndex].label}
          </span>
          
          <span className="px-3 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-zinc-300 font-mono text-[10px] font-bold shadow-sm">
            PROGRESS: {currentQuestionIndex < 8 ? `${currentQuestionIndex + 1}/8` : 'Completed'}
          </span>
        </div>

        {/* Right HUD actions */}
        <div className="flex gap-3 flex-wrap items-center">
          <div className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 shadow-sm backdrop-blur-md flex items-center gap-2.5 text-zinc-200 pointer-events-auto">
            <Clock className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="font-mono text-xs font-bold leading-none">{formatTime(timeLeft)}</span>
          </div>
          
          <button 
            onClick={() => setIsMicOn(!isMicOn)}
            className={`pointer-events-auto px-4 py-2.5 rounded-xl border backdrop-blur-md flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer shadow-sm ${
              isMicOn 
                ? 'bg-cyan-950 border-cyan-500 text-cyan-400 font-extrabold' 
                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-855'
            }`}
          >
            {isMicOn ? <Mic className="w-4.5 h-4.5 text-cyan-400" /> : <MicOff className="w-4.5 h-4.5 text-zinc-400" />}
            {isMicOn ? 'ACTIVE' : 'MIC OFF'}
          </button>
          
          <button
            onClick={handleGenerateEvaluationReport}
            className="pointer-events-auto px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-zinc-950 font-black uppercase text-[10px] tracking-wider hover:scale-[1.01] hover:shadow-cyan-500/20 active:scale-[0.99] transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <ClipboardCheck className="w-4.5 h-4.5" />
            Assess & View Report
          </button>
          
          <div className="relative pointer-events-auto">
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-all flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider text-zinc-300 shadow-sm cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              Settings
            </button>
            {isSettingsOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-zinc-900/95 border border-zinc-800 rounded-xl shadow-2xl backdrop-blur-xl p-4 flex flex-col gap-4 text-left z-50">
                <div>
                  <span className="text-[9px] uppercase tracking-widest font-black text-cyan-400 font-mono">Environment Controls</span>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[8px] uppercase font-bold text-zinc-400 font-mono">Camera Zoom</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button onClick={handleZoomIn} className="py-1.5 text-center bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[9px] font-bold rounded-lg transition-colors flex justify-center items-center cursor-pointer"><ZoomIn className="w-3.5 h-3.5 mr-1"/> In</button>
                    <button onClick={handleZoomOut} className="py-1.5 text-center bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[9px] font-bold rounded-lg transition-colors flex justify-center items-center cursor-pointer"><ZoomOut className="w-3.5 h-3.5 mr-1"/> Out</button>
                    <button onClick={handleResetZoom} className="py-1.5 text-center bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[9px] font-bold rounded-lg transition-colors cursor-pointer">Reset</button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[8px] uppercase font-bold text-zinc-400 font-mono">Lighting Mode</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button onClick={() => setDaylightMode('morning')} className={`py-1.5 text-center font-mono text-[9px] font-bold rounded-lg transition-colors cursor-pointer ${daylightMode === 'morning' ? 'bg-amber-400 text-zinc-900' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'}`}>Morning</button>
                    <button onClick={() => setDaylightMode('sunset')} className={`py-1.5 text-center font-mono text-[9px] font-bold rounded-lg transition-colors cursor-pointer ${daylightMode === 'sunset' ? 'bg-orange-500 text-zinc-900' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'}`}>Evening</button>
                    <button onClick={() => setDaylightMode('night')} className={`py-1.5 text-center font-mono text-[9px] font-bold rounded-lg transition-colors cursor-pointer ${daylightMode === 'night' ? 'bg-indigo-500 text-zinc-900' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'}`}>Night</button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[8px] uppercase font-bold text-zinc-400 font-mono">VR / AR Experience</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button onClick={enterVRMode} className="py-1.5 text-center bg-zinc-800 hover:bg-zinc-700 text-cyan-400 font-mono text-[9px] font-bold rounded-lg transition-colors cursor-pointer">Enter VR</button>
                    <button onClick={enterARMode} className="py-1.5 text-center bg-zinc-800 hover:bg-zinc-700 text-emerald-400 font-mono text-[9px] font-bold rounded-lg transition-colors cursor-pointer">Enter AR</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* 2D Interactive Sidebar - Live Rounds Tracker (Hidden per request) */}
      <div className="hidden">

        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="pointer-events-auto bg-zinc-900/95 border border-zinc-800 p-4 rounded-2xl shadow-xl space-y-3.5 backdrop-blur-md"
        >
          <div>
            <h4 className="text-[10px] uppercase font-bold tracking-widest text-cyan-400 font-mono">Sim Sequence HUD</h4>
            <h3 className="text-sm font-black text-zinc-100">6 Specialized Assessment Rounds</h3>
          </div>

          <div className="space-y-1.5">
            {ROUNDS.map((r, i) => {
              const isActive = currentRoundIndex === i;
              const isCompleted = currentRoundIndex > i;
              return (
                <div 
                  key={r.key}
                  className={`p-2.5 rounded-xl border transition-all text-left flex items-center gap-2.5 ${
                    isActive 
                      ? 'bg-cyan-950/40 border-cyan-800 text-cyan-200' 
                      : isCompleted
                        ? 'bg-zinc-950/50 border-emerald-950 text-zinc-355'
                        : 'bg-zinc-950/30 border-zinc-800 text-zinc-400'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isActive 
                      ? 'bg-cyan-500 text-zinc-950' 
                      : isCompleted
                        ? 'bg-emerald-500 text-white'
                        : 'bg-zinc-800 text-zinc-300'
                  }`}>
                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold truncate leading-none">{r.label}</p>
                    <p className="text-[9px] text-zinc-400 truncate mt-0.5">{r.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-center font-mono">
            <span className="text-[9px] text-zinc-400 font-medium font-bold">Rounds Complete: {currentRoundIndex} of 6 stages</span>
          </div>
        </motion.div>
      </div>

      {/* Interactive Transcripts, Tips, and Inputs Right Side Console */}
      <div className="absolute top-24 right-5 w-[320px] md:w-[360px] max-h-[86vh] overflow-y-auto flex flex-col gap-3.5 z-10 pointer-events-none pr-1.5 scrollbar-thin scrollbar-thumb-zinc-800">
        
        {/* CURRENT QUESTION DISPLAY */}
        {questions[currentQuestionIndex] && currentQuestionIndex < 8 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="pointer-events-auto bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-3 backdrop-blur-md text-left"
          >
            <span className="text-[9px] uppercase font-bold tracking-widest text-cyan-400 font-mono block">
              Current Interview Question
            </span>
            <div className="text-sm md:text-base font-bold text-zinc-100 leading-relaxed font-sans">
              "{questions[currentQuestionIndex].question}"
            </div>
            {(questions[currentQuestionIndex].follow_up || questions[currentQuestionIndex].follow_up_if_weak) && (
              <div className="text-[11px] text-zinc-300 mt-2 font-mono leading-relaxed pt-2 border-t border-zinc-800">
                <span className="text-cyan-400 font-bold mr-1">Follow-up context:</span>
                "{questions[currentQuestionIndex].follow_up || questions[currentQuestionIndex].follow_up_if_weak}"
              </div>
            )}
            {questions[currentQuestionIndex].follow_up_if_strong && (
              <div className="text-[11px] text-zinc-300 mt-2 font-mono leading-relaxed pt-2 border-t border-zinc-800">
                <span className="text-green-500 font-bold mr-1">If Strong:</span>
                "{questions[currentQuestionIndex].follow_up_if_strong}"
              </div>
            )}
          </motion.div>
        )}

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1 flex flex-col bg-zinc-900/95 border border-zinc-800 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden pointer-events-auto mt-auto text-left"
        >
          {/* Transcript Dialogue container */}
          <div className="p-3.5 border-b border-zinc-800 bg-zinc-950/40">
            <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-300 font-mono">Discussion Feed</span>
            <h4 className="text-xs font-bold text-zinc-200">Conversation Transcript</h4>
          </div>

          <div className="flex-1 p-4 overflow-y-auto min-h-[220px] max-h-[360px] flex flex-col gap-3 scrollbar-thin scrollbar-thumb-zinc-800 bg-zinc-950/30">
             {loadingQuestions ? (
               <div className="flex flex-col items-center justify-center my-auto py-12 gap-3 text-center">
                 <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                 <span className="text-xs text-zinc-400 font-mono">Compiling round-specific questions...</span>
               </div>
             ) : chatHistory.length === 0 ? (
               <div className="text-zinc-300 text-xs text-center my-auto italic">
                 Awaiting initial assessment response. Start speaking or type in your response below.
               </div>
             ) : (
               chatHistory.map((msg, i) => (
                  <div key={i} className={`p-2.5 rounded-xl max-w-[85%] text-xs leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-cyan-950/60 text-cyan-150 ml-auto border border-cyan-900 shadow-sm' 
                      : 'bg-zinc-950/80 text-zinc-200 mr-auto border border-zinc-800'
                  }`}>
                    <span className="text-[8px] uppercase font-mono font-bold block mb-1 text-cyan-400">
                      {msg.role === 'user' ? 'You' : 'Interviewer'}
                    </span>
                    "{msg.text}"
                  </div>
               ))
             )}
             {(isGenerating || isEvaluatingAnswer) && (
                <div className="p-2.5 rounded-xl max-w-[85%] text-xs bg-zinc-950 text-zinc-300 mr-auto border border-zinc-800 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-500" />
                  {isEvaluatingAnswer ? "Scoring answer..." : "Interviewer is listening..."}
                </div>
             )}
             <div ref={messagesEndRef} />
          </div>

                    {/* Prompt transition button in case question flow completes */}
          {currentQuestionIndex === 8 && (
            <div className="p-4 bg-zinc-950 text-center space-y-3.5 border-t border-zinc-800">
              {currentRoundIndex < 5 ? (
                <>
                  <p className="text-xs text-zinc-300 font-medium font-sans">Submit & proceed to next round?</p>
                  <button
                    onClick={handleProceedToNextRound}
                    className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-600 text-zinc-950 rounded-xl font-bold uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    Enter {ROUNDS[currentRoundIndex + 1]?.label}
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-950 fill-current" />
                  </button>
                </>
              ) : (
                <>
                  <p className="text-xs text-emerald-400 font-bold">🎉 All 6 interview rounds concluded successfully!</p>
                  <button
                    onClick={handleGenerateEvaluationReport}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 rounded-xl font-bold uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer shadow-lg shadow-emerald-500/10"
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    Assess & View Feedback Report
                  </button>
                </>
              )}
            </div>
          )}

          {/* Interactive Keyboard Submission Input */}
          {currentQuestionIndex < 8 && !loadingQuestions && (
            <div className="p-3 border-t border-zinc-800 bg-zinc-950/60 flex items-center gap-2.5">
               <input
                 type="text"
                 value={inputText}
                 onChange={(e) => setInputText(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleUserMessage(inputText)}
                 placeholder="Type your answer and press Enter..."
                 className="flex-1 bg-transparent border-none text-zinc-350 text-xs outline-none px-2 placeholder-zinc-500"
                 disabled={isGenerating || loadingQuestions}
               />
               <button 
                 onClick={handleSkipQuestion}
                 className="text-[9px] px-2 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 uppercase font-black tracking-wider transition-colors"
                 title="Skip question"
                 disabled={loadingQuestions}
               >
                 skip
               </button>
               <button 
                 onClick={() => handleUserMessage(inputText)}
                 disabled={!inputText.trim() || isGenerating || loadingQuestions}
                 className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 disabled:opacity-30 disabled:hover:bg-cyan-500 text-zinc-950 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0 shadow-sm"
               >
                 <Send className="w-3.5 h-3.5 fill-zinc-950" />
               </button>
            </div>
          )}
        </motion.div>
      </div>

      {/* Center Screen Subtitles Panel */}
      {aiSpeech && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none w-full max-w-2xl px-6">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full py-4 px-6 rounded-2xl bg-[#09090b]/90 border border-zinc-800 backdrop-blur-xl shadow-2xl"
          >
            <p className="text-sm md:text-base text-zinc-100 font-medium leading-relaxed text-center">
              "{aiSpeech}"
            </p>
          </motion.div>
        </div>
      )}

      {/* 2D Immersive Control Center (Bottom-Left) */}
      <div className="absolute bottom-6 left-6 z-10 flex flex-col gap-3.5 pointer-events-auto">
        
      </div>

      {/* Full screen AI Grading overlay spinner */}
      <AnimatePresence>
        {isGrading && (
          <div className="fixed inset-0 z-50 bg-[#09090b]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center pointer-events-auto">
            <div className="space-y-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border border-dashed border-cyan-400 animate-spin [animation-duration:8s] mx-auto" />
                <Award className="w-7 h-7 text-cyan-400 absolute inset-0 m-auto animate-pulse" />
              </div>

              <div>
                <h3 className="text-lg font-black text-zinc-100">AI Placement Evaluation Studio</h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1.5">Parsing 48-question simulation logs, scoring answers against industry standards, and creating structural referral reports...</p>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Graded evaluation scorecard modal */}
      <AnimatePresence>
        {gradeResult && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 text-white pointer-events-auto">
            <div className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm" />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-3.5xl p-6 shadow-2xl relative z-10 space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="text-center space-y-4">
                <div className="w-14 h-14 bg-emerald-900/30 border border-emerald-500 rounded-xl flex items-center justify-center text-emerald-400 mx-auto shadow-sm">
                  <CheckCircle className="w-8 h-8 font-black" />
                </div>
                
                <div>
                  <span className="text-[10px] uppercase tracking-widest font-bold text-cyan-400 font-mono">Sim Sequence Concluded</span>
                  <h3 className="text-2xl font-black text-zinc-100 mt-1">Hiring Evaluation Scorecard</h3>
                  <p className="text-xs text-zinc-300 mt-1">Transcript evaluated and scored against standard placement criteria in India.</p>
                </div>
              </div>

              {/* Score circle */}
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-between gap-4 flex-wrap">
                <div className="space-y-0.5">
                  <span className="text-[9px] uppercase font-bold text-zinc-300 font-mono">placement validation score</span>
                  <h4 className="text-xs font-bold text-zinc-300">Corporate referral eligibility</h4>
                  <div className="pt-2 text-[10px] text-zinc-300 font-mono uppercase">
                    Decision: <span className="text-white font-bold">{gradeResult.hiring_decision}</span> <br/>
                    Percentile: <span className="text-white font-bold">{gradeResult.percentile_estimate}</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <div className="p-3 bg-cyan-950 border border-cyan-800 rounded-xl text-center min-w-[80px] shadow-sm">
                    <span className="text-2xl font-black text-cyan-400 leading-none block">{gradeResult.overall_score || 85}</span>
                    <span className="text-[8px] font-mono text-cyan-400 font-bold block uppercase tracking-widest mt-1">PERCENT</span>
                  </div>
                  <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-center min-w-[60px] shadow-sm">
                    <span className="text-2xl font-black text-white leading-none block">{gradeResult.overall_grade || "B"}</span>
                    <span className="text-[8px] font-mono text-zinc-300 font-bold block uppercase tracking-widest mt-1">GRADE</span>
                  </div>
                </div>
              </div>

              {/* Qualitative analysis */}
              <div className="space-y-2">
                <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-300 font-mono block">Naya's Personal Feedback:</span>
                <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-950 p-4 border border-zinc-800 rounded-xl italic">
                  "{gradeResult.naya_personal_message || gradeResult.alya_personal_message}"
                </p>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                 <div className="p-2 border border-zinc-800 rounded-lg text-center bg-zinc-950/50">
                    <span className="text-[8px] uppercase tracking-widest font-mono text-zinc-300">Tech Accuracy</span>
                    <div className="text-[10px] font-bold mt-0.5">{gradeResult.technical_accuracy}</div>
                 </div>
                 <div className="p-2 border border-zinc-800 rounded-lg text-center bg-zinc-950/50">
                    <span className="text-[8px] uppercase tracking-widest font-mono text-zinc-300">Comm. Quality</span>
                    <div className="text-[10px] font-bold mt-0.5">{gradeResult.communication_quality}</div>
                 </div>
                 <div className="p-2 border border-zinc-800 rounded-lg text-center bg-zinc-950/50">
                    <span className="text-[8px] uppercase tracking-widest font-mono text-zinc-300">Confidence</span>
                    <div className="text-[10px] font-bold mt-0.5">{gradeResult.confidence_level}</div>
                 </div>
              </div>

              {/* Strengths & Weaknesses checklists */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
                
                {/* Strengths */}
                <div className="space-y-2">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-emerald-500 font-mono block">Top Identified Strengths:</span>
                  <div className="space-y-1.5">
                    {gradeResult.top_3_strengths?.map((str: string, index: number) => (
                      <div key={index} className="flex gap-2 items-start text-[11px] text-zinc-300">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0 mt-1.5" />
                        <span>{str}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Weaknesses */}
                <div className="space-y-2">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-rose-500 font-mono block">Action items for improvement:</span>
                  <div className="space-y-1.5">
                    {gradeResult.top_3_weak_areas?.map((weak: string, index: number) => (
                      <div key={index} className="flex gap-2 items-start text-[11px] text-zinc-300">
                        <span className="w-1.5 h-1.5 bg-rose-500 rounded-full shrink-0 mt-1.5" />
                        <span>{weak}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Personalized Improvement Plan */}
              {gradeResult.personalized_improvement_plan && gradeResult.personalized_improvement_plan.length > 0 && (
                <div className="space-y-2 pt-4 border-t border-zinc-800">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-indigo-400 font-mono block">Personalized Improvement Plan:</span>
                  <div className="space-y-2">
                    {gradeResult.personalized_improvement_plan.map((plan: any, i: number) => (
                      <div key={i} className="bg-indigo-950/20 border border-indigo-900/50 p-3 rounded-lg text-[10px]">
                        <div className="font-bold text-indigo-300 mb-1">{plan.area}</div>
                        <div className="text-zinc-300 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">
                          <span className="font-mono text-zinc-400 font-bold">Problem:</span> <span>{plan.problem_observed}</span>
                          <span className="font-mono text-zinc-400 font-bold">Fix:</span> <span>{plan.how_to_fix}</span>
                          <span className="font-mono text-zinc-400 font-bold">Resource:</span> <span>{plan.resource} ({plan.timeline})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  setGradeResult(null);
                  navigate('/');
                }}
                className="w-full py-4 bg-cyan-500 hover:bg-cyan-600 text-zinc-950 hover:scale-[1.01] rounded-xl font-bold uppercase text-xs tracking-wider cursor-pointer shadow-md transition-all animate-none text-center block"
              >
                Return to Dashboard
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>

      {/* A-Frame Scene Space Rendering */}
      {isVRActive ? (
        <VRScene
          daylight={daylight}
          INTERVIEWERS={INTERVIEWERS}
          cameraRigPos={cameraRigPos}
          cameraZ={cameraZ}
          targetCompany={targetCompany}
          doorRotationY={doorRotationY}
          isTechnicalRound={isTechnicalRound}
          selectedInterviewer={selectedInterviewer}
          secondaryInterviewer={secondaryInterviewer}
          avatarState={avatarState}
          escapeAframeText={escapeAframeText}
          handleZoomIn={handleZoomIn}
          handleZoomOut={handleZoomOut}
          enterVRMode={enterVRMode}
          enterARMode={enterARMode}
          monitorReport={monitorReport}
          loadingQuestions={loadingQuestions}
          currentQuestionIndex={currentQuestionIndex}
          questions={questions}
          targetRole={targetRole}
          candidateSkills={candidateSkills}
          ROUNDS={ROUNDS}
          currentRoundIndex={currentRoundIndex}
          getExpectedPointsString={getExpectedPointsString}
        />

      ) : (
        <div className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center p-6 text-center select-none overflow-hidden">
          {/* Elegant background lighting effect */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />
          
          <div className="max-w-md w-full space-y-6 relative z-10 p-8 rounded-2xl border border-zinc-805 bg-zinc-900/60 backdrop-blur-md">
            <div className="mx-auto w-16 h-16 rounded-full bg-cyan-950/50 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Layers className="w-8 h-8 animate-pulse text-cyan-400" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-zinc-100 tracking-tight">Interactive Boardroom Simulation</h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Newyatra AI has automatically activated the **2D Desktop Workspace Console** because WebGL acceleration is unavailable in this environment.
              </p>
            </div>

            <div className="bg-zinc-950/80 border border-zinc-800/80 p-4 rounded-xl text-left space-y-3 font-mono text-[10px]">
              <div className="flex justify-between border-b border-zinc-900 pb-1.5 text-zinc-500 font-bold">
                <span>SYSTEM PARAMETER</span>
                <span>STATUS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-semibold">Active Evaluator:</span>
                <span className="text-cyan-400 font-bold">Naya AI (Coaching Mode)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-semibold">Target Enterprise:</span>
                <span className="text-zinc-300 font-semibold">{targetCompany || "Niya AI"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-semibold">Target Role:</span>
                <span className="text-zinc-300 font-semibold">{targetRole || "Software Engineer"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-semibold">A-Frame Engine:</span>
                <span className="text-amber-500 font-semibold">Standby (Non-WebGL Context)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-semibold">Voice Synthesis:</span>
                <span className="text-emerald-400 font-bold">Fully Online & Connected</span>
              </div>
            </div>

            <div className="text-[10px] text-zinc-500">
              Real-time speech chat and question pipelines are fully active and synchronized in the dashboard sidebar.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 8 robust, tailored local questions per stage matching exact 6-round schema
function getFallbackLocalQuestions(roundType: string, role: string, company: string, skills: string) {
  const norm = (roundType || "").toLowerCase();
  
  if (norm.includes("intro") || norm.includes("self")) {
    return [
      {
        id: 1,
        question: `Welcome! Please perform a professional self-introduction, focusing on your match for the ${role} role at ${company}.`,
        follow_up: "What is the single most unique strength you mention that sets you apart?",
        expected_points: ["Clearly states school, primary studies, and key skillsets", "Connects background context with the target vacancy", "Mentions relevant practical project results"]
      },
      {
        id: 2,
        question: `What motivated you to transition into technology and target ${role} positions?`,
        follow_up: "Can you name one engineering trend in this space that keeps you excited?",
        expected_points: ["Expresses authentic interest in development and tooling", "Connects motivations with specific learning milestones", "Demonstrates alignment with career path progression"]
      },
      {
        id: 3,
        question: `Which programming languages and frameworks in your resume (${skills}) do you consider your superpowers?`,
        follow_up: "How did you adoption curves look when adopting these technologies?",
        expected_points: ["Identifies 1 or 2 specific languages with confident description", "Highlights production use or project repository build history", "Analyzes runtime framework benefits or constraints"]
      },
      {
        id: 4,
        question: "Can you describe your favorite academic project, its target audience, and why you built it?",
        follow_up: "How did you validate that your design resolved the key needs of the target audience?",
        expected_points: ["Defines problem statement and target audience perfectly", "Highlights software architecture or database choice justification", "Shows user empathy and business value context"]
      },
      {
        id: 5,
        question: "How do you organize your workflow and prioritize deliverables when managing multiple project deadlines?",
        follow_up: "What tools or frameworks do you employ to keep yourself accountable?",
        expected_points: ["Discusses scheduling methods, sprints, or prioritisation heuristics", "Shows capability to track tasks and communicate delays early", "Maintains productivity under tight deadlines"]
      },
      {
        id: 6,
        question: `Why did you apply to ${company} specifically? What research did you do on our product ecosystem?`,
        follow_up: "Is there any specific product feature of ours you believe has immediate room for improvement?",
        expected_points: ["Demonstrates genuine research on company services/insights", "Articulates how their skills directly fuel company priorities", "Brings positive constructive product recommendations"]
      },
      {
        id: 7,
        question: "Tell us about a time when you had to learn an unfamiliar technical concept or API in a compressed timeframe.",
        follow_up: "How did you ensure your quality did not suffer while racing against the clock?",
        expected_points: ["Explains rapid assimilation strategy step-by-step", "Illustrates asking active technical questions vs isolated debugging", "Delivered functional proof-of-concept successfully"]
      },
      {
        id: 8,
        question: "How do you approach team collaboration when a teammate strongly disagrees with your technical design or PR?",
        follow_up: "What criteria do you use to compromise without sacrificing codebase quality?",
        expected_points: ["Prioritizes collaborative dialogue and code review objectivity", "Focuses on benchmarks and specifications rather than user ego", "Drives to a unified, documented agreement team-first"]
      }
    ];
  } else if (norm.includes("aptitude")) {
    return [
      {
        id: 1,
        question: "A train running at the speed of 60 km/hr crosses a stationary light pole in exactly 9 seconds. What is the length of the train in meters?",
        follow_up: "If the train had to cross a 150-meter platform instead, how much time would it take?",
        expected_points: ["Converts speed from km/hr to m/s by multiplying by 5/18", "Uses the distance formula (Distance = Speed * Time)", "Calculates the final length correctly as 150 meters"]
      },
      {
        id: 2,
        question: "A system backup task can be completed by Server A in 20 minutes and by Server B in 30 minutes. If both servers work in parallel on the load, how long will it take to complete?",
        follow_up: "If Server A breaks down after 5 minutes of combined execution, how much longer does Server B take to finish?",
        expected_points: ["Calculates individual work rates per minute (1/20 and 1/30)", "Sums the mutual rates to get the joint processing rate (1/12)", "Calculates the total time as 12 minutes correctly"]
      },
      {
        id: 3,
        question: "How many unique arrangements can be made from the letters of the word 'EVALUATE'?",
        follow_up: "How many of these arrangements start and end with a vowel?",
        expected_points: ["Identifies total character count as 8", "Identifies duplicate characters (E repeats 2 times, A repeats 2 times)", "Applies formula 8! / (2! * 2!) to arrive at 10,080 permutations"]
      },
      {
        id: 4,
        question: "An investment model doubles its principal amount in 5 years under compound interest. In how many years will it grow to 8 times the initial principal?",
        follow_up: "What is the equivalent annual interest rate percentage approximation?",
        expected_points: ["Identifies that the principal becomes 2P in 5 years", "Recognizes that the factor of growth is exponential (2^3 = 8)", "Calculates target timeline as 3 * 5 = 15 years correctly"]
      },
      {
        id: 5,
        question: "Determine the pattern and select the odd one out of this logical sequence: 3, 5, 11, 14, 17, 21. Why is it the odd one?",
        follow_up: "If you had to formulate the mathematical sequence rule, what would it be?",
        expected_points: ["Examines numbers for prime attributes, odd properties, or differences", "Identifies 14 is the only even number or 21 is a composite", "Defines the clear logical exclusion rationale with confidence"]
      },
      {
        id: 6,
        question: "A laptop is sold at a 20% net profit. If both its purchase cost and sale price are reduced by Rs. 100, the profit percentage increases by 4%. What was the original cost price?",
        follow_up: "How would you write a simple algebraic equation to solve this programmatically?",
        expected_points: ["Sets up the initial Cost Price (CP) and Selling Price (1.20 CP)", "Constructs the new transaction equation: (1.20 CP - 100) = 1.24 * (CP - 100)", "Solves correctly to find the original Cost Price as Rs. 600"]
      },
      {
        id: 7,
        question: "If 12 skilled developers or 18 standard interns can construct a portal in 14 days, how many days will 8 developers and 16 interns require to construct it?",
        follow_up: "Which resource is more cost-effective if a developer costs twice as much as an intern?",
        expected_points: ["Establishes worker equivalency (12 Developer = 18 Intern, so 1 Dev = 1.5 Intern)", "Converts the query target into a single unit (8 Dev + 16 Intern = 12 + 16 = 28 Interns)", "Uses inverse ratio logic to calculate the solution as 9 days"]
      },
      {
        id: 8,
        question: "At exactly 4:15, what is the precise angle between the hour needle and the minute needle of an analog clock?",
        follow_up: "What is the angle 15 minutes later at 4:30?",
        expected_points: ["Uses angle formula: |30H - 5.5M| where H=4 and M=15", "Calculates base angles: Hour has moved 120 + 7.5 = 127.5 degrees", "Deducts 90 degrees of the minute hand to reach 37.5 degrees precisely"]
      }
    ];
  } else if (norm.includes("tech")) {
    return [
      {
        id: 1,
        question: `Explain the fundamental differences between Monolithic and microservices architectures. How do they apply to a system engineered for ${company}?`,
        follow_up: "Under what specific traffic limits would a monolithic design be superior?",
        expected_points: ["Defines scalability boundaries, failure isolation, and deployment modularity", "Mentions database per service vs shared persistent layer", "Discusses network latency overhead and service communication protocols"]
      },
      {
        id: 2,
        question: "How does the virtual DOM optimize UI rendering cycles in modern frameworks? Compare it with direct DOM manipulation.",
        follow_up: "What is React's reconciliation algorithm, and what is its Big-O time complexity?",
        expected_points: ["Explains batching of updates and calculating state change diffs", "Describes standard browser layout/paint pipeline bottlenecks", "Discusses why direct DOM updates are expensive on complex layers"]
      },
      {
        id: 3,
        question: "What strategies, indexes, and queries do you employ to troubleshoot a slow database scan in high-scale transactions?",
        follow_up: "When does a database engine ignore an index and opt for a full table scan?",
        expected_points: ["Mentions analyzing plan queries via EXPLAIN/ANALYZE statements", "Details B-Tree index lookups, composite indexes, and covering indexes", "Covers query restructuring, removing wildcards, or partitioning big tables"]
      },
      {
        id: 4,
        question: "What constitutes a memory leak in a garbage-collected language or runtime? How do you isolate and fix it?",
        follow_up: "Can you name one common source of leaks in client-side state engines?",
        expected_points: ["Defines unreferenced object preservation due to persistent pointers", "Points out forgotten timers, global scopes, or event listener scopes", "Discusses Chrome DevTools heap snapshotting as a diagnostic tool"]
      },
      {
        id: 5,
        question: `How would you architect a rate limiting engine to secure public API routes (like our chatbot)? What algorithm would you select?`,
        follow_up: "How do you scale this rate limiter across geographically distributed regions?",
        expected_points: ["Compares Token Bucket, Leaky Bucket, and Sliding Window Log algorithms", "Introduces Redis-based atomic counters or middleware token storage", "Details standard HTTP headers like RateLimit-Limit and RateLimit-Remaining"]
      },
      {
        id: 6,
        question: "Explain the absolute functional difference between Synchronous, Asynchronous, Parallel, and Concurrent execution paradigms.",
        follow_up: "How does Node.js's Event Loop achieve concurrency despite being single-threaded?",
        expected_points: ["Defines synchronous blocking, asynchronous non-blocking, and thread assignment", "Explains CPU-bound parallel processing vs I/O-bound concurrent scheduling", "Describes the call stack, APIs, callback queue, and tick operations"]
      },
      {
        id: 7,
        question: "What is Cross-Origin Resource Sharing (CORS)? Why is it enforced, and how do you resolve its common console exceptions?",
        follow_up: "What is a CORS preflight request, and what HTTP method does it use?",
        expected_points: ["Explains the Same-Origin Policy security restriction in browsers", "Details how the server responds with Access-Control-Allow-Origin headers", "Describes OPTIONS preflight checks and correct server security configuration"]
      },
      {
        id: 8,
        question: `How do you decide between NoSQL and SQL databases when designing a system with technologies like ${skills}?`,
        follow_up: "Under what conditions would you integrate both into a polyglot persistence design?",
        expected_points: ["Compares strict relational schemas and ACID guarantees with flexible document stores", "Analyzes read-heavy horizontal scale benefits of key-value databases", "Contrasts join operations in relational tables with normalized nested schemas"]
      }
    ];
  } else if (norm.includes("project")) {
    return [
      {
        id: 1,
        question: `Please provide a walkthrough of the technical architecture of your primary project. Focus on the data flow and technology stack used.`,
        follow_up: "What was the most challenging technical constraint you discovered in your initial architecture?",
        expected_points: ["Summarizes frontend, server and storage tiers accurately", "Explains key routing, API mechanisms, and state logic", "Defines boundaries between client-side operations and server payloads"]
      },
      {
        id: 2,
        question: "What was the single most challenging performance roadblock in your project, and how did you resolve it?",
        follow_up: "If you had access to cloud profiling tools, how would you have approached it?",
        expected_points: ["Identifies a specific bottleneck (e.g. infinite loop, large assets, query scan)", "Details empirical testing, profiling, or debugging steps", "Explains the tangible outcome metric of the optimization"]
      },
      {
        id: 3,
        question: "If your project's active user count increased to 100,000 concurrent updates tomorrow, what components of the system would break first?",
        follow_up: "How would you implement caching or load balancing to buy time before scaling?",
        expected_points: ["Addresses scalability weak points (e.g. database connection pools, memory limits)", "Suggests mitigations like horizontal replication, database shards, or caching", "Estimates request limits and infrastructure bounds realistically"]
      },
      {
        id: 4,
        question: "How did you manage database schemas, relationships, and persistence layers in this project? What drove that design choice?",
        follow_up: "Explain how you handle data migration in production when updates require database schema modifications.",
        expected_points: ["Justifies relational schema vs unstructured collections", "Details data integrity preservation, indexing, or transaction states", "Explains CRUD query patterns and persistence model optimization"]
      },
      {
        id: 5,
        question: "How did you evaluate and secure the integrations with third-party APIs or external SDKs inside your project?",
        follow_up: "How would you prevent a failure inside a third-party payment gateway from taking down your entire app?",
        expected_points: ["Mentions API secret hiding in environment variables", "Details error handling, fallback models, and circuit breaker patterns", "Discusses payload validation and webhook verification techniques"]
      },
      {
        id: 6,
        question: "Detail the strategies used to optimize client bundle size, initial load latency, and Lighthouse audit metrics in your app.",
        follow_up: "What is code splitting, and how does it effect the main JavaScript bundle?",
        expected_points: ["Mentions code splitting, lazy loading of routes/media, and minification", "Explains cache headers, CDN asset delivery, or compression algorithms", "Cites actual visual render speeds like LCP (Largest Contentful Paint) optimizations"]
      },
      {
        id: 7,
        question: "If you had to host and run this project with a strict budget of $10 per month, what hosting, platform, and tier architecture would you swap in?",
        follow_up: "How would you handle analytics logging and scheduled crons within this constrained budget?",
        expected_points: ["Proposes serverless, static-hosting portals (Vercel, Netlify, Cloudflare Pages)", "Utilizes free Firestore/Supabase tier bounds or Docker containers in free tiers", "Balances scale demands with zero-cost compute constraints"]
      },
      {
        id: 8,
        question: "What is the single feature inside this project that you are most proud of? What was the creative spark behind its codebase implementation?",
        follow_up: "If you had infinite dev cycles, how would you make this feature incredibly superior?",
        expected_points: ["Highlights a proprietary algorithm, custom state machine, or design triumph", "Shows true builder passion, creativity, and clean code hygiene", "Explains why it stands out compared to vanilla templates"]
      }
    ];
  } else if (norm.includes("gd") || norm.includes("group")) {
    return [
      {
        id: 1,
        question: "Group Discussion Topic: 'Has the surge of remote collaboration decreased codebase quality and slowed product velocity in tech corporations?' What is your engineering stance?",
        follow_up: "How would you respond to a peer who claims remote work causes unmanageable code merge conflicts?",
        expected_points: ["Weights remote async documentation vs live whiteboard sessions objectively", "Proposes tools like trunk-based development, structured reviews, and automated CI/CD", "Maintains clear debate stance and supporting metrics"]
      },
      {
        id: 2,
        question: "Topic: 'Is generative AI a threat to junior software developers, or is it merely an accelerator?' Portray your views.",
        follow_up: "If seniors rely heavily on AI generation, how will juniors learn to debug from scratch?",
        expected_points: ["Balances prompt assistance with deep debugging and verification skills", "Highlights that AI solves boilerplate but system architecture demands human reasoning", "Acknowledges shift in junior role requirements towards code curation"]
      },
      {
        id: 3,
        question: "Topic: 'Should standard 4-year computer science degrees be replaced entirely by rigorous 12-week specialized bootcamps and certifications?'",
        follow_up: "What theoretical computer science skills (e.g. compilers, operating systems) do bootcamps omit that are vital?",
        expected_points: ["Compares foundational mathematics, DS/Algorithms, and deep OS with practical web dev", "Argues for high-integrity blended tracks or university core with rapid hacking projects", "Respects alternative learning tracks and industry skill validation mechanisms"]
      },
      {
        id: 4,
        question: "Topic: 'To what extent should consumer software gather client usage telemetry? Where is the boundary of user privacy?'",
        follow_up: "How can we compile sufficient diagnostic logs when users opt out of telemetry entirely?",
        expected_points: ["Stresses user consent, clear opt-out routes, and data anonymization", "Examines functional logging benefits vs invasive scroll-tracking marketing profiles", "Advocates for transparency, compliance standards like GDPR, and on-device processing"]
      },
      {
        id: 5,
        question: "Topic: 'Is open source software development structurally sustainable without continuous tech corporate patronage?'",
        follow_up: "Can you name one critical library whose security failure compromised globally major systems?",
        expected_points: ["Cites volunteer burnout, security oversights (e.g., Log4j or Heartbleed)", "Discusses corporate sponsorship models, foundations, and developer grant programs", "Argues for corporate tech giants committing standard dev hours back to core dependencies"]
      },
      {
        id: 6,
        question: "Topic: 'Should software developer compensation be calculated based on geographical location resources, or uniform value delivered?'",
        follow_up: "If compensation is completely flat, how will companies afford offices in high-resource major hubs?",
        expected_points: ["Examines cost-of-living adjustments vs equity of equal developer contribution", "Highlights risk of 'brain drain' if hub offices fail to attract talent due to low index", "Proposes balanced approaches like base scale with flexible city adjustments"]
      },
      {
        id: 7,
        question: "Topic: 'What is more critical to student employment: deep theoretical knowledge of complex DSA or mastery of modern application frameworks?'",
        follow_up: "Why do top tier firms still use DSA questions as their primary filtering mechanism?",
        expected_points: ["Balances problem-solving analytical agility with practical immediate project value", "Argues that frameworks decay in years while problem-solving heuristics persist", "Points out that frameworks are quickly learned when basic computer science foundation is solid"]
      },
      {
        id: 8,
        question: "Topic: 'Should high-growth tech startups deprioritize carbon footprints and climate impacts until they achieve profitability?'",
        follow_up: "What are some highly actionable hosting adjustments a startup can make to cut server emissions?",
        expected_points: ["Balances startup survival rates with ethical social footprint duties", "Discusses cloud providers that offset green power indexes vs budget server farms", "Mentions code-level computing efficiency directly reducing server CPU heating"]
      }
    ];
  } else { // HR
    return [
      {
        id: 1,
        question: "Tell us about a time when you were working on a critical group assignment and a teammate suddenly failed to deliver their part. How did you react?",
        follow_up: "If you had to grade their contribution, would you have reported them to the professor?",
        expected_points: ["Demonstrates proactive ownership, teamwork, and task division", "Steps in constructively to learn their status before pointing blame", "Employs open communication to save the deadline without burning bridges"]
      },
      {
        id: 2,
        question: `Where do you envision your technical expertise and soft leadership skills in the next 5 years? How does ${company} fit in?`,
        follow_up: "If you are offered a path into management next year, would you accept or stick to dev?",
        expected_points: ["Expresses clear drive for continuous skill growth (e.g. system design, staff/principal path)", "Avoids generic answers, linking progression targets to the role profile", "Emphasizes longevity and learning landmarks within the organization"]
      },
      {
        id: 3,
        question: `What makes you uniquely alignment with the core values and engineering culture of our target team here at ${company}?`,
        follow_up: "Which of our corporate core values resonates with you least, and why?",
        expected_points: ["Articulates deep, unprompted alignment with public company initiatives/engineering", "Mentions specific products, blogs, or tech breakthroughs of the company", "Connects values with personal work ethics (e.g. ownership, transparency)"]
      },
      {
        id: 4,
        question: `Why should we select you for this ${role} position over candidates with identical education backgrounds and credentials?`,
        follow_up: "If we reject you today, what is the first thing you will do to improve your skills?",
        expected_points: ["Promotes custom practical competencies, side projects, and continuous learning", "Shows exceptional motivation, passion for systems engineering, and grit", "Speaks with humility and professional confidence without disparaging peers"]
      },
      {
        id: 5,
        question: "Can you describe your single biggest academic or professional failure? What lessons did you salvage from it?",
        follow_up: "Do you believe this failure could have been avoided with better communication?",
        expected_points: ["Takes full, unreserved responsibility for a real setback (no false strengths like 'I work too hard')", "Explains the systemic takeaway or new habit built because of the mistake", "Demonstrates resilience and self-awareness through retrospection"]
      },
      {
        id: 6,
        question: "How do you maintain a healthy work-life integration and prevent burnout under high-stress corporate sprints?",
        follow_up: "What is your tell-tale sign that you are burning out, and how do you reset?",
        expected_points: ["Employs systematic boundaries, timetables, and offline hobbies", "Communicates active workload overloads early and transparently with managers", "Focuses on steady, high-quality consistency over chaotic, exhausted bursts"]
      },
      {
        id: 7,
        question: "If your engineering lead adamantly demands you deploy a critical update with a known potential security vulnerability to meet a sales milestone, how do you handle it?",
        follow_up: "If they claim they will take full responsibility for any breaches, would you proceed?",
        expected_points: ["Prioritizes client safety, codebase security, and ethical standards", "Documents and highlights technical risks clearly and offers speed-up mitigations", "Suggests a compromise like feature-flag toggling or secure staged rollouts"]
      },
      {
        id: 8,
        question: "What are your salary expectations for this position? Are you completely comfortable with working directly from our local office?",
        follow_up: "If we offer you 15% lower than your target but include rich learning mentorship, would you join?",
        expected_points: ["Drives discussion to industry benchmarks honestly and professionally", "Shares excitement and accommodation details for central office location", "Keeps focus on career growth, mentorship, and high-impact placement potential"]
      }
    ];
  }
}
