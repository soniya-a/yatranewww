import { pool, isPostgresConfigured } from './db';

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
  if (!isPostgresConfigured || !skill || typeof skill !== 'string') return null;

  const trimmed = skill.trim();
  if (trimmed.length === 0) return null;

  try {
    // 1. Check known direct ESCO equivalent label
    const targetLabel = ESCO_CONCEPT_EQUIVALENTS[trimmed] || trimmed;

    // 2. Exact match (case-insensitive) in PostgreSQL
    const exactRes = await pool.query(
      `SELECT id, concept_uri, preferred_label FROM esco_skills WHERE LOWER(preferred_label) = LOWER($1) LIMIT 1`,
      [targetLabel]
    );

    if (exactRes.rows.length > 0) {
      return {
        skill: trimmed,
        escoId: String(exactRes.rows[0].id),
        escoUri: exactRes.rows[0].concept_uri,
        escoLabel: exactRes.rows[0].preferred_label
      };
    }

    // 3. Try with "(computer programming)" qualifier if not already attempted
    if (!targetLabel.includes('(computer programming)')) {
      const progRes = await pool.query(
        `SELECT id, concept_uri, preferred_label FROM esco_skills WHERE LOWER(preferred_label) = LOWER($1) LIMIT 1`,
        [`${trimmed} (computer programming)`]
      );

      if (progRes.rows.length > 0) {
        return {
          skill: trimmed,
          escoId: String(progRes.rows[0].id),
          escoUri: progRes.rows[0].concept_uri,
          escoLabel: progRes.rows[0].preferred_label
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
 * skill -> esco_occupation_skills -> esco_occupations.
 */
export async function matchSkillsToEscoOccupations(
  normalizedSkills: string[],
  topLimit = 20
): Promise<EscoMatchingResult> {
  if (!isPostgresConfigured) {
    throw new Error("PostgreSQL is not configured. Cannot perform ESCO graph traversal.");
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

  // Step 2: Fetch all relations for mapped skill URIs from PostgreSQL
  const skillUris = mappedSkills.map(m => m.escoUri);
  const skillUriToOriginalMap = new Map<string, string>();
  for (const m of mappedSkills) {
    skillUriToOriginalMap.set(m.escoUri, m.skill);
  }

  const relRes = await pool.query(
    `SELECT occupation_uri, skill_uri, relation_type FROM esco_occupation_skills WHERE skill_uri = ANY($1)`,
    [skillUris]
  );
  const relations = relRes.rows;

  // Step 3: Aggregate matched skills and relation types per occupation
  const occupationSkillMap = new Map<string, Set<string>>();
  const occupationEssentialMap = new Map<string, Set<string>>();
  const occupationOptionalMap = new Map<string, Set<string>>();

  for (const rel of relations) {
    const origSkill = skillUriToOriginalMap.get(rel.skill_uri);
    if (!origSkill) continue;

    if (!occupationSkillMap.has(rel.occupation_uri)) {
      occupationSkillMap.set(rel.occupation_uri, new Set<string>());
      occupationEssentialMap.set(rel.occupation_uri, new Set<string>());
      occupationOptionalMap.set(rel.occupation_uri, new Set<string>());
    }
    occupationSkillMap.get(rel.occupation_uri)!.add(origSkill);

    if (rel.relation_type === 'essential') {
      occupationEssentialMap.get(rel.occupation_uri)!.add(origSkill);
    } else {
      occupationOptionalMap.get(rel.occupation_uri)!.add(origSkill);
    }
  }

  const totalOccupationsMatched = occupationSkillMap.size;

  // Step 4: Sort occupations by raw matched count (descending) to find candidate top occupations
  const candidateOccs = Array.from(occupationSkillMap.entries())
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, Math.max(topLimit * 2, 50));

  const candidateUris = candidateOccs.map(c => c[0]);

  if (candidateUris.length === 0) {
    return {
      totalNormalizedSkillsSupplied: normalizedSkills.length,
      mappedSkillCount: mappedSkills.length,
      unmappedSkillCount: unmappedSkills.length,
      mappedSkills,
      unmappedSkills,
      totalOccupationsMatched: 0,
      topOccupations: []
    };
  }

  // Step 5: Fetch occupation metadata (name, ISCO code)
  const occRes = await pool.query(
    `SELECT concept_uri, preferred_label, code, description FROM esco_occupations WHERE concept_uri = ANY($1)`,
    [candidateUris]
  );
  const occMetaMap = new Map(occRes.rows.map(o => [o.concept_uri, o]));

  // Step 6: Query total skill count for candidate occupations in a single grouped query
  const countsRes = await pool.query(
    `SELECT occupation_uri, count(*) as count FROM esco_occupation_skills WHERE occupation_uri = ANY($1) GROUP BY occupation_uri`,
    [candidateUris]
  );
  const occTotalSkillsMap = new Map<string, number>(
    countsRes.rows.map(r => [r.occupation_uri, parseInt(r.count, 10)])
  );

  const rankedOccupations: MatchedOccupation[] = [];

  for (const [occUri, matchedSkillSet] of candidateOccs) {
    const meta = occMetaMap.get(occUri);
    if (!meta) continue;

    const totalRelevant = occTotalSkillsMap.get(occUri) || matchedSkillSet.size;
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
      essentialMatchedCount: occupationEssentialMap.get(occUri)?.size || 0,
      optionalMatchedCount: occupationOptionalMap.get(occUri)?.size || 0
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
