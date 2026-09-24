import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Job } from "../lib/jobs/types";
import { EnrichedJob, determinePrimaryTargetRole, enrichJobsWithMatching } from "../lib/jobs/liveJobMatcher";
import { CandidateProfile, deriveJobSearchContext, computeSearchContextKey } from "../types/candidateProfile";
import { 
  Briefcase, 
  MapPin, 
  Building2, 
  Calendar, 
  ExternalLink, 
  Search, 
  AlertCircle, 
  Loader2, 
  DollarSign, 
  Tag, 
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Info,
  Sparkles,
  ArrowUpDown,
  Filter,
  Check,
  Award
} from "lucide-react";

interface SearchResponse {
  success: boolean;
  query?: string;
  total?: number;
  jobs?: (Job | EnrichedJob)[];
  error?: {
    code: string;
    message: string;
  };
}

export interface LiveJobsViewProps {
  candidateProfile?: CandidateProfile;
  onPrepareInterview?: (job: EnrichedJob) => void;
}

export const LiveJobsView: React.FC<LiveJobsViewProps> = ({ candidateProfile, onPrepareInterview }) => {
  // Infer initial role query if candidate profile is present
  const defaultQuery = useMemo(() => {
    if (candidateProfile) {
      return determinePrimaryTargetRole(candidateProfile);
    }
    return "Graduate Engineer Trainee";
  }, [candidateProfile?.primaryRole, candidateProfile?.domain]);

  const [query, setQuery] = useState(defaultQuery);
  const [location, setLocation] = useState("India");
  const [jobs, setJobs] = useState<EnrichedJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Sort and Filter States
  const [sortBy, setSortBy] = useState<"match" | "recent" | "salary">("match");
  const [filterTier, setFilterTier] = useState<"all" | "strong" | "good">("all");

  // Lifecycle control refs
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const activeRequestIdRef = useRef<number>(0);
  const lastExecutedSearchKeyRef = useRef<string | null>(null);

  // Core search execution function with cancellation, stale response guard, and deduplication
  const executeSearch = useCallback(async (
    targetQuery: string,
    targetLoc: string,
    options?: { force?: boolean }
  ) => {
    const searchContext = deriveJobSearchContext(candidateProfile, targetLoc, targetQuery);
    const searchKey = computeSearchContextKey(searchContext);

    // If identical search has already executed and not forced, do not re-fetch!
    if (!options?.force && lastExecutedSearchKeyRef.current === searchKey) {
      return;
    }

    // Cancel any previous in-flight request
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    activeAbortControllerRef.current = abortController;
    const currentRequestId = ++activeRequestIdRef.current;
    lastExecutedSearchKeyRef.current = searchKey;

    setJobs((currentJobs) => {
      if (currentJobs.length > 0) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      return currentJobs; // Preserve existing jobs in state during refresh
    });
    setError(null);

    try {
      const res = await fetch("/api/jobs/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: abortController.signal,
        body: JSON.stringify({
          query: targetQuery,
          location: targetLoc,
          page: 1,
          candidateProfile: candidateProfile || undefined,
        }),
      });

      // Ignore if a newer request was dispatched while this was in-flight
      if (currentRequestId !== activeRequestIdRef.current) {
        return;
      }

      const data: SearchResponse = await res.json();

      if (currentRequestId !== activeRequestIdRef.current) {
        return;
      }

      if (data.success && Array.isArray(data.jobs)) {
        let jobList = data.jobs as EnrichedJob[];
        if (candidateProfile) {
          jobList = enrichJobsWithMatching(data.jobs as Job[], candidateProfile);
        }
        setJobs(jobList);
        setError(null);
      } else {
        setJobs([]);
        setError({
          code: data.error?.code || "SEARCH_FAILED",
          message: data.error?.message || "Failed to fetch jobs from provider.",
        });
      }
    } catch (err: any) {
      if (err?.name === "AbortError") {
        // Expected cancellation of obsolete request
        return;
      }
      if (currentRequestId !== activeRequestIdRef.current) {
        return;
      }
      setJobs([]);
      setError({
        code: "NETWORK_ERROR",
        message: err?.message || "Unable to reach server job search endpoint.",
      });
    } finally {
      if (currentRequestId === activeRequestIdRef.current) {
        setLoading(false);
        setIsRefreshing(false);
        setHasSearched(true);
      }
    }
  }, [candidateProfile]);

  // Stable scalar dependencies derived from candidate profile
  const profileDomain = candidateProfile?.domain || "unclassified";
  const profilePrimaryRole = candidateProfile?.primaryRole || null;
  const profileSkillsKey = Array.isArray(candidateProfile?.skills)
    ? [...candidateProfile.skills].map(s => s.toLowerCase().trim()).sort().join(",")
    : "";

  // React ONLY to meaningful search inputs:
  // 1. Candidate profile's domain/role/skills change
  // Mouse movement, hover, scrolling, typing, and unrelated parent renders CANNOT trigger this effect!
  useEffect(() => {
    let initialQuery = query;
    if (candidateProfile) {
      const suggested = determinePrimaryTargetRole(candidateProfile);
      setQuery(suggested);
      initialQuery = suggested;
    }

    executeSearch(initialQuery, location);

    return () => {
      // Abort in-flight request when component unmounts
      if (activeAbortControllerRef.current) {
        activeAbortControllerRef.current.abort();
      }
    };
  }, [profileDomain, profilePrimaryRole, profileSkillsKey]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query, location);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Recently posted";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (_) {
      return dateStr;
    }
  };

  // Filtered and Sorted Jobs
  const displayJobs = useMemo(() => {
    let filtered = [...jobs];

    // Filter by match tier if enriched
    if (filterTier === "strong") {
      filtered = filtered.filter((j) => (j.matchScore ?? 0) >= 85);
    } else if (filterTier === "good") {
      filtered = filtered.filter((j) => (j.matchScore ?? 0) >= 70);
    }

    // Sort by criteria
    if (sortBy === "match") {
      filtered.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
    } else if (sortBy === "recent") {
      filtered.sort((a, b) => {
        const da = new Date(a.postedAt || 0).getTime();
        const db = new Date(b.postedAt || 0).getTime();
        return db - da;
      });
    } else if (sortBy === "salary") {
      filtered.sort((a, b) => {
        const sa = a.salaryMax ?? a.salaryMin ?? 0;
        const sb = b.salaryMax ?? b.salaryMin ?? 0;
        return sb - sa;
      });
    }

    return filtered;
  }, [jobs, filterTier, sortBy]);

  const getTierColor = (score?: number) => {
    if (score == null) return "bg-slate-100 text-slate-700 border-slate-200";
    if (score >= 85) return "bg-emerald-500/15 text-emerald-700 border-emerald-300 dark:border-emerald-800 dark:text-emerald-300";
    if (score >= 70) return "bg-blue-500/15 text-blue-700 border-blue-300 dark:border-blue-800 dark:text-blue-300";
    if (score >= 55) return "bg-amber-500/15 text-amber-700 border-amber-300 dark:border-amber-800 dark:text-amber-300";
    return "bg-rose-500/15 text-rose-700 border-rose-300 dark:border-rose-800 dark:text-rose-300";
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#0f172a] tracking-tight">
            Live Job Openings
          </h2>
          <p className="text-sm text-[#64748b] max-w-2xl leading-relaxed">
            Real vacancies from the <strong>Adzuna Index</strong>. Compatibility scores computed from your verified resume profile.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#64748b]">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Powered by Adzuna API</span>
        </div>
      </div>

      {/* Candidate Profile Bar */}
      {candidateProfile && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[#64748b]">Your Profile:</span>
            <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold uppercase tracking-wider">
              {candidateProfile.domain || "General"}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold">
              Target: {determinePrimaryTargetRole(candidateProfile)}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
              {candidateProfile.skills?.length || 0} Skills
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Matching against live postings</span>
          </div>
        </div>
      )}

      {/* Search Filter Controls */}
      <form
        onSubmit={handleFormSubmit}
        className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-4"
      >
        <div className="flex-1 relative">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Job Title / Keyword
          </label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Mechanical Design Engineer, Structural Engineer, Full Stack Developer"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        <div className="w-full md:w-72 relative">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Location
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. India, Bangalore, Pune"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        <div className="flex items-end pt-1 md:pt-5">
          <button
            type="submit"
            disabled={loading}
            className="w-full md:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Querying Adzuna...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Find Live Jobs
              </>
            )}
          </button>
        </div>
      </form>

      {/* Sorting & Filter Toolbar */}
      {!loading && jobs.length > 0 && (
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mr-1">
              <Filter className="w-3.5 h-3.5" />
              Filter by Match:
            </span>
            <button
              onClick={() => setFilterTier("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterTier === "all"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              All Openings ({jobs.length})
            </button>
            <button
              onClick={() => setFilterTier("strong")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterTier === "strong"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              Strong Match (85%+)
            </button>
            <button
              onClick={() => setFilterTier("good")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterTier === "good"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              Good Match (70%+)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5" />
              Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              <option value="match">Highest Compatibility</option>
              <option value="recent">Most Recent Posting</option>
              <option value="salary">Highest Stated Salary</option>
            </select>
          </div>
        </div>
      )}

      {/* Error Alert Box */}
      {error && (
        <div className="bg-amber-50 border border-amber-300/80 rounded-2xl p-5 text-amber-900 shadow-sm flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-amber-950">Provider Error:</span>
              <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-amber-200/70 text-amber-900 font-semibold">
                {error.code}
              </span>
            </div>
            <p className="text-sm mt-1 text-amber-800">{error.message}</p>
          </div>
          <button
            onClick={() => executeSearch(query, location, { isUserInitiated: true })}
            className="px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* Results Header */}
      {hasSearched && !error && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-3">
            <div className="text-sm font-semibold text-slate-700">
              Showing <span className="text-blue-600 font-extrabold text-base">{displayJobs.length}</span> live vacancies for{" "}
              <span className="text-slate-900 font-bold">"{query}"</span> in{" "}
              <span className="text-slate-900 font-bold">{location || "India"}</span>
            </div>
            {isRefreshing && (
              <span className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-medium bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 rounded-full">
                <Loader2 className="w-3 h-3 animate-spin" />
                Refreshing...
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Score is calculated from candidate profile and information available in the job posting snippet.</span>
          </div>
        </div>
      )}

      {/* Initial Loading Skeleton (only displayed when no jobs are cached yet) */}
      {loading && jobs.length === 0 && (
        <div className="space-y-4">
          <div className="p-8 bg-blue-50/60 border border-blue-200/80 rounded-2xl text-center flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <h4 className="text-base font-bold text-slate-800">Finding live jobs matching your profile...</h4>
            <p className="text-xs text-slate-500">Querying real-time vacancies from Adzuna Index and computing compatibility scores.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-white rounded-2xl border border-slate-200/80 p-6 animate-pulse flex flex-col gap-3">
                <div className="h-5 bg-slate-200 rounded-md w-3/4"></div>
                <div className="h-4 bg-slate-100 rounded-md w-1/2"></div>
                <div className="h-20 bg-slate-50 rounded-md w-full mt-2"></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Job Cards Grid (Preserved during refresh to prevent layout collapse) */}
      {displayJobs.length > 0 && (
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-5 transition-opacity duration-200 ${isRefreshing ? 'opacity-75' : 'opacity-100'}`}>
          {displayJobs.map((job) => {
            const hasMatchData = job.matchScore !== undefined;

            return (
              <div
                key={job.id}
                className="bg-white rounded-2xl border border-slate-200/80 hover:border-blue-400 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  {/* Top Header: Title, Category & Compatibility Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-base text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                        {job.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs font-medium text-slate-600 mt-1.5">
                        <span className="inline-flex items-center gap-1.5 text-slate-800 font-semibold">
                          <Building2 className="w-3.5 h-3.5 text-blue-500" />
                          {job.company}
                        </span>
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {job.location}
                        </span>
                      </div>
                    </div>

                    {/* Compatibility Score Pill */}
                    {hasMatchData && (
                      <div className="flex flex-col items-end shrink-0">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-extrabold ${getTierColor(job.matchScore)}`}>
                          <Award className="w-3.5 h-3.5" />
                          <span>{job.matchScore}% Compatibility</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">
                          {job.matchTier || "Evaluated"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Compatibility Breakdown (Skill 50%, Role 35%, Experience 15%) */}
                  {hasMatchData && (
                    <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200/70 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <span>Compatibility Breakdown</span>
                        <span className="text-[10px] lowercase font-normal text-slate-400">weighted composite</span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white p-2 rounded-lg border border-slate-100">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Skill Match</span>
                          <span className="text-xs font-extrabold text-blue-600">{job.skillScore ?? 0}%</span>
                          <div className="w-full bg-slate-100 h-1 rounded-full mt-1 overflow-hidden">
                            <div className="bg-blue-600 h-full rounded-full" style={{ width: `${job.skillScore ?? 0}%` }}></div>
                          </div>
                        </div>

                        <div className="bg-white p-2 rounded-lg border border-slate-100">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Role Alignment</span>
                          <span className="text-xs font-extrabold text-indigo-600">{job.roleScore ?? 0}%</span>
                          <div className="w-full bg-slate-100 h-1 rounded-full mt-1 overflow-hidden">
                            <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${job.roleScore ?? 0}%` }}></div>
                          </div>
                        </div>

                        <div className="bg-white p-2 rounded-lg border border-slate-100">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Experience Fit</span>
                          <span className="text-xs font-extrabold text-emerald-600">{job.experienceScore ?? 0}%</span>
                          <div className="w-full bg-slate-100 h-1 rounded-full mt-1 overflow-hidden">
                            <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${job.experienceScore ?? 0}%` }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Matched Skills & Skill Gaps Tags */}
                  {hasMatchData && (
                    <div className="space-y-2.5">
                      {/* Matched Skills */}
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                          Matched Skills ({job.matchedSkills?.length || 0}):
                        </span>
                        {job.matchedSkills && job.matchedSkills.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {job.matchedSkills.map((s, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200"
                              >
                                <Check className="w-3 h-3 text-emerald-600" />
                                {s}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No specific direct skill overlap detected in available snippet</span>
                        )}
                      </div>

                      {/* Missing Skills / Skill Gap */}
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                          Skill Gaps Based on Available Text:
                        </span>
                        {job.missingSkills && job.missingSkills.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {job.missingSkills.map((s, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200"
                              >
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                {s}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 bg-slate-50 border border-slate-200/60 px-2.5 py-1 rounded-lg inline-block">
                            No disclosed skill gaps in available posting snippet
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Why This Job Matches Rationale */}
                  {job.matchRationale && (
                    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 text-xs text-blue-900 leading-relaxed">
                      <span className="font-bold text-blue-950 block text-[10px] uppercase tracking-wider mb-0.5">
                        Match Rationale:
                      </span>
                      {job.matchRationale}
                    </div>
                  )}

                  {/* Description Excerpt */}
                  {job.description && (
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                      {job.description}
                    </p>
                  )}

                  {/* Salary Tag */}
                  {(job.salaryMin !== null || job.salaryMax !== null) && (
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-lg">
                      <DollarSign className="w-3.5 h-3.5" />
                      {job.salaryMin && job.salaryMax
                        ? `₹${job.salaryMin.toLocaleString()} - ₹${job.salaryMax.toLocaleString()}`
                        : job.salaryMin
                        ? `From ₹${job.salaryMin.toLocaleString()}`
                        : `Up to ₹${job.salaryMax?.toLocaleString()}`}
                    </div>
                  )}
                </div>

                {/* Bottom Footer: Posting Metadata & Actions */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1 text-[11px]">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Posted: {formatDate(job.postedAt)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {onPrepareInterview && (
                      <button
                        onClick={() => onPrepareInterview(job)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-all shadow-sm hover:shadow cursor-pointer active:scale-95"
                      >
                        Prepare Interview
                      </button>
                    )}

                    {job.url && (
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-sm hover:shadow cursor-pointer active:scale-95"
                      >
                        View Job
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && hasSearched && displayJobs.length === 0 && !error && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center">
          <Briefcase className="w-12 h-12 text-slate-300 mb-3" />
          <h4 className="text-base font-bold text-slate-800">No suitable live openings found</h4>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            Try adjusting your search keyword, resetting filter options, or broadening the location.
          </p>
        </div>
      )}
    </div>
  );
};
