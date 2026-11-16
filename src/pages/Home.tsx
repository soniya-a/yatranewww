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
import { supabase, clearUserSessionData } from "../lib/supabase";
import { LiveJobsView } from "../components/LiveJobsView";
import { CareerRoadmapView } from "../components/CareerRoadmapView";
import { CandidateProfile } from "../types/candidateProfile";
import { buildCanonicalProfile } from "../lib/profile/candidateProfileBuilder";
import { ResumeIntelligenceDashboard } from "../components/ResumeIntelligenceDashboard";
import { ResumeIntelligenceData } from "../lib/resume/resumeSchema";
import { getStableJobId, persistActiveInterviewContext, ActiveInterviewContext } from "../lib/interview/interviewContext";

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

const MAX_RESUME_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const SUPPORTED_RESUME_EXTENSIONS = new Set(['pdf', 'docx', 'txt', 'md', 'png', 'jpg', 'jpeg', 'webp']);

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
  const [selectedCanonicalSetId, setSelectedCanonicalSetId] = useState<string>("");
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
  const [userName, setUserName] = useState("Student");

  // Tab navigation
  const [activeTab, setActiveTab] = useState<"home" | "resume" | "live-jobs" | "interview" | "roadmap">(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get("tab");
      if (tabParam === "live-jobs" || tabParam === "resume" || tabParam === "interview" || tabParam === "roadmap") {
        return tabParam;
      }
    }
    return "home";
  });

  // Interview prep sub-views
  const [interviewSubView, setInterviewSubView] = useState<"prep" | "mode">("prep");
  const [selectedJobForInterview, setSelectedJobForInterview] = useState<any>(null);
  const [interviewSession, setInterviewSession] = useState<any>(null);
  const [isLoadingInterview, setIsLoadingInterview] = useState(false);
  const [isLaunchingDirectInterview, setIsLaunchingDirectInterview] = useState(false);
  const [directInterviewTarget, setDirectInterviewTarget] = useState<{ company: string; role: string } | null>(null);

  const getAuthContext = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id || localStorage.getItem("guest_uid") || "guest";
    const name = session?.user?.user_metadata?.full_name || localStorage.getItem("guest_name") || "Student";
    const email = session?.user?.email || localStorage.getItem("guest_email") || "Student";
    const token = session?.access_token || "";
    return { session, uid, name, email, token };
  };

  const getScopedKey = (base: string, uid?: string | null) => {
    return uid && uid !== "guest" && !uid.startsWith("guest_") ? `${base}_${uid}` : base;
  };

  const fetchSavedResume = async () => {
    try {
      const { session, uid, token } = await getAuthContext();
      const isAuthUser = Boolean(session?.user && uid && !uid.startsWith("guest") && !localStorage.getItem("guest_session"));

      // 1. If authenticated, fetch authoritative profile from database endpoint
      if (isAuthUser && token) {
        try {
          const res = await fetch("/api/resume/latest", {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (res.ok) {
            const json = await res.json();
            if (json?.profile) {
              const row = json.profile;
              const restoredProfile: CandidateProfile = {
                fullName: row.candidate_name,
                headline: row.headline,
                domain: row.metadata?.domain || "software",
                primaryRole: row.metadata?.primaryRole || null,
                targetRoles: Array.isArray(row.matching_roles) ? row.matching_roles : [],
                classificationStatus: "verified",
                classificationConfidence: "high",
                skills: Array.isArray(row.skills) ? row.skills : [],
                experienceYears: row.metadata?.experienceYears || 0,
                experienceLevel: row.metadata?.experienceLevel || "Entry",
                contact: {
                  location: row.location,
                  email: row.email,
                  phone: row.phone,
                  linkedin: row.linkedin,
                  github: row.github,
                  portfolio: row.portfolio
                },
                educationRecords: Array.isArray(row.education) ? row.education : [],
                experienceRecords: Array.isArray(row.experience) ? row.experience : [],
                projects: Array.isArray(row.projects) ? row.projects : [],
                certifications: Array.isArray(row.certifications) ? row.certifications : [],
                achievements: Array.isArray(row.achievements) ? row.achievements : [],
                rawResumeText: row.raw_resume_text,
                source: "resume_upload",
                parserSource: row.parser_source || "gemini",
                updatedAt: row.updated_at
              };
              setCandidateProfile(restoredProfile);
              if (row.raw_resume_text) setResumeInput(row.raw_resume_text);
              if (row.skills?.length > 0) setCandidateSkills(row.skills.join(", "));
              if (row.matching_companies?.length > 0) {
                setSelectedRole(row.matching_companies[0].role);
                setSelectedCompany(row.matching_companies[0].company);
              }
              try {
                localStorage.setItem(getScopedKey("yatra_candidate_profile", uid), JSON.stringify(restoredProfile));
              } catch (_) {}
              return;
            }
          }
        } catch (netErr) {
          console.warn("[Resume Restoration] Server query offline, falling back to user-scoped cache:", netErr);
        }
      }

      // 2. Fallback to user-scoped localStorage cache
      const scopedKey = getScopedKey("yatra_candidate_profile", uid);
      const cachedProfile = localStorage.getItem(scopedKey);
      if (cachedProfile) {
        const parsed = JSON.parse(cachedProfile);
        setCandidateProfile(parsed);
        if (parsed.rawResumeText) setResumeInput(parsed.rawResumeText);
        if (parsed.skills?.length > 0) setCandidateSkills(parsed.skills.join(", "));
      } else {
        // Enforce clean state for new or switching accounts
        setCandidateProfile(null);
        setParseResult(null);
        setResumeInput("");
      }

      const cachedParse = localStorage.getItem(getScopedKey("yatra_parse_result", uid));
      if (cachedParse) {
        const parsed = JSON.parse(cachedParse);
        setParseResult(parsed);
        if (parsed.skills?.length > 0) setCandidateSkills(parsed.skills.join(", "));
        if (parsed.matchingCompanies?.length > 0) {
          setSelectedRole(parsed.matchingCompanies[0].role);
          setSelectedCompany(parsed.matchingCompanies[0].company);
        }
      }
    } catch (_) {}
  };

  // ── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const handleDeviceCheck = async () => {
      const { email, name } = await getAuthContext();
      setUserEmail(email);
      setUserName(name);
      setIsMobile(window.innerWidth < 1024);
    };
    handleDeviceCheck();
    window.addEventListener("resize", handleDeviceCheck);
    return () => window.removeEventListener("resize", handleDeviceCheck);
  }, []);

  useEffect(() => {
    fetchSavedRoadmaps();
    fetchInterviewReports();
    fetchSavedResume();

    // Restore cached selected job across reloads
    try {
      const cachedJob = localStorage.getItem("yatra_selected_job");
      if (cachedJob) {
        const parsed = JSON.parse(cachedJob);
        setSelectedJobForInterview(parsed);
        if (parsed.company) setSelectedCompany(parsed.company);
        if (parsed.title || parsed.role) setSelectedRole(parsed.title || parsed.role);
      }
    } catch (_) {}
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
    if (isParsingResume) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcessing(file);
    }
    e.target.value = '';
  };

  const handleFileProcessing = async (file: File) => {
    // 1. In-flight guard: prevent duplicate simultaneous uploads
    if (isParsingResume) {
      console.warn("[Resume Upload] Another document is currently being processed. Ignoring trigger.");
      return;
    }

    setParseError(null);

    // Stash previous valid state in case validation or extraction fails
    const prevCandidateProfile = candidateProfile;
    const prevParseResult = parseResult;
    const prevCandidateSkills = candidateSkills;
    const prevSelectedCompany = selectedCompany;
    const prevSelectedRole = selectedRole;
    const prevResumeInput = resumeInput;

    const restorePreviousOnFailure = (errorMsg: string) => {
      setCandidateProfile(prevCandidateProfile);
      setParseResult(prevParseResult);
      setCandidateSkills(prevCandidateSkills);
      setSelectedCompany(prevSelectedCompany);
      setSelectedRole(prevSelectedRole);
      setResumeInput(prevResumeInput);
      setIsParsingResume(false);
      setAiThinkingStep(0);
      setParseError(errorMsg);
    };

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!file.size) {
      restorePreviousOnFailure('The selected file is empty. Upload a resume with readable content.');
      return;
    }
    if (file.size > MAX_RESUME_FILE_SIZE_BYTES) {
      restorePreviousOnFailure('This resume is larger than 10 MB. Upload a smaller PDF or DOCX, or paste the resume text.');
      return;
    }
    if (!SUPPORTED_RESUME_EXTENSIONS.has(ext)) {
      restorePreviousOnFailure('Unsupported file format. Upload a PDF (.pdf), DOCX (.docx), plain text (.txt), or image (.png, .jpg). Legacy .doc files are not supported; save them as .docx first.');
      return;
    }

    if (ext === 'txt' || ext === 'md') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = (event.target?.result as string) || "";
        if (!text.trim()) {
          restorePreviousOnFailure('The selected text file has no readable resume content.');
          return;
        }
        setResumeInput(text);
        setParseError(null);
        handleParseResume(text, prevCandidateProfile, prevParseResult);
      };
      reader.onerror = () => restorePreviousOnFailure('The selected text file could not be read.');
      reader.readAsText(file);
    } else if (ext === 'docx') {
      setIsParsingResume(true);
      setParseError(null);
      setAiThinkingStep(1);
      setAiThinkingProgress("Uploading Word document & extracting text...");

      const reader = new FileReader();
      reader.onerror = () => {
        restorePreviousOnFailure("Could not read the selected DOCX file from disk.");
      };
      reader.onload = async (event) => {
        const abortCtrl = new AbortController();
        const timeoutHandle = setTimeout(() => abortCtrl.abort(), 35000);
        try {
          const base64 = event.target?.result as string;
          const { token } = await getAuthContext();

          const extractRes = await fetch("/api/resume/extract-docx", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ docxBase64: base64, filename: file.name }),
            signal: abortCtrl.signal
          });
          clearTimeout(timeoutHandle);

          const extractData = await extractRes.json();

          if (!extractRes.ok || !extractData.success || !extractData.text) {
            const errMsg = extractData.error?.message || "We couldn't read the text from this DOCX file. Try uploading a PDF or pasting the resume text instead.";
            restorePreviousOnFailure(errMsg);
            return;
          }

          const extractedText = extractData.text;
          setResumeInput(extractedText);
          setParseError(null);
          handleParseResume(extractedText, prevCandidateProfile, prevParseResult);
        } catch (err: any) {
          clearTimeout(timeoutHandle);
          const isTimeout = err?.name === "AbortError";
          restorePreviousOnFailure(isTimeout
            ? "DOCX extraction timed out after 35 seconds. Please try again or paste the text."
            : "We couldn't extract text from this DOCX. Try uploading a PDF or plain text instead.");
        }
      };
      reader.readAsDataURL(file);
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
          restorePreviousOnFailure("The selected file is not a valid PDF document. Please upload the original PDF file.");
          return;
        }
      } catch (validationErr) {
        restorePreviousOnFailure("The selected file is not a valid PDF document. Please upload the original PDF file.");
        return;
      }

      // 3. Genuine PDF validation passed -> proceed with extraction flow
      setIsParsingResume(true);
      setParseError(null);
      setAiThinkingStep(1);
      setAiThinkingProgress("Uploading PDF and extracting text...");

      const reader = new FileReader();
      reader.onerror = () => {
        restorePreviousOnFailure("Could not read the selected PDF file from disk.");
      };
      reader.onload = async (event) => {
        const abortCtrl = new AbortController();
        const timeoutHandle = setTimeout(() => abortCtrl.abort(), 35000);
        try {
          const base64 = event.target?.result as string;
          const { token } = await getAuthContext();

          const extractRes = await fetch("/api/resume/extract-pdf", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ pdfBase64: base64, filename: file.name }),
            signal: abortCtrl.signal
          });
          clearTimeout(timeoutHandle);

          const extractData = await extractRes.json();

          if (!extractRes.ok || !extractData.success || !extractData.text) {
            const errMsg = extractData.error?.message || "We couldn't read the text from this PDF. Try pasting the resume text instead.";
            restorePreviousOnFailure(errMsg);
            return;
          }

          const extractedText = extractData.text;
          setResumeInput(extractedText);
          setParseError(null);
          handleParseResume(extractedText, prevCandidateProfile, prevParseResult);
        } catch (err: any) {
          clearTimeout(timeoutHandle);
          const isTimeout = err?.name === "AbortError";
          restorePreviousOnFailure(isTimeout
            ? "PDF extraction timed out after 35 seconds. Please try again."
            : "We couldn't read this PDF. Try pasting the resume text instead.");
        }
      };
      reader.readAsDataURL(file);
    } else if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) {
      setIsParsingResume(true);
      setParseError(null);
      setAiThinkingStep(1);
      setAiThinkingProgress("Performing OCR on resume image...");

      const reader = new FileReader();
      reader.onerror = () => {
        restorePreviousOnFailure("Could not read the selected image file from disk.");
      };
      reader.onload = async (event) => {
        const abortCtrl = new AbortController();
        const timeoutHandle = setTimeout(() => abortCtrl.abort(), 45000);
        try {
          const base64 = event.target?.result as string;
          const { token } = await getAuthContext();

          const extractRes = await fetch("/api/resume/extract-image", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ imageBase64: base64, filename: file.name }),
            signal: abortCtrl.signal
          });
          clearTimeout(timeoutHandle);

          const extractData = await extractRes.json();
          if (!extractRes.ok || !extractData.success || !extractData.text) {
            restorePreviousOnFailure(extractData.error?.message || "Could not read text from this image.");
            return;
          }
          const extractedText = extractData.text;
          setResumeInput(extractedText);
          setParseError(null);
          handleParseResume(extractedText, prevCandidateProfile, prevParseResult);
        } catch (err: any) {
          clearTimeout(timeoutHandle);
          const isTimeout = err?.name === "AbortError";
          restorePreviousOnFailure(isTimeout
            ? "Image OCR timed out after 45 seconds. Please try again or upload a PDF/DOCX."
            : "Image OCR processing failed. Please try again or upload a PDF/DOCX.");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const fetchSavedRoadmaps = async () => {
    const { session, uid } = await getAuthContext();
    try {
      if (session?.user && !localStorage.getItem("guest_session")) {
        const { data, error } = await supabase
          .from("roadmaps")
          .select("*")
          .eq("user_id", uid)
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (data && data.length > 0) {
          const loaded = data.map(d => ({
            id: d.id,
            roadmap_title: d.roadmap_title,
            student_name: d.student_name,
            target: d.target,
            start_message: d.start_message,
            weeks: d.weeks,
            milestones: d.milestones,
            daily_routine: d.daily_routine,
            final_week_checklist: d.final_week_checklist,
            confidence_message: d.confidence_message,
            createdAt: new Date(d.created_at).getTime()
          })) as CareerRoadmap[];
          setSavedRoadmaps(loaded);
          return;
        }
      }
      const local = localStorage.getItem(`roadmaps_${uid}`);
      if (local) setSavedRoadmaps(JSON.parse(local));
    } catch (e) {
      const local = localStorage.getItem(`roadmaps_${uid}`);
      if (local) setSavedRoadmaps(JSON.parse(local));
    }
  };

  const fetchInterviewReports = async () => {
    setIsLoadingReports(true);
    const { session, uid } = await getAuthContext();
    try {
      if (session?.user && !localStorage.getItem("guest_session")) {
        const { data, error } = await supabase
          .from("interviews")
          .select("*")
          .eq("user_id", uid)
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (data && data.length > 0) {
          const loaded = data.map(d => ({
            id: d.id,
            userId: d.user_id,
            role: d.role,
            company: d.company,
            score: Number(d.score),
            feedback: d.feedback,
            strengths: d.strengths,
            weaknesses: d.weaknesses,
            transcript: d.transcript,
            hiring_decision: d.hiring_decision,
            percentile_estimate: Number(d.percentile_estimate),
            createdAt: new Date(d.created_at).getTime()
          })) as SavedInterviewReport[];
          setSavedReports(loaded);
          return;
        }
      }
      const local = localStorage.getItem(`interviews_${uid}`);
      if (local) setSavedReports(JSON.parse(local));
    } catch (e) {
      const local = localStorage.getItem(`interviews_${uid}`);
      if (local) setSavedReports(JSON.parse(local));
    } finally {
      setIsLoadingReports(false);
    }
  };

  const handleParseResume = async (
    overrideText?: string,
    previousProfileFallback?: CandidateProfile | null,
    previousParseFallback?: any | null
  ) => {
    const textToParse = overrideText !== undefined ? overrideText : resumeInput;
    if (!textToParse.trim()) {
      setParseError('Resume text is empty. Upload a readable document or paste your resume text.');
      return;
    }
    setIsParsingResume(true);
    setParseError(null);

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
      }, i * 200);
    });

    const abortController = new AbortController();
    const timeoutHandle = setTimeout(() => abortController.abort(), 35000);

    try {
      const { session, uid, token } = await getAuthContext();

      // Single unified call: /api/resume/parse now provides full profile AND ML metrics
      const parseRes = await fetch("/api/resume/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ resumeText: textToParse }),
        signal: abortController.signal
      });
      clearTimeout(timeoutHandle);

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

      // Establish single source of truth canonical profile
      const canonical = buildCanonicalProfile(data, data, textToParse);
      canonical.parserSource = data.parser_source || "gemini";

      setParseError(null);
      setParseResult(data);
      setCandidateProfile(canonical);

      // Save to user-scoped localStorage
      try {
        const scopedKey = getScopedKey("yatra_candidate_profile", uid);
        const scopedParseKey = getScopedKey("yatra_parse_result", uid);
        localStorage.setItem(scopedKey, JSON.stringify(canonical));
        localStorage.setItem(scopedParseKey, JSON.stringify(data));
      } catch (_) {}

      if (data.skills && data.skills.length > 0) {
        setCandidateSkills(data.skills.join(", "));
      }
      if (data.matchingCompanies && data.matchingCompanies.length > 0) {
        setSelectedRole(data.matchingCompanies[0].role);
        setSelectedCompany(data.matchingCompanies[0].company);
      }

      // Persist to Supabase candidate_profiles in background if authenticated
      if (session?.user && uid && !uid.startsWith("guest") && token) {
        fetch("/api/resume/save", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            profile: canonical,
            rawResumeText: textToParse,
            parserSource: data.parser_source || "gemini"
          })
        }).catch(err => console.warn("[Resume DB Persistence Notice]:", err));
      }

    } catch (error: any) {
      clearTimeout(timeoutHandle);
      const isTimeout = error?.name === "AbortError";
      console.error("Resume analysis failed:", error);

      // Preserve previous valid profile if current parse failed
      if (previousProfileFallback !== undefined) {
        setCandidateProfile(previousProfileFallback);
        setParseResult(previousParseFallback || null);
      }
      setParseError(isTimeout
        ? "Resume parsing timed out after 35 seconds. Please try again."
        : (error?.message || "Resume analysis failed. Please try again."));
    } finally {
      setIsParsingResume(false);
      setAiThinkingStep(0);
    }
  };

  const handleGenerateRoadmap = async (overrideRole?: string, overrideCompany?: string) => {
    const roleToUse = overrideRole !== undefined ? overrideRole : selectedRole;
    const companyToUse = overrideCompany !== undefined ? overrideCompany : selectedCompany;
    setIsGeneratingRoadmap(true);
    setRoadmapError(null);
    setGeneratedRoadmap(null);
    try {
      const { session, uid, token, name } = await getAuthContext();

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
            student_name: name,
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

      // Persist to Supabase if session active
      try {
        if (session?.user && !localStorage.getItem("guest_session")) {
          await supabase.from("roadmaps").insert([{
            user_id: uid,
            roadmap_title: roadmapData.roadmap_title || "Engineering Roadmap",
            student_name: roadmapData.student_name || name,
            target: roadmapData.target || roleToUse,
            start_message: roadmapData.start_message || "",
            weeks: roadmapData.weeks || [],
            milestones: roadmapData.milestones || [],
            daily_routine: roadmapData.daily_routine || {},
            final_week_checklist: roadmapData.final_week_checklist || [],
            confidence_message: roadmapData.confidence_message || ""
          }]);
        }
        const cached = localStorage.getItem(`roadmaps_${uid}`);
        const currentList = cached ? JSON.parse(cached) : [];
        localStorage.setItem(`roadmaps_${uid}`, JSON.stringify([roadmapData, ...currentList]));
        fetchSavedRoadmaps();
      } catch (saveErr) {
        console.warn("Could not persist generated roadmap to database:", saveErr);
      }
    } catch (err) {
      setRoadmapError("Roadmap generation is currently unavailable. Please try again later.");
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  // ── Prepare Interview for selected job ──────────────────────────────────
  const handlePrepareInterview = async (job: any) => {
    if (!job) return;
    const jobId = getStableJobId(job);
    const company = (job.company || selectedCompany || "").trim();
    const role = (job.title || selectedRole || "").trim();

    setSelectedJobForInterview(job);
    try {
      localStorage.setItem("yatra_selected_job", JSON.stringify(job));
    } catch (_) {}
    setActiveTab("interview");
    setInterviewSubView("prep");
    setIsLoadingInterview(true);

    try {
      const { token } = await getAuthContext();

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
            title: role,
            company: company,
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

      // Generate Canonical Interview Question Set scoped to this exact job
      if (company && role) {
        try {
          const { data: { session: authSession } } = await supabase.auth.getSession();
          const effectiveUid = authSession?.user?.id || (typeof window !== 'undefined' ? localStorage.getItem("guest_uid") : null) || "guest-user-123";
          const canRes = await fetch("/api/interview/generate-canonical-set", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              company,
              role,
              jobDescription: job.description || "",
              parsedResume: parseResult || candidateProfile || null,
              user_id: effectiveUid
            })
          });
          if (canRes.ok) {
            const canonicalData = await canRes.json();
            setSelectedCanonicalSetId(canonicalData.set_id);
            localStorage.setItem(`job_canonical_set_${jobId}`, canonicalData.set_id);
            const candidateSkillsStr = Array.isArray(candidateProfile?.skills)
              ? candidateProfile.skills.join(", ")
              : (candidateSkills || parseResult?.skills?.join(", ") || "");
            persistActiveInterviewContext({
              jobId,
              company,
              role,
              jobDescription: job.description || "",
              candidateSkills: candidateSkillsStr,
              setId: canonicalData.set_id,
              isVR: false,
              resumeReference: parseResult || candidateProfile || null
            });
          }
        } catch (canErr) {
          console.warn("Canonical question set generation notice:", canErr);
        }
      }
    } catch (err) {
      console.error("Interview session generation failed:", err);
    } finally {
      setIsLoadingInterview(false);
    }
  };

  // ── Direct Interview Launch (One-Click Launch from Job Card or Dashboard) ──
  const handleDirectInterview = async (job: any, isVR: boolean = false) => {
    if (!job) return;
    const jobId = getStableJobId(job);
    const company = (job.company || selectedCompany || "").trim();
    const role = (job.title || selectedRole || "").trim();
    const jobDescription = job.description || "";

    if (!company || !role) {
      alert("The selected job requires both a company name and role title to initialize an interview.");
      return;
    }

    setIsLaunchingDirectInterview(true);
    setDirectInterviewTarget({ company, role });

    try {
      // 1. Check if a canonical set is already generated and verified for this specific jobId
      let targetSetId = localStorage.getItem(`job_canonical_set_${jobId}`) || "";

      if (targetSetId) {
        try {
          const checkRes = await fetch(`/api/interview/question-set/${targetSetId}`);
          if (!checkRes.ok) {
            targetSetId = "";
          } else {
            const checkData = await checkRes.json();
            // Verify context isolation: ensure cached set matches this exact company and role
            if (
              checkData.company?.toLowerCase() !== company.toLowerCase() ||
              checkData.role?.toLowerCase() !== role.toLowerCase()
            ) {
              targetSetId = ""; // Stale cross-job set discarded
            }
          }
        } catch (e) {
          targetSetId = "";
        }
      }

      // 2. Generate a fresh canonical question set if none exists for this exact job
      if (!targetSetId) {
        const { data: { session: authSession } } = await supabase.auth.getSession();
        const effectiveUid = authSession?.user?.id || (typeof window !== 'undefined' ? localStorage.getItem("guest_uid") : null) || "guest-user-123";

        const canRes = await fetch("/api/interview/generate-canonical-set", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company,
            role,
            jobDescription,
            parsedResume: parseResult || candidateProfile || null,
            user_id: effectiveUid
          })
        });

        if (!canRes.ok) {
          throw new Error(`Failed to generate canonical questions for ${company} (${canRes.status})`);
        }

        const canonicalData = await canRes.json();
        targetSetId = canonicalData.set_id;
        localStorage.setItem(`job_canonical_set_${jobId}`, targetSetId);
      }

      // 3. Build & persist scoped context
      const candidateSkillsStr = Array.isArray(candidateProfile?.skills)
        ? candidateProfile.skills.join(", ")
        : (candidateSkills || parseResult?.skills?.join(", ") || "");

      const context: ActiveInterviewContext = {
        jobId,
        company,
        role,
        jobDescription,
        candidateSkills: candidateSkillsStr,
        setId: targetSetId,
        isVR,
        resumeReference: parseResult || candidateProfile || null
      };

      persistActiveInterviewContext(context);
      setSelectedJobForInterview(job);
      setSelectedCanonicalSetId(targetSetId);

      // 4. Navigate directly to /interview with URL parameters AND state
      navigate(`/interview?jobId=${encodeURIComponent(jobId)}&setId=${encodeURIComponent(targetSetId)}&company=${encodeURIComponent(company)}&role=${encodeURIComponent(role)}&vr=${isVR ? 'true' : 'false'}`, {
        state: context
      });
    } catch (err: any) {
      console.error("[Home] Direct interview launch failed:", err);
      alert(`Could not start interview for ${role} at ${company}: ${err?.message || 'Network error'}`);
    } finally {
      setIsLaunchingDirectInterview(false);
      setDirectInterviewTarget(null);
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
              onClick={async () => {
                try {
                  await supabase.auth.signOut();
                } catch (e) {
                  console.warn("Supabase signout skipped:", e);
                }
                clearUserSessionData();
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
        accept=".pdf,.PDF,.docx,.DOCX,.txt,.TXT,.md,.MD,.png,.PNG,.jpg,.JPG,.jpeg,.JPEG,.webp,.WEBP,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,image/*"
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

              <div className={`grid grid-cols-1 ${parseResult ? 'lg:grid-cols-12' : 'lg:grid-cols-2'} gap-8`}>
                {/* Left: Upload Dropzone */}
                <div className={`bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center text-center ${parseResult ? 'lg:col-span-4' : ''}`}>
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
                        <p className="text-xs text-[#94a3b8]">PDF • DOCX • Image (Max 10MB)</p>
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

                {/* Right: Dynamic Resume Intelligence Dashboard */}
                <div className={`${parseResult ? 'lg:col-span-8' : ''}`}>
                  {(() => {
                    const resumeIntelligencePayload: ResumeIntelligenceData | null = parseResult ? {
                      profile: parseResult.profile || {
                        name: parseResult.candidate_name || candidateProfile?.fullName || null,
                        headline: parseResult.headline || candidateProfile?.primaryRole || null,
                        location: candidateProfile?.contact?.location || null,
                        email: candidateProfile?.contact?.email || null,
                        phone: candidateProfile?.contact?.phone || null,
                        linkedin: candidateProfile?.contact?.linkedin || null,
                        github: candidateProfile?.contact?.github || null,
                        portfolio: candidateProfile?.contact?.portfolio || null
                      },
                      skills: Array.isArray(parseResult.structuredSkills)
                        ? parseResult.structuredSkills
                        : (parseResult.skills || []).map((s: string) => ({ name: s, category: "Verified Skills", evidence: s, confidence: 0.95 })),
                      experience: (Array.isArray(parseResult.experience) && parseResult.experience.length > 0) ? parseResult.experience : (candidateProfile?.experienceRecords || []),
                      education: (Array.isArray(parseResult.education) && parseResult.education.length > 0) ? parseResult.education : (candidateProfile?.educationRecords || []),
                      projects: (Array.isArray(parseResult.projects) && parseResult.projects.length > 0) ? parseResult.projects : (candidateProfile?.projects || []),
                      certifications: Array.isArray(parseResult.certifications) ? parseResult.certifications : [],
                      achievements: Array.isArray(parseResult.achievements) ? parseResult.achievements : []
                    } : null;

                    return (
                      <ResumeIntelligenceDashboard
                        data={resumeIntelligencePayload}
                        isLoading={isParsingResume}
                        parseError={parseError}
                        onRetry={() => {
                          if (resumeInput) handleParseResume(resumeInput);
                          else handleFileClick();
                        }}
                        onFindJobs={() => setActiveTab("live-jobs")}
                        onPrepareInterview={() => {
                          handlePrepareInterview({
                            title: parseResult?.matchingRoles?.[0] || selectedRole || "Professional",
                            company: parseResult?.matchingCompanies?.[0]?.company || selectedCompany || "Company"
                          });
                        }}
                      />
                    );
                  })()}
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
                onDirectInterview={(job) => handleDirectInterview(job, false)}
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
                            handleDirectInterview(selectedJobForInterview, false);
                          }
                        }}
                        disabled={!selectedJobForInterview || isLaunchingDirectInterview}
                        className="flex-1 py-3 bg-[#2563eb] hover:bg-[#1d4ed8] disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                      >
                        {isLaunchingDirectInterview ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Initializing Interview...
                          </>
                        ) : (
                          <>
                            Start Interview
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
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
                          onClick={() => {
                            if (selectedJobForInterview) {
                              handleDirectInterview(selectedJobForInterview, false);
                            }
                          }}
                          disabled={!selectedJobForInterview || isLaunchingDirectInterview}
                          className="w-full py-3 bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
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

                        <h3 className="text-xl font-bold text-[#0f172a] mb-2">Virtual Reality Executive Room</h3>

                        <ul className="space-y-2 mb-6">
                          {[
                            "Executive office with Mr. Vinodh — Hiring Manager",
                            "Floor-to-ceiling panoramic glass windows with city skyline",
                            "Dynamic floating interview-question display & documents",
                            "Real-time voice conversation & speech recognition",
                          ].map((feature) => (
                            <li key={feature} className="flex items-center gap-2 text-sm text-[#475569]">
                              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>

                        <button
                          onClick={() => {
                            if (selectedJobForInterview) {
                              handleDirectInterview(selectedJobForInterview, true);
                            }
                          }}
                          disabled={!selectedJobForInterview || isLaunchingDirectInterview}
                          className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
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
            >
              <CareerRoadmapView
                candidateProfile={candidateProfile}
                parseResult={parseResult}
                selectedJob={selectedJobForInterview || (selectedCompany && selectedRole ? {
                  company: selectedCompany,
                  title: selectedRole,
                  role: selectedRole,
                  description: "",
                  matchedSkills: [],
                  missingSkills: []
                } : null)}
                savedReports={savedReports}
                onSelectTab={setActiveTab}
                onSelectJob={(job) => {
                  setSelectedJobForInterview(job);
                  setSelectedCompany(job.company);
                  setSelectedRole(job.title || job.role);
                }}
              />
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
