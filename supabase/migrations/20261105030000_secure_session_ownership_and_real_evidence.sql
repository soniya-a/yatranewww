-- ==============================================================================
-- YATRA AI: Security Hardening & Real Evidence Migration
-- Migration: 20261105030000_secure_session_ownership_and_real_evidence.sql
-- 1. Hardens interview_sessions RLS: removes all USING(true) and wildcard policies.
-- 2. Enforces strict cryptographic guest isolation via session_token and server mediation.
-- 3. Authenticated candidates can strictly only select/update their own records (auth.uid() = user_id).
-- 4. Removes user_id LIKE 'guest-%' wildcard loophole across all tables.
-- ==============================================================================

-- 1. ADD SESSION_TOKEN COLUMN TO INTERVIEW_SESSIONS
ALTER TABLE public.interview_sessions 
    ADD COLUMN IF NOT EXISTS session_token TEXT;

CREATE INDEX IF NOT EXISTS idx_interview_sessions_token ON public.interview_sessions (session_token);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_user ON public.interview_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_set ON public.interview_sessions (question_set_id);

-- 2. STRIP ALL PREVIOUS PERMISSIVE POLICIES FROM INTERVIEW_SESSIONS
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public interview_sessions read access" ON public.interview_sessions;
DROP POLICY IF EXISTS "Public interview_sessions insert access" ON public.interview_sessions;
DROP POLICY IF EXISTS "Public interview_sessions update access" ON public.interview_sessions;
DROP POLICY IF EXISTS "Allow user select on interview_sessions" ON public.interview_sessions;
DROP POLICY IF EXISTS "Allow user insert on interview_sessions" ON public.interview_sessions;
DROP POLICY IF EXISTS "Allow user update on interview_sessions" ON public.interview_sessions;
DROP POLICY IF EXISTS "Users can only select their own interview sessions" ON public.interview_sessions;
DROP POLICY IF EXISTS "Users can only insert their own interview sessions" ON public.interview_sessions;
DROP POLICY IF EXISTS "Users can only update their own interview sessions" ON public.interview_sessions;
DROP POLICY IF EXISTS "Service role full session access" ON public.interview_sessions;

-- 3. APPLY ZERO-TRUST AUTHENTICATED OWNERSHIP POLICIES
-- Authenticated users can ONLY read, insert, and update their own records matching their exact auth.uid()
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

CREATE POLICY "Authenticated users own sessions delete"
    ON public.interview_sessions FOR DELETE
    USING (
        auth.role() = 'service_role' 
        OR (auth.uid() IS NOT NULL AND auth.uid()::text = user_id)
    );

-- 4. HARDEN INTERVIEWS TABLE (Remove user_id LIKE 'guest-%' loophole)
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only select their own interview reports" ON public.interviews;
DROP POLICY IF EXISTS "Users can only insert their own interview reports" ON public.interviews;
DROP POLICY IF EXISTS "Allow user select on interviews" ON public.interviews;
DROP POLICY IF EXISTS "Allow user insert on interviews" ON public.interviews;

CREATE POLICY "Users can only select their own interview reports"
    ON public.interviews FOR SELECT
    USING (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND auth.uid()::text = user_id));

CREATE POLICY "Users can only insert their own interview reports"
    ON public.interviews FOR INSERT
    WITH CHECK (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND auth.uid()::text = user_id));

-- 5. HARDEN ROADMAPS TABLE (Remove user_id LIKE 'guest-%' loophole)
ALTER TABLE public.roadmaps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only select their own roadmaps" ON public.roadmaps;
DROP POLICY IF EXISTS "Users can only insert their own roadmaps" ON public.roadmaps;
DROP POLICY IF EXISTS "Users can only delete their own roadmaps" ON public.roadmaps;
DROP POLICY IF EXISTS "Allow user select on roadmaps" ON public.roadmaps;
DROP POLICY IF EXISTS "Allow user insert on roadmaps" ON public.roadmaps;
DROP POLICY IF EXISTS "Allow user delete on roadmaps" ON public.roadmaps;

CREATE POLICY "Users can only select their own roadmaps"
    ON public.roadmaps FOR SELECT
    USING (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND auth.uid()::text = user_id));

CREATE POLICY "Users can only insert their own roadmaps"
    ON public.roadmaps FOR INSERT
    WITH CHECK (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND auth.uid()::text = user_id));

CREATE POLICY "Users can only delete their own roadmaps"
    ON public.roadmaps FOR DELETE
    USING (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND auth.uid()::text = user_id));

