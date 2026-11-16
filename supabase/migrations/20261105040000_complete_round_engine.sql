-- ==============================================================================
-- YATRA AI: Complete Company-Specific Interview Round Engine Migration
-- Migration: 20261105040000_complete_round_engine.sql
-- 1. Extends company_interview_rounds with role applicability, GD flags, and evaluation focus.
-- 2. Extends interview_questions with round-specific assessment fields:
--    - Aptitude: aptitude_options, correct_answer, explanation, difficulty
--    - Coding / OA: constraints, examples, expected_complexity, evaluation_criteria
--    - Technical: expected_points, scoring_rubric
--    - HR & Behavioral: behavioral_criteria
--    - Group Discussion: discussion_context, key_perspectives
-- Safe and non-destructive: uses ADD COLUMN IF NOT EXISTS.
-- ==============================================================================

-- 1. EXTEND COMPANY_INTERVIEW_ROUNDS
ALTER TABLE public.company_interview_rounds
    ADD COLUMN IF NOT EXISTS applicable_roles TEXT[] DEFAULT '{}'::text[],
    ADD COLUMN IF NOT EXISTS requires_gd BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS requires_system_design BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS evaluation_focus TEXT;

-- 2. EXTEND INTERVIEW_QUESTIONS WITH ROUND-SPECIFIC ASSESSMENT METRICS
ALTER TABLE public.interview_questions
    ADD COLUMN IF NOT EXISTS aptitude_options JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS correct_answer TEXT,
    ADD COLUMN IF NOT EXISTS explanation TEXT,
    ADD COLUMN IF NOT EXISTS constraints JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS examples JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS expected_complexity JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS expected_points JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS scoring_rubric JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS behavioral_criteria JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS discussion_context TEXT,
    ADD COLUMN IF NOT EXISTS key_perspectives JSONB DEFAULT '[]'::jsonb;

-- 3. INDEXES FOR ROUND TYPE SEARCH & FILTERING
CREATE INDEX IF NOT EXISTS idx_interview_questions_round_type ON public.interview_questions (round_type);
CREATE INDEX IF NOT EXISTS idx_interview_questions_difficulty ON public.interview_questions (difficulty);
CREATE INDEX IF NOT EXISTS idx_company_interview_rounds_gd ON public.company_interview_rounds (requires_gd);
CREATE INDEX IF NOT EXISTS idx_company_interview_rounds_sys_design ON public.company_interview_rounds (requires_system_design);
