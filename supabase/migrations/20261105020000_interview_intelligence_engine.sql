-- ==============================================================================
-- YATRA AI: Normalized Interview Intelligence Engine Schema
-- Migration: 20261105020000_interview_intelligence_engine.sql
-- Run this in your Supabase Dashboard -> SQL Editor -> New Query -> Run
-- Safe and non-destructive: creates 5 normalized tables, indexes, and RLS policies.
-- Does NOT delete, drop, or alter existing question sets or interview sessions.
-- ==============================================================================

-- 1. INTERVIEW SOURCES (Original permitted post metadata & permalinks)
CREATE TABLE IF NOT EXISTS public.interview_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT NOT NULL,                     -- e.g. 'LeetCode Discuss', 'GeeksforGeeks', 'Reddit'
    url TEXT NOT NULL UNIQUE,                   -- Direct permalink URL to the original experience
    title TEXT NOT NULL,                        -- Title of the post
    author TEXT,                                -- Author handle or 'Anonymous Candidate'
    published_date DATE,                        -- Publication date (YYYY-MM-DD) or NULL
    retrieved_at TIMESTAMPTZ DEFAULT now(),
    raw_content TEXT,                           -- Permitted content snippet or post summary
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for interview_sources
ALTER TABLE public.interview_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public interview_sources read access" ON public.interview_sources;
CREATE POLICY "Public interview_sources read access"
    ON public.interview_sources FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Service role modify interview_sources" ON public.interview_sources;
CREATE POLICY "Service role modify interview_sources"
    ON public.interview_sources FOR ALL
    USING (auth.role() = 'service_role' OR auth.jwt() ->> 'email' LIKE '%@yatra.ai')
    WITH CHECK (auth.role() = 'service_role' OR auth.jwt() ->> 'email' LIKE '%@yatra.ai');


-- 2. INTERVIEW EXPERIENCES (Individual candidate reports & interview rounds)
CREATE TABLE IF NOT EXISTS public.interview_experiences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES public.interview_sources(id) ON DELETE CASCADE,
    company TEXT NOT NULL,                      -- Normalized company (e.g. 'Amazon', 'Google', 'TCS')
    company_raw TEXT,                           -- Company string in post (e.g. 'Amazon AWS')
    role TEXT NOT NULL,                         -- Normalized role (e.g. 'Software Engineer')
    role_raw TEXT,                              -- Role string in post (e.g. 'SDE-1 (L4)')
    level TEXT,                                 -- e.g. 'Entry / Fresher', 'L4 / SDE-1', 'Senior'
    location TEXT,                              -- e.g. 'Bangalore, India', 'Seattle, WA', 'Remote'
    interview_date DATE,                        -- Actual interview date (or NULL if not stated)
    outcome TEXT,                               -- e.g. 'Offer', 'Rejected', 'Pending'
    overall_difficulty TEXT,                    -- e.g. 'Medium', 'Hard'
    summary TEXT,                               -- Brief synopsis of candidate loop
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for interview_experiences
ALTER TABLE public.interview_experiences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public interview_experiences read access" ON public.interview_experiences;
CREATE POLICY "Public interview_experiences read access"
    ON public.interview_experiences FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Service role modify interview_experiences" ON public.interview_experiences;
CREATE POLICY "Service role modify interview_experiences"
    ON public.interview_experiences FOR ALL
    USING (auth.role() = 'service_role' OR auth.jwt() ->> 'email' LIKE '%@yatra.ai')
    WITH CHECK (auth.role() = 'service_role' OR auth.jwt() ->> 'email' LIKE '%@yatra.ai');


-- 3. COMPANY INTERVIEW ROUNDS (Evidence-supported round configurations per company/role)
CREATE TABLE IF NOT EXISTS public.company_interview_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    round_name TEXT NOT NULL,                   -- e.g. 'Online Assessment', 'Technical DSA', 'System Design'
    round_order INT NOT NULL DEFAULT 1,
    description TEXT,
    evidence_summary TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company, role, round_name)
);

-- Enable RLS for company_interview_rounds
ALTER TABLE public.company_interview_rounds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public company_interview_rounds read access" ON public.company_interview_rounds;
CREATE POLICY "Public company_interview_rounds read access"
    ON public.company_interview_rounds FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Service role modify company_interview_rounds" ON public.company_interview_rounds;
CREATE POLICY "Service role modify company_interview_rounds"
    ON public.company_interview_rounds FOR ALL
    USING (auth.role() = 'service_role' OR auth.jwt() ->> 'email' LIKE '%@yatra.ai')
    WITH CHECK (auth.role() = 'service_role' OR auth.jwt() ->> 'email' LIKE '%@yatra.ai');


-- 4. INTERVIEW QUESTIONS (Canonical reusable questions with practice specs)
CREATE TABLE IF NOT EXISTS public.interview_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canonical_title TEXT NOT NULL,              -- e.g. 'LRU Cache Design', 'Top K Frequent Elements'
    category TEXT NOT NULL DEFAULT 'REPORTED',  -- 'REPORTED', 'OFFICIAL_DERIVED', 'RESUME_BASED', 'AI_PREDICTED'
    primary_domain TEXT NOT NULL DEFAULT 'technical',
    round_type TEXT NOT NULL,                   -- Matches round_name (e.g. 'Technical DSA')
    difficulty TEXT NOT NULL DEFAULT 'Medium',  -- 'Easy', 'Medium', 'Hard'
    problem_statement TEXT NOT NULL,            -- Enriched practice question statement
    what_we_look_for TEXT,
    follow_up_hint TEXT,
    expected_depth TEXT DEFAULT 'junior',       -- 'junior', 'mid', 'senior'
    time_limit_seconds INT DEFAULT 150,
    independent_reports_count INT DEFAULT 1,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for interview_questions
ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public interview_questions read access" ON public.interview_questions;
CREATE POLICY "Public interview_questions read access"
    ON public.interview_questions FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Service role modify interview_questions" ON public.interview_questions;
CREATE POLICY "Service role modify interview_questions"
    ON public.interview_questions FOR ALL
    USING (auth.role() = 'service_role' OR auth.jwt() ->> 'email' LIKE '%@yatra.ai')
    WITH CHECK (auth.role() = 'service_role' OR auth.jwt() ->> 'email' LIKE '%@yatra.ai');


-- 5. QUESTION EVIDENCE (M:N Links between Canonical Questions and Experiences)
CREATE TABLE IF NOT EXISTS public.question_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES public.interview_questions(id) ON DELETE CASCADE,
    experience_id UUID NOT NULL REFERENCES public.interview_experiences(id) ON DELETE CASCADE,
    source_id UUID NOT NULL REFERENCES public.interview_sources(id) ON DELETE CASCADE,
    excerpt TEXT NOT NULL,                      -- Verbatim excerpt from candidate report
    round_name TEXT,
    reported_difficulty TEXT,
    confidence TEXT DEFAULT 'high',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(question_id, experience_id)
);

-- Enable RLS for question_evidence
ALTER TABLE public.question_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public question_evidence read access" ON public.question_evidence;
CREATE POLICY "Public question_evidence read access"
    ON public.question_evidence FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Service role modify question_evidence" ON public.question_evidence;
CREATE POLICY "Service role modify question_evidence"
    ON public.question_evidence FOR ALL
    USING (auth.role() = 'service_role' OR auth.jwt() ->> 'email' LIKE '%@yatra.ai')
    WITH CHECK (auth.role() = 'service_role' OR auth.jwt() ->> 'email' LIKE '%@yatra.ai');


-- 6. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_interview_sources_platform ON public.interview_sources (platform);
CREATE INDEX IF NOT EXISTS idx_interview_experiences_company_role ON public.interview_experiences (company, role);
CREATE INDEX IF NOT EXISTS idx_company_interview_rounds_lookup ON public.company_interview_rounds (company, role, round_order);
CREATE INDEX IF NOT EXISTS idx_interview_questions_category ON public.interview_questions (category, round_type);
CREATE INDEX IF NOT EXISTS idx_interview_questions_canonical_title ON public.interview_questions (canonical_title);
CREATE INDEX IF NOT EXISTS idx_question_evidence_q_exp ON public.question_evidence (question_id, experience_id);

