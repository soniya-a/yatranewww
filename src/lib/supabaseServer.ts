import { createClient } from '@supabase/supabase-js';

/**
 * Server-only environment variable loader.
 * Exclusively uses process.env for Node.js runtime and CommonJS bundling.
 * Zero references to browser-specific import.meta.
 */
const getEnvVar = (key: string): string => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  return '';
};

const supabaseUrl = getEnvVar('SUPABASE_URL');
// On server, check for SERVICE_ROLE_KEY first, fallback to PUBLISHABLE_KEY
const supabaseKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY') || getEnvVar('SUPABASE_PUBLISHABLE_KEY');

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseUrl.trim() !== '' && !supabaseUrl.includes('placeholder') &&
  supabaseKey && supabaseKey.trim() !== '' && !supabaseKey.includes('placeholder')
);

export const supabase = createClient(
  supabaseUrl || 'https://vimllthildskrgkjpwdv.supabase.co',
  supabaseKey || 'placeholder-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

/**
 * Returns a Supabase client scoped to an authenticated user's JWT.
 * Allows backend server operations to execute under the caller's authentic PostgreSQL auth.uid().
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
