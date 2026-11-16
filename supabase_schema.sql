-- ==============================================================================
-- YATRA AI: Complete Supabase PostgreSQL Schema & Security Policies
-- Run this in your Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. COMPANIES (Interview Templates & Question Banks)
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    difficulty TEXT NOT NULL DEFAULT 'Medium',
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Everyone can read company templates
DROP POLICY IF EXISTS "Public companies read access" ON public.companies;
CREATE POLICY "Public companies read access"
    ON public.companies FOR SELECT
    USING (true);

-- Anyone authenticated or service role can insert/delete companies
DROP POLICY IF EXISTS "Public companies insert access" ON public.companies;
CREATE POLICY "Public companies insert access"
    ON public.companies FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public companies delete access" ON public.companies;
CREATE POLICY "Public companies delete access"
    ON public.companies FOR DELETE
    USING (true);


-- 2. ROADMAPS (Personalized Career Roadmaps)
CREATE TABLE IF NOT EXISTS public.roadmaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    roadmap_title TEXT NOT NULL,
    student_name TEXT DEFAULT 'Student',
    target TEXT NOT NULL,
    start_message TEXT,
    weeks JSONB NOT NULL DEFAULT '[]'::jsonb,
    milestones JSONB NOT NULL DEFAULT '[]'::jsonb,
    daily_routine JSONB DEFAULT '{}'::jsonb,
    final_week_checklist JSONB DEFAULT '[]'::jsonb,
    confidence_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for roadmaps
ALTER TABLE public.roadmaps ENABLE ROW LEVEL SECURITY;

-- Allow users to read and write only their own roadmaps
DROP POLICY IF EXISTS "Allow user select on roadmaps" ON public.roadmaps;
DROP POLICY IF EXISTS "Authenticated users own roadmaps select" ON public.roadmaps;
CREATE POLICY "Authenticated users own roadmaps select"
    ON public.roadmaps FOR SELECT
    USING ((auth.uid() IS NOT NULL AND auth.uid()::text = user_id) OR (user_id = 'guest' OR user_id LIKE 'guest_%'));

DROP POLICY IF EXISTS "Allow user insert on roadmaps" ON public.roadmaps;
DROP POLICY IF EXISTS "Authenticated users own roadmaps insert" ON public.roadmaps;
CREATE POLICY "Authenticated users own roadmaps insert"
    ON public.roadmaps FOR INSERT
    WITH CHECK ((auth.uid() IS NOT NULL AND auth.uid()::text = user_id) OR (user_id = 'guest' OR user_id LIKE 'guest_%'));

DROP POLICY IF EXISTS "Allow user delete on roadmaps" ON public.roadmaps;
DROP POLICY IF EXISTS "Authenticated users own roadmaps delete" ON public.roadmaps;
CREATE POLICY "Authenticated users own roadmaps delete"
    ON public.roadmaps FOR DELETE
    USING (auth.uid() IS NOT NULL AND auth.uid()::text = user_id);


-- 3. INTERVIEWS (Completed Mock Interviews & Report Cards)
CREATE TABLE IF NOT EXISTS public.interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    company TEXT NOT NULL,
    score NUMERIC DEFAULT 0,
    feedback TEXT,
    strengths JSONB DEFAULT '[]'::jsonb,
    weaknesses JSONB DEFAULT '[]'::jsonb,
    transcript JSONB DEFAULT '[]'::jsonb,
    hiring_decision TEXT,
    percentile_estimate NUMERIC,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for interviews
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow user select on interviews" ON public.interviews;
DROP POLICY IF EXISTS "Authenticated users own interviews select" ON public.interviews;
CREATE POLICY "Authenticated users own interviews select"
    ON public.interviews FOR SELECT
    USING ((auth.uid() IS NOT NULL AND auth.uid()::text = user_id) OR (user_id = 'guest' OR user_id LIKE 'guest_%'));

DROP POLICY IF EXISTS "Allow user insert on interviews" ON public.interviews;
DROP POLICY IF EXISTS "Authenticated users own interviews insert" ON public.interviews;
CREATE POLICY "Authenticated users own interviews insert"
    ON public.interviews FOR INSERT
    WITH CHECK ((auth.uid() IS NOT NULL AND auth.uid()::text = user_id) OR (user_id = 'guest' OR user_id LIKE 'guest_%'));


-- 4. STORAGE BUCKET (Resumes)
-- Inserts the 'resumes' bucket into Supabase Storage if it doesn't already exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: allow authenticated users access to their own resume storage folder
DROP POLICY IF EXISTS "Public access to resumes bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users own resume storage access" ON storage.objects;
CREATE POLICY "Authenticated users own resume storage access"
    ON storage.objects FOR ALL
    USING (
        bucket_id = 'resumes' 
        AND (
            auth.uid() IS NULL 
            OR auth.uid()::text = (storage.foldername(name))[1]
            OR name LIKE 'anonymous_%'
            OR name LIKE 'guest_%'
        )
    )
    WITH CHECK (
        bucket_id = 'resumes'
        AND (
            auth.uid() IS NULL 
            OR auth.uid()::text = (storage.foldername(name))[1]
            OR name LIKE 'anonymous_%'
            OR name LIKE 'guest_%'
        )
    );


-- 5. CANONICAL INTERVIEW QUESTION SETS
CREATE TABLE IF NOT EXISTS public.interview_question_sets (
    set_id TEXT PRIMARY KEY,
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    job_description TEXT,
    user_id TEXT DEFAULT 'guest',
    evidence_window TEXT DEFAULT 'last_90_days',
    rounds JSONB NOT NULL DEFAULT '[]'::jsonb,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    overall_confidence TEXT DEFAULT 'high',
    provider TEXT DEFAULT 'gemini_grounded',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for interview_question_sets
ALTER TABLE public.interview_question_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public interview_question_sets read access" ON public.interview_question_sets;
CREATE POLICY "Public interview_question_sets read access"
    ON public.interview_question_sets FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Public interview_question_sets insert access" ON public.interview_question_sets;
CREATE POLICY "Public interview_question_sets insert access"
    ON public.interview_question_sets FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public interview_question_sets update access" ON public.interview_question_sets;
CREATE POLICY "Public interview_question_sets update access"
    ON public.interview_question_sets FOR UPDATE
    USING (true);


-- 6. INTERVIEW SESSIONS (Active & Completed Sessions linked to Canonical Sets)
CREATE TABLE IF NOT EXISTS public.interview_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT DEFAULT 'guest',
    session_token TEXT, -- High-entropy server credential for guest isolation
    question_set_id TEXT NOT NULL REFERENCES public.interview_question_sets(set_id) ON DELETE CASCADE,
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    current_question_id TEXT DEFAULT 'Q001',
    current_question_order INT DEFAULT 0,
    answers JSONB DEFAULT '{}'::jsonb,
    is_completed BOOLEAN DEFAULT false,
    interview_mode TEXT DEFAULT 'normal', -- 'normal' or 'vr'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_interview_sessions_token ON public.interview_sessions (session_token);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_user ON public.interview_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_set ON public.interview_sessions (question_set_id);

-- Enable RLS for interview_sessions
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;

-- Strip ALL old permissive policies
DROP POLICY IF EXISTS "Public interview_sessions read access" ON public.interview_sessions;
DROP POLICY IF EXISTS "Public interview_sessions insert access" ON public.interview_sessions;
DROP POLICY IF EXISTS "Public interview_sessions update access" ON public.interview_sessions;
DROP POLICY IF EXISTS "Allow user select on interview_sessions" ON public.interview_sessions;
DROP POLICY IF EXISTS "Allow user insert on interview_sessions" ON public.interview_sessions;
DROP POLICY IF EXISTS "Allow user update on interview_sessions" ON public.interview_sessions;

-- Zero-Trust Authenticated Ownership Policies (No guest wildcard loopholes)
CREATE POLICY "Authenticated users own sessions select"
    ON public.interview_sessions FOR SELECT
    USING (
        auth.role() = 'service_role' 
        OR (auth.uid() IS NOT NULL AND auth.uid()::text = user_id)
    );

CREATE POLICY "Authenticated users own sessions insert"
    ON public.interview_sessions FOR INSERT
    WITH CHECK (
        auth.role() = 'service_role' 
        OR (auth.uid() IS NOT NULL AND auth.uid()::text = user_id)
    );

CREATE POLICY "Authenticated users own sessions update"
    ON public.interview_sessions FOR UPDATE
    USING (
        auth.role() = 'service_role' 
        OR (auth.uid() IS NOT NULL AND auth.uid()::text = user_id)
    )
    WITH CHECK (
        auth.role() = 'service_role' 
        OR (auth.uid() IS NOT NULL AND auth.uid()::text = user_id)
    );

-- 7. CAREER ROADMAPS (Dynamic Evidence-Based Career Intelligence Roadmaps)
CREATE TABLE IF NOT EXISTS public.career_roadmaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    job_id TEXT,
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    domain TEXT NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT now(),
    roadmap_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    skill_gaps_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    source_metadata JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for career_roadmaps
ALTER TABLE public.career_roadmaps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow user select on career_roadmaps" ON public.career_roadmaps;
CREATE POLICY "Allow user select on career_roadmaps"
    ON public.career_roadmaps FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow user insert on career_roadmaps" ON public.career_roadmaps;
CREATE POLICY "Allow user insert on career_roadmaps"
    ON public.career_roadmaps FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow user update on career_roadmaps" ON public.career_roadmaps;
CREATE POLICY "Allow user update on career_roadmaps"
    ON public.career_roadmaps FOR UPDATE
    USING (true);

DROP POLICY IF EXISTS "Allow user delete on career_roadmaps" ON public.career_roadmaps;
CREATE POLICY "Allow user delete on career_roadmaps"
    ON public.career_roadmaps FOR DELETE
    USING (true);


-- ==============================================================================
-- 8. INTERVIEW INTELLIGENCE ENGINE (Normalized Sources, Experiences & Evidence)
-- ==============================================================================

-- 8.1 INTERVIEW SOURCES (Original permitted post metadata & permalinks)
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

ALTER TABLE public.interview_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public interview_sources read access" ON public.interview_sources;
CREATE POLICY "Public interview_sources read access"
    ON public.interview_sources FOR SELECT
    USING (true);

-- 8.2 INTERVIEW EXPERIENCES (Individual candidate reports & interview rounds)
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

ALTER TABLE public.interview_experiences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public interview_experiences read access" ON public.interview_experiences;
CREATE POLICY "Public interview_experiences read access"
    ON public.interview_experiences FOR SELECT
    USING (true);

-- 8.3 COMPANY INTERVIEW ROUNDS (Evidence-supported round configurations per company/role)
CREATE TABLE IF NOT EXISTS public.company_interview_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    round_name TEXT NOT NULL,                   -- e.g. 'Online Assessment', 'Technical DSA', 'System Design'
    round_order INT NOT NULL DEFAULT 1,
    description TEXT,
    evidence_summary TEXT,
    applicable_roles TEXT[] DEFAULT '{}'::text[],
    requires_gd BOOLEAN DEFAULT false,
    requires_system_design BOOLEAN DEFAULT false,
    evaluation_focus TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company, role, round_name)
);

ALTER TABLE public.company_interview_rounds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public company_interview_rounds read access" ON public.company_interview_rounds;
CREATE POLICY "Public company_interview_rounds read access"
    ON public.company_interview_rounds FOR SELECT
    USING (true);

-- 8.4 INTERVIEW QUESTIONS (Canonical reusable questions with practice specs)
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
    aptitude_options JSONB DEFAULT '[]'::jsonb,
    correct_answer TEXT,
    explanation TEXT,
    constraints JSONB DEFAULT '[]'::jsonb,
    examples JSONB DEFAULT '[]'::jsonb,
    expected_complexity JSONB DEFAULT '{}'::jsonb,
    expected_points JSONB DEFAULT '[]'::jsonb,
    scoring_rubric JSONB DEFAULT '[]'::jsonb,
    behavioral_criteria JSONB DEFAULT '{}'::jsonb,
    discussion_context TEXT,
    key_perspectives JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public interview_questions read access" ON public.interview_questions;
CREATE POLICY "Public interview_questions read access"
    ON public.interview_questions FOR SELECT
    USING (true);

-- 8.5 QUESTION EVIDENCE (M:N Links between Canonical Questions and Experiences)
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

ALTER TABLE public.question_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public question_evidence read access" ON public.question_evidence;
CREATE POLICY "Public question_evidence read access"
    ON public.question_evidence FOR SELECT
    USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_interview_sources_platform ON public.interview_sources (platform);
CREATE INDEX IF NOT EXISTS idx_interview_experiences_company_role ON public.interview_experiences (company, role);
CREATE INDEX IF NOT EXISTS idx_company_interview_rounds_lookup ON public.company_interview_rounds (company, role, round_order);
CREATE INDEX IF NOT EXISTS idx_interview_questions_category ON public.interview_questions (category, round_type);
CREATE INDEX IF NOT EXISTS idx_interview_questions_canonical_title ON public.interview_questions (canonical_title);
CREATE INDEX IF NOT EXISTS idx_question_evidence_q_exp ON public.question_evidence (question_id, experience_id);

-- 9. INTERVIEW ASSESSMENT REPORTS (End-to-End Scorecards)
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

ALTER TABLE public.interview_assessment_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Candidates can read their own assessment reports" ON public.interview_assessment_reports;
CREATE POLICY "Candidates can read their own assessment reports"
    ON public.interview_assessment_reports FOR SELECT
    USING (
        auth.uid()::text = user_id
        OR user_id = 'guest'
        OR user_id LIKE 'guest_%'
    );

DROP POLICY IF EXISTS "Allow insert on interview_assessment_reports" ON public.interview_assessment_reports;
CREATE POLICY "Allow insert on interview_assessment_reports"
    ON public.interview_assessment_reports FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update on interview_assessment_reports" ON public.interview_assessment_reports;
CREATE POLICY "Allow update on interview_assessment_reports"
    ON public.interview_assessment_reports FOR UPDATE
    USING (
        auth.uid()::text = user_id
        OR user_id = 'guest'
        OR user_id LIKE 'guest_%'
    );

CREATE INDEX IF NOT EXISTS idx_assessment_reports_session_id ON public.interview_assessment_reports (session_id);
CREATE INDEX IF NOT EXISTS idx_assessment_reports_user_id ON public.interview_assessment_reports (user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_reports_question_set_id ON public.interview_assessment_reports (question_set_id);

