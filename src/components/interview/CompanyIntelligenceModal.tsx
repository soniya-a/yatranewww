import React, { useState, useEffect, useCallback } from "react";
import {
  Building2,
  Briefcase,
  Cpu,
  Calendar,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  BookOpen,
  Filter,
  Loader2,
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Monitor,
  Glasses,
  Layers,
} from "lucide-react";

type CanonicalRoundCategory =
  | "Aptitude"
  | "Technical"
  | "Coding / Practical"
  | "Managerial"
  | "HR";

interface CompanyIntelligenceQuestion {
  id: string;
  company: string;
  role: string;
  branch: string;
  round: CanonicalRoundCategory;
  question: string;
  difficulty: "Easy" | "Medium" | "Hard";
  category: "REPORTED" | "OFFICIAL_DERIVED" | "AI_PREDICTED";
  source_title: string | null;
  source_url: string | null;
  published_date: string | null;
  interview_date: string | null;
  what_we_look_for?: string;
  follow_up_hint?: string;
}

interface RoundMetadata {
  round: CanonicalRoundCategory;
  is_evidence_supported: boolean;
  label: string;
  description: string;
  question_count: number;
}

interface CompanyIntelligenceData {
  company: string;
  role: string;
  branch: string;
  branch_topics: string[];
  period: "6m" | "1y";
  search_provider_used: string;
  retrieved_at: string;
  canonical_set_id: string;
  rounds: RoundMetadata[];
  evidence_supported_rounds: CanonicalRoundCategory[];
  suggested_preparation_rounds: CanonicalRoundCategory[];
  reported_questions: CompanyIntelligenceQuestion[];
  official_derived_questions: CompanyIntelligenceQuestion[];
  ai_predicted_questions: CompanyIntelligenceQuestion[];
  total_verified_count: number;
  notice?: string;
}

export interface CompanyIntelligenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: any | null;
  candidateProfile?: any;
  onStartDirectInterview: (job: any) => void;
  onStartVRInterview: (job: any) => void;
}

export const CompanyIntelligenceModal: React.FC<CompanyIntelligenceModalProps> = ({
  isOpen,
  onClose,
  job,
  candidateProfile,
  onStartDirectInterview,
  onStartVRInterview,
}) => {
  const [period, setPeriod] = useState<"6m" | "1y">("6m");
  const [selectedRound, setSelectedRound] = useState<string>("All");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("All");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CompanyIntelligenceData | null>(null);

  const fetchIntelligence = useCallback(
    async (targetPeriod: "6m" | "1y", forceRefresh = false) => {
      if (!job?.company || !job?.title) return;
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/interview/company-intelligence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company: job.company,
            role: job.title,
            domain: candidateProfile?.domain || undefined,
            candidateSkills: candidateProfile?.skills || job.matchedSkills || [],
            jobDescription: job.description || "",
            parsedResume: candidateProfile || null,
            period: targetPeriod,
            forceRefresh,
          }),
        });

        if (!res.ok) {
          throw new Error(`Failed to load company intelligence (HTTP ${res.status})`);
        }

        const json: CompanyIntelligenceData = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err?.message || "Could not retrieve company interview intelligence.");
      } finally {
        setLoading(false);
      }
    },
    [job?.company, job?.title, job?.description, candidateProfile]
  );

  useEffect(() => {
    if (isOpen && job) {
      setSelectedRound("All");
      setSelectedDifficulty("All");
      fetchIntelligence(period, false);
    }
  }, [isOpen, job, period, fetchIntelligence]);

  if (!isOpen || !job) return null;

  const filterQuestion = (q: CompanyIntelligenceQuestion) => {
    const roundMatch = selectedRound === "All" || q.round === selectedRound;
    const diffMatch = selectedDifficulty === "All" || q.difficulty === selectedDifficulty;
    return roundMatch && diffMatch;
  };

  const filteredReported = (data?.reported_questions || []).filter(filterQuestion);
  const filteredOfficial = (data?.official_derived_questions || []).filter(filterQuestion);
  const filteredPredicted = (data?.ai_predicted_questions || []).filter(filterQuestion);

  const getDifficultyBadge = (diff: string) => {
    switch (diff) {
      case "Easy":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Hard":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-amber-50 text-amber-800 border-amber-200";
    }
  };

  const renderQuestionCard = (q: CompanyIntelligenceQuestion) => {
    const isVerified = q.category === "REPORTED" || q.category === "OFFICIAL_DERIVED";
    return (
      <div
        key={q.id}
        className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs hover:border-blue-300 transition-all space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Badge */}
            {q.category === "REPORTED" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="w-3 h-3" />
                REPORTED
              </span>
            )}
            {q.category === "OFFICIAL_DERIVED" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                <ShieldCheck className="w-3 h-3" />
                OFFICIAL_DERIVED
              </span>
            )}
            {q.category === "AI_PREDICTED" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
                <Sparkles className="w-3 h-3" />
                AI_PREDICTED
              </span>
            )}

            {/* Round Badge */}
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              Round: {q.round}
            </span>

            {/* Branch Badge */}
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
              {q.branch}
            </span>
          </div>

          {/* Difficulty Badge */}
          <span
            className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${getDifficultyBadge(
              q.difficulty
            )}`}
          >
            {q.difficulty}
          </span>
        </div>

        {/* Question Text */}
        <p className="text-sm font-semibold text-slate-900 leading-relaxed">{q.question}</p>

        {/* What interviewers look for */}
        {q.what_we_look_for && (
          <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200/70 text-xs text-slate-600">
            <span className="font-bold text-slate-800">Evaluation Focus: </span>
            {q.what_we_look_for}
          </div>
        )}

        {/* Source & Dates Footer for Verified Questions */}
        {isVerified && q.source_url && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <a
              href={q.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-bold text-blue-600 hover:text-blue-800 hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {q.source_title || "Original Interview Source"}
            </a>

            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
              {q.published_date && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  Published: <strong className="text-slate-700">{q.published_date}</strong>
                </span>
              )}
              {q.interview_date && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-emerald-500" />
                  Interview Date: <strong className="text-emerald-700">{q.interview_date}</strong>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="company-intel-title"
    >
      <div className="bg-slate-50 rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Top Modal Header */}
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold">
                <Building2 className="w-3.5 h-3.5" />
                {data?.company || job.company}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold">
                <Cpu className="w-3.5 h-3.5" />
                Branch: {data?.branch || "Detecting..."}
              </span>
            </div>
            <h2 id="company-intel-title" className="text-lg md:text-xl font-extrabold text-slate-900">
              {data?.role || job.title} — Company Interview Intelligence
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls Bar: Search Period & Round/Difficulty Filters */}
        <div className="bg-white px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          {/* Search Period Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Search Period:</span>
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setPeriod("6m")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  period === "6m"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Last 6 Months
              </button>
              <button
                type="button"
                onClick={() => setPeriod("1y")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  period === "1y"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Last 1 Year
              </button>
            </div>
            <button
              type="button"
              onClick={() => fetchIntelligence(period, true)}
              disabled={loading}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
              title="Refresh live search"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Round & Difficulty Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                aria-label="Filter by interview round"
                value={selectedRound}
                onChange={(e) => setSelectedRound(e.target.value)}
                className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700"
              >
                <option value="All">All Rounds</option>
                <option value="Aptitude">1. Aptitude</option>
                <option value="Technical">2. Technical</option>
                <option value="Coding / Practical">3. Coding / Practical</option>
                <option value="Managerial">4. Managerial</option>
                <option value="HR">5. HR</option>
              </select>
            </div>

            <select
              aria-label="Filter by difficulty"
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700"
            >
              <option value="All">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-center gap-3">
              <Loader2 className="w-9 h-9 text-blue-600 animate-spin" />
              <h4 className="text-base font-bold text-slate-800">
                Searching {period === "6m" ? "Last 6 Months" : "Last 1 Year"} Interview Intelligence for{" "}
                {job.company}...
              </h4>
              <p className="text-xs text-slate-500 max-w-md">
                Querying public interview experiences and matching questions for {job.title}.
              </p>
            </div>
          ) : error ? (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : data ? (
            <>
              {/* Branch Core Preparation Topics */}
              {data.branch_topics && data.branch_topics.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Branch-Matched Preparation Focus ({data.branch} + {data.role})
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Preparation guidelines (not claimed as company-reported)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {data.branch_topics.map((topic, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50/80 text-indigo-800 border border-indigo-200/80 text-xs font-semibold"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Interview Rounds Breakdown: Evidence-Supported vs Suggested Preparation Rounds */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-600" />
                    Interview Rounds Structure
                  </h3>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Evidence-Supported ({data.evidence_supported_rounds.length})
                    </span>
                    <span className="inline-flex items-center gap-1 text-slate-600 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                      Suggested Preparation ({data.suggested_preparation_rounds.length})
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
                  {data.rounds.map((r) => (
                    <button
                      key={r.round}
                      type="button"
                      onClick={() =>
                        setSelectedRound(selectedRound === r.round ? "All" : r.round)
                      }
                      className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                        selectedRound === r.round
                          ? "ring-2 ring-blue-500 border-blue-400 bg-blue-50/40"
                          : r.is_evidence_supported
                          ? "bg-emerald-50/50 border-emerald-200 hover:border-emerald-300"
                          : "bg-slate-50 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-extrabold text-slate-900">{r.round}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                          {r.question_count} Q
                        </span>
                      </div>
                      <span
                        className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mb-1 ${
                          r.is_evidence_supported
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-200/80 text-slate-700"
                        }`}
                      >
                        {r.is_evidence_supported ? "Evidence-Supported" : "Suggested Prep"}
                      </span>
                      <p className="text-[11px] text-slate-500 line-clamp-2">{r.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Section 1: REPORTED Questions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    1. Reported Candidate Interview Questions ({filteredReported.length})
                  </h3>
                  <span className="text-xs text-slate-500">
                    Verified from public interview experiences ({period === "6m" ? "Last 6 Months" : "Last 1 Year"})
                  </span>
                </div>

                {filteredReported.length > 0 ? (
                  <div className="space-y-3">{filteredReported.map(renderQuestionCard)}</div>
                ) : (
                  <div className="bg-white rounded-xl border border-dashed border-slate-300 p-5 text-center space-y-1">
                    <p className="text-xs font-bold text-slate-700">
                      No verified candidate-reported questions found for {data.company} ({data.role}) in{" "}
                      {period === "6m" ? "the last 6 months" : "the last 1 year"}
                      {selectedRound !== "All" || selectedDifficulty !== "All"
                        ? " matching your current filters"
                        : ""}.
                    </p>
                    <p className="text-[11px] text-slate-500">
                      YATRA never fabricates reported questions or fake source links. Try switching the search period or review the branch-specific practice questions below.
                    </p>
                  </div>
                )}
              </div>

              {/* Section 2: OFFICIAL_DERIVED Questions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    2. Official-Derived Questions ({filteredOfficial.length})
                  </h3>
                  <span className="text-xs text-slate-500">
                    Derived from official company career guides & assessments
                  </span>
                </div>

                {filteredOfficial.length > 0 ? (
                  <div className="space-y-3">{filteredOfficial.map(renderQuestionCard)}</div>
                ) : (
                  <div className="bg-white rounded-xl border border-dashed border-slate-300 p-4 text-center">
                    <p className="text-xs text-slate-500">
                      No separate official assessment syllabus published for {data.company} ({data.role}).
                    </p>
                  </div>
                )}
              </div>

              {/* Section 3: AI_PREDICTED Practice Questions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    3. AI-Generated Branch & Role Practice Questions ({filteredPredicted.length})
                  </h3>
                  <span className="text-xs text-slate-500">
                    Tailored to {data.branch} & {data.role} for practice
                  </span>
                </div>

                {filteredPredicted.length > 0 ? (
                  <div className="space-y-3">{filteredPredicted.map(renderQuestionCard)}</div>
                ) : (
                  <div className="bg-white rounded-xl border border-dashed border-slate-300 p-4 text-center">
                    <p className="text-xs text-slate-500">
                      No practice questions match the selected round/difficulty filter.
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Bottom Footer Actions: Start Direct Interview & Start VR Interview */}
        <div className="bg-white px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Both interview modes use the canonical interview engine for{" "}
              <strong className="text-slate-800">{job.company}</strong>.
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                onClose();
                onStartDirectInterview(job);
              }}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <Monitor className="w-4 h-4" />
              Start Direct Interview
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onStartVRInterview(job);
              }}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <Glasses className="w-4 h-4" />
              Start VR Interview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
