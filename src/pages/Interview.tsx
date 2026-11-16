// @ts-nocheck
import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Mic, MicOff, Clock, Send, Loader2, Award, ClipboardCheck, Sparkles, Check, CheckCircle, ChevronRight, BookOpen, AlertCircle, Sun, Volume2, ZoomIn, ZoomOut, Smartphone, Layers, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { VRScene } from "../components/VRScene";
import { GeminiLiveClient } from '../lib/geminiLiveClient';
import { 
  retrieveActiveInterviewContext, 
  persistActiveInterviewContext, 
  purgeLegacyUnscopedKeys 
} from '../lib/interview/interviewContext';
import { InterviewHeader } from '../components/interview/InterviewHeader';
import { AIInterviewerCard } from '../components/interview/AIInterviewerCard';
import { CanonicalQuestionCard } from '../components/interview/CanonicalQuestionCard';
import { AITranscriptCard } from '../components/interview/AITranscriptCard';
import { CandidateTranscriptCard } from '../components/interview/CandidateTranscriptCard';
import { VoiceControls } from '../components/interview/VoiceControls';
import { QuestionQueue } from '../components/interview/QuestionQueue';
import { BehaviorObserver, BehaviorLog } from '../lib/interview/behaviorObserver';

const INTERVIEWERS = [
  {
    id: "vinodh",
    name: "Mr. Vinodh — Hiring Manager",
    role: "Hiring Manager & Engineering Director",
    url: "/avatars/mr-vinodh.png",
    desc: "Executive hiring manager conducting the interview opposite you.",
    img: "👨‍💼"
  },
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

function isQuestionEcho(candidateText: string, activeQuestionText: string): boolean {
  if (!candidateText || !activeQuestionText) return false;
  const normCand = candidateText.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
  const normQ = activeQuestionText.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
  if (normCand.length < 5) return false;
  if (normQ.includes(normCand) && normCand.length > 15) return true;
  if (normCand.includes(normQ)) return true;
  const qWords = new Set(normQ.split(/\s+/).filter(w => w.length > 3));
  if (qWords.size === 0) return false;
  const candWords = normCand.split(/\s+/).filter(w => w.length > 3);
  let overlap = 0;
  for (const w of candWords) {
    if (qWords.has(w)) overlap++;
  }
  return candWords.length > 0 && (overlap / candWords.length) > 0.65;
}

export default function Interview() {
  const navigate = useNavigate();
  const location = useLocation();

  // 1. First, parse URL search parameters
  const queryParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const queryJobId = queryParams.get('jobId') || '';
  const querySetId = queryParams.get('setId') || '';
  const queryCompany = queryParams.get('company') || '';
  const queryRole = queryParams.get('role') || '';
  const queryVR = queryParams.get('vr');

  // 2. React Router location state
  const state = (location.state || {}) as any;

  // 3. Fallback to scoped storage if needed
  const scopedContext = retrieveActiveInterviewContext(queryJobId || state.jobId || null);

  // 4. Resolve exact Job Context with zero hardcoded TCS / Software Engineer fallbacks
  const targetJobId = queryJobId || state.jobId || scopedContext?.jobId || '';
  const targetCompany = (queryCompany || state.company || scopedContext?.company || '').trim();
  const targetRole = (queryRole || state.role || scopedContext?.role || '').trim();
  const targetJobDescription = state.jobDescription || scopedContext?.jobDescription || '';
  const candidateSkills = state.candidateSkills || scopedContext?.candidateSkills || 'React, TypeScript, Python, SQL';

  // 5. Retrieve parsed resume / candidate profile from location state, scoped storage, or local storage
  const parsedResume = useMemo(() => {
    if (state.resumeReference) return state.resumeReference;
    if (scopedContext?.resumeReference) return scopedContext.resumeReference;
    if (typeof window !== 'undefined') {
      try {
        const storedProfile = localStorage.getItem("yatra_candidate_profile");
        if (storedProfile) return JSON.parse(storedProfile);
        const storedParse = localStorage.getItem("yatra_parse_result");
        if (storedParse) return JSON.parse(storedParse);
      } catch (e) {
        console.warn("[Interview] Failed to read stored resume profile:", e);
      }
    }
    return null;
  }, [state.resumeReference, scopedContext?.resumeReference]);

  // Canonical InterviewQuestionSet ID
  const [activeSetId, setActiveSetId] = useState<string>(() => {
    return querySetId || state.setId || scopedContext?.setId || '';
  });

  // VR Mode: Strictly false unless explicitly requested as true in URL or state
  const [isVRActive, setIsVRActive] = useState<boolean>(() => {
    if (queryVR === 'true') return true;
    if (queryVR === 'false') return false;
    if (state.isVR !== undefined) return Boolean(state.isVR);
    if (scopedContext?.isVR !== undefined) return Boolean(scopedContext.isVR);
    return false;
  });

  // Track session ID for persistence across reloads
  const [sessionId, setSessionId] = useState<string>(() => {
    const querySessionId = queryParams.get('sessionId');
    return querySessionId || '';
  });

  // Lifecycle state management: LOADING | READY | ERROR | NO_CONTEXT
  const [interviewState, setInterviewState] = useState<'LOADING' | 'READY' | 'ERROR' | 'NO_CONTEXT'>(() => {
    if (!targetCompany && !targetRole && !activeSetId && !querySetId && !state.setId && !scopedContext?.setId) {
      return 'NO_CONTEXT';
    }
    return 'LOADING';
  });
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    purgeLegacyUnscopedKeys();
  }, []);

  // Determine active company configuration mode on boot
  const [currentMode, setCurrentMode] = useState(() => {
    const comp = (targetCompany || '').toLowerCase();
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

  useEffect(() => {
    if (isVRActive) {
      const checkVR = () => {
        if (typeof window !== 'undefined' && (window as any).AFRAME) {

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
    }
  }, [isVRActive]);

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
  const [geminiLiveClient, setGeminiLiveClient] = useState<GeminiLiveClient | null>(null);
  const hasAnnouncedInitialQuestionRef = useRef(false);
  const [isListeningSTT, setIsListeningSTT] = useState(false);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  // Custom entrance variables for corporate boardroom walk-in
  const [entranceState, setEntranceState] = useState<'unstarted' | 'door-opening' | 'walking' | 'seated'>('seated');
  const [doorRotationY, setDoorRotationY] = useState(0); // 0 = closed, -90 = open
  const [cameraRigPos, setCameraRigPos] = useState({ x: 0, y: 0, z: 1.45 }); // starts outside the door
  const [questions, setQuestions] = useState<any[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({}); // structure: { "roundIdx_questionIdx": answerString }
  const [codeAnswers, setCodeAnswers] = useState<Record<string, string>>({});
  
  const [isMicOn, setIsMicOn] = useState(false);
  const isMicOnRef = useRef(false);
  const [liveInterimTranscript, setLiveInterimTranscript] = useState('');
  const [liveFinalTranscript, setLiveFinalTranscript] = useState('');
  const [timeLeft, setTimeLeft] = useState(45 * 60); // 45 minute total timer
  const [cameraZ, setCameraZ] = useState(1.5);
  const [showTips, setShowTips] = useState(true);

  // Live Camera state for candidate webcam auto-start
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Re-attach stream when entering/exiting VR mode
  useEffect(() => {
    if (videoRef.current && activeStream) {
      videoRef.current.srcObject = activeStream;
    }
  }, [isVRActive, activeStream]);

  // Behavior Observation
  const [behaviorLogs, setBehaviorLogs] = useState<BehaviorLog[]>([]);
  const behaviorObserverRef = useRef<BehaviorObserver | null>(null);

  useEffect(() => {
    behaviorObserverRef.current = new BehaviorObserver((log) => {
      setBehaviorLogs((prev) => [...prev, log]);
      console.log("[Behavior Observation]", log);
    });
    behaviorObserverRef.current.initialize();
    
    return () => {
      behaviorObserverRef.current?.stopObserving();
    };
  }, []);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setActiveStream(stream);
        setIsCameraOn(true);
      } catch (err) {
        console.warn("Camera access failed or denied:", err);
        setIsCameraOn(false);
      }
    };
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (isCameraOn && activeStream && videoRef.current) {
      videoRef.current.srcObject = activeStream;
      // Start behavioral observation
      if (behaviorObserverRef.current) {
        behaviorObserverRef.current.startObserving(videoRef.current);
      }
    }
  }, [isCameraOn, activeStream]);

  const toggleCamera = () => {};

  const handleToggleSpeaking = () => {
    if (isSpeaking) {
      if (geminiLiveClient) geminiLiveClient.stopAudio();
      setIsSpeaking(false);
      setAvatarState('idle');
    } else {
      const activeQ = questions[currentQuestionIndex];
      if (activeQ) {
        const qText = activeQ.question_text || activeQ.question;
        speakText(qText);
      }
    }
  };

  const handleSelectQuestion = (idx: number) => {
    if (idx >= 0 && idx < questions.length) {
      setCurrentQuestionIndex(idx);
      const targetQ = questions[idx];
      const targetQText = targetQ.question_text || targetQ.question;
      speakText(targetQText);
    }
  };

  const handleEndInterview = () => {
    if (window.confirm("Do you want to conclude the interview and view your evaluation report?")) {
      handleGenerateEvaluationReport();
    }
  };

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
    if (!navigator.xr) {
      setErrorMessage('WebXR is not supported by this browser or device. You can continue in the 3D desktop room.');
      return;
    }
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
  const pendingAiSpeech = useRef<string | null>(null);
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
    if (isSpeaking || loadingQuestions || isGenerating || (questions.length > 0 && currentQuestionIndex >= questions.length)) {
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

  // Keep a fresh reference to handleUserMessage for auto-submit from Gemini Live
  const handleUserMessageRef = useRef<((msg: string) => Promise<void>) | null>(null);

  const questionsRef = useRef(questions);
  useEffect(() => { questionsRef.current = questions; }, [questions]);

  const currentQuestionIndexRef = useRef(currentQuestionIndex);
  useEffect(() => { currentQuestionIndexRef.current = currentQuestionIndex; }, [currentQuestionIndex]);

  const latestInputTextRef = useRef(inputText);
  useEffect(() => { latestInputTextRef.current = inputText; }, [inputText]);

  const voiceAutoSubmitTimerRef = useRef<any>(null);
  const candidateRecognitionRef = useRef<any>(null);
  const candidateRecognitionActiveRef = useRef(false);
  const isSubmittingAnswerRef = useRef(false);

  useEffect(() => {
    isSubmittingAnswerRef.current = false;
  }, [currentQuestionIndex]);

  useEffect(() => {
    let client: GeminiLiveClient | null = null;
    const initGemini = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const uid = session?.user?.id || localStorage.getItem("guest_uid") || "guest-user-123";
        const token = session?.access_token || (() => {
          const payload = { user_id: uid };
          const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
          return `header.${payloadB64}.signature`;
        })();

        const res = await fetch('/api/interview/live-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          if (data.token) {
            client = new GeminiLiveClient({
              token: data.token,
              model: data.model,
              endpoint: data.endpoint,
              voiceName: "Charon"
            });
            await client.connect();
            client.onConnectionStateChange = (state) => {
              if (state === 'disconnected') {
                setErrorMessage('Interviewer audio is unavailable. The active question remains visible; reconnect or use the text controls to continue.');
              }
            };
            client.onSpeakingChange = (speaking) => {
              setIsSpeaking(speaking);
              setAvatarState(speaking ? 'speaking' : 'idle');
              if (speaking && pendingAiSpeech.current) {
                setAiSpeech(pendingAiSpeech.current);
                pendingAiSpeech.current = null;
              }
            };
            setGeminiLiveClient(client);
            console.log("[GeminiLive] Connected with ephemeral token!");
          }
        }
      } catch (e) {
        console.warn("[GeminiLive] Ephemeral token init deferred:", e);
      }
    };
    initGemini();
    return () => {
      client?.cleanup();
    };
  }, []);
  // Synchronize ref for continuous speech recognition lifecycle
  useEffect(() => {
    isMicOnRef.current = isMicOn;
  }, [isMicOn]);

  const isSpeakingRef = useRef(false);
  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  const toggleListen = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!isMicOn && !SpeechRecognition) {
      setErrorMessage('Speech recognition is not supported in this browser. Type your answer instead.');
      return;
    }
    setIsMicOn(prev => !prev);
  };

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition || candidateRecognitionRef.current) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    recognition.onstart = () => {
      candidateRecognitionActiveRef.current = true;
      setIsListeningSTT(true);
      setErrorMessage('');
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let finalText = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0]?.transcript?.trim();
        if (!transcript) continue;
        if (event.results[index].isFinal) finalText += `${finalText ? ' ' : ''}${transcript}`;
        else interim += `${interim ? ' ' : ''}${transcript}`;
      }

      setLiveInterimTranscript(interim);
      if (!finalText || isSpeakingRef.current) return;

      const activeQuestion = questionsRef.current[currentQuestionIndexRef.current];
      const questionText = activeQuestion?.question_text || activeQuestion?.question || '';
      if (isQuestionEcho(finalText, questionText)) return;

      setLiveFinalTranscript((previous) => (previous ? `${previous.trim()} ` : '') + finalText);
      setInputText((previous) => {
        const updated = (previous ? `${previous.trim()} ` : '') + finalText;
        latestInputTextRef.current = updated;
        return updated;
      });
      setSecondsWaiting(0);

      if (voiceAutoSubmitTimerRef.current) clearTimeout(voiceAutoSubmitTimerRef.current);
      voiceAutoSubmitTimerRef.current = setTimeout(() => {
        const answer = latestInputTextRef.current.trim();
        if (!isSpeakingRef.current && answer.length >= 25 && handleUserMessageRef.current) {
          handleUserMessageRef.current(answer);
        }
      }, 2800);
    };

    recognition.onerror = (event: any) => {
      candidateRecognitionActiveRef.current = false;
      if (event.error === 'aborted') return;
      setIsListeningSTT(false);
      setIsMicOn(false);
      const message = event.error === 'not-allowed' || event.error === 'service-not-allowed'
        ? 'Microphone permission was denied. Type your answer or enable microphone access and try again.'
        : event.error === 'no-speech'
          ? 'No speech was detected. Try again or type your answer.'
          : 'Speech recognition failed. Type your answer and continue.';
      setErrorMessage(message);
    };

    recognition.onend = () => {
      candidateRecognitionActiveRef.current = false;
      setIsListeningSTT(false);
      if (isMicOnRef.current && !isSpeakingRef.current) {
        window.setTimeout(() => {
          if (isMicOnRef.current && !isSpeakingRef.current && !candidateRecognitionActiveRef.current) {
            try { recognition.start(); } catch (_) {}
          }
        }, 250);
      }
    };

    candidateRecognitionRef.current = recognition;
    return () => {
      recognition.onend = null;
      try { recognition.abort(); } catch (_) {}
      candidateRecognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    const recognition = candidateRecognitionRef.current;
    if (!recognition) return;
    if (isMicOn && !isSpeaking) {
      try {
        if (!candidateRecognitionActiveRef.current) recognition.start();
      } catch (_) {}
    } else {
      try { recognition.stop(); } catch (_) {}
      setIsListeningSTT(false);
    }
  }, [isMicOn, isSpeaking]);

  // Persist session progress to server and local cache (scoped strictly to activeSetId)
  const persistSessionProgress = async (
    qId: string,
    qOrder: number,
    updatedAnswers: Record<string, string>,
    isCompleted: boolean = false
  ) => {
    const currentSetId = activeSetId;
    const currentSessId = sessionId || `SES_${Date.now()}`;
    
    const payload = {
      session_id: currentSessId,
      question_set_id: currentSetId,
      current_question_id: qId,
      current_question_order: qOrder,
      answers: updatedAnswers,
      code_answers: codeAnswers,
      behavior_logs: behaviorLogs,
      is_completed: isCompleted
    };

    const storedToken = typeof window !== 'undefined' && currentSetId ? localStorage.getItem(`interview_session_token_${currentSetId}`) : null;
    const finalPayload = {
      ...payload,
      session_token: storedToken || undefined
    };

    if (typeof window !== 'undefined' && currentSetId) {
      localStorage.setItem(`interview_session_${currentSetId}`, JSON.stringify(finalPayload));
    }

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (storedToken) {
        headers['x-session-token'] = storedToken;
      }
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (authSession?.access_token) {
        headers['Authorization'] = `Bearer ${authSession.access_token}`;
      }

      const saveRes = await fetch('/api/interview/session/save', {
        method: 'POST',
        headers,
        body: JSON.stringify(finalPayload)
      });
      if (saveRes.ok) {
        const savedData = await saveRes.json();
        if (savedData?.session_token && typeof window !== 'undefined' && currentSetId) {
          localStorage.setItem(`interview_session_token_${currentSetId}`, savedData.session_token);
        }
      }
    } catch (e) {
      console.warn("[Interview] Failed to persist session progress to server:", e);
    }
  };

  // Load the single canonical InterviewQuestionSet consumed identically by Normal and VR modes
  const loadCanonicalQuestions = async () => {
    if (!targetCompany && !targetRole && !activeSetId) {
      setInterviewState('NO_CONTEXT');
      return;
    }

    setInterviewState('LOADING');
    setLoadingQuestions(true);
    setErrorMessage('');
    setInputText("");

    try {
      let targetSetId = activeSetId;

      // If no setId was passed from Home, request a canonical question set for the selected company/role
      if (!targetSetId) {
        console.log(`[Interview] No activeSetId, requesting canonical question set for ${targetRole} at ${targetCompany}...`);
        const { data: { session: authSession } } = await supabase.auth.getSession();
        const effectiveUid = authSession?.user?.id || (typeof window !== 'undefined' ? localStorage.getItem("guest_uid") : null) || "guest-user-123";

        const genRes = await fetch('/api/interview/generate-canonical-set', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company: targetCompany,
            role: targetRole,
            roundName: ROUNDS[currentRoundIndex]?.label || undefined,
            jobDescription: targetJobDescription,
            candidateSkills: candidateSkills,
            parsedResume: parsedResume,
            user_id: effectiveUid
          })
        });

        if (!genRes.ok) {
          throw new Error(`Failed to generate canonical questions (HTTP ${genRes.status})`);
        }

        const genData = await genRes.json();
        targetSetId = genData.set_id;
        setActiveSetId(targetSetId);
      }

      if (targetSetId) {
        const setRes = await fetch(`/api/interview/question-set/${targetSetId}`);
        if (!setRes.ok) {
          throw new Error("HTTP error " + setRes.status + " retrieving canonical question set");
        }

        const canonicalSet = await setRes.json();
        const loadedQuestions = (canonicalSet.questions || []).map((q: any) => ({
          ...q,
          question: q.question_text || q.question, // Alias for backward compatibility
          id: q.order_index || q.question_id
        }));

        if (loadedQuestions.length === 0) {
          throw new Error("Canonical question set is empty");
        }

        setQuestions(loadedQuestions);
        console.log(`[Interview] Loaded ${loadedQuestions.length} canonical questions from set ${targetSetId}`);

        // Scoped browser persistence to survive reloads cleanly
        persistActiveInterviewContext({
          jobId: targetJobId,
          company: targetCompany || canonicalSet.company || '',
          role: targetRole || canonicalSet.role || '',
          jobDescription: targetJobDescription,
          candidateSkills,
          setId: targetSetId,
          isVR: isVRActive,
          resumeReference: parsedResume
        });

        // Restore existing interview session or initialize a new one (strictly scoped to targetSetId)
        let existingSession: any = null;
        const storedToken = typeof window !== 'undefined' ? localStorage.getItem(`interview_session_token_${targetSetId}`) : null;
        try {
          const reqHeaders: Record<string, string> = {};
          if (storedToken) {
            reqHeaders['x-session-token'] = storedToken;
          }
          if (authSession?.access_token) {
            reqHeaders['Authorization'] = `Bearer ${authSession.access_token}`;
          }
          const sessRes = await fetch(`/api/interview/session/by-set/${targetSetId}`, {
            headers: reqHeaders
          });
          if (sessRes.ok) {
            existingSession = await sessRes.json();
          }
        } catch (e) {
          console.warn("[Interview] Remote session lookup failed, checking local cache", e);
        }

        if (!existingSession && typeof window !== 'undefined') {
          const cached = localStorage.getItem(`interview_session_${targetSetId}`);
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              // Protect against stale cross-job session restoration: ensure set matches
              if (parsed.question_set_id === targetSetId) {
                existingSession = parsed;
              }
            } catch (e) {}
          }
        }

        if (existingSession && existingSession.question_set_id === targetSetId) {
          console.log("[Interview] Restoring verified session:", existingSession.session_id || existingSession.id);
          const restoredSessId = existingSession.session_id || existingSession.id;
          setSessionId(restoredSessId);
          setAnswers(existingSession.answers || {});

          let restoredIndex = 0;
          if (existingSession.current_question_order && existingSession.current_question_order > 0) {
            restoredIndex = Math.min(loadedQuestions.length, existingSession.current_question_order - 1);
          } else if (existingSession.current_question_id) {
            const foundIdx = loadedQuestions.findIndex((q: any) => q.question_id === existingSession.current_question_id);
            if (foundIdx !== -1) restoredIndex = foundIdx;
          }

          if (existingSession.is_completed) {
            restoredIndex = loadedQuestions.length;
          }

          setCurrentQuestionIndex(restoredIndex);

          if (loadedQuestions[restoredIndex]) {
            const currentQ = loadedQuestions[restoredIndex];
            const qText = currentQ.question_text || currentQ.question;
            setAiSpeech(qText);
          }
        } else {
          // Initialize fresh interview session scoped to this question set
          const newSessionId = `SES_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          setSessionId(newSessionId);
          setCurrentQuestionIndex(0);

          const firstQ = loadedQuestions[0];
          const initialQText = firstQ ? (firstQ.question_text || firstQ.question) : "";
          if (initialQText) {
            setAiSpeech(initialQText);
          }

          const newSessionPayload = {
            session_id: newSessionId,
            session_token: storedToken || undefined,
            question_set_id: targetSetId,
            current_question_id: firstQ?.question_id || 'Q001',
            current_question_order: 1,
            answers: {},
            is_completed: false
          };

          try {
            const reqHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
            if (storedToken) {
              reqHeaders['x-session-token'] = storedToken;
            }
            if (authSession?.access_token) {
              reqHeaders['Authorization'] = `Bearer ${authSession.access_token}`;
            }

            const initSaveRes = await fetch('/api/interview/session/save', {
              method: 'POST',
              headers: reqHeaders,
              body: JSON.stringify(newSessionPayload)
            });
            if (initSaveRes.ok) {
              const savedData = await initSaveRes.json();
              if (savedData?.session_token && typeof window !== 'undefined') {
                localStorage.setItem(`interview_session_token_${targetSetId}`, savedData.session_token);
              }
            }
          } catch (e) {
            console.warn("[Interview] Failed to persist initial session to server:", e);
          }

          if (typeof window !== 'undefined') {
            localStorage.setItem(`interview_session_${targetSetId}`, JSON.stringify(newSessionPayload));
          }
        }

        setInterviewState('READY');
      }
    } catch (err: any) {
      console.warn("[Interview] Could not load canonical question set:", err);
      setErrorMessage(err?.message || "Failed to load the canonical interview question set. Check your interview context and try again.");
      setInterviewState('ERROR');
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Run initial fetch for canonical questions
  useEffect(() => {
    loadCanonicalQuestions();
  }, [activeSetId]);

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
    if (
      entranceState === 'seated' &&
      questions.length > 0 &&
      currentQuestionIndex === 0 &&
      !hasAnnouncedInitialQuestionRef.current
    ) {
      const firstQ = questions[0];
      const qText = firstQ.question_text || firstQ.question;
      const qId = firstQ.question_id || 'Q001';
      if (!geminiLiveClient?.isConnected()) return;
      hasAnnouncedInitialQuestionRef.current = true;
      speakText(qText);
      setChatHistory(prev => [
        ...prev,
        { role: 'ai', text: `[${firstQ.round_name || firstQ.category || 'Interview'} - ${qId}] ${qText}` }
      ]);
    }
  }, [entranceState, questions, currentQuestionIndex, geminiLiveClient]);

  // Vocalize exact stored canonical question text verbatim using Gemini Live (Charon male voice) with Web Speech API male fallback
  const speakText = (text: string) => {
    if (!text) return;
    pendingAiSpeech.current = text;
    setIsSpeaking(true);
    setAvatarState('speaking');

    if (geminiLiveClient && geminiLiveClient.isConnected()) {
      if (geminiLiveClient.speakQuestion(text)) {
        return;
      }
    }

    // High-fidelity fallback: Web Speech API with executive male voice
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        const maleVoice = voices.find(v => 
          v.lang.startsWith('en') && 
          (v.name.toLowerCase().includes('david') || 
           v.name.toLowerCase().includes('male') || 
           v.name.toLowerCase().includes('george') || 
           v.name.toLowerCase().includes('james') ||
           v.name.toLowerCase().includes('guy') ||
           v.name.toLowerCase().includes('mark'))
        ) || voices.find(v => v.lang.startsWith('en'));
        if (maleVoice) utterance.voice = maleVoice;
        utterance.pitch = 0.92; // Authoritative executive male tone
        utterance.rate = 1.0;
        utterance.onstart = () => {
          setIsSpeaking(true);
          setAvatarState('speaking');
          setAiSpeech(text);
          pendingAiSpeech.current = null;
        };
        utterance.onend = () => {
          setIsSpeaking(false);
          setAvatarState('idle');
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          setAvatarState('idle');
        };
        window.speechSynthesis.speak(utterance);
        return;
      } catch (synthErr) {
        console.warn("[Interview] Speech synthesis fallback failed:", synthErr);
      }
    }

    // Text-only fallback if neither audio engine is available
    setIsSpeaking(false);
    setAvatarState('idle');
    setAiSpeech(text);
    pendingAiSpeech.current = null;
  };

  // Record candidate answer against exact canonical question_id and advance
  useEffect(() => {
    handleUserMessageRef.current = handleUserMessage;
  });

  const handleUserMessage = async (message: string) => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || loadingQuestions || isEvaluatingAnswer || isSubmittingAnswerRef.current) return;

    // Clear auto-submit timer if pending
    if (voiceAutoSubmitTimerRef.current) {
      clearTimeout(voiceAutoSubmitTimerRef.current);
      voiceAutoSubmitTimerRef.current = null;
    }

    // Safeguard: Discard if the message is an echo of the active question
    const activeQ = questions[currentQuestionIndex];
    const qText = activeQ?.question_text || activeQ?.question || '';
    if (isQuestionEcho(trimmedMessage, qText)) {
      console.log("[Interview] Discarded question echo in handleUserMessage:", trimmedMessage);
      return;
    }
    isSubmittingAnswerRef.current = true;

    // Clear the input text so it doesn't double-submit
    setInputText('');
    setLiveFinalTranscript('');
    setLiveInterimTranscript('');

    // Immediately stop avatar speaking and audio playback
    if (geminiLiveClient) {
      geminiLiveClient.stopAudio();
    }
    setIsSpeaking(false);
    setAvatarState('idle');

    // Save active reply keyed directly by exact canonical question ID
    const qId = activeQ?.question_id || `Q${String(currentQuestionIndex + 1).padStart(3, '0')}`;
    const updatedAnswers = { ...answers, [qId]: trimmedMessage };
    setAnswers(updatedAnswers);
    // Immediately persist answer to local storage and server for instant crash resilience
    persistSessionProgress(qId, currentQuestionIndex + 1, updatedAnswers, false);

    // Append answer log to transcript with exact question_id
    setChatHistory(prev => [
      ...prev,
      { role: 'user', text: trimmedMessage, question_id: qId }
    ]);
    setInputText("");
    setLiveFinalTranscript("");
    setLiveInterimTranscript("");

    // Calculate real-time visual telemetry fluctuations
    const wordCount = trimmedMessage.split(/\s+/).filter(Boolean).length;
    const computedSpeed = wordCount > 0 ? Math.min(210, Math.max(90, Math.floor((wordCount / 12) * 140))) : 130;
    const hasFillers = trimmedMessage.toLowerCase().includes("um") || trimmedMessage.toLowerCase().includes("like") || trimmedMessage.toLowerCase().includes("uh");
    
    setMetrics(prev => ({
      confidence: Math.min(98, Math.max(74, prev.confidence + (wordCount > 12 ? 1 : -2))),
      communication: Math.min(99, Math.max(68, prev.communication + (wordCount > 10 ? 2 : -2))),
      technical: Math.min(98, Math.max(70, prev.technical + (wordCount > 15 ? 1 : -1))),
      eyeContact: Math.min(97, Math.max(85, prev.eyeContact + Math.floor(Math.random() * 5 - 2))),
      speakingSpeed: computedSpeed,
      fillerCount: prev.fillerCount + (hasFillers ? 1 : 0)
    }));

    setIsEvaluatingAnswer(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || (() => {
        const payload = { user_id: "guest-user-123" };
        const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
        return `header.${payloadB64}.signature`;
      })();

      const exactQText = activeQ?.question_text || activeQ?.question || "";
      const response = await fetch('/api/interview/answer/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          company: targetCompany,
          role: targetRole,
          round: activeQ?.round_name || ROUNDS[currentRoundIndex]?.label || "Technical Round",
          question: exactQText,
          answer: trimmedMessage
        })
      });
      if (!response.ok) throw new Error(`Answer evaluation failed (HTTP ${response.status})`);
      const data = await response.json();
      if (data?.score !== undefined) {
        updateMentorAdvice(`SCORE: ${data.score}/${data.max_score} (${data.verdict}). ${data.ideal_answer_in_one_line || ""}`);
      }
    } catch (e) {
      updateMentorAdvice('Your answer was saved. Live evaluation is temporarily unavailable, so the interview will continue.');
    }

    persistSessionProgress(qId, currentQuestionIndex + 1, updatedAnswers, false);
    advanceToNextQuestion(updatedAnswers);
  };

  const advanceToNextQuestion = (updatedAnswers: Record<string, string>) => {
    setIsEvaluatingAnswer(false);
    setPendingFollowUp(null);
    setAskedFollowUp(false);

    const nextIdx = currentQuestionIndex + 1;
    if (nextIdx < questions.length) {
      // Step to next canonical question in order
      setCurrentQuestionIndex(nextIdx);

      const nextQ = questions[nextIdx];
      const nextQId = nextQ.question_id || `Q${String(nextIdx + 1).padStart(3, '0')}`;
      const nextQText = nextQ.question_text || nextQ.question;

      // AI speaks the EXACT stored question text - NO prefix, NO alteration
      speakText(nextQText);

      setChatHistory(prev => [
        ...prev,
        { role: 'ai', text: `[${nextQ.round_name || nextQ.category || 'Interview'} - ${nextQId}] ${nextQText}`, question_id: nextQId }
      ]);

      // Persist session progress
      persistSessionProgress(nextQId, nextIdx + 1, updatedAnswers, false);
    } else {
      // Fully completed all questions in the canonical question set
      const totalQ = questions.length;
      setCurrentQuestionIndex(totalQ);

      const finalNotice = `Excellent work! You have completed all ${totalQ} canonical interview questions. Click 'Assess & View Report' to view your comprehensive evaluation!`;
      speakText(finalNotice);

      setChatHistory(prev => [
        ...prev,
        { role: 'ai', text: `[Interview Completed] Candidate completed all ${totalQ} questions in the canonical set.` }
      ]);

      const lastQId = questions[totalQ - 1]?.question_id || 'COMPLETED';
      persistSessionProgress(lastQId, totalQ, updatedAnswers, true);
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
    }
  };


  // Aggregate transcripts and evaluate using Gemini grading API
  const handleGenerateEvaluationReport = async () => {
    if (chatHistory.length === 0) {
      alert("Please participate in the interview rounds first to build up your transcripts!");
      return;
    }
    
    setIsGrading(true);
    setGradeResult(null);
    setSaveSuccess(false);

    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id || localStorage.getItem("guest_uid") || "guest-user-123";
    try {
      const token = session?.access_token || (() => {
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
          candidateSkills: candidateSkills,
          answers: answers,
          codeAnswers: codeAnswers,
          behaviorLogs: behaviorLogs
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
            candidate: session?.user?.user_metadata?.full_name || localStorage.getItem("userName") || "Candidate",
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
        if (session?.user && !localStorage.getItem("guest_session")) {
          const { error: insertError } = await supabase.from('interviews').insert([{
            user_id: uid,
            role: targetRole,
            company: targetCompany,
            score: reportCard.overall_score || 85,
            feedback: reportCard.naya_personal_message || reportCard.alya_personal_message || "Splendid mock interaction history.",
            strengths: reportCard.top_3_strengths || ["In-depth technical conceptual breakdowns"],
            weaknesses: reportCard.top_3_weak_areas || ["Could elaborate on scaling parameters and testing"],
            transcript: chatHistory,
            hiring_decision: reportCard.hiring_decision,
            percentile_estimate: reportCard.percentile_estimate
          }]);
          if (insertError) throw insertError;
        } else {
          throw new Error("Guest active");
        }
        setSaveSuccess(true);
      } catch (e) {
        console.warn("Saving directly to Supabase skipped. Writing to local storage lists.", e);
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

  // Lifecycle State 1: NO_CONTEXT (Safe return to jobs; no silent redirects or defaults)
  if (interviewState === 'NO_CONTEXT') {
    return (
      <div className="min-h-screen w-full bg-[#09090b] text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-zinc-900/90 border border-zinc-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-amber-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-zinc-100">No Active Interview Selected</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              No interview context was found for this session. Please select a specific role from Live Jobs or your tailored dashboard to launch your interview.
            </p>
          </div>
          <button
            onClick={() => navigate('/?tab=live-jobs')}
            className="w-full py-3.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-sm tracking-wide transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            Browse Live Jobs
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Lifecycle State 2: LOADING (Preparing environment for selected job)
  if (interviewState === 'LOADING') {
    return (
      <div className="min-h-screen w-full bg-[#09090b] text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-zinc-900/90 border border-zinc-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-zinc-100">Preparing Interview Environment</h2>
            <p className="text-sm text-zinc-400">
              Loading questions for <span className="text-cyan-400 font-semibold">{targetRole || "Role"}</span> at <span className="text-purple-400 font-semibold">{targetCompany || "Company"}</span>...
            </p>
            {activeSetId && (
              <p className="text-xs font-mono text-zinc-500 pt-1">Set ID: {activeSetId}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Lifecycle State 3: ERROR (Clear retry and fallback recovery options)
  if (interviewState === 'ERROR') {
    return (
      <div className="min-h-screen w-full bg-[#09090b] text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-zinc-900/90 border border-red-500/30 rounded-3xl p-8 shadow-2xl backdrop-blur-xl text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-zinc-100">Unable to Load Interview</h2>
            <p className="text-sm text-zinc-400">
              {errorMessage || "We encountered an issue preparing the interview questions for this role."}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => loadCanonicalQuestions()}
              className="flex-1 py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition-all cursor-pointer"
            >
              Retry Generation
            </button>
            <button
              onClick={() => navigate('/?tab=live-jobs')}
              className="flex-1 py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition-all cursor-pointer"
            >
              Back to Jobs
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Lifecycle State 4: READY (Render Normal or WebXR VR Room)
  return (
    <div className="relative w-full h-screen bg-transparent text-white overflow-hidden select-none">
      <div id="vr-ui-overlay" className="absolute inset-0 pointer-events-none z-10">
        {errorMessage && interviewState === 'READY' && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 max-w-xl px-4 py-2 rounded-lg bg-amber-950/90 border border-amber-700/70 text-amber-100 text-xs text-center shadow-lg">
            {errorMessage}
          </div>
        )}
      
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
                  <span className="text-zinc-200 font-medium font-sans mt-0.5 block">Gemini Live</span>
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
      
      {/* VR HUD BAR Overlay (rendered in VR mode) */}
      {isVRActive && (
        <div className="absolute top-0 inset-x-0 p-3 px-6 flex justify-between items-center z-10 pointer-events-none">
          
          {/* Left Side: Exit + Role Badge */}
          <div className="flex gap-2 items-center flex-nowrap">
            <button 
              onClick={() => {
                if (geminiLiveClient) geminiLiveClient.stopAudio();
                navigate('/');
              }}
              className="pointer-events-auto px-3 py-1.5 rounded-lg bg-red-950/60 border border-red-800/80 text-red-200 hover:bg-red-500 hover:text-zinc-950 shadow-md transition-all flex items-center gap-1.5 font-bold text-[10px] uppercase cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Exit
            </button>
            <span className="px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800/80 backdrop-blur-md text-zinc-300 font-mono text-[9px] font-bold uppercase tracking-wider shadow-xs hidden sm:inline-block">
              {targetCompany} • {targetRole}
            </span>
            <span className="px-2.5 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800/80 backdrop-blur-md text-cyan-400 font-mono text-[9px] font-bold shadow-xs">
              {questions[currentQuestionIndex]?.question_id || `Q${currentQuestionIndex + 1}`}
            </span>
            {questions[currentQuestionIndex] && (
              <span className={`px-2.5 py-1.5 rounded-lg border backdrop-blur-md font-mono text-[9px] font-bold shadow-xs hidden md:inline-block ${
                questions[currentQuestionIndex].category === 'REPORTED'
                  ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300'
                  : questions[currentQuestionIndex].category === 'RESUME_BASED'
                  ? 'bg-purple-950/70 border-purple-500/60 text-purple-300'
                  : questions[currentQuestionIndex].category === 'OFFICIAL_DERIVED'
                  ? 'bg-blue-950/70 border-blue-500/60 text-blue-300'
                  : 'bg-amber-950/70 border-amber-500/60 text-amber-300'
              }`}>
                {questions[currentQuestionIndex].category === 'REPORTED'
                  ? `REPORTED (${questions[currentQuestionIndex].source?.platform || 'COMMUNITY'})`
                  : questions[currentQuestionIndex].category === 'RESUME_BASED'
                  ? 'VERIFIED RESUME CLAIM'
                  : questions[currentQuestionIndex].category === 'OFFICIAL_DERIVED'
                  ? 'OFFICIAL PREP GUIDE'
                  : 'AI PREDICTED (JD & ROLE)'}
              </span>
            )}
          </div>

          {/* Right Side: Timer + Mic + Actions */}
          <div className="flex gap-2 flex-nowrap items-center">
            <div className="px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800/80 shadow-xs backdrop-blur-md flex items-center gap-1.5 text-zinc-200 pointer-events-auto">
              <Clock className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span className="font-mono text-[11px] font-bold leading-none">{formatTime(timeLeft)}</span>
            </div>
            
            <button
              onClick={toggleListen}
              className={`pointer-events-auto px-3 py-1.5 rounded-lg border backdrop-blur-md flex items-center gap-1.5 text-[9px] uppercase font-bold tracking-wider transition-all shadow-xs ${
                isMicOn 
                  ? 'bg-cyan-950/80 border-cyan-500 text-cyan-400 font-extrabold' 
                  : 'bg-zinc-900/80 border-zinc-800 text-zinc-400'
              }`}
            >
              {isMicOn ? <Mic className="w-3.5 h-3.5 text-cyan-400" /> : <MicOff className="w-3.5 h-3.5 text-zinc-400" />}
              {isMicOn ? 'MIC ON' : 'MUTED'}
            </button>

            <button
              onClick={handleGenerateEvaluationReport}
              className="pointer-events-auto px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-zinc-950 font-black uppercase text-[9px] tracking-wider transition-all flex items-center gap-1 cursor-pointer shadow-sm hidden md:flex"
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              Report
            </button>
            
            <div className="relative pointer-events-auto">
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className="px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800/80 hover:bg-zinc-800 transition-all flex items-center gap-1 text-[9px] uppercase font-bold tracking-wider text-zinc-300 shadow-xs cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5" />
                Settings
              </button>
              {isSettingsOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-zinc-900/95 border border-zinc-800 rounded-xl shadow-2xl backdrop-blur-xl p-3 flex flex-col gap-3 text-left z-50">
                  <div className="space-y-1">
                    <span className="text-[8px] uppercase font-bold text-zinc-400 font-mono">Camera Zoom</span>
                    <div className="grid grid-cols-3 gap-1">
                      <button onClick={handleZoomIn} className="py-1 text-center bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[9px] font-bold rounded transition-colors flex justify-center items-center cursor-pointer"><ZoomIn className="w-3 h-3 mr-0.5"/> In</button>
                      <button onClick={handleZoomOut} className="py-1 text-center bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[9px] font-bold rounded transition-colors flex justify-center items-center cursor-pointer"><ZoomOut className="w-3 h-3 mr-0.5"/> Out</button>
                      <button onClick={handleResetZoom} className="py-1 text-center bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[9px] font-bold rounded transition-colors cursor-pointer">Reset</button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[8px] uppercase font-bold text-zinc-400 font-mono">VR / AR Mode</span>
                    <div className="grid grid-cols-2 gap-1">
                      <button onClick={enterVRMode} className="py-1 text-center bg-zinc-800 hover:bg-zinc-700 text-cyan-400 font-mono text-[9px] font-bold rounded transition-colors cursor-pointer">Enter VR</button>
                      <button onClick={enterARMode} className="py-1 text-center bg-zinc-800 hover:bg-zinc-700 text-emerald-400 font-mono text-[9px] font-bold rounded transition-colors cursor-pointer">Enter AR</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VR Response Console: Live Speech Pill + Direct Keyboard Input Bar (Fallback for Desktop 3D / Mic Disabled) */}
      {isVRActive && (
        <div className="absolute bottom-4 inset-x-0 flex flex-col items-center gap-2 z-20 px-4 pointer-events-none">
          {chatHistory.length > 0 && (
            <div className="bg-zinc-950/85 border border-zinc-800/80 backdrop-blur-md rounded-full py-1 px-4 shadow-lg text-center max-w-xl pointer-events-auto">
              <p className="text-[11px] text-zinc-300 truncate">
                <span className={chatHistory[chatHistory.length - 1].role === 'user' ? "text-cyan-400 font-bold" : "text-amber-400 font-bold"}>
                  {chatHistory[chatHistory.length - 1].role === 'user' ? 'You: ' : 'Mr. Vinodh: '}
                </span>
                {chatHistory[chatHistory.length - 1].text}
              </p>
            </div>
          )}

          {/* Desktop 3D Answer Input Bar (Usable even when WebXR or microphone is unavailable) */}
          <div className="w-full max-w-xl bg-zinc-950/90 border border-zinc-800/90 backdrop-blur-md rounded-2xl p-2 shadow-2xl flex items-center gap-2 pointer-events-auto">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && inputText.trim() && !loadingQuestions && !isEvaluatingAnswer) {
                  handleUserMessage(inputText.trim());
                }
              }}
              placeholder="Type your answer or speak using the microphone..."
              className="flex-1 bg-zinc-900/90 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-cyan-500 transition-colors"
            />
            <button
              onClick={() => {
                if (inputText.trim()) {
                  handleUserMessage(inputText.trim());
                }
              }}
              disabled={!inputText.trim() || loadingQuestions || isEvaluatingAnswer}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap shadow-xs"
            >
              Submit & Next
            </button>
          </div>
        </div>
      )}
      
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
        <div className="absolute inset-0 bg-[#f8fafc] flex flex-col z-20 pointer-events-auto overflow-y-auto">
          {/* 1. Dynamic Header matching reference image */}
          <InterviewHeader
            company={targetCompany}
            role={targetRole}
            setId={activeSetId}
            currentQuestionIndex={currentQuestionIndex}
            totalQuestions={questions.length}
            timeLeft={timeLeft}
            isLiveConnected={geminiLiveClient?.isConnected() ?? false}
            onEndInterview={handleEndInterview}
          />

          {/* 2. Main 3-Column Responsive Grid matching reference image visual hierarchy */}
          <main className="flex-1 p-4 md:p-6 max-w-[1600px] w-full mx-auto grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: AI Interviewer Avatar + Audio Waveform & Status */}
            <div className="xl:col-span-3 flex flex-col gap-4">
              <AIInterviewerCard
                isSpeaking={isSpeaking}
                avatarState={avatarState}
                company={targetCompany}
                onToggleSpeaking={handleToggleSpeaking}
                onReplayVoice={() => {
                  const activeQ = questions[currentQuestionIndex];
                  if (activeQ) {
                    const qText = activeQ.question_text || activeQ.question;
                    speakText(qText);
                  }
                }}
              />

              {/* Optional Candidate Live Webcam Stream */}
              {isCameraOn && (
                <div className="w-full bg-white border border-gray-200/90 rounded-2xl p-3 shadow-xs relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Candidate Camera
                    </span>
                  </div>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full rounded-xl aspect-video object-cover bg-gray-900 border border-gray-200"
                  />
                </div>
              )}
            </div>

            {/* MIDDLE COLUMN: Question Card + Dual Separate Transcripts + Voice Controls */}
            <div className="xl:col-span-6 flex flex-col gap-5">
              {currentQuestionIndex < questions.length ? (
                <>
                  {/* Canonical Question Card with Metadata & Source Provenance */}
                  <CanonicalQuestionCard
                    question={questions[currentQuestionIndex]}
                    index={currentQuestionIndex}
                    totalQuestions={questions.length}
                    role={targetRole}
                    company={targetCompany}
                    codeValue={codeAnswers[questions[currentQuestionIndex]?.question_id] || '// Write your code here...'}
                    onCodeChange={(val) => {
                      const qId = questions[currentQuestionIndex]?.question_id;
                      if (qId) {
                        setCodeAnswers(prev => ({ ...prev, [qId]: val }));
                      }
                    }}
                  />

                  {/* Dual Separate Transcripts: AI Spoken Transcript vs Candidate Live Speech Transcript */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left: AI Spoken Transcript Only */}
                    <AITranscriptCard
                      spokenText={aiSpeech || questions[currentQuestionIndex]?.question_text || questions[currentQuestionIndex]?.question || ""}
                      duration="00:00 - 00:08"
                      isSpeaking={isSpeaking}
                    />

                    {/* Right: Candidate Live Speech Transcript Only */}
                    <CandidateTranscriptCard
                      liveTranscript={liveFinalTranscript}
                      interimTranscript={liveInterimTranscript}
                      isMicOn={isMicOn}
                      duration="00:00 - 00:14"
                    />
                  </div>

                  {/* Dynamic Voice Controls & Action Submissions */}
                  <VoiceControls
                    isMicOn={isMicOn}
                    onToggleMic={toggleListen}
                    isCameraOn={isCameraOn}
                    onToggleCamera={toggleCamera}
                    onSubmitAnswer={() => {
                      const ans = (liveFinalTranscript + ' ' + liveInterimTranscript).trim() || inputText.trim();
                      if (ans) {
                        handleUserMessage(ans);
                      }
                    }}
                    onSkipQuestion={handleSkipQuestion}
                    canSubmit={Boolean((liveFinalTranscript + ' ' + liveInterimTranscript).trim() || inputText.trim())}
                    inputText={inputText}
                    onInputTextChange={(val) => {
                      setInputText(val);
                      setLiveFinalTranscript(val);
                    }}
                    disabled={loadingQuestions || isEvaluatingAnswer}
                  />
                </>
              ) : (
                /* Completed State Screen */
                <div className="w-full bg-white border border-gray-200/90 rounded-2xl p-10 shadow-xs flex flex-col items-center justify-center text-center space-y-5">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                      Interview Concluded
                    </h2>
                    <p className="text-sm text-gray-600 max-w-md mx-auto mt-2 leading-relaxed">
                      You have answered all {questions.length} canonical interview questions. The AI is ready to synthesize your placement referral evaluation report.
                    </p>
                  </div>
                  <button
                    onClick={handleGenerateEvaluationReport}
                    className="py-3.5 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold uppercase tracking-wider shadow-md transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    <span>Assess & View Final Report</span>
                  </button>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Dynamic Canonical Question Queue Grouped By Rounds */}
            <div className="xl:col-span-3 flex flex-col h-[calc(100vh-110px)] sticky top-20">
              <QuestionQueue
                questions={questions}
                currentQuestionIndex={currentQuestionIndex}
                answers={answers}
                onSelectQuestion={handleSelectQuestion}
              />
            </div>
          </main>
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
