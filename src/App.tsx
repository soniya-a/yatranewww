import React, { useEffect, useState, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useUser, useAuth, HandleSSOCallback, SignUp } from "@clerk/react";
import { useSignIn, useSignUp } from "@clerk/react/legacy";
import { clearUserSessionData } from "./lib/supabase";
import { registerAuthHandlers, logoutUser, type AppUser } from "./lib/auth";
export type { AppUser };
import Home from "./pages/Home";
import Interview from "./pages/Interview";
import AdminDashboard from "./pages/AdminDashboard";
import Login from "./pages/Login";
import { 
  motion, 
  AnimatePresence 
} from "motion/react";
import { 
  BrainCircuit, Sparkles, Globe, Sun, Moon, HelpCircle, Mail, Lock, 
  Check, CheckCircle, ShieldCheck, Layers, Bot, Video, TrendingUp, 
  Coins, Award, Terminal, ArrowRight, LockKeyhole, Cpu, Layers2, 
  FileSpreadsheet, Eye, EyeOff, UserCheck, Menu, X, ChevronDown, 
  Compass, GraduationCap, AwardIcon, Shield, Radio, Server,
  Volume2, Settings, MessageSquare, Heart, Move, BookOpen
} from "lucide-react";

// Particle system helper component for robot mascot
const SparkleParticle = ({ x, y, delay, size, className }: { x: number; y: number; delay: number; size: number; className?: string }) => {
  return (
    <div 
      className={`absolute pointer-events-none select-none ${className || ""}`}
      style={{
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
        animation: `sparkle_bubble 3.2s ease-in-out ${delay}s infinite`,
        opacity: 0
      }}
    >
      <Sparkles style={{ width: size, height: size }} />
    </div>
  );
};

// Extremely Cute Futuristic Graduate Robot Mascot SVG
// Styled exactly to replicate the uploaded custom holographic, smiling graduate robot design.
export const CuteRobotSvg = ({ 
  isBlinking = false, 
  isWaving = false, 
  expression = "smile", // "smile" | "wink" | "stars" | "blush" | "neutral"
  offset = { x: 0, y: 0 }
}: {
  isBlinking?: boolean;
  isWaving?: boolean;
  expression?: string;
  offset?: { x: number; y: number };
}) => {
  return (
    <svg 
      width="100%" 
      height="100%" 
      viewBox="0 0 240 240" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className="drop-shadow-[0_16px_36px_rgba(34,211,238,0.22)] select-none"
    >
      {/* Ambient background glow aura */}
      <circle cx="120" cy="115" r="75" fill="url(#coreAuraGrad)" opacity="0.3" className="animate-pulse" />

      {/* THREE-DOT SPEECH BUBBLE (above head, waving proudly) */}
      <g className="animate-bounce" style={{ transformOrigin: "185px 35px", animationDuration: "3.5s" }}>
        <path d="M 175 42 L 180 48 L 185 42" fill="#22d3ee" opacity="0.85" />
        <rect x="155" y="18" width="48" height="24" rx="12" fill="url(#glowingBubbleGrad)" stroke="#22d3ee" strokeWidth="1.5" />
        <circle cx="169" cy="30" r="2.5" fill="#ffffff" className="animate-pulse" />
        <circle cx="179" cy="30" r="2.5" fill="#ffffff" className="animate-pulse" style={{ animationDelay: "0.2s" }} />
        <circle cx="189" cy="30" r="2.5" fill="#ffffff" className="animate-pulse" style={{ animationDelay: "0.4s" }} />
      </g>

      {/* FLOATING HOLOGRAPHIC OPEN BOOK (Bottom-right, just like image) */}
      <g className="animate-float" style={{ transform: "translate(22px, 20px)" }}>
        <path d="M 145 155 Q 165 145 185 155 Q 205 145 225 155 L 225 178 Q 205 168 185 178 Q 165 168 145 178 Z" fill="url(#bookCoverGrad)" opacity="0.9" stroke="#22d3ee" strokeWidth="1.5" />
        <path d="M 148 152 Q 165 142 185 152 Q 205 142 222 152 L 222 171 Q 205 161 185 171 Q 165 161 148 171 Z" fill="#ffffff" />
        <path d="M 154 158 Q 165 151 180 157" stroke="#22d3ee" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
        <path d="M 154 163 Q 165 156 180 162" stroke="#22d3ee" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
        <path d="M 190 158 Q 205 151 216 157" stroke="#22d3ee" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
        <path d="M 190 163 Q 205 156 216 162" stroke="#22d3ee" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      </g>

      {/* Left arm/hand, cute baby white pod style */}
      <g style={{ transform: `translate(${-offset.x * 0.1}px, ${-offset.y * 0.15}px)` }}>
        <path d="M 64 162 C 45 168 34 186 42 194" fill="none" stroke="#f4f4f5" strokeWidth="9.5" strokeLinecap="round" />
        <circle cx="39" cy="192" r="5" fill="#f4f4f5" />
      </g>

      {/* Right arm waving dynamically */}
      <g 
        style={{ 
          transform: `translate(${offset.x * 0.1}px, ${offset.y * 0.15}px)`,
          transformOrigin: "176px 162px" 
        }} 
        className={isWaving ? "animate-[wave_intense_0.7s_infinite_alternate]" : "animate-[wave_gentle_2s_infinite_alternate]"}
      >
        <path d="M 176 162 C 194 155 212 134 218 114" fill="none" stroke="#f4f4f5" strokeWidth="9.5" strokeLinecap="round" />
        <circle cx="219" cy="110" r="6.5" fill="#ffffff" />
        <path d="M 219 110 Q 227 111 226 117" stroke="#f4f4f5" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M 219 110 Q 224 101 221 95" stroke="#f4f4f5" strokeWidth="2.5" strokeLinecap="round" />
      </g>

      {/* Bottom Floating Hover Legs / feet */}
      <g style={{ transform: `translate(${offset.x * 0.08}px, ${offset.y * 0.08}px)` }}>
        <path d="M 104 198 Q 104 213 112 213" fill="none" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" />
        <path d="M 136 198 Q 136 213 128 213" fill="none" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" />
        <ellipse cx="112" cy="214" rx="4.5" ry="3" fill="#f4f4f5" />
        <ellipse cx="128" cy="214" rx="4.5" ry="3" fill="#f4f4f5" />
      </g>

      {/* Slim Neck */}
      <rect x="111" y="146" width="18" height="10" rx="3" fill="#cbd5e1" stroke="#ffffff" strokeWidth="1" />

      {/* Cute body block */}
      <rect x="85" y="150" width="70" height="50" rx="22" fill="url(#cuteBodyGrad)" stroke="#ffffff" strokeWidth="3" />
      
      {/* Cyan Chest reactor core - pulsing glowing neon reactor */}
      <g style={{ transformOrigin: "120px 175px" }}>
        <circle cx="120" cy="175" r="13" fill="none" stroke="#22d3ee" strokeWidth="1.5" opacity="0.6" className="animate-ping" />
        <circle cx="120" cy="175" r="8" fill="none" stroke="#22d3ee" strokeWidth="2" className="animate-pulse" />
        <circle cx="120" cy="175" r="5" fill="#22d3ee" />
      </g>

      {/* Head section with physical tilt offset */}
      <g style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}>
        {/* Head Shell */}
        <ellipse cx="120" cy="112" rx="62" ry="50" fill="url(#cuteHeadGrad)" stroke="#ffffff" strokeWidth="4" />
        
        {/* Shiny glass glare on top of head */}
        <path d="M 76 89 Q 120 75 164 89" fill="none" stroke="#ffffff" strokeWidth="2.5" opacity="0.5" strokeLinecap="round" />

        {/* Headphones (Ears) with concentric neon cyan glowing rings */}
        <rect x="42" y="94" width="16" height="36" rx="8" fill="#e4e4e7" stroke="#ffffff" strokeWidth="1.5" />
        <circle cx="50" cy="112" r="5" fill="none" stroke="#22d3ee" strokeWidth="2.5" className="animate-pulse" />
        
        <rect x="182" y="94" width="16" height="36" rx="8" fill="#e4e4e7" stroke="#ffffff" strokeWidth="1.5" />
        <circle cx="190" cy="112" r="5" fill="none" stroke="#22d3ee" strokeWidth="2.5" className="animate-pulse" />

        {/* Space helmet deep glossy screen visor */}
        <ellipse cx="120" cy="115" rx="50" ry="38" fill="url(#cuteScreenBorderGrad)" stroke="#ffffff" strokeWidth="2" />
        <ellipse cx="120" cy="115" rx="46" ry="34" fill="url(#cuteScreenGrad)" />

        {/* SCREEN FACE STATS BLOCK (blinking or happy facial expression matches) */}
        {isBlinking ? (
          <>
            <line x1="88" y1="113" x2="108" y2="113" stroke="#22d3ee" strokeWidth="6.5" strokeLinecap="round" />
            <line x1="132" y1="113" x2="152" y2="113" stroke="#22d3ee" strokeWidth="6.5" strokeLinecap="round" />
          </>
        ) : expression === "stars" ? (
          <>
            {/* Sparkles / Star pupils */}
            <path d="M 98 103 L 101 109 L 107 110 L 102 114 L 104 120 L 98 116 L 92 120 L 94 114 L 89 110 L 95 109 Z" fill="#22d3ee" />
            <path d="M 142 103 L 145 109 L 151 110 L 146 114 L 148 120 L 142 116 L 136 120 L 138 114 L 133 110 L 139 109 Z" fill="#22d3ee" />
          </>
        ) : expression === "wink" ? (
          <>
            {/* Playful wink design */}
            <path d="M 88 113 Q 98 98 108 113" fill="none" stroke="#22d3ee" strokeWidth="6.5" strokeLinecap="round" />
            <line x1="132" y1="113" x2="152" y2="113" stroke="#22d3ee" strokeWidth="6.5" strokeLinecap="round" />
          </>
        ) : expression === "blush" ? (
          <>
            <circle cx="98" cy="111" r="7.5" fill="#22d3ee" />
            <circle cx="142" cy="111" r="7.5" fill="#22d3ee" />
          </>
        ) : (
          <>
            {/* Default highly friendly smiling arched eyes ^^ */}
            <path d="M 88 113 Q 98 98 108 113" fill="none" stroke="#22d3ee" strokeWidth="7" strokeLinecap="round" />
            <path d="M 132 113 Q 142 98 152 113" fill="none" stroke="#22d3ee" strokeWidth="7" strokeLinecap="round" />
          </>
        )}

        {/* Cute blushing coral cheeks slots */}
        <ellipse cx="81" cy="125" rx="5" ry="3" fill="#f43f5e" opacity="0.6" className="animate-pulse" />
        <ellipse cx="159" cy="125" rx="5" ry="3" fill="#f43f5e" opacity="0.6" className="animate-pulse" />

        {/* Tiny cute curved smiling mouth (giggle hook ~ style) */}
        <path d="M 114 124 Q 120 127 126 124" fill="none" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" />

        {/* NEON DOCTORAL GRADUATION MORTARBOARD CAP (Perfect tilted design from image) */}
        <g style={{ transform: "rotate(-6deg) translate(0px, -22px)", transformOrigin: "120px 65px" }}>
          {/* Cap headband binding */}
          <path d="M 94 62 Q 120 54 146 62 L 140 71 Q 120 63 100 71 Z" fill="#1e1b4b" stroke="#ffffff" strokeWidth="1" />
          {/* Obsidian gloss diamond plate */}
          <polygon points="120,38 185,50 120,62 55,50" fill="url(#capPlateGrad)" stroke="#22d3ee" strokeWidth="2" className="shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
          {/* Glowing central cap rivet */}
          <circle cx="120" cy="50" r="4.5" fill="#22d3ee" />
          {/* Streaming bright tassel on left/right side (we drop on left) */}
          <path d="M 120 50 Q 82 56 74 74" fill="none" stroke="#22d3ee" strokeWidth="2.2" strokeLinecap="round" opacity="0.8" />
          {/* Holographic tassel nodes */}
          <path d="M 74 74 L 71 85 M 74 74 L 74 87 M 74 74 L 77 85" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" />
        </g>
      </g>

      {/* Graphic Design Gradient Definitions */}
      <defs>
        <linearGradient id="cuteHeadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
        <linearGradient id="cuteBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
        <linearGradient id="cuteScreenBorderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
        <linearGradient id="cuteScreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="60%" stopColor="#020617" />
          <stop offset="100%" stopColor="#000000" />
        </linearGradient>
        <linearGradient id="capPlateGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="50%" stopColor="#1e1e38" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
        <linearGradient id="glowingBubbleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
        <linearGradient id="bookCoverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e1e38" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
        <radialGradient id="coreAuraGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
          <stop offset="60%" stopColor="#818cf8" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
};

// Standard Inline Mascot wrapper utilizing the cute model
const InteractiveMascot = ({ mouseX, mouseY, isSuccess }: { mouseX: number; mouseY: number; isSuccess: boolean }) => {
  const [isBlinking, setIsBlinking] = useState(false);
  const robotRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [expression, setExpression] = useState("smile");

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 220);
    }, 4000);
    return () => clearInterval(blinkInterval);
  }, []);

  useEffect(() => {
    if (!robotRef.current) return;
    const rect = robotRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = mouseX - centerX;
    const dy = mouseY - centerY;
    const moveX = Math.max(-10, Math.min(10, dx * 0.025));
    const moveY = Math.max(-8, Math.min(8, dy * 0.025));
    setOffset({ x: moveX, y: moveY });
  }, [mouseX, mouseY]);

  return (
    <div 
      ref={robotRef} 
      onClick={() => {
        setExpression(expression === "smile" ? "wink" : expression === "wink" ? "stars" : expression === "stars" ? "blush" : "smile");
      }}
      className="relative flex flex-col items-center justify-center select-none py-4 cursor-pointer transition-transform hover:scale-105 active:scale-95 animate-float-companion"
    >
      <div className="absolute inset-0 pointer-events-none">
        <SparkleParticle x={-50} y={-40} delay={0} size={15} className="text-cyan-400" />
        <SparkleParticle x={50} y={-70} delay={1.2} size={11} className="text-purple-400" />
        <SparkleParticle x={80} y={20} delay={0.5} size={16} className="text-indigo-400" />
      </div>

      <div className="w-[200px] h-[200px]">
        <CuteRobotSvg 
          isBlinking={isBlinking} 
          isWaving={true} 
          expression={isSuccess ? "stars" : expression} 
          offset={offset} 
        />
      </div>

      {/* Floating pedestal ring visual effect */}
      <div className="w-full max-w-[150px] h-6 flex items-center justify-center mt-2">
        <div className="absolute w-32 h-2.5 bg-cyan-500/10 border border-cyan-400/20 rounded-[50%] blur-xs animate-pulse"></div>
        <div className="absolute w-24 h-1.5 bg-gradient-to-r from-cyan-400/20 to-purple-400/10 rounded-[50%] animate-[spin_10s_linear_infinite]"></div>
      </div>
    </div>
  );
};

// Global Interactive Floating Cyber Mascot ("Sonu")
export const GlobalCompanionBot = () => {
  return null;
};

// Abstract network overlay in background
const GlobalNetworkGrid = () => {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-45">
      <div className="absolute inset-0 bg-[radial-gradient(#ebecef_1px,transparent_1px)] [background-size:32px_32px]"></div>
      
      {/* Visual map pathways representing global university connectivity */}
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="pathGradientOne" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c084fc" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#818cf8" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        
        {/* Soft flowing connections */}
        <path d="M 80 180 Q 280 340 450 200 T 820 450" fill="none" stroke="url(#pathGradientOne)" strokeWidth="1.5" />
        <path d="M 190 520 Q 380 250 640 380 T 1150 120" fill="none" stroke="url(#pathGradientOne)" strokeWidth="1.5" strokeDasharray="6,6" />
        <path d="M 520 80 Q 750 250 1020 180" fill="none" stroke="url(#pathGradientOne)" strokeWidth="1.2" />
        
        {/* Connection points (Universities/Nodes) */}
        <circle cx="80" cy="180" r="4.5" fill="#c084fc" className="animate-pulse" />
        <circle cx="280" cy="310" r="5" fill="#818cf8" />
        <circle cx="450" cy="200" r="4" fill="#22d3ee" />
        <circle cx="820" cy="450" r="5.5" fill="#6366f1" className="animate-pulse" />
        <circle cx="190" cy="520" r="4.5" fill="#ec4899" />
        <circle cx="380" cy="320" r="5" fill="#c084fc" />
        <circle cx="640" cy="380" r="6" fill="#a855f7" />
        <circle cx="1150" cy="120" r="5" fill="#38bdf8" />
        <circle cx="520" cy="80" r="4" fill="#a855f7" className="animate-pulse" />
        <circle cx="1020" cy="180" r="5" fill="#818cf8" />
        
        {/* Large orbital lines */}
        <circle cx="15%" cy="30%" r="220" fill="none" stroke="#e9d5ff" strokeWidth="0.8" strokeOpacity="0.4" />
        <circle cx="85%" cy="70%" r="320" fill="none" stroke="#e0e7ff" strokeWidth="0.8" strokeDasharray="4,8" strokeOpacity="0.5" />
      </svg>
    </div>
  );
};

export default function App() {
  const { isLoaded: isUserLoaded, isSignedIn: isUserSignedIn, user: clerkUser } = useUser();
  const { isLoaded: isAuthLoaded, isSignedIn: isAuthSignedIn, userId, getToken, signOut: clerkSignOut } = useAuth();
  const { isLoaded: isSignInLoaded, signIn, setActive: setActiveSignIn } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp, setActive: setActiveSignUp } = useSignUp();

  const isClerkSignedIn = Boolean(isUserSignedIn || isAuthSignedIn);

  // Guest Sandbox User (for local testing / demo mode)
  const [guestUser, setGuestUser] = useState<AppUser | null>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem("yatra_guest_user");
        if (stored) return JSON.parse(stored);
        if (localStorage.getItem("guest_session") === "true") {
          return {
            uid: localStorage.getItem("guest_uid") || "guest-123",
            email: localStorage.getItem("guest_email") || "guest@yatra.ai",
            displayName: localStorage.getItem("guest_name") || "Student",
            isAnonymous: true,
            getIdToken: async () => localStorage.getItem("guest_token") || "guest_token_123"
          };
        }
      }
      return null;
    } catch {
      return null;
    }
  });

  // Fallback timeout so unauthenticated / sandbox / test environments never hang on Clerk SDK
  const [clerkTimeout, setClerkTimeout] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setClerkTimeout(true), 4000);
    return () => clearTimeout(t);
  }, []);

  // Authentication submission states
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Cursor mouse tracking for mascot
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Register active auth handlers synchronously and on update so child components always acquire fresh tokens
  if (isAuthLoaded && getToken && clerkSignOut) {
    registerAuthHandlers(getToken, clerkSignOut);
  }
  useEffect(() => {
    if (isAuthLoaded && getToken && clerkSignOut) {
      registerAuthHandlers(getToken, clerkSignOut);
    }
  }, [isAuthLoaded, getToken, clerkSignOut]);

  // Derive effective user: Clerk authenticated user takes precedence over guest sandbox user
  const effectiveUser: AppUser | null = (() => {
    if (isClerkSignedIn && (clerkUser || userId)) {
      const resolvedName =
        clerkUser?.fullName ||
        (clerkUser?.unsafeMetadata?.fullName as string) ||
        (clerkUser?.publicMetadata?.fullName as string) ||
        [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") ||
        clerkUser?.username ||
        clerkUser?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
        "Candidate";
      return {
        uid: clerkUser?.id || userId || "user_authenticated",
        email: clerkUser?.primaryEmailAddress?.emailAddress || "user@yatra.ai",
        displayName: resolvedName,
        isAnonymous: false,
        avatarUrl: clerkUser?.imageUrl,
        getIdToken: async () => (await getToken()) || ""
      };
    }
    if (guestUser && !isClerkSignedIn) {
      return guestUser;
    }
    return null;
  })();

  // Email/Password login and signup handler powered by Clerk
  const handleAuthLogin = async (credentials?: {
    email: string;
    password?: string;
    name?: string;
    mode?: "signin" | "signup";
  }): Promise<{ error?: string; requiresVerification?: boolean } | void> => {
    setIsLoggingIn(true);
    setAuthError(null);

    const emailToUse = credentials?.email?.trim();
    const passwordToUse = credentials?.password || "";
    const nameToUse = credentials?.name?.trim() || "";

    if (credentials?.mode === "signup" && !nameToUse) {
      setIsLoggingIn(false);
      const msg = "Please enter your full name.";
      setAuthError(msg);
      return { error: msg };
    }

    if (!emailToUse) {
      setIsLoggingIn(false);
      const msg = "Please enter your email address.";
      setAuthError(msg);
      return { error: msg };
    }

    if (!passwordToUse) {
      setIsLoggingIn(false);
      const msg = "Please enter your password.";
      setAuthError(msg);
      return { error: msg };
    }

    try {
      if (credentials?.mode === "signup") {
        if (!isSignInLoaded || !signIn) {
          throw new Error("Authentication service is initializing. Please try again.");
        }
        if (passwordToUse.length < 8) {
          throw new Error("Password must be at least 8 characters long.");
        }
        clearUserSessionData();
        setGuestUser(null);
        localStorage.removeItem("yatra_guest_user");

        // Create account via backend Clerk endpoint so user's full name and 8+ character password are saved accurately
        const signupRes = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: nameToUse,
            email: emailToUse,
            password: passwordToUse
          })
        });
        const signupData = await signupRes.json();

        if (!signupRes.ok || !signupData?.success) {
          const errMsg = signupData?.error || "Could not create account. Please check your details and try again.";
          setAuthError(errMsg);
          return { error: errMsg };
        }

        try {
          localStorage.setItem("userName", nameToUse);
        } catch {}

        // Activate Clerk session on frontend using the newly registered credentials (or sign-in token fallback)
        try {
          const signInRes = await signIn.create({
            identifier: emailToUse,
            password: passwordToUse
          });
          if (signInRes.status === "complete" && setActiveSignIn && signInRes.createdSessionId) {
            await setActiveSignIn({ session: signInRes.createdSessionId });
            return {};
          }
        } catch (signInErr) {
          if (signupData.signInToken) {
            const ticketRes = await signIn.create({
              strategy: "ticket",
              ticket: signupData.signInToken
            });
            if (ticketRes.status === "complete" && setActiveSignIn && ticketRes.createdSessionId) {
              await setActiveSignIn({ session: ticketRes.createdSessionId });
              return {};
            }
          } else {
            throw signInErr;
          }
        }
        return {};
      } else {
        // Sign in mode
        if (!isSignInLoaded || !signIn) {
          throw new Error("Authentication service is initializing. Please try again.");
        }
        clearUserSessionData();
        setGuestUser(null);
        localStorage.removeItem("yatra_guest_user");
        const res = await signIn.create({
          identifier: emailToUse,
          password: passwordToUse
        });

        if (res.status === "complete") {
          if (setActiveSignIn && res.createdSessionId) {
            await setActiveSignIn({ session: res.createdSessionId });
          }
          return {};
        } else if (res.status === "needs_first_factor" || res.status === "needs_second_factor") {
          return { error: "Multi-factor authentication required. Please check your verification method." };
        }
        return {};
      }
    } catch (err: any) {
      console.warn("[Clerk Auth] Login/Signup notice:", err);
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message || "Authentication failed. Please check your credentials.";
      setAuthError(msg);
      return { error: msg };
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Dedicated email verification code submission
  const handleVerifyCode = async (code: string): Promise<{ error?: string } | void> => {
    if (!isSignUpLoaded || !signUp) {
      return { error: "Authentication service is initializing. Please try again." };
    }
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const verified = await signUp.attemptEmailAddressVerification({ code: code.trim() });
      if (verified.status === "complete") {
        if (setActiveSignUp && verified.createdSessionId) {
          await setActiveSignUp({ session: verified.createdSessionId });
        }
        return {};
      } else {
        return { error: "Verification could not be completed. Please check the code." };
      }
    } catch (err: any) {
      console.warn("[Clerk Auth] Code verification notice:", err);
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message || "Invalid verification code. Please check and try again.";
      setAuthError(msg);
      return { error: msg };
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Resend verification code
  const handleResendCode = async (): Promise<{ error?: string; message?: string }> => {
    if (!isSignUpLoaded || !signUp) {
      return { error: "Authentication service is initializing. Please try again." };
    }
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      return { message: "A fresh verification code has been sent to your email." };
    } catch (err: any) {
      return { error: err?.errors?.[0]?.message || err?.message || "Failed to resend verification code." };
    }
  };

  const handleForgotPassword = async (email: string): Promise<{ error?: string; message?: string }> => {
    try {
      const cleanEmail = email.trim();
      if (!cleanEmail || !cleanEmail.includes("@")) {
        return { error: "Please enter a valid email address." };
      }
      if (!isSignInLoaded) {
        return { error: "Authentication service is initializing. Please wait." };
      }
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: cleanEmail
      });
      return { message: `Password reset instructions sent to ${cleanEmail}.` };
    } catch (err: any) {
      return { error: err?.errors?.[0]?.message || err?.message || "Failed to send password reset email." };
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      clearUserSessionData();
      setGuestUser(null);
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.removeItem("yatra_guest_user");
        localStorage.removeItem("guest_session");
      }

      const redirectParams = {
        strategy: "oauth_google" as const,
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/",
        continueSignUp: true,
        continueSignIn: true
      };

      if (signIn) {
        await signIn.authenticateWithRedirect(redirectParams);
      } else if (signUp) {
        await signUp.authenticateWithRedirect(redirectParams);
      } else {
        throw new Error("Authentication service is initializing. Please wait.");
      }
    } catch (error: any) {
      console.warn("[Clerk OAuth] Google sign in notice:", error);
      const msg = error?.errors?.[0]?.longMessage || error?.errors?.[0]?.message || error?.message || "Google sign in failed. Please try email/password.";
      setAuthError(msg);
      setIsLoggingIn(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      clearUserSessionData();
      const guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const guest: AppUser = {
        uid: guestId,
        email: "guest@yatra.ai",
        displayName: "Guest Candidate",
        isAnonymous: true,
        getIdToken: async () => guestId
      };
      setGuestUser(guest);
      localStorage.setItem("yatra_guest_user", JSON.stringify(guest));
    } finally {
      setIsLoggingIn(false);
    }
  };

  // SSO Callback handling: Mount HandleSSOCallback to resolve pending Protect challenges and complete session
  const isSSOCallback = typeof window !== "undefined" && window.location.pathname.startsWith("/sso-callback");

  if (isSSOCallback) {
    if (isClerkSignedIn) {
      if (typeof window !== "undefined") {
        window.location.replace("/");
      }
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-zinc-50 relative">
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 bg-purple-600/10 rounded-2xl flex items-center justify-center border border-purple-200 shadow-md animate-pulse">
              <BrainCircuit className="w-7 h-7 text-purple-600" />
            </div>
            <div className="text-zinc-500 font-mono text-[11px] uppercase tracking-widest animate-pulse">
              Entering YATRA Dashboard...
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-zinc-50 relative">
        <div className="flex flex-col items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-purple-600/10 rounded-2xl flex items-center justify-center border border-purple-200 shadow-md animate-pulse">
            <BrainCircuit className="w-7 h-7 text-purple-600" />
          </div>
          <div className="text-zinc-500 font-mono text-[11px] uppercase tracking-widest animate-pulse">
            Completing Google Sign-In...
          </div>
        </div>
        <HandleSSOCallback
          navigateToApp={() => {
            if (typeof window !== "undefined") {
              window.location.replace("/");
            }
          }}
          navigateToSignIn={() => {
            if (typeof window !== "undefined") {
              window.location.replace("/");
            }
          }}
          navigateToSignUp={() => {
            if (typeof window !== "undefined") {
              window.location.replace("/sign-up");
            }
          }}
        />
      </div>
    );
  }

  // Dedicated in-app Clerk Sign-Up route so pending Protect (bot detection / Turnstile) challenges can resolve
  const isSignUpRoute = typeof window !== "undefined" && window.location.pathname.startsWith("/sign-up");
  if (isSignUpRoute && !effectiveUser) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-zinc-50 p-4 relative">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-purple-600/10 rounded-xl flex items-center justify-center border border-purple-200 shadow-sm">
            <BrainCircuit className="w-5 h-5 text-purple-600" />
          </div>
          <span className="font-bold text-lg text-zinc-900 tracking-tight">YATRA</span>
        </div>
        <div className="w-full max-w-md flex justify-center">
          <SignUp 
            routing="path" 
            path="/sign-up" 
            signInUrl="/"
            fallbackRedirectUrl="/"
            forceRedirectUrl="/"
          />
        </div>
      </div>
    );
  }

  // Loading state while Clerk SDK initializes:
  // If Clerk is still loading, display the portal loader unless clerkTimeout has expired.
  // When effectiveUser is resolved, bypass loader immediately.
  const isAuthInitializing = (!isUserLoaded || !isAuthLoaded) && !clerkTimeout;
  const loading = isAuthInitializing && !effectiveUser;
  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-zinc-50 relative">
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes pulse_scale { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.05); opacity: 1; } }
          .glowing-loader { animation: pulse_scale 2s infinite ease-in-out; }
        `}} />
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 bg-purple-600/10 rounded-2xl flex items-center justify-center border border-purple-200 shadow-md glowing-loader">
            <BrainCircuit className="w-7 h-7 text-purple-600" />
          </div>
          <div className="text-zinc-400 font-mono text-[11px] uppercase tracking-widest animate-pulse">Initializing Portal Environment...</div>
        </div>
      </div>
    );
  }

  // If unauthenticated, show the approved YATRA login layout
  if (!effectiveUser) {
    return (
      <Login 
        onLogin={handleAuthLogin} 
        onGoogleLogin={handleGoogleLogin} 
        onForgotPassword={handleForgotPassword}
        onVerifyCode={handleVerifyCode}
        onResendCode={handleResendCode}
        onGuestLogin={handleGuestLogin}
        isLoggingIn={isLoggingIn} 
        authError={authError}
        mousePos={mousePos} 
      />
    );
  }

  // Visual layout for authenticated users
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/sso-callback" element={<Navigate to="/" replace />} />
        <Route path="/sso-callback/*" element={<Navigate to="/" replace />} />
        <Route path="/sign-up" element={<Navigate to="/" replace />} />
        <Route path="/sign-up/*" element={<Navigate to="/" replace />} />
        <Route path="/" element={<Home />} />
        <Route path="/interview" element={<Interview />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <GlobalCompanionBot />
    </BrowserRouter>
  );
}
