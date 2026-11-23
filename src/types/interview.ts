// Canonical Interview Question Generation Engine Types
// Phase: Canonical Question Engine - YATRA platform
import { z } from 'zod';

export type QuestionCategory =
  | 'REPORTED'
  | 'OFFICIAL_DERIVED'
  | 'RESUME_BASED'
  | 'AI_PREDICTED';

export type InterviewRoundName =
  | 'Aptitude & Logical Reasoning'
  | 'Coding / Online Assessment'
  | 'Technical DSA'
  | 'Domain-Specific Technical'
  | 'Project & Resume Deep Dive'
  | 'System Design / Low-Level Design'
  | 'HR & Behavioral'
  | 'Group Discussion'
  | 'Online Assessment'
  | 'Aptitude'
  | 'Quantitative'
  | 'Logical Reasoning'
  | 'Verbal'
  | 'Coding'
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
  author?: string | null;
}

// ── 1.1 QUESTION EVIDENCE (1-to-N Link between Question and Independent Candidate Experiences)
export interface QuestionEvidence {
  evidence_id?: string;
  source_id?: string;
  experience_id?: string;
  platform: string;               // e.g. "LeetCode Discuss", "GeeksforGeeks", "Reddit"
  url: string;                    // Exact permalink to post
  title: string;                  // Post title
  author?: string | null;         // Post author or 'Anonymous'
  published_date?: string | null; // YYYY-MM-DD or null
  interview_date?: string | null; // Actual interview date or null (NEVER invented)
  location?: string | null;       // Candidate location (e.g. "Bangalore, India")
  candidate_type?: string | null; // e.g. "SDE-1", "Campus", "Experienced"
  round_name?: string | null;     // e.g. "Technical DSA Round 1"
  excerpt: string;                // Verbatim candidate excerpt reporting this question
  reported_difficulty?: string | null;
  confidence?: ConfidenceLevel;
}

// ── 1.2 NORMALIZED ENTITIES ──────────────────────────────────────────────────
export interface InterviewSource {
  id: string;
  platform: string;
  url: string;
  title: string;
  author?: string | null;
  published_date?: string | null;
  retrieved_at: string;
  raw_content?: string | null;
  metadata?: Record<string, any>;
}

export interface InterviewExperience {
  id: string;
  source_id: string;
  company: string;
  company_raw?: string | null;
  role: string;
  role_raw?: string | null;
  level?: string | null;
  location?: string | null;
  interview_date?: string | null;
  outcome?: string | null;
  overall_difficulty?: string | null;
  summary?: string | null;
}

export interface CompanyInterviewRound {
  id: string;
  company: string;
  role: string;
  round_name: string;
  round_order: number;
  description?: string | null;
  evidence_summary?: string | null;
  is_active: boolean;
  applicable_roles?: string[];
  requires_gd?: boolean;
  requires_system_design?: boolean;
  evaluation_focus?: string;
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
  branch?: string;           // e.g. "EEE", "ECE", "CSE", "Mechanical", "Civil"
  round: InterviewRoundName | string;
  category: QuestionCategory;
  confidence: ConfidenceLevel;
  freshness?: FreshnessWindow | string;
  relevance_score: number;   // 0 - 100
  requires_coding?: boolean; // Strictly true ONLY when question explicitly requires writing code or an SQL query
  coding_language?: string;  // e.g. "python", "sql", "c", "cpp", "javascript", "java"
  
  // Specific metadata based on category
  source?: ReportedQuestionSource | OfficialDerivedSource | null;
  resume_metadata?: ResumeBasedMetadata | null;
  prediction_metadata?: AIPredictedMetadata | null;

  // Question execution metadata for interviewers
  what_we_look_for?: string;
  follow_up_hint?: string;
  expected_depth?: 'junior' | 'mid' | 'senior';
  time_limit_seconds?: number;

  // Enhanced Katkat & InterviewDrip multi-evidence fields
  canonical_title?: string;
  evidence_list?: QuestionEvidence[];
  independent_reports_count?: number;
  frequency_3m?: number;
  frequency_6m?: number;
  slot_number?: number;      // 1 to 10

  // ── Round-Specific Assessment & Evaluation Criteria ─────────────────────────
  difficulty?: 'Easy' | 'Medium' | 'Hard' | string;
  // Aptitude fields
  aptitude_options?: string[];
  correct_answer?: string;
  explanation?: string;
  // Coding / Online Assessment fields
  constraints?: string[];
  examples?: Array<{ input: string; output: string; explanation?: string }>;
  expected_complexity?: { time: string; space: string };
  // Technical & Project Deep Dive rubrics
  expected_points?: string[];
  scoring_rubric?: Array<{ criterion: string; weight: number; description: string }> | string;
  // HR / Behavioral Criteria
  behavioral_criteria?: {
    competency?: string;
    positive_indicators?: string[];
    negative_indicators?: string[];
  };
  // Group Discussion fields
  discussion_context?: string;
  key_perspectives?: string[];
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
  branch?: string | null;     // Optional explicit engineering branch
  roundName?: string | null;  // e.g. 'Online Assessment', 'Technical DSA', 'System Design', 'Behavioral & Leadership'
  jobDescription?: string | null;
  parsedResume?: any;        // Full parsed resume object from Resume Intelligence
  candidateSkills?: string | null; // Raw or comma-separated skills list
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
  canonical_title: z.string().optional(),
  evidence_list: z.array(z.any()).optional().default([]),
  independent_reports_count: z.number().optional().default(1),
  slot_number: z.number().optional(),
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
  session_token?: string; // High-entropy cryptographic token for guest candidate ownership
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
  session_token: z.string().optional(),
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

// ── 5. ASSESSMENT SCORECARD & REPORT TYPES ────────────────────────────────────
export interface RubricCriterionScore {
  criterion: string;
  weight: number;
  score: number;      // 0 - 100
  comment: string;
}

export interface QuestionEvaluation {
  question_id: string;              // e.g. "Q001"
  canonical_title: string;
  question_text?: string;
  round: string;
  category: QuestionCategory;
  candidate_answer: string;
  submitted_code?: string;
  code_execution_result?: {
    status: 'passed' | 'error' | 'not_run';
    language: string;
    output: string;
    error?: string;
  };
  is_answered: boolean;
  answer_status?: 'correct' | 'partially_correct' | 'incorrect' | 'unanswered';
  score: number;                     // 0 - 100
  max_score: number;                 // 100
  marks_awarded?: number;            // 0 - 100
  marks_deducted?: number;           // 0 - 100
  verdict: 'Excellent' | 'Good' | 'Average' | 'Weak' | 'Unanswered';
  rubric_breakdown?: RubricCriterionScore[];
  strengths: string[];
  missing_concepts: string[];
  feedback: string;
  expected_answer_summary?: string;
  code_evaluation_note?: string;
}

export interface RoundScorecardDimensions {
  correctness: number;               // 0 - 100
  technical_depth: number;           // 0 - 100
  problem_solving: number;           // 0 - 100
  communication?: number;            // 0 - 100 (relevant only for non-MCQ rounds)
}

export interface RoundScorecard {
  round_name: string;
  round_order: number;
  score: number;                     // 0 - 100
  dimensions: RoundScorecardDimensions;
  strengths: string[];
  weaknesses: string[];
  missing_concepts: string[];
  improvement_suggestions: string[];
  questions_evaluated: number;
  questions_answered: number;
}

export interface RecommendedRoadmapItem {
  topic: string;
  action: string;
  timeline: string;
  resources: string[];
}

export interface ProctoringEventLog {
  timestamp: number;
  iso_time?: string;
  event_type: string;
  duration_ms?: number;
  details?: string;
}

export interface ProctoringReport {
  observed_events: {
    camera_permission: string;
    screen_share_permission: string;
    screen_share_active: boolean;
    face_present_checks: number;
    face_missing_count: number;
    face_missing_duration_ms: number;
    multiple_faces_count: number;
    head_movement_count: number;
    camera_disconnect_count: number;
    screen_share_interruptions: number;
    tab_switch_count: number;
    tab_hidden_duration_ms: number;
    total_interruptions: number;
    event_timeline: ProctoringEventLog[];
  };
  interpretation: {
    integrity_status: 'Clean Session' | 'Minor Interruptions Observed' | 'Review Recommended';
    head_movement_note: string;
    phone_detection_note: string;
    summary: string;
  };
}

export interface ReportSummaryMetrics {
  total_questions_asked: number;
  correct_count: number;
  partially_correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  total_marks_awarded: number;
  total_marks_deducted: number;
  total_max_marks: number;
}

export interface InterviewAssessmentReport {
  id: string;                        // e.g. "RPT_AMZ_1730000000"
  session_id: string;
  question_set_id: string;
  user_id: string;
  session_token?: string;
  company: string;
  role: string;
  overall_score: number;             // 0 - 100
  overall_grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D';
  hiring_decision: 'Strong Hire' | 'Hire' | 'Lean Hire' | 'Hold' | 'Reject';
  hiring_summary: string;
  summary_metrics?: ReportSummaryMetrics;
  round_scorecards: Record<string, RoundScorecard>;
  question_evaluations: QuestionEvaluation[];
  strongest_skills: string[];
  weakest_skills: string[];
  critical_skill_gaps: string[];
  recommended_roadmap: RecommendedRoadmapItem[];
  proctoring_report?: ProctoringReport;
  coding_execution_capabilities?: {
    sandbox_available: boolean;
    evaluation_mode: string;
    note: string;
  };
  interview_mode: 'normal' | 'vr';
  created_at: string;
  updated_at?: string;
}

export interface InterviewEvaluationInput {
  reportId?: string;
  sessionId?: string;
  questionSetId: string;
  userId?: string;
  sessionToken?: string;
  authToken?: string;
  company: string;
  role: string;
  answers: Record<string, string>;
  codeAnswers?: Record<string, string>;
  codeExecutionResults?: Record<string, { status: 'passed' | 'error' | 'not_run'; language: string; output: string; error?: string }>;
  chatHistory?: Array<{ role: string; text: string; question_id?: string }>;
  behaviorLogs?: Array<{ timestamp: number; marker: string; confidence?: number; durationMs?: number; details?: string }>;
  proctoringTelemetry?: any;
  parsedResume?: any;
  interviewMode?: 'normal' | 'vr';
}


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
