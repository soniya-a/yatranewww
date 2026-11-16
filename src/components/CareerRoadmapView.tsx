import React, { useState, useEffect } from "react";
import {
  Target,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  ExternalLink,
  RefreshCw,
  BookOpen,
  Layers,
  Award,
  Sparkles,
  ChevronRight,
  Loader2,
  ShieldCheck,
  Building2,
  Calendar,
  Briefcase,
  AlertCircle
} from "lucide-react";
import { CareerIntelligenceRoadmap, RoadmapPhase, RoadmapItem, SkillGapItem } from "../types/careerRoadmap";
import { supabase } from "../lib/supabase";

interface CareerRoadmapViewProps {
  candidateProfile: any;
  parseResult: any;
  selectedJob: any;
  savedReports: any[];
  onSelectTab: (tab: string) => void;
  onSelectJob?: (job: any) => void;
}

export const CareerRoadmapView: React.FC<CareerRoadmapViewProps> = ({
  candidateProfile,
  parseResult,
  selectedJob,
  savedReports,
  onSelectTab,
  onSelectJob
}) => {
  const [roadmap, setRoadmap] = useState<CareerIntelligenceRoadmap | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activePhase, setActivePhase] = useState<"0-3" | "3-6" | "6-9">("0-3");

  // Derive active context
  const currentSkills: string[] = candidateProfile?.skills || parseResult?.skills || [];
  const targetCompany: string = selectedJob?.company || parseResult?.matchingCompanies?.[0]?.company || "";
  const targetRole: string = selectedJob?.title || selectedJob?.role || parseResult?.matchingRoles?.[0] || candidateProfile?.primaryRole || "";
  const targetDomain: string = candidateProfile?.domain || "software";
  const jobDescription: string = selectedJob?.description || "";
  const missingSkillsFromJob: string[] = selectedJob?.missingSkills || [];
  const matchedSkillsFromJob: string[] = selectedJob?.matchedSkills || [];

  // Helper to get auth context
  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id || localStorage.getItem("guest_uid") || "guest-user-123";
    const token = session?.access_token || (() => {
      const payload = { user_id: uid };
      const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
      return `header.${payloadB64}.signature`;
    })();
    return { uid, token };
  };

  const getStorageKey = (uid: string, comp: string, rol: string) => {
    return `career_roadmap_${uid}_${comp.toLowerCase().replace(/\s+/g, '_')}_${rol.toLowerCase().replace(/\s+/g, '_')}`;
  };

  // Load saved roadmap on mount or context change
  useEffect(() => {
    loadSavedRoadmap();
  }, [targetCompany, targetRole]);

  const loadSavedRoadmap = async () => {
    if (!targetCompany || !targetRole) return;
    const { uid, token } = await getAuthToken();

    // 1. Check local cache first for instant render
    const cachedKey = getStorageKey(uid, targetCompany, targetRole);
    const cached = localStorage.getItem(cachedKey) || localStorage.getItem(`latest_career_roadmap_${uid}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.company && parsed.role) {
          setRoadmap(parsed);
        }
      } catch (_) {}
    }

    // 2. Fetch latest from backend/database
    try {
      const res = await fetch("/api/roadmap/latest", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.roadmap) {
          // If the saved roadmap matches the target role and company (or none selected yet)
          if (!roadmap || data.roadmap.company.toLowerCase() === targetCompany.toLowerCase()) {
            setRoadmap(data.roadmap);
            localStorage.setItem(cachedKey, JSON.stringify(data.roadmap));
          }
        }
      }
    } catch (e) {
      // Offline or network error, cached roadmap already loaded
    }
  };

  // Explicit Generation / Regeneration Handler
  const handleGenerateRoadmap = async (isRegen = false) => {
    if (!targetCompany || !targetRole || currentSkills.length === 0) {
      setErrorMessage("Upload your resume and select a target job to generate your roadmap.");
      return;
    }

    if (isRegen) setIsRegenerating(true);
    else setIsLoading(true);
    setErrorMessage(null);

    try {
      const { uid, token } = await getAuthToken();

      // Gather past interview evidence for this company/role if available
      const relevantInterviews = (savedReports || []).filter(
        (r) => r.company?.toLowerCase() === targetCompany.toLowerCase() || r.role?.toLowerCase() === targetRole.toLowerCase()
      );

      const payload = {
        company: targetCompany,
        role: targetRole,
        domain: targetDomain,
        jobId: selectedJob?.id || undefined,
        jobDescription: jobDescription,
        resumeSkills: currentSkills,
        resumeProjects: candidateProfile?.projects || [],
        experienceYears: candidateProfile?.experienceYears || 2,
        candidateName: candidateProfile?.fullName || "Candidate",
        matchedSkills: matchedSkillsFromJob,
        missingSkills: missingSkillsFromJob,
        interviewEvidence: relevantInterviews.map((r) => ({
          company: r.company,
          role: r.role,
          score: r.score,
          weaknesses: r.weaknesses || [],
          feedback: r.feedback || ""
        }))
      };

      const res = await fetch("/api/roadmap/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.status === 429) {
        throw new Error("RATE_LIMITED");
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to generate roadmap.");
      }

      const generated: CareerIntelligenceRoadmap = await res.json();
      setRoadmap(generated);

      // Save to localStorage
      const cachedKey = getStorageKey(uid, targetCompany, targetRole);
      localStorage.setItem(cachedKey, JSON.stringify(generated));
      localStorage.setItem(`latest_career_roadmap_${uid}`, JSON.stringify(generated));

    } catch (err: any) {
      if (err.message === "RATE_LIMITED") {
        setErrorMessage(
          "Roadmap generation is temporarily unavailable because the AI service is rate limited. Your saved roadmap remains available."
        );
      } else {
        setErrorMessage(err.message || "Could not generate roadmap. Please try again.");
      }
    } finally {
      setIsLoading(false);
      setIsRegenerating(false);
    }
  };

  // ── EMPTY / MISSING CONTEXT STATE ───────────────────────────────────────────
  const hasResume = currentSkills.length > 0;
  const hasJob = Boolean(targetCompany && targetRole);

  if (!hasResume || !hasJob) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-10">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 md:p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-5 text-blue-600">
            <Target className="w-8 h-8" />
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#0f172a] mb-3">
            Career Intelligence Roadmap
          </h2>
          <p className="text-base text-[#64748b] max-w-xl mx-auto mb-8 leading-relaxed">
            Upload your resume and select a target job to generate your roadmap.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto mb-8 text-left">
            <div className={`p-5 rounded-2xl border ${hasResume ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                {hasResume ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-amber-500" />}
                <span className="font-bold text-sm text-[#0f172a]">Candidate Resume</span>
              </div>
              <p className="text-xs text-[#64748b]">
                {hasResume ? `${currentSkills.length} verified competencies extracted.` : "Upload your resume in PDF/DOCX to extract skills."}
              </p>
            </div>

            <div className={`p-5 rounded-2xl border ${hasJob ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                {hasJob ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-amber-500" />}
                <span className="font-bold text-sm text-[#0f172a]">Target Job & Company</span>
              </div>
              <p className="text-xs text-[#64748b]">
                {hasJob ? `${targetRole} at ${targetCompany}` : "Select a target position from Live Jobs or Matched Companies."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            {!hasResume && (
              <button
                onClick={() => onSelectTab("resume")}
                className="px-6 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Upload Resume First
              </button>
            )}
            {hasResume && !hasJob && (
              <button
                onClick={() => onSelectTab("live-jobs")}
                className="px-6 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                <Briefcase className="w-4 h-4" />
                Select a Target Job
              </button>
            )}
          </div>

          {/* Quick Match Selector if resume has matching companies */}
          {hasResume && parseResult?.matchingCompanies?.length > 0 && (
            <div className="mt-10 pt-8 border-t border-slate-100 max-w-2xl mx-auto">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                Or Generate Immediately For One Of Your Matched Target Roles:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {parseResult.matchingCompanies.slice(0, 4).map((c: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (onSelectJob) onSelectJob({ company: c.company, title: c.role, description: `Target role at ${c.company}` });
                    }}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 text-left transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="text-sm font-bold text-[#0f172a]">{c.role}</div>
                      <div className="text-xs text-[#64748b]">{c.company}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-blue-500 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── RENDER ACTIVE CAREER ROADMAP ───────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8">
      {/* ── HEADER BANNER ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 md:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700 uppercase tracking-wide">
                {targetDomain} Domain
              </span>
              <span className="px-3 py-1 rounded-full bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                {targetCompany}
              </span>
              {roadmap?.generated_at && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Last Updated: {new Date(roadmap.generated_at).toLocaleDateString()}
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-[#0f172a]">
              {targetRole}
            </h1>
            <p className="text-sm text-[#64748b] max-w-2xl">
              Evidence-based career acceleration roadmap generated specifically for{" "}
              <strong className="text-slate-800 font-semibold">{targetRole}</strong> at{" "}
              <strong className="text-slate-800 font-semibold">{targetCompany}</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => handleGenerateRoadmap(Boolean(roadmap))}
              disabled={isLoading || isRegenerating}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2 disabled:opacity-60 active:scale-[0.98]"
            >
              {isRegenerating || isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing & Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  {roadmap ? "Regenerate Roadmap" : "Generate Roadmap"}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Rate limit or transparent error banner */}
        {errorMessage && (
          <div className="mt-5 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-900 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{errorMessage}</p>
              {roadmap && (
                <p className="text-xs text-amber-700 mt-1">
                  Showing your previously persisted roadmap below.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── 3-COLUMN OVERVIEW METRICS & EVIDENCE ───────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Target Role & Evidence */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">
              <Target className="w-4 h-4" />
              Target Position Context
            </div>
            <h3 className="text-lg font-bold text-[#0f172a] mb-1">{targetRole}</h3>
            <p className="text-xs font-semibold text-slate-500 mb-3">{targetCompany}</p>
            <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
              {jobDescription || `Standard competencies and engineering criteria for ${targetRole} within the ${targetDomain} sector.`}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Domain Category</span>
            <span className="font-bold text-slate-800 uppercase">{targetDomain}</span>
          </div>
        </div>

        {/* Card 2: Candidate's Current Verified Skills */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-wider mb-3">
              <CheckCircle className="w-4 h-4" />
              Verified Resume Skills ({currentSkills.length})
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
              {currentSkills.slice(0, 10).map((skill, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200/80 text-[11px] font-semibold text-emerald-800 flex items-center gap-1"
                >
                  <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                  {skill}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-emerald-700 font-semibold flex items-center gap-1">
            <ShieldCheck className="w-4 h-4" />
            Verified against uploaded resume
          </div>
        </div>

        {/* Card 3: Priority Skill Gaps */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-rose-600 uppercase tracking-wider mb-3">
              <AlertTriangle className="w-4 h-4" />
              Priority Skill Gaps ({roadmap?.priority_skill_gaps?.length || missingSkillsFromJob.length || 0})
            </div>
            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {(roadmap?.priority_skill_gaps || []).slice(0, 4).map((gap: SkillGapItem, idx: number) => (
                <div key={idx} className="p-2 rounded-lg bg-rose-50/60 border border-rose-100 text-xs flex items-start justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-800">{gap.skill}</span>
                    <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{gap.why_gap_exists}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                    gap.priority === "Critical" ? "bg-rose-600 text-white" : "bg-amber-100 text-amber-800"
                  }`}>
                    {gap.priority}
                  </span>
                </div>
              ))}
              {(!roadmap?.priority_skill_gaps || roadmap.priority_skill_gaps.length === 0) && (
                <p className="text-xs text-slate-400 italic">
                  Generate roadmap to calculate role-specific priority gaps.
                </p>
              )}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>Derived from JD vs Resume</span>
            <span className="font-bold text-rose-600">Sequential Focus</span>
          </div>
        </div>
      </div>

      {/* ── INTERVIEW EVIDENCE INSIGHTS BANNER ─────────────────────────────── */}
      {roadmap?.interview_insights && (
        <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-5 flex items-start gap-3.5">
          <Award className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="text-xs text-indigo-950 space-y-1">
            <span className="font-bold uppercase tracking-wider text-indigo-700 text-[11px]">
              Interview Remediation Applied
            </span>
            <p className="text-slate-700 font-medium leading-relaxed">
              {roadmap.interview_insights.interview_evidence_applied}
            </p>
            {roadmap.interview_insights.identified_weaknesses && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-slate-500">Flagged Weaknesses Targeted:</span>
                {roadmap.interview_insights.identified_weaknesses.map((w, idx) => (
                  <span key={idx} className="font-semibold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded">
                    {w}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ROADMAP PHASES NAVIGATION ───────────────────────────────────────── */}
      {roadmap ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-xl font-extrabold text-[#0f172a]">Sequential 9-Month Roadmap</h2>
              <p className="text-xs text-slate-500">
                Building competencies progressively: Fundamentals → Specialization → Production Readiness
              </p>
            </div>

            {/* Tab switchers */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
              {[
                { id: "0-3", label: "0–3 Months", subtitle: "Fundamentals" },
                { id: "3-6", label: "3–6 Months", subtitle: "Projects" },
                { id: "6-9", label: "6–9 Months", subtitle: "Mastery" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActivePhase(tab.id as any)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activePhase === tab.id
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* ACTIVE PHASE CONTENT */}
          {(() => {
            const currentPhaseData: RoadmapPhase =
              activePhase === "0-3"
                ? roadmap.phases.phase_0_3
                : activePhase === "3-6"
                ? roadmap.phases.phase_3_6
                : roadmap.phases.phase_6_9;

            return (
              <div className="space-y-6">
                {/* Phase Overview Header */}
                <div className="bg-gradient-to-r from-slate-900 to-[#1e293b] text-white p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                      Phase Focus
                    </span>
                    <h3 className="text-lg font-bold text-white mt-0.5">
                      {currentPhaseData.phase_title}
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                      {currentPhaseData.phase_objective}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="px-3 py-1.5 rounded-xl bg-white/10 text-xs font-bold text-white">
                      {currentPhaseData.items?.length || 0} Core Competencies
                    </span>
                  </div>
                </div>

                {/* Structured Items Grid */}
                <div className="grid grid-cols-1 gap-6">
                  {(currentPhaseData.items || []).map((item: RoadmapItem) => (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl border border-slate-200/90 p-6 hover:border-blue-300 transition-all shadow-sm space-y-4"
                    >
                      {/* Top Item Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-extrabold text-sm shrink-0">
                            <BookOpen className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-base font-bold text-[#0f172a]">{item.skill}</h4>
                            <p className="text-xs text-slate-500">{item.learning_objective}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${
                              item.priority === "Critical"
                                ? "bg-rose-100 text-rose-800 border border-rose-200"
                                : item.priority === "High"
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-blue-100 text-blue-800 border border-blue-200"
                            }`}
                          >
                            {item.priority} Priority
                          </span>
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                              item.current_status === "Strong"
                                ? "bg-emerald-100 text-emerald-800"
                                : item.current_status === "Partial"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {item.current_status}
                          </span>
                        </div>
                      </div>

                      {/* Detail 1: Specific "Why Required" Reason */}
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                          Why You Need It
                        </span>
                        <p className="text-xs text-slate-800 font-medium leading-relaxed">
                          {item.why_needed}
                        </p>
                      </div>

                      {/* Detail 2: JD / Role Evidence */}
                      <div className="flex items-start gap-2 text-xs text-slate-600">
                        <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-slate-800 font-semibold">Evidence Basis: </strong>
                          <span>{item.evidence}</span>
                        </div>
                      </div>

                      {/* Detail 3: Practical Project / Task */}
                      <div className="p-3.5 rounded-xl bg-blue-50/40 border border-blue-100">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 mb-1">
                          <Layers className="w-4 h-4" />
                          Practical Hands-on Project / Task
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          {item.practical_project}
                        </p>
                      </div>

                      {/* Detail 4: Verified Clickable Source Link */}
                      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-semibold text-slate-700">Recommended Resource:</span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-medium">
                            {item.source_type}
                          </span>
                        </div>

                        <a
                          href={item.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-800 font-semibold text-xs transition-colors cursor-pointer group"
                        >
                          <span>{item.source_title || item.recommended_source}</span>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        /* Call to Action to generate if context is ready */
        <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-4">
          <Sparkles className="w-10 h-10 text-blue-600 mx-auto" />
          <h3 className="text-xl font-bold text-[#0f172a]">
            Ready to Build Your Career Intelligence Roadmap
          </h3>
          <p className="text-sm text-[#64748b] max-w-lg mx-auto">
            Generate an evidence-based roadmap tailored to {targetRole} at {targetCompany} using your {currentSkills.length} verified resume skills.
          </p>
          <button
            onClick={() => handleGenerateRoadmap(false)}
            disabled={isLoading}
            className="px-6 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 shadow-md transition-all cursor-pointer inline-flex items-center gap-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {isLoading ? "Generating Evidence-Based Roadmap..." : "Generate Career Roadmap Now"}
          </button>
        </div>
      )}
    </div>
  );
};
