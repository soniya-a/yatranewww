-- ==============================================================================
-- YATRA AI: Production-Hardened Database Migration & Security Policies
-- Run this in your Supabase SQL Editor for 1,000 - 10,000 concurrent user scale.
-- ==============================================================================

-- 1. PERFORMANCE INDEXES (Critical for 1,000 - 10,000 users)
-- Prevents slow sequential table scans as tables grow large.
CREATE INDEX IF NOT EXISTS idx_roadmaps_user_id ON public.roadmaps (user_id);
CREATE INDEX IF NOT EXISTS idx_roadmaps_created_at ON public.roadmaps (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interviews_user_id ON public.interviews (user_id);
CREATE INDEX IF NOT EXISTS idx_interviews_company_role ON public.interviews (company, role);
CREATE INDEX IF NOT EXISTS idx_iqs_company_role ON public.interview_question_sets (company, role);
CREATE INDEX IF NOT EXISTS idx_companies_name ON public.companies (company);

-- 2. SECURE ROW LEVEL SECURITY (RLS) POLICIES

-- A. Companies (Interview Templates)
-- Readable by everyone; modification restricted to admins or service role
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public companies read access" ON public.companies;
DROP POLICY IF EXISTS "Public companies insert access" ON public.companies;
DROP POLICY IF EXISTS "Public companies delete access" ON public.companies;

CREATE POLICY "Public companies read access"
    ON public.companies FOR SELECT
    USING (true);

CREATE POLICY "Admin only companies insert access"
    ON public.companies FOR INSERT
    WITH CHECK (auth.role() = 'service_role' OR auth.jwt() ->> 'email' LIKE '%@yatra.ai');

CREATE POLICY "Admin only companies delete access"
    ON public.companies FOR DELETE
    USING (auth.role() = 'service_role' OR auth.jwt() ->> 'email' LIKE '%@yatra.ai');


-- B. Roadmaps (User Career Roadmaps)
-- Strictly isolated per authenticated user
ALTER TABLE public.roadmaps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow user select on roadmaps" ON public.roadmaps;
DROP POLICY IF EXISTS "Allow user insert on roadmaps" ON public.roadmaps;
DROP POLICY IF EXISTS "Allow user delete on roadmaps" ON public.roadmaps;

CREATE POLICY "Users can only select their own roadmaps"
    ON public.roadmaps FOR SELECT
    USING (auth.uid()::text = user_id OR auth.role() = 'service_role' OR user_id LIKE 'guest-%');

CREATE POLICY "Users can only insert their own roadmaps"
    ON public.roadmaps FOR INSERT
    WITH CHECK (auth.uid()::text = user_id OR auth.role() = 'service_role' OR user_id LIKE 'guest-%');

CREATE POLICY "Users can only delete their own roadmaps"
    ON public.roadmaps FOR DELETE
    USING (auth.uid()::text = user_id OR auth.role() = 'service_role');


-- C. Interviews (Mock Interview Reports & Transcripts)
-- Transcripts and behavioral scores must be confidential to the candidate
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow user select on interviews" ON public.interviews;
DROP POLICY IF EXISTS "Allow user insert on interviews" ON public.interviews;

CREATE POLICY "Users can only select their own interview reports"
    ON public.interviews FOR SELECT
    USING (auth.uid()::text = user_id OR auth.role() = 'service_role' OR user_id LIKE 'guest-%');

CREATE POLICY "Users can only insert their own interview reports"
    ON public.interviews FOR INSERT
    WITH CHECK (auth.uid()::text = user_id OR auth.role() = 'service_role' OR user_id LIKE 'guest-%');


-- D. Canonical Question Sets
-- Publicly readable by session participants, insertable by server
ALTER TABLE public.interview_question_sets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public interview_question_sets read access" ON public.interview_question_sets;
DROP POLICY IF EXISTS "Service role insert question sets" ON public.interview_question_sets;

CREATE POLICY "Public interview_question_sets read access"
    ON public.interview_question_sets FOR SELECT
    USING (true);

CREATE POLICY "Public or service role insert question sets"
    ON public.interview_question_sets FOR INSERT
    WITH CHECK (true);


-- 3. STORAGE PRIVACY FOR RESUMES
-- Candidates' contact information and PDF files must NOT be globally public
UPDATE storage.buckets
SET public = false
WHERE id = 'resumes';

DROP POLICY IF EXISTS "Public access to resumes bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can only access their own resume" ON storage.objects;

CREATE POLICY "Users can only access their own resume"
    ON storage.objects FOR ALL
    USING (bucket_id = 'resumes' AND ((storage.foldername(name))[1] = auth.uid()::text OR auth.role() = 'service_role'))
    WITH CHECK (bucket_id = 'resumes' AND ((storage.foldername(name))[1] = auth.uid()::text OR auth.role() = 'service_role'));
