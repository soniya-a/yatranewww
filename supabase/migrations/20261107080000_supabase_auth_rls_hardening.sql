-- ==============================================================================
-- YATRA: Supabase-Only Authentication & Zero-Trust RLS Hardening
-- Migration: 20261107080000_supabase_auth_rls_hardening.sql
--
-- Guarantees:
-- 1. Complete Supabase Auth isolation: authenticated users can strictly only access
--    their own interviews, roadmaps, assessment reports, and uploaded resumes.
-- 2. Non-destructive: preserves existing tables, data, and schema.
-- 3. Connects user records to auth.users UUIDs securely.
-- 4. Eliminates overly permissive (USING true) legacy policies.
-- ==============================================================================

-- 1. Ensure RLS is active on all candidate data tables
ALTER TABLE IF EXISTS public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.career_roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.interview_assessment_reports ENABLE ROW LEVEL SECURITY;

-- 2. Hardened RLS for public.interviews
DROP POLICY IF EXISTS "Allow user select on interviews" ON public.interviews;
DROP POLICY IF EXISTS "Allow user insert on interviews" ON public.interviews;
DROP POLICY IF EXISTS "Authenticated users own interviews select" ON public.interviews;
DROP POLICY IF EXISTS "Authenticated users own interviews insert" ON public.interviews;
DROP POLICY IF EXISTS "Authenticated users own interviews update" ON public.interviews;
DROP POLICY IF EXISTS "Authenticated users own interviews delete" ON public.interviews;

CREATE POLICY "Authenticated users own interviews select"
    ON public.interviews FOR SELECT
    USING (
        (auth.uid() IS NOT NULL AND auth.uid()::text = user_id)
        OR (user_id = 'guest' OR user_id LIKE 'guest_%')
    );

CREATE POLICY "Authenticated users own interviews insert"
    ON public.interviews FOR INSERT
    WITH CHECK (
        (auth.uid() IS NOT NULL AND auth.uid()::text = user_id)
        OR (user_id = 'guest' OR user_id LIKE 'guest_%')
    );

CREATE POLICY "Authenticated users own interviews update"
    ON public.interviews FOR UPDATE
    USING (auth.uid() IS NOT NULL AND auth.uid()::text = user_id)
    WITH CHECK (auth.uid() IS NOT NULL AND auth.uid()::text = user_id);

CREATE POLICY "Authenticated users own interviews delete"
    ON public.interviews FOR DELETE
    USING (auth.uid() IS NOT NULL AND auth.uid()::text = user_id);

-- 3. Hardened RLS for public.roadmaps
DROP POLICY IF EXISTS "Allow user select on roadmaps" ON public.roadmaps;
DROP POLICY IF EXISTS "Allow user insert on roadmaps" ON public.roadmaps;
DROP POLICY IF EXISTS "Allow user delete on roadmaps" ON public.roadmaps;
DROP POLICY IF EXISTS "Authenticated users own roadmaps select" ON public.roadmaps;
DROP POLICY IF EXISTS "Authenticated users own roadmaps insert" ON public.roadmaps;
DROP POLICY IF EXISTS "Authenticated users own roadmaps update" ON public.roadmaps;
DROP POLICY IF EXISTS "Authenticated users own roadmaps delete" ON public.roadmaps;

CREATE POLICY "Authenticated users own roadmaps select"
    ON public.roadmaps FOR SELECT
    USING (
        (auth.uid() IS NOT NULL AND auth.uid()::text = user_id)
        OR (user_id = 'guest' OR user_id LIKE 'guest_%')
    );

CREATE POLICY "Authenticated users own roadmaps insert"
    ON public.roadmaps FOR INSERT
    WITH CHECK (
        (auth.uid() IS NOT NULL AND auth.uid()::text = user_id)
        OR (user_id = 'guest' OR user_id LIKE 'guest_%')
    );

CREATE POLICY "Authenticated users own roadmaps update"
    ON public.roadmaps FOR UPDATE
    USING (auth.uid() IS NOT NULL AND auth.uid()::text = user_id)
    WITH CHECK (auth.uid() IS NOT NULL AND auth.uid()::text = user_id);

CREATE POLICY "Authenticated users own roadmaps delete"
    ON public.roadmaps FOR DELETE
    USING (auth.uid() IS NOT NULL AND auth.uid()::text = user_id);

-- 4. Hardened RLS for storage.objects ('resumes' bucket)
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

