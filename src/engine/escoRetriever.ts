// ESCO Skill Retriever
// Grounds raw skill strings against the ESCO skills taxonomy in Supabase.
// Reuses the existing Supabase client from src/lib/supabase.ts - never creates a second client.

import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Takes a list of raw skill strings and returns ESCO-normalised preferred_label values.
 * On any failure, returns the raw (cleaned) input so the pipeline can continue.
 * NEVER throws - always returns a string array.
 */
export async function retrieveGroundedSkills(skills: string[]): Promise<string[]> {
  if (!skills.length) return [];

  // Normalize + dedupe
  const cleaned = [...new Set(skills.map(s => s.trim().toLowerCase()).filter(Boolean))];
  if (!cleaned.length) return [];

  if (!isSupabaseConfigured) {
    console.warn('[ESCO] Supabase not configured - returning raw skills');
    return cleaned;
  }

  try {
    const { data, error } = await supabase
      .from('esco_skills')
      .select('preferred_label')
      .or(cleaned.map(s => `preferred_label.ilike.%${s}%`).join(','))
      .limit(30);

    if (error) {
      console.warn('[ESCO] retrieval failed:', error.message);
      return cleaned;
    }

    const found = data?.map((r: { preferred_label: string }) => r.preferred_label) ?? [];
    // If ESCO returned nothing useful, fall back to raw
    return found.length > 0 ? found : cleaned;
  } catch (err: any) {
    console.warn('[ESCO] unexpected error:', err?.message ?? String(err));
    return cleaned;
  }
}
