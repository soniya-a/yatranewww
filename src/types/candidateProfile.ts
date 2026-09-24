/**
 * CANONICAL CANDIDATE PROFILE & PHASE 0 DATA CONTRACTS
 * 
 * Single Source of Truth for candidate data across all YATRA subsystems:
 * Resume Parsing -> Canonical CandidateProfile -> Jobs / Interview / Roadmap
 */

export type EngineeringDomain =
  | "civil"
  | "mechanical"
  | "electrical"
  | "electronics"
  | "aerospace"
  | "chemical"
  | "aiml"
  | "data"
  | "software"
  | "architecture"
  | "unclassified";

export type ClassificationStatus = "verified" | "inferred" | "needs_review";
export type ClassificationConfidence = "high" | "medium" | "low";

export interface CandidateSkill {
  name: string;
  normalizedName?: string;
  proficiency?: string; // e.g. "4/5"
  years?: number;
  category?: string;
}

export interface CandidateAchievement {
  description: string;
  metricValue?: number;
  impactScore?: number;
  type?: string;
}

export interface CandidateProfile {
  id?: string;
  fullName?: string;
  rawResumeText?: string;

  // Domain & Role Classification (Strictly verified - never defaults to SWE)
  domain: EngineeringDomain;
  primaryRole: string | null;
  targetRoles: string[];
  classificationStatus: ClassificationStatus;
  classificationConfidence: ClassificationConfidence;
  classificationNotes?: string;

  // Skills
  skills: string[];
  technicalSkills?: CandidateSkill[];

  // Experience & Background
  experienceYears: number;
  experienceLevel?: "Entry" | "Junior" | "Mid" | "Senior" | "Lead";
  achievements?: CandidateAchievement[];

  // Metadata
  updatedAt: string;
  source: "resume_upload" | "manual_entry" | "inferred";
}

// =============================================================================
// STABLE SEMANTIC JOB SEARCH CONTEXT
// =============================================================================

export interface JobSearchContext {
  query: string;
  domain: EngineeringDomain;
  primaryRole: string | null;
  skillsKey: string;
  location: string;
}

/**
 * Computes a deterministic string key from a search context to guarantee
 * that React renders and unrelated state changes never re-trigger searches.
 */
export function computeSearchContextKey(ctx: JobSearchContext): string {
  return `${ctx.query.trim().toLowerCase()}|${ctx.location.trim().toLowerCase()}|${ctx.domain}|${ctx.skillsKey}`;
}

/**
 * Derives a stable semantic job-search context from the canonical candidate profile
 * and search parameters.
 */
export function deriveJobSearchContext(
  profile: CandidateProfile | null | undefined,
  location: string,
  customQuery?: string
): JobSearchContext {
  const normLocation = (location || "India").trim();

  // If candidate has a verified or inferred primary role, use that; otherwise fall back to domain-appropriate or generic
  let roleQuery = "";
  if (customQuery && customQuery.trim().length > 0) {
    roleQuery = customQuery.trim();
  } else if (profile?.primaryRole) {
    roleQuery = profile.primaryRole;
  } else if (profile?.targetRoles && profile.targetRoles.length > 0) {
    roleQuery = profile.targetRoles[0];
  } else if (profile?.domain && profile.domain !== "unclassified") {
    switch (profile.domain) {
      case "civil":
        roleQuery = "Civil Engineer";
        break;
      case "mechanical":
        roleQuery = "Mechanical Engineer";
        break;
      case "architecture":
        roleQuery = "Architectural Engineer";
        break;
      case "electrical":
      case "electronics":
        roleQuery = "Electrical Engineer";
        break;
      case "aiml":
        roleQuery = "Machine Learning Engineer";
        break;
      case "data":
        roleQuery = "Data Engineer";
        break;
      case "software":
        roleQuery = "Software Engineer";
        break;
      default:
        roleQuery = "Graduate Engineer Trainee";
        break;
    }
  } else {
    // Unclassified / no profile: use generic engineering query, NEVER force Software Engineer
    roleQuery = "Graduate Engineer Trainee";
  }

  // Generate deterministic sorted skills key
  const sortedSkills = Array.isArray(profile?.skills)
    ? [...profile.skills].map(s => s.toLowerCase().trim()).sort().join(",")
    : "";

  return {
    query: roleQuery,
    domain: profile?.domain || "unclassified",
    primaryRole: profile?.primaryRole || null,
    skillsKey: sortedSkills,
    location: normLocation
  };
}

// =============================================================================
// PHASE 0 DATA CONTRACTS FOR FUTURE ENGINES (INTERVIEW & ROADMAP)
// =============================================================================

export interface SelectedJob {
  id: string;
  company: string;
  title: string;
  description: string;
  location?: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  category?: string;
  matchedSkills?: string[];
  missingSkills?: string[];
}

export interface JobRequirements {
  requiredSkills: string[];
  preferredSkills?: string[];
  minExperienceYears?: number;
  domain?: EngineeringDomain;
}

export interface InterviewContext {
  interviewType: "technical" | "behavioral" | "mixed" | "vr";
  difficulty: "Entry" | "Mid" | "Advanced";
  targetDomain: EngineeringDomain;
  focusAreas?: string[];
}

export interface PerformanceHistory {
  pastSessionsCount: number;
  averageScore?: number;
  weakSkills?: string[];
}

/**
 * Future Interview Engine Contract
 * CandidateProfile + SelectedJob + JobRequirements + InterviewContext + PerformanceHistory -> InterviewEngine
 */
export interface InterviewEngineInput {
  candidateProfile: CandidateProfile;
  selectedJob?: SelectedJob;
  jobRequirements?: JobRequirements;
  interviewContext: InterviewContext;
  performanceHistory?: PerformanceHistory;
}

export interface SkillGapAnalysis {
  matchedSkills: string[];
  missingSkills: string[];
  transferableSkills?: string[];
  gapSeverity: "low" | "medium" | "high";
}

export interface InterviewEvaluation {
  overallScore: number;
  perQuestionScores?: { questionId: string; score: number; feedback: string }[];
  verifiedStrengths: string[];
  flaggedGaps: string[];
}

/**
 * Future Roadmap Engine Contract
 * CandidateProfile + SelectedJob + SkillGaps + InterviewEvaluation -> RoadmapEngine
 */
export interface RoadmapEngineInput {
  candidateProfile: CandidateProfile;
  selectedJob?: SelectedJob;
  skillGaps: SkillGapAnalysis;
  interviewEvaluation?: InterviewEvaluation;
}
