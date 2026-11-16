-- ============================================================================
-- YATRA: CANDIDATE PROFILES PERSISTENCE & USER-SCOPED RLS SECURITY
-- Migration: 20261117000000_candidate_profiles_persistence.sql
-- Description: Creates the candidate_profiles table with strict ownership RLS,
--              enabling authenticated users to persist and restore their parsed
--              resumes without data leaks across accounts.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.candidate_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    candidate_name TEXT,
    headline TEXT,
    location TEXT,
    email TEXT,
    phone TEXT,
    linkedin TEXT,
    github TEXT,
    portfolio TEXT,
    skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    structured_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    education JSONB NOT NULL DEFAULT '[]'::jsonb,
    experience JSONB NOT NULL DEFAULT '[]'::jsonb,
    projects JSONB NOT NULL DEFAULT '[]'::jsonb,
    certifications JSONB NOT NULL DEFAULT '[]'::jsonb,
    achievements JSONB NOT NULL DEFAULT '[]'::jsonb,
    matching_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
    matching_companies JSONB NOT NULL DEFAULT '[]'::jsonb,
    raw_resume_text TEXT,
    parser_source TEXT NOT NULL DEFAULT 'gemini', -- 'gemini' | 'local_deterministic'
    storage_path TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.candidate_profiles ENABLE ROW LEVEL SECURITY;

-- Indexes for fast user-scoped retrieval
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_user_id ON public.candidate_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_updated_at ON public.candidate_profiles(updated_at DESC);

-- RLS: Authenticated users can SELECT only their own profiles
DROP POLICY IF EXISTS "candidate_profiles_select_own" ON public.candidate_profiles;
CREATE POLICY "candidate_profiles_select_own"
    ON public.candidate_profiles FOR SELECT
    USING (
        auth.role() = 'service_role' OR 
        (auth.uid() IS NOT NULL AND auth.uid()::text = user_id)
    );

-- RLS: Authenticated users can INSERT only their own profiles
DROP POLICY IF EXISTS "candidate_profiles_insert_own" ON public.candidate_profiles;
CREATE POLICY "candidate_profiles_insert_own"
    ON public.candidate_profiles FOR INSERT
    WITH CHECK (
        auth.role() = 'service_role' OR 
        (auth.uid() IS NOT NULL AND auth.uid()::text = user_id)
    );

-- RLS: Authenticated users can UPDATE only their own profiles
DROP POLICY IF EXISTS "candidate_profiles_update_own" ON public.candidate_profiles;
CREATE POLICY "candidate_profiles_update_own"
    ON public.candidate_profiles FOR UPDATE
    USING (
        auth.role() = 'service_role' OR 
        (auth.uid() IS NOT NULL AND auth.uid()::text = user_id)
    )
    WITH CHECK (
        auth.role() = 'service_role' OR 
        (auth.uid() IS NOT NULL AND auth.uid()::text = user_id)
    );

-- RLS: Authenticated users can DELETE only their own profiles
DROP POLICY IF EXISTS "candidate_profiles_delete_own" ON public.candidate_profiles;
CREATE POLICY "candidate_profiles_delete_own"
    ON public.candidate_profiles FOR DELETE
    USING (
        auth.role() = 'service_role' OR 
        (auth.uid() IS NOT NULL AND auth.uid()::text = user_id)
    );
