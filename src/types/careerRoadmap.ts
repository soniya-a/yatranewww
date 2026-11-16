export type RoadmapItemPriority = "Critical" | "High" | "Medium";
export type RoadmapItemStatus = "Strong" | "Partial" | "Missing";

export interface RoadmapItem {
  id: string;
  skill: string;
  priority: RoadmapItemPriority;
  why_needed: string; // Specific rationale citing company/JD/role
  evidence: string; // Exact evidence from company/JD/role/interview
  current_status: RoadmapItemStatus;
  learning_objective: string;
  practical_project: string; // Concrete project or task
  recommended_source: string; // Name of recommended source
  source_title: string;
  source_type: string;
  source_url: string; // Clickable verified URL
  source_reason: string;
}

export interface RoadmapPhase {
  phase_id: "0-3" | "3-6" | "6-9";
  phase_title: string;
  phase_objective: string;
  items: RoadmapItem[];
}

export interface SkillGapItem {
  skill: string;
  priority: RoadmapItemPriority;
  status: RoadmapItemStatus;
  why_gap_exists: string; // JD requirement, company/role evidence, interview evidence
  evidence_source: string;
  interview_evidence?: string;
}

export interface CareerIntelligenceRoadmap {
  id?: string;
  user_id?: string;
  job_id?: string;
  company: string;
  role: string;
  domain: string;
  job_description_snippet?: string;
  generated_at: string; // ISO date
  updated_at?: string;

  target_summary: {
    company: string;
    role: string;
    domain: string;
    match_score?: number;
    total_required_skills: number;
    matched_skills_count: number;
    gap_count: number;
  };

  current_skills: string[]; // Actual parsed/verified resume skills
  priority_skill_gaps: SkillGapItem[]; // Priority skill gaps (REQUIRED minus CURRENT)

  phases: {
    phase_0_3: RoadmapPhase;
    phase_3_6: RoadmapPhase;
    phase_6_9: RoadmapPhase;
  };

  interview_insights?: {
    past_interview_score?: number;
    identified_weaknesses?: string[];
    interview_evidence_applied?: string;
  };

  source_metadata: {
    primary_sources_count: number;
    verified_urls_count: number;
    model: string;
  };

  status?: string;
}

export interface RoadmapGenerationInput {
  userId?: string;
  company: string;
  role: string;
  domain?: string;
  jobId?: string;
  jobDescription?: string;
  resumeSkills: string[];
  resumeProjects?: Array<{ name: string; description?: string; technologies?: string[] }>;
  experienceYears?: number;
  candidateName?: string;
  matchedSkills?: string[];
  missingSkills?: string[];
  interviewSkillGaps?: string[];
  interviewEvidence?: Array<{
    company: string;
    role: string;
    score: number;
    weaknesses: string[];
    feedback?: string;
  }>;
}
