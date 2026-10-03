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

-- Allow users to read and write their own roadmaps
DROP POLICY IF EXISTS "Allow user select on roadmaps" ON public.roadmaps;
CREATE POLICY "Allow user select on roadmaps"
    ON public.roadmaps FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow user insert on roadmaps" ON public.roadmaps;
CREATE POLICY "Allow user insert on roadmaps"
    ON public.roadmaps FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow user delete on roadmaps" ON public.roadmaps;
CREATE POLICY "Allow user delete on roadmaps"
    ON public.roadmaps FOR DELETE
    USING (true);


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
CREATE POLICY "Allow user select on interviews"
    ON public.interviews FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow user insert on interviews" ON public.interviews;
CREATE POLICY "Allow user insert on interviews"
    ON public.interviews FOR INSERT
    WITH CHECK (true);


-- 4. STORAGE BUCKET (Resumes)
-- Inserts the 'resumes' bucket into Supabase Storage if it doesn't already exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: allow public uploads and downloads to 'resumes'
DROP POLICY IF EXISTS "Public access to resumes bucket" ON storage.objects;
CREATE POLICY "Public access to resumes bucket"
    ON storage.objects FOR ALL
    USING (bucket_id = 'resumes')
    WITH CHECK (bucket_id = 'resumes');
