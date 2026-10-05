// Canonical Interview Question Generation Engine Types
// Phase: Canonical Question Engine - YATRA platform
import { z } from 'zod';

export type QuestionCategory =
  | 'REPORTED'
  | 'OFFICIAL_DERIVED'
  | 'RESUME_BASED'
  | 'AI_PREDICTED';

export type InterviewRoundName =
  | 'Online Assessment'
  | 'Aptitude'
  | 'Quantitative'
  | 'Logical Reasoning'
  | 'Verbal'
  | 'Coding'
  | 'Technical DSA'
  | 'AI/ML Domain Technical'
  | 'Domain Technical'
  | 'System Design'
  | 'LLD'
  | 'HLD'
  | 'Managerial'
  | 'Behavioral'
  | 'GD'
  | 'HR'
  | 'Final';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type FreshnessWindow =
  | '0-30_days'
  | '31-90_days'
  | '3-12_months'
  | '1-2_years'
  | 'historical';

// ── 1. REPORTED METADATA ──────────────────────────────────────────────────────
export interface ReportedQuestionSource {
  platform: string;          // e.g. "GeeksforGeeks", "Glassdoor", "LeetCode Discuss", "Reddit"
  url: string;               // Direct or permalink URL
  title: string;             // Title of post/experience report
  published_date: string | null;  // YYYY-MM-DD or null
  interview_date: string | null;  // YYYY-MM-DD or null (MUST NOT invent)
  location?: string | null;
  candidate_type?: string | null; // e.g. "Campus", "Off-Campus", "Experienced", "NQT Ninja/Digital"
  evidence_summary: string;       // Context snippet of the reported question
}

// ── 2. OFFICIAL DERIVED METADATA ──────────────────────────────────────────────
export interface OfficialDerivedSource {
  platform: string;          // e.g. "TCS Careers Official", "Company Recruitment Portal"
  url: string;               // Official guidance / career process link
  title: string;             // Page / guide title
  published_date: string | null;
}

// ── 3. RESUME-BASED METADATA ──────────────────────────────────────────────────
export interface ResumeBasedMetadata {
  resume_section: 'skills' | 'projects' | 'experience' | 'education' | 'certifications' | 'achievements';
  resume_item: string;       // Specific project name or metric claim from resume
  reason_generated: string;  // Why interviewer would probe this exact claim/skill
}

// ── 4. AI-PREDICTED METADATA ──────────────────────────────────────────────────
export interface AIPredictedMetadata {
  reason_generated: string;
  inputs_used: string[];     // e.g. ["Company Tech Stack", "JD Requirement: Distributed Systems", "Skill Gap: Kafka"]
  prediction_confidence: ConfidenceLevel;
}

// ── CANONICAL INTERVIEW QUESTION ──────────────────────────────────────────────
export interface CanonicalInterviewQuestion {
  question_id: string;       // e.g. "Q001", "Q002" - STABLE across Normal and VR
  question_text: string;
  company: string;
  role: string;
  round: InterviewRoundName | string;
  category: QuestionCategory;
  confidence: ConfidenceLevel;
  freshness?: FreshnessWindow | string;
  relevance_score: number;   // 0 - 100
  
  // Specific metadata based on category
  source?: ReportedQuestionSource | OfficialDerivedSource | null;
  resume_metadata?: ResumeBasedMetadata | null;
  prediction_metadata?: AIPredictedMetadata | null;

  // Question execution metadata for interviewers
  what_we_look_for?: string;
  follow_up_hint?: string;
  expected_depth?: 'junior' | 'mid' | 'senior';
  time_limit_seconds?: number;
}

export interface DetectedRound {
  round_name: InterviewRoundName | string;
  description: string;
  evidence: string;
  confidence: ConfidenceLevel;
  order: number;
}

// ── CANONICAL PERSISTED INTERVIEW QUESTION SET ─────────────────────────────────
export interface InterviewQuestionSet {
  set_id: string;            // e.g. "SET_TCS_SE_1740000000"
  company: string;
  role: string;
  job_description?: string | null;
  generated_at: string;
  evidence_window: string;
  rounds: DetectedRound[];
  questions: CanonicalInterviewQuestion[];
  overall_confidence: ConfidenceLevel;
  provider: 'gemini_grounded' | 'verified_offline_engine';
  warnings: string[];
}

// ── INPUT CONTEXT ─────────────────────────────────────────────────────────────
export interface CanonicalQuestionGenerationInput {
  company: string;
  role: string;
  jobDescription?: string | null;
  parsedResume?: any;        // Full parsed resume object from Resume Intelligence
  user_id?: string;
}

// ── ZOD SCHEMAS FOR STRICT STRUCTURED VALIDATION ──────────────────────────────
export const ReportedSourceSchema = z.object({
  platform: z.string(),
  url: z.string(),
  title: z.string(),
  published_date: z.string().nullable().default(null),
  interview_date: z.string().nullable().default(null),
  location: z.string().nullable().default(null),
  candidate_type: z.string().nullable().default(null),
  evidence_summary: z.string().default(''),
});

export const OfficialDerivedSourceSchema = z.object({
  platform: z.string(),
  url: z.string(),
  title: z.string(),
  published_date: z.string().nullable().default(null),
});

export const ResumeBasedMetadataSchema = z.object({
  resume_section: z.enum(['skills', 'projects', 'experience', 'education', 'certifications', 'achievements']),
  resume_item: z.string(),
  reason_generated: z.string(),
});

export const AIPredictedMetadataSchema = z.object({
  reason_generated: z.string(),
  inputs_used: z.array(z.string()).default([]),
  prediction_confidence: z.enum(['high', 'medium', 'low']).default('medium'),
});

export const CanonicalQuestionSchema = z.object({
  question_id: z.string(),
  question_text: z.string(),
  company: z.string(),
  role: z.string(),
  round: z.string(),
  category: z.enum(['REPORTED', 'OFFICIAL_DERIVED', 'RESUME_BASED', 'AI_PREDICTED']),
  confidence: z.enum(['high', 'medium', 'low']).default('medium'),
  freshness: z.string().optional(),
  relevance_score: z.number().min(0).max(100).default(85),
  source: z.union([ReportedSourceSchema, OfficialDerivedSourceSchema]).nullable().optional(),
  resume_metadata: ResumeBasedMetadataSchema.nullable().optional(),
  prediction_metadata: AIPredictedMetadataSchema.nullable().optional(),
  what_we_look_for: z.string().optional(),
  follow_up_hint: z.string().optional(),
  expected_depth: z.enum(['junior', 'mid', 'senior']).default('junior'),
  time_limit_seconds: z.number().default(120),
});

export const DetectedRoundSchema = z.object({
  round_name: z.string(),
  description: z.string(),
  evidence: z.string(),
  confidence: z.enum(['high', 'medium', 'low']).default('medium'),
  order: z.number(),
});

export const InterviewQuestionSetSchema = z.object({
  set_id: z.string(),
  company: z.string(),
  role: z.string(),
  job_description: z.string().nullable().optional(),
  generated_at: z.string(),
  evidence_window: z.string().default('last_90_days'),
  rounds: z.array(DetectedRoundSchema).default([]),
  questions: z.array(CanonicalQuestionSchema).default([]),
  overall_confidence: z.enum(['high', 'medium', 'low']).default('high'),
  provider: z.enum(['gemini_grounded', 'verified_offline_engine']).default('verified_offline_engine'),
  warnings: z.array(z.string()).default([]),
});

// ── INTERVIEW SESSION STATE PERSISTENCE ───────────────────────────────────────
export interface InterviewSession {
  id: string;
  user_id: string;
  job_id?: string;
  question_set_id: string;
  company: string;
  role: string;
  job_description?: string;
  current_question_id: string;
  current_question_order: number;
  answers: Record<string, string>;
  is_completed: boolean;
  interview_mode: 'normal' | 'vr';
  created_at: string;
  updated_at: string;
}

export const InterviewSessionSchema = z.object({
  id: z.string(),
  user_id: z.string().default('guest'),
  job_id: z.string().optional(),
  question_set_id: z.string(),
  company: z.string(),
  role: z.string(),
  job_description: z.string().optional(),
  current_question_id: z.string().default('Q001'),
  current_question_order: z.number().default(0),
  answers: z.record(z.string(), z.string()).default({}),
  is_completed: z.boolean().default(false),
  interview_mode: z.enum(['normal', 'vr']).default('normal'),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});


// ── BACKWARD COMPATIBILITY TYPES (Legacy Consumers) ───────────────────────────
export interface InterviewQuestion {
  id: string;
  category: string;
  question: string;
  testsSkill: string;
  expectedDepth: 'junior' | 'mid' | 'senior';
  followUpHints?: string[];
  source: 'llm' | 'fallback';
}

export interface QuestionGenerationInput {
  resumeProfile: {
    domain: string;
    skills: string[];
    projects: string[];
    experienceYears?: number;
  };
  matchedJob: {
    title: string;
    company: string;
    description: string;
    requiredSkills: string[];
    missingSkills: string[];
  };
}

export interface QuestionGenerationResult {
  questions: InterviewQuestion[];
  groundedSkills: string[];
  provider: 'gemini' | 'fallback';
  warnings: string[];
}
