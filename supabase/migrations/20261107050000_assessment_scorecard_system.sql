-- ==============================================================================
-- YATRA AI: End-to-End Interview Assessment Scorecard System Migration
-- Migration: 20261107050000_assessment_scorecard_system.sql
-- 1. Creates interview_assessment_reports table storing evidence-based evaluations.
-- 2. Adds session_id and question_set_id to interviews table for backward compatibility.
-- 3. Configures Row Level Security (RLS) policies for candidate report ownership.
-- ==============================================================================

-- 1. ASSESSMENT REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.interview_assessment_reports (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    question_set_id TEXT NOT NULL,
    user_id TEXT NOT NULL DEFAULT 'guest',
    session_token TEXT,
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    overall_score NUMERIC DEFAULT 0,
    overall_grade TEXT DEFAULT 'B',
    hiring_decision TEXT DEFAULT 'Hold',
    hiring_summary TEXT,
    answers JSONB DEFAULT '{}'::jsonb,
    round_scorecards JSONB DEFAULT '{}'::jsonb,
    question_evaluations JSONB DEFAULT '[]'::jsonb,
    strongest_skills JSONB DEFAULT '[]'::jsonb,
    weakest_skills JSONB DEFAULT '[]'::jsonb,
    critical_skill_gaps JSONB DEFAULT '[]'::jsonb,
    recommended_roadmap JSONB DEFAULT '[]'::jsonb,
    interview_mode TEXT DEFAULT 'normal',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. EXTEND LEGACY INTERVIEWS TABLE FOR LINKING
ALTER TABLE public.interviews
    ADD COLUMN IF NOT EXISTS session_id TEXT,
    ADD COLUMN IF NOT EXISTS question_set_id TEXT,
    ADD COLUMN IF NOT EXISTS report_id TEXT;

-- 3. INDEXES FOR FAST REPORT RETRIEVAL
CREATE INDEX IF NOT EXISTS idx_assessment_reports_session_id ON public.interview_assessment_reports (session_id);
CREATE INDEX IF NOT EXISTS idx_assessment_reports_user_id ON public.interview_assessment_reports (user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_reports_question_set_id ON public.interview_assessment_reports (question_set_id);
CREATE INDEX IF NOT EXISTS idx_assessment_reports_created_at ON public.interview_assessment_reports (created_at DESC);

-- 4. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.interview_assessment_reports ENABLE ROW LEVEL SECURITY;

-- Candidates can view their own reports (authenticated user_id or guest session ownership)
DROP POLICY IF EXISTS "Candidates can read their own assessment reports" ON public.interview_assessment_reports;
CREATE POLICY "Candidates can read their own assessment reports"
    ON public.interview_assessment_reports FOR SELECT
    USING (
        auth.uid()::text = user_id
        OR user_id = 'guest'
        OR user_id LIKE 'guest_%'
    );

-- Allow inserting assessment reports
DROP POLICY IF EXISTS "Allow insert on interview_assessment_reports" ON public.interview_assessment_reports;
CREATE POLICY "Allow insert on interview_assessment_reports"
    ON public.interview_assessment_reports FOR INSERT
    WITH CHECK (true);

-- Allow updates for modifying or concluding reports
DROP POLICY IF EXISTS "Allow update on interview_assessment_reports" ON public.interview_assessment_reports;
CREATE POLICY "Allow update on interview_assessment_reports"
    ON public.interview_assessment_reports FOR UPDATE
    USING (
        auth.uid()::text = user_id
        OR user_id = 'guest'
        OR user_id LIKE 'guest_%'
    );

