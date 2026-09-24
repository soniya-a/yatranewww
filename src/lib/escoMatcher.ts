import { supabase, isSupabaseConfigured } from './supabase';

export interface EscoSkillMapping {
  skill: string;
  escoId: string;
  escoUri: string;
  escoLabel: string;
}

export interface MatchedOccupation {
  rank: number;
  occupationName: string;
  iscoCode: string;
  occupationUri: string;
  matchedSkillCount: number;
  matchedSkills: string[];
  totalRelevantSkills: number;
  coverageScore: number;
  essentialMatchedCount: number | string;
  optionalMatchedCount: number | string;
}

export interface EscoMatchingResult {
  totalNormalizedSkillsSupplied: number;
  mappedSkillCount: number;
  unmappedSkillCount: number;
  mappedSkills: EscoSkillMapping[];
  unmappedSkills: string[];
  totalOccupationsMatched: number;
  topOccupations: MatchedOccupation[];
}

/**
 * Known direct ESCO concept equivalences for computer science / engineering domains.
 * Strictly bounded: only maps terms with identical semantic meaning in ESCO.
 * NEVER makes broad leaps (e.g. cloud does NOT become AWS, database does NOT become PostgreSQL).
 */
const ESCO_CONCEPT_EQUIVALENTS: Record<string, string> = {
  "Python": "Python (computer programming)",
  "Java": "Java (computer programming)",
  "Distributed Systems": "distributed computing",
  "Object-Oriented Design": "use object-oriented programming",
  "Data Structures & Algorithms": "algorithms"
};

/**
 * Resolves a normalized skill to its ESCO concept in public.esco_skills.
 * Returns null if the skill has no direct counterpart in ESCO.
 */
export async function resolveSkillToEsco(skill: string): Promise<EscoSkillMapping | null> {
  if (!isSupabaseConfigured || !skill || typeof skill !== 'string') return null;

  const trimmed = skill.trim();
  if (trimmed.length === 0) return null;

  try {
    // 1. Check known direct ESCO equivalent label
    const targetLabel = ESCO_CONCEPT_EQUIVALENTS[trimmed] || trimmed;

    // 2. Exact match (case-insensitive)
    const { data: exactMatch } = await supabase
      .from('esco_skills')
      .select('id, concept_uri, preferred_label')
      .ilike('preferred_label', targetLabel)
      .limit(1);

    if (exactMatch && exactMatch.length > 0) {
      return {
        skill: trimmed,
        escoId: exactMatch[0].id,
        escoUri: exactMatch[0].concept_uri,
        escoLabel: exactMatch[0].preferred_label
      };
    }

    // 3. Try with "(computer programming)" qualifier if not already attempted
    if (!targetLabel.includes('(computer programming)')) {
      const { data: progMatch } = await supabase
        .from('esco_skills')
        .select('id, concept_uri, preferred_label')
        .ilike('preferred_label', `${trimmed} (computer programming)`)
        .limit(1);

      if (progMatch && progMatch.length > 0) {
        return {
          skill: trimmed,
          escoId: progMatch[0].id,
          escoUri: progMatch[0].concept_uri,
          escoLabel: progMatch[0].preferred_label
        };
      }
    }
  } catch (err) {
    console.error(`[ESCO Matcher] Error resolving skill "${skill}":`, err);
  }

  // Strictly return null when confidence is insufficient (Never fabricate)
  return null;
}

/**
 * Traverses the raw ESCO relationship graph to match normalized skills to ESCO occupations.
 * Strictly uses official foreign-key concept URIs:
 * skill -> esco_occupation_skill_relations -> esco_occupations.
 */
export async function matchSkillsToEscoOccupations(
  normalizedSkills: string[],
  topLimit = 20
): Promise<EscoMatchingResult> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. Cannot perform ESCO graph traversal.");
  }

  const mappedSkills: EscoSkillMapping[] = [];
  const unmappedSkills: string[] = [];

  // Step 1: Map normalized skills to ESCO skill IDs & concept URIs
  for (const skill of normalizedSkills) {
    const escoSkill = await resolveSkillToEsco(skill);
    if (escoSkill) {
      mappedSkills.push(escoSkill);
    } else {
      unmappedSkills.push(skill);
    }
  }

  if (mappedSkills.length === 0) {
    return {
      totalNormalizedSkillsSupplied: normalizedSkills.length,
      mappedSkillCount: 0,
      unmappedSkillCount: unmappedSkills.length,
      mappedSkills: [],
      unmappedSkills,
      totalOccupationsMatched: 0,
      topOccupations: []
    };
  }

  // Step 2: Fetch all relations for mapped skill URIs
  const skillUris = mappedSkills.map(m => m.escoUri);
  const skillUriToOriginalMap = new Map<string, string>();
  for (const m of mappedSkills) {
    skillUriToOriginalMap.set(m.escoUri, m.skill);
  }

  const { data: relations, error: relError } = await supabase
    .from('esco_occupation_skill_relations')
    .select('occupation_uri, skill_uri')
    .in('skill_uri', skillUris);

  if (relError || !relations) {
    throw new Error(`Failed to query esco_occupation_skill_relations: ${relError?.message}`);
  }

  // Step 3: Aggregate matched skills per occupation
  const occupationSkillMap = new Map<string, Set<string>>();
  for (const rel of relations) {
    const origSkill = skillUriToOriginalMap.get(rel.skill_uri);
    if (!origSkill) continue;

    if (!occupationSkillMap.has(rel.occupation_uri)) {
      occupationSkillMap.set(rel.occupation_uri, new Set<string>());
    }
    occupationSkillMap.get(rel.occupation_uri)!.add(origSkill);
  }

  const totalOccupationsMatched = occupationSkillMap.size;

  // Step 4: Sort occupations by raw matched count (descending) to find candidate top occupations
  const candidateOccs = Array.from(occupationSkillMap.entries())
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, Math.max(topLimit * 2, 50)); // Take top slice to calculate accurate coverage

  const candidateUris = candidateOccs.map(c => c[0]);

  // Step 5: Fetch occupation metadata (name, ISCO code)
  const { data: occupations, error: occError } = await supabase
    .from('esco_occupations')
    .select('concept_uri, preferred_label, code, description')
    .in('concept_uri', candidateUris);

  if (occError || !occupations) {
    throw new Error(`Failed to query esco_occupations: ${occError?.message}`);
  }

  const occMetaMap = new Map(occupations.map(o => [o.concept_uri, o]));

  // Step 6: Query total skill count for each candidate occupation to compute coverageScore
  const rankedOccupations: MatchedOccupation[] = [];

  for (const [occUri, matchedSkillSet] of candidateOccs) {
    const meta = occMetaMap.get(occUri);
    if (!meta) continue;

    // Count total skills associated with this occupation in ESCO
    const { count: totalSkillsCount } = await supabase
      .from('esco_occupation_skill_relations')
      .select('*', { count: 'exact', head: true })
      .eq('occupation_uri', occUri);

    const totalRelevant = totalSkillsCount || matchedSkillSet.size;
    const matchedCount = matchedSkillSet.size;
    const coverageScore = Number((matchedCount / totalRelevant).toFixed(4));

    rankedOccupations.push({
      rank: 0,
      occupationName: meta.preferred_label,
      iscoCode: meta.code || 'N/A',
      occupationUri: occUri,
      matchedSkillCount: matchedCount,
      matchedSkills: Array.from(matchedSkillSet),
      totalRelevantSkills: totalRelevant,
      coverageScore,
      essentialMatchedCount: "N/A (no relation_type in schema)",
      optionalMatchedCount: "N/A (no relation_type in schema)"
    });
  }

  // Sort by: 1) matchedSkillCount desc, 2) coverageScore desc
  rankedOccupations.sort((a, b) => {
    if (b.matchedSkillCount !== a.matchedSkillCount) {
      return b.matchedSkillCount - a.matchedSkillCount;
    }
    return b.coverageScore - a.coverageScore;
  });

  // Assign final 1-based ranks
  const topOccupations = rankedOccupations.slice(0, topLimit).map((occ, idx) => ({
    ...occ,
    rank: idx + 1
  }));

  return {
    totalNormalizedSkillsSupplied: normalizedSkills.length,
    mappedSkillCount: mappedSkills.length,
    unmappedSkillCount: unmappedSkills.length,
    mappedSkills,
    unmappedSkills,
    totalOccupationsMatched,
    topOccupations
  };
}
