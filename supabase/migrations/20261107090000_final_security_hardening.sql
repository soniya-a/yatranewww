-- ==============================================================================
-- YATRA: Zero-Trust Security & Ownership Hardening Migration (Production Final)
-- File: supabase/migrations/20261107090000_final_security_hardening.sql
--
-- Security Guarantees:
-- 1. Strictly enforces auth.uid()::text = user_id for candidate personal data.
-- 2. Eliminates all unrestricted guest conditions from PostgreSQL RLS:
--    - NO user_id = 'guest'
--    - NO user_id LIKE 'guest_%'
--    - NO name LIKE 'anonymous_%'
--    - NO name LIKE 'guest_%'
-- 3. Dynamic purge drops all pre-existing permissive/leaky policies on the 5 candidate tables.
-- 4. Storage Bucket Hardening:
--    - 'resumes' bucket set to private (public = false).
--    - Uses a PostgreSQL RESTRICTIVE guard policy (AS RESTRICTIVE) so NO other
--      permissive policy on storage.objects can EVER bypass folder ownership isolation.
-- 5. Preserves all shared interview questions, companies, benchmarks, and existing user data.
-- 6. Idempotent & Non-destructive: safe to re-run; will never delete tables or existing rows.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- STEP 1: Enable & Force Row Level Security (RLS) on candidate personal tables
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.career_roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.interview_assessment_reports ENABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.interviews FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.roadmaps FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.career_roadmaps FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.interview_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.interview_assessment_reports FORCE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- STEP 2: Dynamically drop ALL pre-existing policies on candidate tables
-- Prevents any legacy, custom, or auto-generated permissive policy from surviving.
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename, schemaname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename IN (
              'interviews', 
              'roadmaps', 
              'career_roadmaps', 
              'interview_sessions', 
              'interview_assessment_reports'
          )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- STEP 3: Explicitly drop historically known policy names (redundant safety)
-- ------------------------------------------------------------------------------
-- Interviews
DROP POLICY IF EXISTS "Allow user select on interviews" ON public.interviews;
DROP POLICY IF EXISTS "Allow user insert on interviews" ON public.interviews;
DROP POLICY IF EXISTS "Allow user update on interviews" ON public.interviews;
DROP POLICY IF EXISTS "Allow user delete on interviews" ON public.interviews;
DROP POLICY IF EXISTS "Authenticated users own interviews select" ON public.interviews;
DROP POLICY IF EXISTS "Authenticated users own interviews insert" ON public.interviews;
DROP POLICY IF EXISTS "Authenticated users own interviews update" ON public.interviews;
DROP POLICY IF EXISTS "Authenticated users own interviews delete" ON public.interviews;
DROP POLICY IF EXISTS "Users can only select their own interview reports" ON public.interviews;
DROP POLICY IF EXISTS "Users can only insert their own interview reports" ON public.interviews;
DROP POLICY IF EXISTS "Public interviews read access" ON public.interviews;
DROP POLICY IF EXISTS "Public interviews insert access" ON public.interviews;

-- Roadmaps
DROP POLICY IF EXISTS "Allow user select on roadmaps" ON public.roadmaps;
DROP POLICY IF EXISTS "Allow user insert on roadmaps" ON public.roadmaps;
DROP POLICY IF EXISTS "Allow user update on roadmaps" ON public.roadmaps;
DROP POLICY IF EXISTS "Allow user delete on roadmaps" ON public.roadmaps;
DROP POLICY IF EXISTS "Authenticated users own roadmaps select" ON public.roadmaps;
DROP POLICY IF EXISTS "Authenticated users own roadmaps insert" ON public.roadmaps;
DROP POLICY IF EXISTS "Authenticated users own roadmaps update" ON public.roadmaps;
DROP POLICY IF EXISTS "Authenticated users own roadmaps delete" ON public.roadmaps;
DROP POLICY IF EXISTS "Users can only select their own roadmaps" ON public.roadmaps;
DROP POLICY IF EXISTS "Users can only insert their own roadmaps" ON public.roadmaps;
DROP POLICY IF EXISTS "Users can only delete their own roadmaps" ON public.roadmaps;

-- Career Roadmaps
DROP POLICY IF EXISTS "Allow user select on career_roadmaps" ON public.career_roadmaps;
DROP POLICY IF EXISTS "Allow user insert on career_roadmaps" ON public.career_roadmaps;
DROP POLICY IF EXISTS "Allow user update on career_roadmaps" ON public.career_roadmaps;
DROP POLICY IF EXISTS "Allow user delete on career_roadmaps" ON public.career_roadmaps;
DROP POLICY IF EXISTS "Authenticated users own career_roadmaps select" ON public.career_roadmaps;
DROP POLICY IF EXISTS "Authenticated users own career_roadmaps insert" ON public.career_roadmaps;
DROP POLICY IF EXISTS "Authenticated users own career_roadmaps update" ON public.career_roadmaps;
DROP POLICY IF EXISTS "Authenticated users own career_roadmaps delete" ON public.career_roadmaps;

-- Interview Sessions
DROP POLICY IF EXISTS "Public interview_sessions read access" ON public.interview_sessions;
DROP POLICY IF EXISTS "Public interview_sessions insert access" ON public.interview_sessions;
DROP POLICY IF EXISTS "Public interview_sessions update access" ON public.interview_sessions;
DROP POLICY IF EXISTS "Allow user select on interview_sessions" ON public.interview_sessions;
DROP POLICY IF EXISTS "Allow user insert on interview_sessions" ON public.interview_sessions;
DROP POLICY IF EXISTS "Allow user update on interview_sessions" ON public.interview_sessions;
DROP POLICY IF EXISTS "Authenticated users own sessions select" ON public.interview_sessions;
DROP POLICY IF EXISTS "Authenticated users own sessions insert" ON public.interview_sessions;
DROP POLICY IF EXISTS "Authenticated users own sessions update" ON public.interview_sessions;

-- Interview Assessment Reports
DROP POLICY IF EXISTS "Candidates can read their own assessment reports" ON public.interview_assessment_reports;
DROP POLICY IF EXISTS "Allow insert on interview_assessment_reports" ON public.interview_assessment_reports;
DROP POLICY IF EXISTS "Allow update on interview_assessment_reports" ON public.interview_assessment_reports;
DROP POLICY IF EXISTS "Authenticated users own assessment reports select" ON public.interview_assessment_reports;
DROP POLICY IF EXISTS "Authenticated users own assessment reports insert" ON public.interview_assessment_reports;
DROP POLICY IF EXISTS "Authenticated users own assessment reports update" ON public.interview_assessment_reports;

-- ------------------------------------------------------------------------------
-- STEP 4: Create Zero-Trust RLS Policies for candidate personal tables
-- ------------------------------------------------------------------------------

-- 4.1 public.interviews (Mock interview records & transcripts)
CREATE POLICY "interviews_authenticated_select"
    ON public.interviews FOR SELECT
    USING (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND auth.uid()::text = user_id));

CREATE POLICY "interviews_authenticated_insert"
    ON public.interviews FOR INSERT
    WITH CHECK (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND auth.uid()::text = user_id));

CREATE POLICY "interviews_authenticated_update"
    ON public.interviews FOR UPDATE
    USING (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND auth.uid()::text = user_id))
    WITH CHECK (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND auth.uid()::text = user_id));

CREATE POLICY "interviews_authenticated_delete"
    ON public.interviews FOR DELETE
    USING (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND auth.uid()::text = user_id));

-- 4.2 public.roadmaps (Personal roadmap plans)
CREATE POLICY "roadmaps_authenticated_select"
    ON public.roadmaps FOR SELECT
    USING (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND auth.uid()::text = user_id));

CREATE POLICY "roadmaps_authenticated_insert"
    ON public.roadmaps FOR INSERT
    WITH CHECK (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND auth.uid()::text = user_id));

CREATE POLICY "roadmaps_authenticated_update"
    ON public.roadmaps FOR UPDATE
    USING (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND auth.uid()::text = user_id))
    WITH CHECK (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND auth.uid()::text = user_id));

CREATE POLICY "roadmaps_authenticated_delete"
    ON public.roadmaps FOR DELETE
    USING (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND auth.uid()::text = user_id));

-- 4.3 public.career_roadmaps (AI career accelerator blueprints)
CREATE POLICY "career_roadmaps_authenticated_select"
    ON public.career_roadmaps FOR SELECT
    USING (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND auth.uid()::text = user_id));

CREATE POLICY "career_roadmaps_authenticated_insert"
    ON public.career_roadmaps FOR INSERT
    WITH CHECK (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND auth.uid()::text = user_id));

CREATE POLICY "career_roadmaps_authenticated_update"
    ON public.career_roadmaps FOR UPDATE
    USING (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND auth.uid()::text = user_id))
    WITH CHECK (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND auth.uid()::text = user_id));

CREATE POLICY "career_roadmaps_authenticated_delete"
    ON public.career_roadmaps FOR DELETE
    USING (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND auth.uid()::text = user_id));

-- 4.4 public.interview_sessions (Session state & answer progress)
CREATE POLICY "interview_sessions_authenticated_select"
    ON public.interview_sessions FOR SELECT
    USING (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND auth.uid()::text = user_id));

CREATE POLICY "interview_sessions_authenticated_insert"
    ON public.interview_sessions FOR INSERT
    WITH CHECK (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND auth.uid()::text = user_id));

CREATE POLICY "interview_sessions_authenticated_update"
    ON public.interview_sessions FOR UPDATE
    USING (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND auth.uid()::text = user_id))
    WITH CHECK (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND auth.uid()::text = user_id));

CREATE POLICY "interview_sessions_authenticated_delete"
    ON public.interview_sessions FOR DELETE
    USING (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND auth.uid()::text = user_id));

-- 4.5 public.interview_assessment_reports (Final scorecards & rubric evaluations)
CREATE POLICY "interview_assessment_reports_authenticated_select"
    ON public.interview_assessment_reports FOR SELECT
    USING (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND auth.uid()::text = user_id));

CREATE POLICY "interview_assessment_reports_authenticated_insert"
    ON public.interview_assessment_reports FOR INSERT
    WITH CHECK (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND auth.uid()::text = user_id));

CREATE POLICY "interview_assessment_reports_authenticated_update"
    ON public.interview_assessment_reports FOR UPDATE
    USING (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND auth.uid()::text = user_id))
    WITH CHECK (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND auth.uid()::text = user_id));

CREATE POLICY "interview_assessment_reports_authenticated_delete"
    ON public.interview_assessment_reports FOR DELETE
    USING (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND auth.uid()::text = user_id));

-- ------------------------------------------------------------------------------
-- STEP 5: Harden Storage for Resumes (Private bucket + RESTRICTIVE Guard)
-- ------------------------------------------------------------------------------

-- Ensure bucket exists and is set to private
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO UPDATE SET public = false;

UPDATE storage.buckets
SET public = false
WHERE id = 'resumes';

-- Dynamically drop any storage policies explicitly mentioning resumes
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
          AND tablename = 'objects'
          AND (
              policyname ILIKE '%resume%' 
              OR qual ILIKE '%resumes%' 
              OR with_check ILIKE '%resumes%'
          )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
    END LOOP;
END $$;

DROP POLICY IF EXISTS "Public access to resumes bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users own resume storage access" ON storage.objects;
DROP POLICY IF EXISTS "Users can only access their own resume" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own resume" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own resume" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own resume" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own resume" ON storage.objects;
DROP POLICY IF EXISTS "resumes_authenticated_select" ON storage.objects;
DROP POLICY IF EXISTS "resumes_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "resumes_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "resumes_authenticated_delete" ON storage.objects;
DROP POLICY IF EXISTS "resumes_restrictive_access_guard" ON storage.objects;

-- 5.1 Permissive policies for the resumes bucket
CREATE POLICY "resumes_authenticated_select"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'resumes' AND (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)));

CREATE POLICY "resumes_authenticated_insert"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'resumes' AND (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)));

CREATE POLICY "resumes_authenticated_update"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'resumes' AND (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)))
    WITH CHECK (bucket_id = 'resumes' AND (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)));

CREATE POLICY "resumes_authenticated_delete"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'resumes' AND (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)));

-- 5.2 CRITICAL RESTRICTIVE GUARD (AS RESTRICTIVE)
-- In PostgreSQL, restrictive policies are AND-ed with all permissive policies.
-- Even if an existing broad permissive policy (e.g. USING (true)) exists on storage.objects,
-- this restrictive guard FORCIBLY BLOCKS any access to 'resumes' unless the user is the owner.
CREATE POLICY "resumes_restrictive_access_guard"
    ON storage.objects AS RESTRICTIVE
    FOR ALL
    USING (
        bucket_id <> 'resumes'
        OR auth.role() = 'service_role'
        OR (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)
    )
    WITH CHECK (
        bucket_id <> 'resumes'
        OR auth.role() = 'service_role'
        OR (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)
    );
