/**
 * PHASE 2: LIVE JOB MATCHING INTEGRATION
 * 
 * Bridges Candidate Profile (from resume parsing) with live Adzuna jobs:
 * Candidate Profile
 *   → determine primary target role
 *   → query Adzuna
 *   → receive live jobs
 *   → run existing jobMatcher.ts on each job
 *   → rank by overallScore descending
 *   → return enriched jobs.
 */

import { Job, JobProvider } from "./types";
import { matchCandidateToJob, MatchTier } from "./jobMatcher";
import { CandidateProfile } from "../../types/candidateProfile";

export interface EnrichedJob extends Job {
  matchScore: number;
  matchTier: MatchTier;
  skillScore: number;
  roleScore: number;
  experienceScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  matchRationale: string;
}

export interface LiveJobMatchResult {
  total: number;
  targetQuery: string;
  candidateDomain: string;
  jobs: EnrichedJob[];
}

/**
 * Determines the primary target role query for Adzuna based on candidate profile.
 * Strictly respects engineering domain and never forces a software engineering role.
 */
export function determinePrimaryTargetRole(candidate: CandidateProfile): string {
  if (candidate?.primaryRole && candidate.primaryRole.trim().length > 0) {
    return candidate.primaryRole.trim();
  }

  if (Array.isArray(candidate?.targetRoles) && candidate.targetRoles.length > 0) {
    const firstRole = candidate.targetRoles[0]?.trim();
    if (firstRole) return firstRole;
  }

  const dom = (candidate?.domain || "").toLowerCase().trim();
  switch (dom) {
    case "mechanical":
      return "Mechanical Engineer";
    case "civil":
      return "Civil Engineer";
    case "architecture":
      return "Architectural Engineer";
    case "aiml":
      return "Machine Learning Engineer";
    case "electrical":
    case "electronics":
      return "Electrical Engineer";
    case "data":
      return "Data Engineer";
    case "software":
      return "Software Engineer";
    default:
      return "Graduate Engineer Trainee";
  }
}

/**
 * Enriches a collection of raw Adzuna Job items with deterministic compatibility scores.
 * Ranks jobs in descending order by overallScore.
 */
export function enrichJobsWithMatching(
  jobs: Job[],
  candidate: CandidateProfile
): EnrichedJob[] {
  if (!Array.isArray(jobs) || jobs.length === 0) {
    return [];
  }

  const enriched: EnrichedJob[] = jobs.map((job) => {
    const match = matchCandidateToJob(candidate, {
      title: job.title,
      description: job.description,
      category: job.category,
      company: job.company,
    });

    return {
      ...job,
      matchScore: match.overallScore,
      matchTier: match.matchTier,
      skillScore: match.skillScore,
      roleScore: match.roleScore,
      experienceScore: match.experienceScore,
      matchedSkills: match.matchedSkills,
      missingSkills: match.missingSkills,
      matchRationale: match.rationale,
    };
  });

  // Rank locally by overall match score descending
  return enriched.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Performs end-to-end Live Job retrieval and deterministic compatibility ranking.
 */
export async function searchAndMatchLiveJobs(
  provider: JobProvider,
  candidate: CandidateProfile,
  options?: {
    location?: string;
    explicitQuery?: string;
    page?: number;
  }
): Promise<LiveJobMatchResult> {
  const targetQuery = options?.explicitQuery?.trim() || determinePrimaryTargetRole(candidate);
  const location = options?.location?.trim() || "India";
  const page = options?.page && options.page > 0 ? options.page : 1;

  const result = await provider.searchJobs({
    query: targetQuery,
    location,
    page,
  });

  const jobs = enrichJobsWithMatching(result.jobs, candidate);

  return {
    total: typeof result.total === "number" ? result.total : jobs.length,
    targetQuery,
    candidateDomain: candidate.domain || "general",
    jobs,
  };
}
