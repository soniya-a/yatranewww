import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import * as THREE from "three";
import {
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  Github,
  Linkedin,
  ShieldAlert
} from "lucide-react";

// A-Frame components wrapped to avoid TypeScript JSX IntrinsicElements errors
const AScene = (props: any) => React.createElement("a-scene", props);
const ACamera = (props: any) => React.createElement("a-camera", props);
const AEntity = (props: any) => React.createElement("a-entity", props);
const ASphere = (props: any) => React.createElement("a-sphere", props);
const ALight = (props: any) => React.createElement("a-light", props);

// Helper function to procedurally determine land vs ocean coordinates
function isLand(lat: number, lon: number): boolean {
  const nLat = lat + Math.sin(lon * 0.15) * 1.5;
  const nLon = lon + Math.cos(lat * 0.15) * 1.5;
  
  // North America
  if (nLon > -130 && nLon < -60 && nLat > 15 && nLat < 75) return true;
  // South America
  if (nLon > -85 && nLon < -35 && nLat > -55 && nLat < 12) return true;
  // Europe
  if (nLon > -10 && nLon < 50 && nLat > 35 && nLat < 75) return true;
  // Africa
  if (nLon > -18 && nLon < 52 && nLat > -35 && nLat < 35) return true;
  // Asia / India
  if (nLon > 50 && nLon < 145 && nLat > 5 && nLat < 75) return true;
  // Australia
  if (nLon > 113 && nLon < 154 && nLat > -40 && nLat < -10) return true;
  // Antarctica
  if (nLat < -65) return true;

  return false;
}

// Google Icon SVG
const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

// Microsoft Icon SVG
const MicrosoftIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 21 21">
    <path fill="#f35325" d="M1 1h9v9H1z" />
    <path fill="#81bc06" d="M11 1h9v9h-9z" />
    <path fill="#05a6f0" d="M1 11h9v9H1z" />
    <path fill="#ffba08" d="M11 11h9v9h-9z" />
  </svg>
);

interface LoginProps {
  onLogin: () => void;
  onGoogleLogin: () => void;
  isLoggingIn: boolean;
  mousePos?: { x: number; y: number };
}

export default function Login({
  onLogin,
  onGoogleLogin,
  isLoggingIn
}: LoginProps) {
  const [email, setEmail] = useState("student@yatranew.ai");
  const [password, setPassword] = useState("••••••••");
  const [internalSuccess, setInternalSuccess] = useState(false);
  const [authMethod, setAuthMethod] = useState<"google" | "demo" | null>(null);
  const [aframeLoaded, setAframeLoaded] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if ((window as any).AFRAME) {
      setAframeLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://aframe.io/releases/1.4.2/aframe.min.js";
    script.async = true;
    script.onload = () => {
      setAframeLoaded(true);
    };
    script.onerror = () => {
      console.warn("A-Frame failed to load. Falling back gracefully.");
    };
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    
    // Set up standard 3D Earth using Three.js
    const width = canvas.clientWidth || 1200;
    const height = canvas.clientHeight || 1200;
    
    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    
    const scene = new THREE.Scene();
    
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 6.2;
    
    // Core Earth Group
    const earthGroup = new THREE.Group();
    scene.add(earthGroup);
    
    // Inner Solid Globe to block back-facing points
    const innerGeo = new THREE.SphereGeometry(1.97, 32, 32);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xFAFAFC, // Match white background seamlessly
      transparent: true,
      opacity: 0.95,
      depthWrite: false
    });
    const innerSphere = new THREE.Mesh(innerGeo, innerMat);
    earthGroup.add(innerSphere);
    
    // 3D Earth Landmasses & Glowing City Lights using Points
    const particleCount = 12000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    // Distribution using Fibonacci Sphere algorithm for perfect density
    for (let i = 0; i < particleCount; i++) {
      const y = 1 - (i / (particleCount - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      
      const goldenRatio = Math.PI * (3 - Math.sqrt(5));
      const theta = goldenRatio * i;
      
      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;
      
      const r = 2.0;
      positions[i * 3] = x * r;
      positions[i * 3 + 1] = y * r;
      positions[i * 3 + 2] = z * r;
      
      const lat = Math.asin(y) * (180 / Math.PI);
      const lon = Math.atan2(z, x) * (180 / Math.PI);
      
      const isLandPoint = isLand(lat, lon);
      
      if (isLandPoint) {
        // High density hub check
        const isCityHub = Math.random() > 0.97;
        if (isCityHub) {
          // Purple/violet glowing city lights
          colors[i * 3] = 0.545;     // R: 139 (purple-600)
          colors[i * 3 + 1] = 0.361; // G: 92
          colors[i * 3 + 2] = 0.969; // B: 247
        } else {
          // Standard glowing city lights: brilliant cyan/blue
          colors[i * 3] = 0.118;     // R: 30 (blue-500)
          colors[i * 3 + 1] = 0.518; // G: 132
          colors[i * 3 + 2] = 0.969; // B: 247
        }
      } else {
        // Very subtle faint background oceanic pattern for high-fidelity feel
        colors[i * 3] = 0.88;
        colors[i * 3 + 1] = 0.92;
        colors[i * 3 + 2] = 0.98;
      }
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const pointsMaterial = new THREE.PointsMaterial({
      size: 0.035,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.NormalBlending,
      depthWrite: false
    });
    
    const earthPoints = new THREE.Points(geometry, pointsMaterial);
    earthGroup.add(earthPoints);
    
    // Thin Atmospheric Rim
    const glowGeo = new THREE.SphereGeometry(2.05, 32, 32);
    const glowMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          // Thin glowing rim using Fresnel reflection approximation
          float intensity = pow(0.65 - dot(vNormal, vec3(0, 0, 1.0)), 3.0);
          gl_FragColor = vec4(0.545, 0.361, 0.969, 1.0) * intensity;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false
    });
    const atmosphere = new THREE.Mesh(glowGeo, glowMat);
    earthGroup.add(atmosphere);
    
    // Curved Connection Paths between global hubs
    const curvesGroup = new THREE.Group();
    earthGroup.add(curvesGroup);
    
    const hubs = [
      { lat: 19.0760, lon: 72.8777 },   // Mumbai
      { lat: 37.7749, lon: -122.4194 }, // SF
      { lat: 51.5074, lon: -0.1278 },   // London
      { lat: 35.6762, lon: 139.6503 },  // Tokyo
      { lat: -33.8688, lon: 151.2093 }  // Sydney
    ];
    
    const getCartesian = (lat: number, lon: number, radius: number = 2.0) => {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);
      
      return new THREE.Vector3(
        -(radius * Math.sin(phi) * Math.sin(theta)),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.cos(theta)
      );
    };
    
    for (let i = 0; i < hubs.length; i++) {
      for (let j = i + 1; j < hubs.length; j++) {
        const p1 = getCartesian(hubs[i].lat, hubs[i].lon, 2.0);
        const p2 = getCartesian(hubs[j].lat, hubs[j].lon, 2.0);
        
        const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
        const dist = p1.distanceTo(p2);
        mid.normalize().multiplyScalar(2.0 + dist * 0.22);
        
        const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
        const points = curve.getPoints(30);
        const curveGeo = new THREE.BufferGeometry().setFromPoints(points);
        
        const curveMat = new THREE.LineBasicMaterial({
          color: Math.random() > 0.5 ? 0x8b5cf6 : 0x3b82f6,
          transparent: true,
          opacity: 0.3,
          blending: THREE.AdditiveBlending
        });
        
        const line = new THREE.Line(curveGeo, curveMat);
        curvesGroup.add(line);
      }
    }
    
    // Slowly rotate Earth
    let animationFrameId: number;
    const animate = () => {
      earthGroup.rotation.y += 0.0018;
      earthGroup.rotation.x = 0.15; // static slight tilt
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();
    
    // Handle Window Resize
    const handleResize = () => {
      if (!canvas) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
    };
  }, []);

  const handleSignIn = (method: "google" | "demo") => {
    if (isLoggingIn || internalSuccess) return;
    setAuthMethod(method);
    setInternalSuccess(true);

    setTimeout(() => {
      if (method === "google") {
        onGoogleLogin();
      } else {
        onLogin();
      }
    }, 1800);
  };

  return (
    <div className="min-h-screen w-full bg-[#FAFAFC] text-slate-900 relative overflow-hidden flex flex-col font-sans selection:bg-blue-600/10 selection:text-blue-900">
      
      {/* Fully Covered Digital World Map Background merged with White */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-0 bg-white" />
      
      {/* Background Globe Container */}
      <div className="absolute right-[-25%] top-[-15%] w-[1200px] h-[1200px] pointer-events-none opacity-90 z-0 hidden lg:block">
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "100%", contain: "layout paint size" }}
        />
      </div>

      {/* Top Navbar */}
      <header className="relative z-20 w-full max-w-[1440px] mx-auto px-6 md:px-12 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-purple-200 flex items-center justify-center">
            <span className="font-extrabold text-lg text-purple-600">Y</span>
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-base tracking-tight text-slate-900 leading-tight">Yatranew <span className="text-purple-600">AI</span></span>
            <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">VR-based interview training and career recommendation</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 w-full max-w-[1440px] mx-auto px-6 md:px-12 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center py-4">
        
        {/* Left Column: Headlines */}
        <section className="lg:col-span-4 xl:col-span-5 space-y-8 text-left z-20">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 border border-purple-100 w-fit">
              <span className="text-[9px] uppercase tracking-widest text-purple-700 font-bold">AI THE NEXT STANDARD IN TECH</span>
            </div>

            <h1 className="text-5xl lg:text-[4rem] font-black tracking-tight text-slate-900 leading-[1.1]">
              Master your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                interview reality.
              </span>
            </h1>

            <p className="text-slate-600 text-sm md:text-base font-medium leading-relaxed max-w-md">
              Prepare for elite engineering teams using India's most advanced VR interview simulators and AI-driven algorithmic placement matching.
            </p>
          </div>
          
          {/* Scroll to explore removed */}
        </section>

        {/* Center Column: Login Form */}
        <section className="lg:col-span-4 xl:col-span-4 flex justify-center lg:justify-end z-20 relative">
          
          {/* A-Frame Floating Orb */}
          {aframeLoaded && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] pointer-events-none z-[-1] opacity-60 mix-blend-multiply">
              <AScene embedded vr-mode-ui="enabled: false" background="transparent: true" style={{ width: '100%', height: '100%' }}>
                <ACamera position="0 0 4" wasd-controls-enabled="false" look-controls-enabled="false"></ACamera>
                <AEntity position="0 0 0" animation="property: object3D.position.y; to: 0.3; dir: alternate; dur: 4000; loop: true; easing: easeInOutSine">
                   <AEntity animation="property: rotation; to: 0 360 0; dur: 20000; loop: true; easing: linear">
                      <ASphere radius="1.8" color="#8b5cf6" material="opacity: 0.15; transparent: true; wireframe: true" segments-width="18" segments-height="18"></ASphere>
                   </AEntity>
                   <AEntity animation="property: rotation; to: 360 360 0; dur: 25000; loop: true; easing: linear">
                      <ASphere radius="1.4" color="#3b82f6" material="opacity: 0.1; transparent: true; wireframe: true"></ASphere>
                   </AEntity>
                   <ASphere radius="0.8" color="#c084fc" material="opacity: 0.2; transparent: true"></ASphere>
                   <ALight type="point" color="#818cf8" intensity="3" position="0 0 0" distance="10"></ALight>
                </AEntity>
              </AScene>
            </div>
          )}

          <div className="w-full max-w-[400px] bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] shadow-purple-900/5 space-y-6 text-left">
            
            <div className="space-y-1">
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Access Portal</h2>
              <p className="text-xs text-slate-500 font-medium">Authenticate to synchronize your profile.</p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoggingIn || internalSuccess}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white font-semibold text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoggingIn || internalSuccess}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white font-semibold text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <button
                onClick={() => handleSignIn("demo")}
                disabled={isLoggingIn || internalSuccess}
                className="w-full h-11 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-95 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all mt-2"
              >
                {internalSuccess && authMethod === "demo" ? (
                   <span className="flex items-center gap-2">
                     <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                     </svg>
                     <span>Initializing...</span>
                   </span>
                ) : (
                  <>
                    <span>Initialize Demo Session</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <div className="relative py-2 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100" />
                </div>
                <span className="relative px-3 bg-white text-[10px] font-bold text-slate-400 uppercase tracking-widest">OR</span>
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={() => handleSignIn("google")}
                  disabled={isLoggingIn || internalSuccess}
                  className="w-full h-10 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-[11px] flex items-center justify-center gap-3 transition-colors"
                >
                  <GoogleIcon />
                  <span>Continue with Google</span>
                </button>
                <button
                  disabled={isLoggingIn || internalSuccess}
                  className="w-full h-10 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-[11px] flex items-center justify-center gap-3 transition-colors"
                >
                  <Github className="w-4 h-4" />
                  <span>Continue with GitHub</span>
                </button>
                <button
                  disabled={isLoggingIn || internalSuccess}
                  className="w-full h-10 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-[11px] flex items-center justify-center gap-3 transition-colors"
                >
                  <MicrosoftIcon />
                  <span>Continue with Microsoft</span>
                </button>
                <button
                  disabled={isLoggingIn || internalSuccess}
                  className="w-full h-10 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-[11px] flex items-center justify-center gap-3 transition-colors"
                >
                  <Linkedin className="w-4 h-4 text-[#0A66C2]" />
                  <span>Continue with LinkedIn</span>
                </button>
                <button
                  disabled={isLoggingIn || internalSuccess}
                  className="w-full h-10 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-[11px] flex items-center justify-center gap-3 transition-colors"
                >
                  <Mail className="w-4 h-4 text-purple-600" />
                  <span>Continue with Email</span>
                </button>
              </div>
              
              <div className="pt-2">
                <div className="flex items-start gap-2 bg-purple-50/50 border border-purple-100 p-3 rounded-xl text-[9px] text-purple-800 font-medium leading-relaxed">
                  <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-purple-500" />
                  <span>
                    Secure 256-bit encrypted connection. Your data is isolated in a sandboxed environment for strict privacy compliance.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: AI Character & Chat Bubble */}
        <section className="lg:col-span-4 xl:col-span-3 relative h-full hidden lg:flex items-center justify-center z-20">
           {/* We use a placeholder character overlay for the exact matching vibe */}
           <div className="absolute right-[-100px] bottom-[-50px] w-[600px] pointer-events-none">
             {/* Note: In a real app this would be a high quality 3D render image source */}
             <img 
               src="https://images.unsplash.com/photo-1620724838634-1c6c646fa127?auto=format&fit=crop&q=80&w=1000&blend=ffffff&blend-mode=screen" 
               alt="AI Mentor" 
               className="w-full h-auto object-cover opacity-90 drop-shadow-2xl mix-blend-multiply"
               style={{
                 maskImage: "linear-gradient(to top, transparent 10%, black 50%)",
                 WebkitMaskImage: "linear-gradient(to top, transparent 10%, black 50%)"
               }}
             />
             <div className="absolute top-[30%] right-[60%] bg-white border border-slate-100 shadow-xl rounded-2xl rounded-br-sm p-4 w-56 text-left pointer-events-auto">
                <p className="text-xs font-bold text-slate-900 mb-1">Hi there! 👋</p>
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                  I am <span className="text-purple-600 font-bold">Naya</span>, your AI mentor. Let's prepare you for your dream career.
                </p>
             </div>
           </div>
           
           <div className="absolute bottom-10 right-0 bg-white border border-slate-200 px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-bold text-slate-700">AI System Online</span>
           </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="relative z-20 w-full max-w-[1440px] mx-auto px-6 md:px-12 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-slate-500 font-medium bg-[#FAFAFC]/80 backdrop-blur-sm">
        <span>© 2026 Yatranew AI. All rights reserved.</span>
        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-slate-900 transition-colors">Privacy Charter</a>
          <a href="#" className="hover:text-slate-900 transition-colors">Security Architecture</a>
          <a href="#" className="hover:text-slate-900 transition-colors">Terms of Use</a>
        </div>
      </footer>
    </div>
  );
}

