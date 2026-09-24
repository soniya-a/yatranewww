import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Upload, ArrowRight, FileText, 
  ChevronDown, Loader2, 
  ExternalLink, CheckCircle, Check, X, Shield, 
  Briefcase, Search, MapPin, Clock, Settings, 
  Target, BarChart3, MessageSquare, BookOpen, Sparkles,
  ChevronLeft, Monitor, Headphones, Mic, Users, Zap,
  TrendingUp, AlertTriangle, Lock
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { db, auth, getDocsWithTimeout } from "../lib/firebase";
import { collection, query, where } from "firebase/firestore";
import { LiveJobsView } from "../components/LiveJobsView";
import { CandidateProfile } from "../types/candidateProfile";
import { buildCanonicalProfile } from "../lib/profile/candidateProfileBuilder";

// ── Interfaces (preserved exactly from original) ──────────────────────────────

interface RoadmapCourse {
  title: string;
  platform: string;
  link: string;
}

interface CareerRoadmap {
  id?: string;
  roadmap_title: string;
  student_name: string;
  target: string;
  start_message: string;
  weeks: {
    week_number: number;
    theme: string;
    goal: string;
    days: {
      day: number;
      topic: string;
      what_to_do: string;
      resource_name: string;
      resource_type: string;
      estimated_time: string;
      done?: boolean;
    }[];
  }[];
  milestones: {
    day: number;
    milestone: string;
    how_to_check: string;
  }[];
  daily_routine: {
    morning_30min: string;
    evening_90min: string;
  };
  final_week_checklist: string[];
  confidence_message: string;
  createdAt?: number;
}

interface MatchedCompany {
  company: string;
  role: string;
  matchScore: string;
  reason: string;
}

interface ParsedResume {
  skills: string[];
  matchingRoles: string[];
  matchingCompanies: MatchedCompany[];
}

interface SavedInterviewReport {
  id: string;
  userId: string;
  role: string;
  company: string;
  createdAt: number;
  score: number;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
  transcript?: { role: string; text: string }[];
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Home() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── State (all preserved from original) ──────────────────────────────────

  // Resume & Parsing
  const [resumeInput, setResumeInput] = useState("");
  const [candidateSkills, setCandidateSkills] = useState("");
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [parseResult, setParseResult] = useState<any>(null);
  const [mlParseResult, setMlParseResult] = useState<any>(null);
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [aiThinkingStep, setAiThinkingStep] = useState(0);
  const [aiThinkingProgress, setAiThinkingProgress] = useState("");
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Company & Role Selection
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [showDeepMatchModal, setShowDeepMatchModal] = useState(false);
  const [deepMatchResult, setDeepMatchResult] = useState<any>(null);
  const [isMatchingCompanies, setIsMatchingCompanies] = useState(false);

  // Roadmap
  const [selectedDuration, setSelectedDuration] = useState("30 days");
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);
  const [generatedRoadmap, setGeneratedRoadmap] = useState<CareerRoadmap | null>(null);
  const [savedRoadmaps, setSavedRoadmaps] = useState<CareerRoadmap[]>([]);
  const [roadmapError, setRoadmapError] = useState<string | null>(null);
  const [isSavingRoadmap, setIsSavingRoadmap] = useState(false);
  const [savedReports, setSavedReports] = useState<SavedInterviewReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  // Tab navigation
  const [activeTab, setActiveTab] = useState<"home" | "resume" | "live-jobs" | "interview" | "roadmap">("home");

  // Interview prep sub-views
  const [interviewSubView, setInterviewSubView] = useState<"prep" | "mode">("prep");
  const [selectedJobForInterview, setSelectedJobForInterview] = useState<any>(null);
  const [interviewSession, setInterviewSession] = useState<any>(null);
  const [isLoadingInterview, setIsLoadingInterview] = useState(false);

  // ── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const handleDeviceCheck = () => {
      setUserEmail(auth.currentUser?.email || localStorage.getItem("guest_email") || "Student");
      setIsMobile(window.innerWidth < 1024);
    };
    handleDeviceCheck();
    window.addEventListener("resize", handleDeviceCheck);
    return () => window.removeEventListener("resize", handleDeviceCheck);
  }, []);

  useEffect(() => {
    fetchSavedRoadmaps();
    fetchInterviewReports();
  }, []);

  // ── Business Logic Handlers (all preserved exactly) ──────────────────────

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileProcessing(files[0]);
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileProcessing(files[0]);
    }
  };

  const handleFileProcessing = async (file: File) => {
    // 1. Immediately clear any prior candidate profile state before processing the new document
    setParseResult(null);
    setMlParseResult(null);
    setCandidateSkills("");
    setSelectedCompany("");
    setSelectedRole("");
    setResumeInput("");
    setParseError(null);

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'txt' || ext === 'md' || ext === 'json' || ext === 'csv' || ext === 'rtf') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = (event.target?.result as string) || "";
        setResumeInput(text);
        setParseError(null);
        handleParseResume(text);
      };
      reader.readAsText(file);
    } else if (ext === 'pdf') {
      // 2. Validate actual binary file bytes (PDF magic bytes: %PDF -> 0x25, 0x50, 0x44, 0x46)
      try {
        const headerSlice = await file.slice(0, 1024).arrayBuffer();
        const bytes = new Uint8Array(headerSlice);

        let isPdfMagic = false;
        for (let i = 0; i <= bytes.length - 4; i++) {
          if (
            bytes[i] === 0x25 &&     // %
            bytes[i + 1] === 0x50 && // P
            bytes[i + 2] === 0x44 && // D
            bytes[i + 3] === 0x46    // F
          ) {
            isPdfMagic = true;
            break;
          }
        }

        if (!isPdfMagic) {
          setIsParsingResume(false);
          setAiThinkingStep(0);
          setParseError("The selected file is not a valid PDF document. Please upload the original PDF file.");
          return;
        }
      } catch (validationErr) {
        setIsParsingResume(false);
        setAiThinkingStep(0);
        setParseError("The selected file is not a valid PDF document. Please upload the original PDF file.");
        return;
      }

      // 3. Genuine PDF validation passed -> proceed with existing extraction flow
      setIsParsingResume(true);
      setParseError(null);
      setAiThinkingStep(1);
      setAiThinkingProgress("Uploading PDF and extracting text...");

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const base64 = event.target?.result as string;
          const uid = auth.currentUser?.uid || localStorage.getItem("guest_uid") || "guest-user-123";
          const token = (auth.currentUser ? await auth.currentUser.getIdToken() : null) || (() => {
            const payload = { user_id: uid };
            const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
            return `header.${payloadB64}.signature`;
          })();

          const extractRes = await fetch("/api/resume/extract-pdf", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ pdfBase64: base64, filename: file.name })
          });

          const extractData = await extractRes.json();

          if (!extractRes.ok || !extractData.success || !extractData.text) {
            // Extraction failure: ensure profile state is cleared
            setParseResult(null);
            setMlParseResult(null);
            setCandidateSkills("");
            setSelectedCompany("");
            setSelectedRole("");
            setResumeInput("");
            setIsParsingResume(false);
            setAiThinkingStep(0);
            const errMsg = extractData.error?.message || "We couldn't read the text from this PDF. Try pasting the resume text instead.";
            setParseError(errMsg);
            return;
          }

          const extractedText = extractData.text;
          setResumeInput(extractedText);
          setParseError(null);
          handleParseResume(extractedText);
        } catch (err: any) {
          setParseResult(null);
          setMlParseResult(null);
          setCandidateSkills("");
          setSelectedCompany("");
          setSelectedRole("");
          setResumeInput("");
          setIsParsingResume(false);
          setAiThinkingStep(0);
          setParseError("We couldn't read this PDF. Try pasting the resume text instead.");
        }
      };
      reader.readAsDataURL(file);
    } else {
      setParseError("Unsupported file format. Please upload a PDF (.pdf) or plain text (.txt).");
    }
  };

  const fetchSavedRoadmaps = async () => {
    const uid = auth.currentUser?.uid || localStorage.getItem("guest_uid") || "guest-user-123";
    try {
      if (auth.currentUser && !localStorage.getItem("guest_session")) {
        const q = query(collection(db, "roadmaps"), where("userId", "==", uid));
        const snap = await getDocsWithTimeout(q);
        const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() })) as CareerRoadmap[];
        loaded.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setSavedRoadmaps(loaded);
      } else {
        const local = localStorage.getItem(`roadmaps_${uid}`);
        if (local) setSavedRoadmaps(JSON.parse(local));
      }
    } catch (e) {
      const local = localStorage.getItem(`roadmaps_${uid}`);
      if (local) setSavedRoadmaps(JSON.parse(local));
    }
  };

  const fetchInterviewReports = async () => {
    setIsLoadingReports(true);
    const uid = auth.currentUser?.uid || localStorage.getItem("guest_uid") || "guest-user-123";
    try {
      if (auth.currentUser && !localStorage.getItem("guest_session")) {
        const q = query(collection(db, "interviews"), where("userId", "==", uid));
        const snap = await getDocsWithTimeout(q);
        const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() })) as SavedInterviewReport[];
        loaded.sort((a, b) => b.createdAt - a.createdAt);
        setSavedReports(loaded);
      } else {
        const local = localStorage.getItem(`interviews_${uid}`);
        if (local) setSavedReports(JSON.parse(local));
      }
    } catch (e) {
      const local = localStorage.getItem(`interviews_${uid}`);
      if (local) setSavedReports(JSON.parse(local));
    } finally {
      setIsLoadingReports(false);
    }
  };

  const handleParseResume = async (overrideText?: string) => {
    const textToParse = overrideText !== undefined ? overrideText : resumeInput;
    if (!textToParse.trim()) return;
    setIsParsingResume(true);
    setParseError(null);
    setParseResult(null);

    const steps = [
      { step: 1, text: "Extracting skills and competencies..." },
      { step: 2, text: "Detecting domain and experience..." },
      { step: 3, text: "Matching against role templates..." },
      { step: 4, text: "Building your profile..." }
    ];

    steps.forEach((s, i) => {
      setTimeout(() => {
        setAiThinkingStep(s.step);
        setAiThinkingProgress(s.text);
      }, i * 150);
    });

    try {
      const uid = auth.currentUser?.uid || localStorage.getItem("guest_uid") || "guest-user-123";
      const token = (auth.currentUser ? await auth.currentUser.getIdToken() : null) || (() => {
        const payload = { user_id: uid };
        const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
        return `header.${payloadB64}.signature`;
      })();

      const [parseRes, parseMlRes] = await Promise.all([
        fetch("/api/resume/parse", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ resumeText: textToParse })
        }),
        fetch("/api/resume/parse-ml", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ resumeText: textToParse })
        })
      ]);

      if (!parseRes.ok) {
        let errMessage = "Resume analysis failed. Please try again.";
        try {
          const errData = await parseRes.json();
          if (errData?.error) errMessage = typeof errData.error === "string" ? errData.error : JSON.stringify(errData.error);
        } catch (_) {}
        throw new Error(errMessage);
      }

      const data = await parseRes.json();
      if (!data || !Array.isArray(data.skills) || data.skills.length === 0) {
        throw new Error("No skills could be identified. Please verify the document has readable competencies.");
      }

      let mlData = null;
      if (parseMlRes.ok) {
        try {
          mlData = await parseMlRes.json();
        } catch (_) {}
      }

      setParseError(null);
      setTimeout(() => {
        setParseResult(data);
        if (mlData) {
          setMlParseResult(mlData);
        }
        // Establish single source of truth canonical profile
        const canonical = buildCanonicalProfile(data, mlData, textToParse);
        setCandidateProfile(canonical);

        if (data.skills && data.skills.length > 0) {
          setCandidateSkills(data.skills.join(", "));
        }
        if (data.matchingCompanies && data.matchingCompanies.length > 0) {
          setSelectedRole(data.matchingCompanies[0].role);
          setSelectedCompany(data.matchingCompanies[0].company);
        }
      }, 600);

    } catch (error: any) {
      console.error("Resume analysis failed:", error);
      setParseResult(null);
      setMlParseResult(null);
      setCandidateProfile(null);
      setCandidateSkills("");
      setSelectedCompany("");
      setSelectedRole("");
      setParseError(error?.message || "Resume analysis failed. Please try again.");
    } finally {
      setTimeout(() => {
        setIsParsingResume(false);
        setAiThinkingStep(0);
      }, 650);
    }
  };

  const handleGenerateRoadmap = async (overrideRole?: string, overrideCompany?: string) => {
    const roleToUse = overrideRole !== undefined ? overrideRole : selectedRole;
    const companyToUse = overrideCompany !== undefined ? overrideCompany : selectedCompany;
    setIsGeneratingRoadmap(true);
    setRoadmapError(null);
    setGeneratedRoadmap(null);
    try {
      const uid = auth.currentUser?.uid || localStorage.getItem("guest_uid") || "guest-user-123";
      const token = (auth.currentUser ? await auth.currentUser.getIdToken() : null) || (() => {
        const payload = { user_id: uid };
        const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
        return `header.${payloadB64}.signature`;
      })();

      const res = await fetch("/api/roadmap/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ 
          role: roleToUse,
          duration: selectedDuration,
          profile: {
            student_name: auth.currentUser?.displayName || "Student",
            target_company: companyToUse,
            current_skills: candidateSkills,
            missing_skills: deepMatchResult?.companies?.find((c: any) => c.company === companyToUse)?.missing_skills?.join(", ") || "Advanced concepts",
            graduation_year: "2026"
          }
        })
      });

      if (!res.ok) throw new Error("Roadmap generation limit hit.");
      const roadmapData = await res.json();
      setGeneratedRoadmap(roadmapData);
    } catch (err) {
      setRoadmapError("Roadmap generation is currently unavailable. Please try again later.");
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  // ── Prepare Interview for selected job ──────────────────────────────────
  const handlePrepareInterview = async (job: any) => {
    setSelectedJobForInterview(job);
    setActiveTab("interview");
    setInterviewSubView("prep");
    setIsLoadingInterview(true);

    try {
      const uid = auth.currentUser?.uid || localStorage.getItem("guest_uid") || "guest-user-123";
      const token = (auth.currentUser ? await auth.currentUser.getIdToken() : null) || (() => {
        const payload = { user_id: uid };
        const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
        return `header.${payloadB64}.signature`;
      })();

      const res = await fetch("/api/interview/job-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          candidateProfile: candidateProfile ? {
            skills: candidateProfile.skills,
            targetRoles: candidateProfile.targetRoles,
            domain: candidateProfile.domain,
            experienceYears: candidateProfile.experienceYears,
            resumeTextSnippet: candidateProfile.rawResumeText?.substring(0, 500) || resumeInput.substring(0, 500),
          } : {
            skills: parseResult?.skills || [],
            targetRoles: parseResult?.matchingRoles || [],
            domain: getDomainFromProfile(),
            experienceYears: mlParseResult?.extractedYearsExp || 2,
            resumeTextSnippet: resumeInput.substring(0, 500),
          },
          selectedJob: {
            title: job.title,
            company: job.company,
            description: job.description || "",
            location: job.location || "",
            matchedSkills: job.matchedSkills || [],
            missingSkills: job.missingSkills || [],
          }
        })
      });

      if (res.ok) {
        const sessionData = await res.json();
        setInterviewSession(sessionData);
      }
    } catch (err) {
      console.error("Interview session generation failed:", err);
    } finally {
      setIsLoadingInterview(false);
    }
  };

  // Helper: detect domain from parse results
  const getDomainFromProfile = (): string => {
    // 1. Prioritize primary target role (matchingRoles[0]) - explicit target role takes precedence
    const primaryRole = (
      parseResult?.matchingRoles?.[0] ||
      mlParseResult?.role_matches?.[0] ||
      selectedRole ||
      ""
    ).toLowerCase().trim();

    if (
      primaryRole.includes("mechanical") ||
      primaryRole.includes("automotive") ||
      primaryRole.includes("aerospace") ||
      primaryRole.includes("thermal") ||
      primaryRole.includes("cad") ||
      primaryRole.includes("fea") ||
      primaryRole.includes("robotics")
    ) {
      return "mechanical";
    }

    if (
      primaryRole.includes("civil") ||
      primaryRole.includes("structural engineer") ||
      primaryRole.includes("structural design") ||
      primaryRole.includes("construction") ||
      primaryRole.includes("site engineer") ||
      primaryRole.includes("geotechnical") ||
      primaryRole.includes("infrastructure")
    ) {
      return "civil";
    }

    if (
      primaryRole.includes("electrical") ||
      primaryRole.includes("electronics") ||
      primaryRole.includes("vlsi") ||
      primaryRole.includes("embedded") ||
      primaryRole.includes("hardware")
    ) {
      return "electrical";
    }

    if (
      primaryRole.includes("machine learning") ||
      primaryRole.includes("data scientist") ||
      primaryRole.includes("data engineer") ||
      primaryRole.includes("ai ") ||
      primaryRole.includes("aiml")
    ) {
      return "aiml";
    }

    if (
      primaryRole.includes("software") ||
      primaryRole.includes("developer") ||
      primaryRole.includes("frontend") ||
      primaryRole.includes("backend") ||
      primaryRole.includes("full-stack") ||
      primaryRole.includes("full stack") ||
      primaryRole.includes("web")
    ) {
      return "software";
    }

    // 2. Secondary check across all detected roles
    const allRoles = [
      ...(parseResult?.matchingRoles || []),
      ...(mlParseResult?.role_matches || []),
      selectedRole || ""
    ].join(" ").toLowerCase();

    if (allRoles.includes("mechanical")) return "mechanical";
    if (allRoles.includes("civil") || allRoles.includes("structural engineer") || allRoles.includes("structural design")) return "civil";
    if (allRoles.includes("electrical")) return "electrical";
    if (allRoles.includes("machine learning") || allRoles.includes("data scientist")) return "aiml";
    if (allRoles.includes("software") || allRoles.includes("developer") || allRoles.includes("full-stack")) return "software";

    // 3. Fallback to technical skills: evaluate domain-specific technical skills
    const skills = (parseResult?.skills || []).join(" ").toLowerCase();

    // Check Mechanical skills first to ensure "Structural Analysis" in mechanical contexts is not misclassified as Civil
    if (
      skills.includes("mechanical") ||
      skills.includes("solidworks") ||
      skills.includes("catia") ||
      skills.includes("creo") ||
      skills.includes("ansys") ||
      skills.includes("gd&t") ||
      skills.includes("fea") ||
      skills.includes("finite element") ||
      skills.includes("thermodynamics") ||
      skills.includes("fluid dynamics") ||
      skills.includes("matlab") ||
      skills.includes("simulink") ||
      skills.includes("cnc") ||
      skills.includes("aerodynamics")
    ) {
      return "mechanical";
    }

    // Check Civil skills
    if (
      skills.includes("civil") ||
      skills.includes("staad") ||
      skills.includes("etabs") ||
      skills.includes("rcc") ||
      skills.includes("geotechnical") ||
      skills.includes("surveying") ||
      skills.includes("revit") ||
      skills.includes("concrete") ||
      skills.includes("building construction")
    ) {
      return "civil";
    }

    // Check Electrical skills
    if (
      skills.includes("electrical") ||
      skills.includes("embedded") ||
      skills.includes("vlsi") ||
      skills.includes("pcb") ||
      skills.includes("microcontroller") ||
      skills.includes("verilog")
    ) {
      return "electrical";
    }

    // Check AI/ML skills
    if (
      skills.includes("machine learning") ||
      skills.includes("pytorch") ||
      skills.includes("tensorflow") ||
      skills.includes("deep learning") ||
      skills.includes("nlp") ||
      skills.includes("computer vision")
    ) {
      return "aiml";
    }

    // Tools with shared domain usage (AutoCAD)
    if (skills.includes("autocad")) {
      if (
        skills.includes("concrete") ||
        skills.includes("building") ||
        skills.includes("rcc") ||
        skills.includes("staad") ||
        skills.includes("etabs") ||
        skills.includes("site")
      ) {
        return "civil";
      }
      return "mechanical";
    }

    // Structural keyword fallback: check for civil indicators vs mechanical resume context
    if (skills.includes("structural")) {
      if (
        skills.includes("concrete") ||
        skills.includes("beam") ||
        skills.includes("bridge") ||
        skills.includes("building") ||
        skills.includes("foundation")
      ) {
        return "civil";
      }
      const resumeText = (resumeInput || "").toLowerCase();
      if (
        resumeText.includes("mechanical") ||
        resumeText.includes("casing") ||
        resumeText.includes("solidworks") ||
        resumeText.includes("ansys")
      ) {
        return "mechanical";
      }
      return "civil";
    }

    return "software";
  };

  // Helper: get candidate profile for LiveJobsView (returns stable canonical profile)
  const getCandidateProfile = (): CandidateProfile | undefined => {
    return candidateProfile || undefined;
  };

  // Helper: count interview questions by category
  const getQuestionCount = (category: string): number => {
    if (!interviewSession?.questions) return 0;
    return interviewSession.questions.filter((q: any) => q.category === category).length;
  };

  const totalQuestions = interviewSession?.questions?.length || 0;

  // ── RENDER ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>

      {/* ═══ GOOGLE FONTS ═══ */}
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* ═══ DARK NAVY NAVBAR ═══ */}
      <nav className="sticky top-0 z-50 bg-[#0b1329] border-b border-[#1e293b]">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab("home")}>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#2563eb] to-[#06b6d4] flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2L2 19h20L12 2z" strokeLinejoin="round" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="text-white font-extrabold text-xl tracking-tight">YATRA</span>
          </div>

          {/* Center Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {[
              { id: "home", label: "Home" },
              { id: "resume", label: "Resume" },
              { id: "live-jobs", label: "Live Jobs" },
              { id: "interview", label: "Interview" },
              { id: "roadmap", label: "Roadmap" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-[#2563eb] text-white shadow-lg shadow-blue-500/30"
                    : "text-[#cbd5e1] hover:text-white hover:bg-white/10"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Right: User Avatar */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-[#2563eb] flex items-center justify-center text-white text-xs font-bold">
                ST
              </div>
              <span className="hidden md:inline text-sm text-[#cbd5e1] font-medium">Student</span>
              <ChevronDown className="w-4 h-4 text-[#64748b] hidden md:block" />
            </div>
            <button 
              onClick={() => {
                auth.signOut();
                localStorage.removeItem("guest_session");
                localStorage.removeItem("guest_email");
                window.location.reload();
              }}
              className="text-xs text-[#94a3b8] hover:text-red-400 transition-colors cursor-pointer ml-2"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden flex items-center gap-1 px-4 pb-3 overflow-x-auto">
          {[
            { id: "home", label: "Home" },
            { id: "resume", label: "Resume" },
            { id: "live-jobs", label: "Jobs" },
            { id: "interview", label: "Interview" },
            { id: "roadmap", label: "Roadmap" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-[#2563eb] text-white"
                  : "text-[#94a3b8] hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".txt,.md,.pdf,.doc,.docx"
        onChange={handleFileChange}
      />

      {/* ═══ MAIN CONTENT ═══ */}
      <main className="flex-grow">
        <AnimatePresence mode="wait">

          {/* ═══════════════════════════════════════════════════════════════════
              TAB: HOME
          ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === "home" && (
            <motion.div
              key="tab-home"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              {/* Hero Section */}
              <section className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-20">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                  {/* Left: Text */}
                  <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-xs font-semibold text-blue-700">From College to Career</span>
                    </div>

                    <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight">
                      <span className="text-[#0f172a]">Same{"\n"}Talent.</span>
                      <br />
                      <span className="text-[#2563eb]">Bigger{"\n"}Opportunities.</span>
                    </h1>

                    <p className="text-base md:text-lg text-[#475569] leading-relaxed max-w-lg">
                      YATRA helps students from non-elite colleges understand their skills, find real jobs, practice interviews and build a career they deserve.
                    </p>

                    <div className="flex flex-wrap gap-3 pt-2">
                      <button
                        onClick={() => setActiveTab("resume")}
                        className="px-6 py-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transition-all flex items-center gap-2 cursor-pointer active:scale-[0.98]"
                      >
                        Get Started
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setActiveTab("live-jobs")}
                        className="px-6 py-3 bg-white hover:bg-slate-50 text-[#334155] font-semibold text-sm rounded-xl border border-slate-200 shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer"
                      >
                        Explore Jobs
                      </button>
                    </div>
                  </div>

                  {/* Right: Hero Illustration */}
                  <div className="flex items-center justify-center">
                    <img 
                      src="/yatra_hero.jpg" 
                      alt="Student with YATRA backpack looking towards mountains and opportunities" 
                      className="w-full max-w-md rounded-2xl shadow-2xl shadow-blue-500/10"
                    />
                  </div>
                </div>
              </section>

              {/* Feature Cards */}
              <section className="max-w-7xl mx-auto px-4 md:px-8 pb-16">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {[
                    { icon: <Upload className="w-6 h-6" />, color: "bg-blue-50 text-blue-600 border-blue-100", num: "1", title: "Upload Resume", desc: "Get your profile analyzed", tab: "resume" as const },
                    { icon: <Search className="w-6 h-6" />, color: "bg-emerald-50 text-emerald-600 border-emerald-100", num: "2", title: "Find Live Jobs", desc: "Real opportunities", tab: "live-jobs" as const },
                    { icon: <Sparkles className="w-6 h-6" />, color: "bg-purple-50 text-purple-600 border-purple-100", num: "3", title: "Practice Interview", desc: "AI + VR experience", tab: "interview" as const },
                    { icon: <TrendingUp className="w-6 h-6" />, color: "bg-orange-50 text-orange-600 border-orange-100", num: "4", title: "Grow", desc: "Learn and improve", tab: "roadmap" as const },
                  ].map((card) => (
                    <button
                      key={card.num}
                      onClick={() => setActiveTab(card.tab)}
                      className="bg-white rounded-2xl border border-slate-200 p-6 text-left hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/5 transition-all cursor-pointer group active:scale-[0.98]"
                    >
                      <div className={`w-12 h-12 rounded-xl ${card.color} border flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                        {card.icon}
                      </div>
                      <div className="text-xs font-bold text-slate-400 mb-1">{card.num}.</div>
                      <h3 className="text-base font-bold text-[#0f172a] mb-1">{card.title}</h3>
                      <p className="text-sm text-[#64748b]">{card.desc}</p>
                    </button>
                  ))}
                </div>
              </section>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              TAB: RESUME INTELLIGENCE
          ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === "resume" && (
            <motion.div
              key="tab-resume"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="max-w-7xl mx-auto px-4 md:px-8 py-8"
            >
              {/* Header */}
              <div className="mb-8">
                <h2 className="text-2xl md:text-3xl font-extrabold text-[#0f172a]">Resume Intelligence</h2>
                <p className="text-sm text-[#64748b] mt-1">Upload your resume and let YATRA understand your professional profile.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: Upload Dropzone */}
                <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center text-center">
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleFileClick}
                    className={`w-full border-2 border-dashed rounded-2xl p-10 cursor-pointer transition-all ${
                      isDraggingOver
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-300 hover:border-blue-400 hover:bg-blue-50/50"
                    }`}
                  >
                    {isParsingResume ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                        <p className="text-sm font-semibold text-slate-700">{aiThinkingProgress || "Analyzing resume..."}</p>
                        <div className="w-48 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-blue-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${(aiThinkingStep / 4) * 100}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-4">
                          <Upload className="w-7 h-7 text-blue-600" />
                        </div>
                        <p className="text-sm font-semibold text-[#334155] mb-1">Drop your resume here or click to upload</p>
                        <p className="text-xs text-[#94a3b8]">PDF • DOCX (Max 10MB)</p>
                      </>
                    )}
                  </div>

                  <button
                    onClick={handleFileClick}
                    disabled={isParsingResume}
                    className="mt-5 px-6 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] disabled:bg-blue-300 text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-[0.98]"
                  >
                    Upload Resume
                  </button>

                  <div className="flex items-center gap-2 mt-4 text-xs text-[#64748b]">
                    <Lock className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Your data is secure and private.</span>
                  </div>

                  {/* Parse Error */}
                  {parseError && (
                    <div className="mt-4 w-full bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 text-left">
                      <AlertTriangle className="w-4 h-4 text-red-500 inline mr-1.5" />
                      {parseError}
                    </div>
                  )}
                </div>

                {/* Right: Profile Detected */}
                <div className="bg-white rounded-2xl border border-slate-200 p-8">
                  {parseResult ? (
                    <div className="space-y-5">
                      {/* Profile Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 mb-3">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-xs font-bold text-emerald-700">Profile Detected</span>
                          </div>
                          <h3 className="text-lg font-bold text-[#0f172a]">
                            {auth.currentUser?.displayName || "Student"}
                          </h3>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-[#2563eb] flex items-center justify-center text-white font-bold text-base">
                          {(auth.currentUser?.displayName || "S")[0].toUpperCase()}
                        </div>
                      </div>

                      {/* Domain + Experience Badges */}
                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700 uppercase tracking-wider">
                          Domain: {getDomainFromProfile().toUpperCase()}
                        </span>
                        <span className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600">
                          {mlParseResult?.extractedYearsExp || 2} yrs exp
                        </span>
                        <span className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">
                          {parseResult.skills?.length || 0} Verified Skills
                        </span>
                      </div>

                      {/* Education (from ML parser) */}
                      {mlParseResult?.education && (
                        <div className="flex items-center gap-2 text-xs text-[#64748b]">
                          <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{mlParseResult.education}</span>
                        </div>
                      )}

                      {/* Top Skills */}
                      <div>
                        <h4 className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-2">Top Skills</h4>
                        <div className="flex flex-wrap gap-2">
                          {(parseResult.skills || []).slice(0, 8).map((skill: string, i: number) => (
                            <span key={i} className="px-3 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-[#334155]">
                              {skill}
                            </span>
                          ))}
                          {(parseResult.skills?.length || 0) > 8 && (
                            <span className="px-3 py-1 rounded-lg bg-slate-100 text-xs text-slate-500">
                              +{parseResult.skills.length - 8} more
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Target Role */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Target className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Target Role</span>
                        </div>
                        <p className="text-sm font-bold text-[#0f172a]">
                          {parseResult.matchingRoles?.[0] || selectedRole || "Analyzing..."}
                        </p>
                      </div>

                      {/* CTA: Find Live Jobs */}
                      <button
                        onClick={() => setActiveTab("live-jobs")}
                        className="w-full py-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                      >
                        Find Live Jobs for This Role
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                      <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-4">
                        <FileText className="w-7 h-7 text-slate-300" />
                      </div>
                      <h3 className="text-base font-bold text-[#334155] mb-1">No Profile Yet</h3>
                      <p className="text-sm text-[#94a3b8] max-w-xs">
                        Upload your resume to see your professional profile, detected skills, and target roles.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              TAB: LIVE JOBS
          ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === "live-jobs" && (
            <motion.div
              key="tab-live-jobs"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="max-w-6xl mx-auto px-4 md:px-8 py-8"
            >
              {/* Section Header */}
              <div className="mb-8">
                <h2 className="text-2xl md:text-3xl font-extrabold text-[#0f172a]">Live Job Opportunities</h2>
                <p className="text-sm text-[#64748b] mt-1">Real jobs matched to your skills and experience from live listings.</p>
              </div>
              <LiveJobsView
                candidateProfile={getCandidateProfile()}
                onPrepareInterview={handlePrepareInterview}
              />
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              TAB: INTERVIEW PREPARATION
          ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === "interview" && (
            <motion.div
              key="tab-interview"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="max-w-5xl mx-auto px-4 md:px-8 py-8"
            >
              <AnimatePresence mode="wait">
                {/* Sub-view: Interview Preparation */}
                {interviewSubView === "prep" && (
                  <motion.div
                    key="interview-prep"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="mb-8">
                      <h2 className="text-2xl md:text-3xl font-extrabold text-[#0f172a]">Interview Preparation</h2>
                      <p className="text-sm text-[#64748b] mt-1">Practice for the role you're targeting. AI-generated questions based on your profile and job.</p>
                    </div>

                    {/* Job Summary Card */}
                    {selectedJobForInterview ? (
                      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <h3 className="text-lg font-bold text-[#0f172a]">{selectedJobForInterview.title}</h3>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-[#64748b]">
                              <span className="font-semibold text-[#334155]">{selectedJobForInterview.company}</span>
                              {selectedJobForInterview.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5" />
                                  {selectedJobForInterview.location}
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold uppercase text-[10px]">
                                {getDomainFromProfile()}
                              </span>
                            </div>
                          </div>

                          {/* Compatibility */}
                          {selectedJobForInterview.matchScore && (
                            <div className="flex flex-col items-end">
                              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
                                <span className="text-2xl font-extrabold text-emerald-700">{selectedJobForInterview.matchScore}%</span>
                                <div className="text-right">
                                  <div className="text-xs font-semibold text-emerald-600">Compatibility</div>
                                  <div className="text-[10px] text-emerald-500 font-medium">Strong Match</div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Based on checklist */}
                        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-3 text-xs text-[#64748b]">
                          <span className="font-semibold text-[#334155]">Based on:</span>
                          {["Your resume", "Job requirements", "Detected skills", "Skill gaps"].map((item) => (
                            <span key={item} className="flex items-center gap-1">
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-8 text-center mb-6">
                        <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <h4 className="text-sm font-bold text-[#334155]">No job selected yet</h4>
                        <p className="text-xs text-[#94a3b8] mt-1">Go to Live Jobs, find a match, and click "Prepare Interview" to begin.</p>
                        <button
                          onClick={() => setActiveTab("live-jobs")}
                          className="mt-4 px-5 py-2 bg-[#2563eb] text-white text-xs font-semibold rounded-xl hover:bg-[#1d4ed8] transition-all cursor-pointer"
                        >
                          Browse Live Jobs
                        </button>
                      </div>
                    )}

                    {/* 5 Preparation Cards */}
                    {isLoadingInterview ? (
                      <div className="flex flex-col items-center py-10 gap-3">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        <p className="text-sm font-semibold text-slate-600">Generating interview questions...</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                        {[
                          { category: "Technical", icon: <Settings className="w-5 h-5" />, color: "bg-purple-50 text-purple-600 border-purple-100", desc: "Core concepts and problem solving" },
                          { category: "Role-Specific", icon: <CheckCircle className="w-5 h-5" />, color: "bg-blue-50 text-blue-600 border-blue-100", desc: "Based on job description" },
                          { category: "Resume-Specific", icon: <Briefcase className="w-5 h-5" />, color: "bg-sky-50 text-sky-600 border-sky-100", desc: "From your experience and projects" },
                          { category: "Behavioral", icon: <MessageSquare className="w-5 h-5" />, color: "bg-orange-50 text-orange-600 border-orange-100", desc: "Leadership and teamwork" },
                          { category: "Skill-Gap", icon: <BarChart3 className="w-5 h-5" />, color: "bg-emerald-50 text-emerald-600 border-emerald-100", desc: "Focus on missing skills" },
                        ].map((cat) => {
                          const count = getQuestionCount(cat.category.toLowerCase().replace("-", "_"));
                          return (
                            <div key={cat.category} className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-md transition-all">
                              <div className="flex items-start justify-between mb-3">
                                <div className={`w-10 h-10 rounded-xl ${cat.color} border flex items-center justify-center`}>
                                  {cat.icon}
                                </div>
                                {count > 0 && (
                                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                                    {count} Q
                                  </span>
                                )}
                              </div>
                              <h4 className="text-sm font-bold text-[#0f172a] mb-1">{cat.category} Questions</h4>
                              <p className="text-xs text-[#94a3b8]">{cat.desc}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Bottom Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() => {
                          if (selectedJobForInterview) {
                            navigate("/interview");
                          }
                        }}
                        disabled={!selectedJobForInterview}
                        className="flex-1 py-3 bg-[#2563eb] hover:bg-[#1d4ed8] disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                      >
                        Start Interview
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setInterviewSubView("mode")}
                        className="flex-1 py-3 bg-white hover:bg-slate-50 text-[#334155] font-semibold text-sm rounded-xl border border-slate-200 shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        Choose Interview Mode
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Sub-view: Choose Interview Experience */}
                {interviewSubView === "mode" && (
                  <motion.div
                    key="interview-mode"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.2 }}
                  >
                    <button
                      onClick={() => setInterviewSubView("prep")}
                      className="flex items-center gap-1.5 text-sm text-[#64748b] hover:text-[#334155] font-medium mb-6 cursor-pointer transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back to Interview Prep
                    </button>

                    <div className="mb-8">
                      <h2 className="text-2xl md:text-3xl font-extrabold text-[#0f172a]">Choose Your Interview Experience</h2>
                      <p className="text-sm text-[#64748b] mt-1">Practice with AI and get real-time feedback. Select the mode you prefer.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Option 1: Standard AI Interview */}
                      <div className="bg-white rounded-2xl border border-slate-200 p-8 hover:border-blue-400 hover:shadow-lg transition-all group">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                            <Monitor className="w-7 h-7 text-blue-600" />
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider">
                            Recommended
                          </span>
                        </div>

                        <h3 className="text-xl font-bold text-[#0f172a] mb-2">Standard AI Interview</h3>

                        <ul className="space-y-2 mb-6">
                          {[
                            "AI-powered question generation",
                            "Real-time answer evaluation",
                            "Instant feedback and scoring",
                            "Text and voice input support",
                          ].map((feature) => (
                            <li key={feature} className="flex items-center gap-2 text-sm text-[#475569]">
                              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>

                        <button
                          onClick={() => navigate("/interview")}
                          className="w-full py-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                        >
                          Start Standard Interview
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Option 2: VR Simulated Room */}
                      <div className="bg-white rounded-2xl border border-slate-200 p-8 hover:border-purple-400 hover:shadow-lg transition-all group relative overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center">
                            <Headphones className="w-7 h-7 text-purple-600" />
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold uppercase tracking-wider">
                            New
                          </span>
                        </div>

                        <h3 className="text-xl font-bold text-[#0f172a] mb-2">Virtual Reality Simulated Room</h3>

                        <ul className="space-y-2 mb-6">
                          {[
                            "Immersive 3D boardroom environment",
                            "Realistic interviewer avatars",
                            "Voice-based interaction with speech recognition",
                            "Live scoring and performance report",
                          ].map((feature) => (
                            <li key={feature} className="flex items-center gap-2 text-sm text-[#475569]">
                              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>

                        <button
                          onClick={() => navigate("/interview")}
                          className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                        >
                          Launch Virtual Reality Simulated Room
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              TAB: CAREER ROADMAP
          ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === "roadmap" && (
            <motion.div
              key="tab-roadmap"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="max-w-6xl mx-auto px-4 md:px-8 py-8"
            >
              <div className="mb-8">
                <h2 className="text-2xl md:text-3xl font-extrabold text-[#0f172a]">Your Career Roadmap</h2>
                <p className="text-sm text-[#64748b] mt-1">
                  Personalized learning path to become a {parseResult?.matchingRoles?.[0] || selectedRole || "professional"}.
                </p>
              </div>

              {/* Target Role Card with Mountain Graphic */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8 shadow-sm">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-blue-600" />
                      <span className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Target Role</span>
                    </div>
                    <h3 className="text-xl font-bold text-[#0f172a]">
                      {parseResult?.matchingRoles?.[0] || selectedRole || "Upload your resume first"}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 rounded-lg bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700 uppercase">
                        {getDomainFromProfile()}
                      </span>
                    </div>
                  </div>
                  <div className="w-full md:w-64 shrink-0">
                    <img 
                      src="/yatra_roadmap.jpg" 
                      alt="Career path mountain illustration" 
                      className="w-full rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Three Columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Your Current Skills */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Your Current Skills
                  </h4>
                  <div className="space-y-2">
                    {(parseResult?.skills || []).slice(0, 8).map((skill: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-[#334155]">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                        {skill}
                      </div>
                    ))}
                    {!parseResult?.skills?.length && (
                      <p className="text-xs text-[#94a3b8] italic">Upload resume to see verified skills</p>
                    )}
                  </div>
                  {(parseResult?.skills?.length || 0) > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <span className="text-xs font-semibold text-emerald-600">
                        {parseResult.skills.length} Verified Skills ✓
                      </span>
                    </div>
                  )}
                </div>

                {/* Priority Skill Gaps */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Priority Skill Gaps
                  </h4>
                  <div className="space-y-2">
                    {selectedJobForInterview?.missingSkills?.length > 0 ? (
                      selectedJobForInterview.missingSkills.map((skill: string, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-[#334155]">
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                          {skill}
                        </div>
                      ))
                    ) : (
                      <>
                        {(mlParseResult?.suggested_skills || []).slice(0, 5).map((skill: string, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-[#334155]">
                            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                            {skill}
                          </div>
                        ))}
                        {!mlParseResult?.suggested_skills?.length && (
                          <p className="text-xs text-[#94a3b8] italic">Select a job to see skill gaps</p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Next Steps (30 Days) */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Next Steps (30 Days)
                  </h4>
                  <div className="space-y-4">
                    {[
                      { num: "01", text: "Strengthen core skills with practice projects" },
                      { num: "02", text: "Learn one missing skill from gap analysis" },
                      { num: "03", text: "Complete 3 mock interview sessions" },
                      { num: "04", text: "Apply to 5 matched live jobs" },
                    ].map((step) => (
                      <div key={step.num} className="flex gap-3">
                        <span className="text-lg font-extrabold text-blue-200">{step.num}</span>
                        <p className="text-sm text-[#475569] leading-relaxed">{step.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Progress Banner */}
              <div className="bg-gradient-to-r from-[#2563eb] to-[#7c3aed] rounded-2xl p-6 text-white shadow-lg">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-base font-bold mb-2">You are closer to your dream career than you think.</p>
                    <div className="w-full bg-white/20 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className="bg-white h-full rounded-full transition-all duration-700"
                        style={{ width: `${parseResult ? 35 : 10}%` }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (parseResult) handleGenerateRoadmap();
                      else setActiveTab("resume");
                    }}
                    className="px-6 py-3 bg-white text-[#2563eb] font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-[0.98] whitespace-nowrap"
                  >
                    {isGeneratingRoadmap ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                      </span>
                    ) : (
                      "Keep Going →"
                    )}
                  </button>
                </div>
              </div>

              {/* Generated Roadmap Display (if available) */}
              {generatedRoadmap && (
                <div className="mt-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-[#0f172a] mb-4">{generatedRoadmap.roadmap_title}</h3>
                  <p className="text-sm text-[#64748b] mb-6">{generatedRoadmap.start_message}</p>
                  
                  {generatedRoadmap.weeks?.map((week, wi) => (
                    <div key={wi} className="mb-6 last:mb-0">
                      <h4 className="text-sm font-bold text-blue-700 mb-2">{week.theme}</h4>
                      <p className="text-xs text-[#64748b] mb-3">{week.goal}</p>
                      <div className="space-y-2">
                        {week.days?.map((day, di) => (
                          <div key={di} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-xs font-bold text-slate-400 mt-0.5">Day {day.day}</span>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-[#334155]">{day.topic}</p>
                              <p className="text-xs text-[#64748b] mt-0.5">{day.what_to_do}</p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">{day.resource_type}</span>
                                <span className="text-[10px] text-slate-400">{day.estimated_time}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {roadmapError && (
                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                  {roadmapError}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Deep Match Modal (preserved) */}
      <AnimatePresence>
        {showDeepMatchModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowDeepMatchModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[#0f172a]">Company Match Details</h3>
                <button onClick={() => setShowDeepMatchModal(false)} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              {isMatchingCompanies ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
              ) : deepMatchResult?.companies ? (
                <div className="space-y-4">
                  {deepMatchResult.companies.map((company: any, i: number) => (
                    <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm">
                      <div className="font-bold text-[#0f172a]">{company.company}</div>
                      <div className="text-xs text-[#64748b] mt-1">{company.role}</div>
                      {company.match_score && (
                        <div className="mt-2 text-xs font-semibold text-blue-600">{company.match_score}% Match</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#94a3b8] text-center py-10">No match data available.</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
