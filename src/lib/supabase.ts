/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

/**
 * Browser-safe environment variable resolution for Vite frontend.
 * Resolves from Vite's import.meta.env or Vite-defined process.env fallback.
 */
const DEFAULT_SUPABASE_URL = 'https://vimllthildskrgkjpwdv.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpbWxsdGhpbGRza3Jna2pwd2R2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4Mzc2MDgsImV4cCI6MjEwMzQxMzYwOH0.5wD2pCs4EojoUK4cOy08U1Q2XHEgPgC5TywFyJhcdG0';

const supabaseUrl: string =
  (typeof process !== 'undefined' && process.env?.SUPABASE_URL) ||
  DEFAULT_SUPABASE_URL;

const supabaseKey: string =
  (typeof process !== 'undefined' && process.env?.SUPABASE_PUBLISHABLE_KEY) ||
  DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseUrl.trim() !== '' && !supabaseUrl.includes('placeholder') && !supabaseUrl.includes('vimllthildskrgkjpwdv') &&
  supabaseKey && supabaseKey.trim() !== '' && !supabaseKey.includes('placeholder')
);

export const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

// Bridge Supabase auth getSession to return active Clerk token seamlessly
if (typeof window !== 'undefined') {
  const originalGetSession = supabase.auth.getSession.bind(supabase.auth);
  supabase.auth.getSession = (async () => {
    try {
      const { getAuthToken } = await import('./auth');
      const token = await getAuthToken();
      if (token) {
        let uid = 'user';
        let email = 'user@yatra.ai';
        try {
          const parts = token.split('.');
          if (parts.length >= 2) {
            const decoded = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            uid = decoded.sub || uid;
            email = decoded.email || email;
          } else if (token.startsWith('guest_')) {
            uid = token;
            email = 'guest@yatra.ai';
          }
        } catch {}

        return {
          data: {
            session: {
              access_token: token,
              token_type: 'bearer',
              expires_in: 3600,
              refresh_token: '',
              user: {
                id: uid,
                app_metadata: {},
                user_metadata: { full_name: 'Candidate' },
                aud: 'authenticated',
                created_at: new Date().toISOString(),
                email,
                is_anonymous: uid.startsWith('guest')
              }
            } as any
          },
          error: null
        };
      }
    } catch {}
    if (!isSupabaseConfigured) {
      return { data: { session: null }, error: null };
    }
    return originalGetSession();
  }) as any;
}

/**
 * Returns a Supabase client scoped to an authenticated user's JWT.
 */
export const getUserSupabase = (authToken?: string) => {
  if (!authToken || !isSupabaseConfigured) return supabase;
  const cleanToken = authToken.startsWith('Bearer ') ? authToken.substring(7).trim() : authToken.trim();
  if (!cleanToken) return supabase;
  return createClient(
    supabaseUrl,
    supabaseKey,
    {
      global: {
        headers: {
          Authorization: `Bearer ${cleanToken}`
        }
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );
};

/**
 * Safely purges all user-specific cached sessions, reports, roadmaps, and profile artifacts.
 * Ensures zero data leakage between account switches or upon logout.
 */
export const clearUserSessionData = () => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const staticKeys = [
    'guest_session',
    'guest_uid',
    'guest_email',
    'guest_name',
    'userName',
    'yatra_candidate_profile',
    'yatra_parse_result',
    'yatra_ml_parse_result',
    'yatra_selected_job',
    'latest_grade_score'
  ];
  staticKeys.forEach((k) => {
    try {
      localStorage.removeItem(k);
    } catch {}
  });

  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith('roadmaps_') ||
          key.startsWith('interviews_') ||
          key.startsWith('interview_session_') ||
          key.startsWith('interview_session_token_') ||
          key.startsWith('latest_career_roadmap_') ||
          key.startsWith('career_roadmap_') ||
          key.startsWith('yatra_candidate_profile') ||
          key.startsWith('yatra_parse_result') ||
          key.startsWith('job_canonical_set_'))
      ) {
        localStorage.removeItem(key);
      }
    }
  } catch {}
};
