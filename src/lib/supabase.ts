/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

/**
 * Browser-safe environment variable resolution for Vite frontend.
 * Resolves from Vite's import.meta.env or Vite-defined process.env fallback.
 */
const getBrowserEnv = (key: string): string => {
  try {
    // 1. Vite ESM import.meta.env
    const metaEnv = (import.meta as any)?.env;
    if (metaEnv) {
      if (metaEnv[key]) return metaEnv[key] as string;
      if (metaEnv[`VITE_${key}`]) return metaEnv[`VITE_${key}`] as string;
    }
  } catch {}
  // 2. process.env (injected at build time via vite.config.ts define block)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  return '';
};

const supabaseUrl = getBrowserEnv('SUPABASE_URL') || getBrowserEnv('VITE_SUPABASE_URL');
const supabaseKey = getBrowserEnv('SUPABASE_PUBLISHABLE_KEY') || getBrowserEnv('VITE_SUPABASE_ANON_KEY');

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseUrl.trim() !== '' && !supabaseUrl.includes('placeholder') &&
  supabaseKey && supabaseKey.trim() !== '' && !supabaseKey.includes('placeholder')
);

export const supabase = createClient(
  supabaseUrl || 'https://vimllthildskrgkjpwdv.supabase.co',
  supabaseKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

/**
 * Returns a Supabase client scoped to an authenticated user's JWT.
 */
export const getUserSupabase = (authToken?: string) => {
  if (!authToken || !isSupabaseConfigured) return supabase;
  const cleanToken = authToken.startsWith('Bearer ') ? authToken.substring(7).trim() : authToken.trim();
  if (!cleanToken) return supabase;
  return createClient(
    supabaseUrl || 'https://vimllthildskrgkjpwdv.supabase.co',
    supabaseKey || 'placeholder-key',
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
