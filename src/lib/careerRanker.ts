/**
 * STAGE 5: DETERMINISTIC ENGINEERING CAREER RANKING
 * 
 * Specifically designed for Bachelor of Engineering / engineering students.
 * Takes verified output from Stages 4 & 4.5:
 * - Direct ESCO skill matches (Stage 4)
 * - Defensible bridged ESCO skill matches (Stage 4.5)
 * 
 * Deterministically ranks occupations using transparent scoring:
 * - Direct skill matches (10 pts per direct skill)
 * - Defensible bridged skill matches (7 pts per bridged skill)
 * - ESCO skill coverage ratio (coverage % * 0.5)
 * - ISCO-08 professional engineering classification tier:
 *     - Professional Engineering & ICT (ISCO 21xx, 25xx): 15.0 pts
 *     - Engineering & ICT Management (ISCO 132x, 133x): 10.0 pts
 *     - Engineering & ICT Technicians (ISCO 311x, 351x): 5.0 pts
 * 
 * Segregates primary professional engineering recommendations from
 * lower-tier technical support occupations.
 * 
 * Strict constraints:
 * - ZERO arbitrary +50/+15 boosts
 * - ZERO Gemini/AI calls for ranking
 * - ZERO embeddings
 * - Fully derived from live database joins
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { resolveSkillToEsco } from './escoMatcher';
import { bridgeSkill } from './engineeringSkillBridge';

export interface ScoreBreakdown {
  directSkillsScore: number;
  bridgedSkillsScore: number;
  coverageScore: number;
  professionalTierScore: number;
  totalScore: number;
}

export interface CareerPathRecommendation {
  occupationId: string;
  occupationName: string;
  iscoCode: string;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  matchedSkills: string[];
  directMatches: string[];
  bridgedMatches: string[];
  coverage: string;
  explanation: string;
}

export interface CareerRankingResult {
  studentDisciplineHint?: string;
  totalInputSkills: number;
  totalEffectiveEscoSkills: number;
  recommendedCareerPaths: CareerPathRecommendation[];
  relatedTechnicalOccupations: CareerPathRecommendation[];
}

/**
 * Evaluates ISCO-08 code to determine professional engineering qualification tier.
 * - Tier 1 (Professional Engineering/ICT - ISCO 21xx, 25xx): 15.0 pts
 * - Tier 2 (Engineering Management - ISCO 132x, 133x): 10.0 pts
 * - Tier 3 (Engineering/ICT Technicians - ISCO 311x, 351x): 5.0 pts
 * - Tier 4 (Other/General): 0.0 pts
 */
function getIscoProfessionalTier(iscoCode: string): { tier: string; points: number; isProfessional: boolean } {
  if (!iscoCode) return { tier: "Unclassified", points: 0, isProfessional: false };
  const cleaned = iscoCode.trim();

  // ISCO Sub-Major Group 21: Science and Engineering Professionals (214x Engineers, 215x Electrotechnology, 216x Architects)
  // ISCO Sub-Major Group 25: Information and Communications Technology Professionals (251x Software, 252x Database/Network)
  if (cleaned.startsWith('21') || cleaned.startsWith('25')) {
    return { tier: "Professional Engineering / ICT (ISCO Group 2)", points: 15.0, isProfessional: true };
  }

  // ISCO Sub-Major Group 13: Production and Specialised Services Managers (132x Manufacturing/Construction, 133x ICT)
  if (cleaned.startsWith('132') || cleaned.startsWith('133')) {
    return { tier: "Engineering / ICT Management (ISCO Group 1)", points: 10.0, isProfessional: true };
  }

  // ISCO Sub-Major Group 31: Physical and Engineering Science Technicians (311x)
  // ISCO Sub-Major Group 35: Information and Communications Technology Technicians (351x)
  if (cleaned.startsWith('311') || cleaned.startsWith('351')) {
    return { tier: "Engineering / ICT Technician (ISCO Group 3)", points: 5.0, isProfessional: false };
  }

  return { tier: "Non-Engineering / Manual Trades", points: 0.0, isProfessional: false };
}

/**
 * Deterministically ranks engineering careers based on input skills.
 */
export async function rankEngineeringCareers(
  rawOrNormalizedSkills: string[],
  topLimit: number = 10
): Promise<CareerRankingResult> {
  if (!isSupabaseConfigured || !Array.isArray(rawOrNormalizedSkills) || rawOrNormalizedSkills.length === 0) {
    return {
      totalInputSkills: rawOrNormalizedSkills?.length || 0,
      totalEffectiveEscoSkills: 0,
      recommendedCareerPaths: [],
      relatedTechnicalOccupations: []
    };
  }

  // 1. Resolve direct ESCO skills (Stage 4) and bridged ESCO skills (Stage 4.5)
  interface ActiveSkillMap {
    inputSkill: string;
    escoUri: string;
    escoLabel: string;
    isDirect: boolean;
  }

  const activeSkills: ActiveSkillMap[] = [];
  const escoUriToInputs = new Map<string, { direct: string[]; bridged: string[]; label: string }>();

  for (const skill of rawOrNormalizedSkills) {
    const trimmed = skill.trim();
    if (!trimmed) continue;

    // Check direct ESCO match first
    const directMatch = await resolveSkillToEsco(trimmed);
    if (directMatch) {
      activeSkills.push({
        inputSkill: trimmed,
        escoUri: directMatch.escoUri,
        escoLabel: directMatch.escoLabel,
        isDirect: true
      });

      if (!escoUriToInputs.has(directMatch.escoUri)) {
        escoUriToInputs.set(directMatch.escoUri, { direct: [], bridged: [], label: directMatch.escoLabel });
      }
      escoUriToInputs.get(directMatch.escoUri)!.direct.push(trimmed);
      continue;
    }

    // Check Stage 4.5 defensible engineering bridge
    const bridged = bridgeSkill(trimmed);
    if (bridged && bridged.escoUri && bridged.escoSkill) {
      activeSkills.push({
        inputSkill: trimmed,
        escoUri: bridged.escoUri,
        escoLabel: bridged.escoSkill,
        isDirect: false
      });

      if (!escoUriToInputs.has(bridged.escoUri)) {
        escoUriToInputs.set(bridged.escoUri, { direct: [], bridged: [], label: bridged.escoSkill });
      }
      escoUriToInputs.get(bridged.escoUri)!.bridged.push(trimmed);
    }
  }

  const distinctEscoUris = Array.from(escoUriToInputs.keys());
  if (distinctEscoUris.length === 0) {
    return {
      totalInputSkills: rawOrNormalizedSkills.length,
      totalEffectiveEscoSkills: 0,
      recommendedCareerPaths: [],
      relatedTechnicalOccupations: []
    };
  }

  // 2. Query ESCO occupation-skill relations for all active concept URIs in chunks of 15
  const URI_CHUNK_SIZE = 15;
  let allRelations: Array<{ occupation_uri: string; skill_uri: string }> = [];

  for (let i = 0; i < distinctEscoUris.length; i += URI_CHUNK_SIZE) {
    const chunk = distinctEscoUris.slice(i, i + URI_CHUNK_SIZE);
    const { data: relations } = await supabase
      .from('esco_occupation_skill_relations')
      .select('occupation_uri, skill_uri')
      .in('skill_uri', chunk);

    if (relations) {
      allRelations.push(...relations);
    }
  }

  if (allRelations.length === 0) {
    return {
      totalInputSkills: rawOrNormalizedSkills.length,
      totalEffectiveEscoSkills: distinctEscoUris.length,
      recommendedCareerPaths: [],
      relatedTechnicalOccupations: []
    };
  }

  // 3. Aggregate matches per occupation
  const occMatchMap = new Map<string, { direct: Set<string>; bridged: Set<string>; allMatchedSkills: Set<string> }>();

  for (const rel of allRelations) {
    if (!occMatchMap.has(rel.occupation_uri)) {
      occMatchMap.set(rel.occupation_uri, {
        direct: new Set(),
        bridged: new Set(),
        allMatchedSkills: new Set()
      });
    }

    const mapping = escoUriToInputs.get(rel.skill_uri);
    if (mapping) {
      const target = occMatchMap.get(rel.occupation_uri)!;
      mapping.direct.forEach(s => {
        target.direct.add(s);
        target.allMatchedSkills.add(s);
      });
      mapping.bridged.forEach(s => {
        target.bridged.add(s);
        target.allMatchedSkills.add(s);
      });
    }
  }

  // 4. Prioritize candidate occupations by matched skill count
  const sortedCandidateUris = Array.from(occMatchMap.entries())
    .sort((a, b) => {
      // Direct matches count first, then total matches
      if (b[1].direct.size !== a[1].direct.size) {
        return b[1].direct.size - a[1].direct.size;
      }
      return b[1].allMatchedSkills.size - a[1].allMatchedSkills.size;
    })
    .slice(0, 60)
    .map(entry => entry[0]);

  // 5. Query occupation metadata in safe batches of 25 to prevent HTTP 414 (URI Too Long)
  const OCC_CHUNK_SIZE = 25;
  const occMetadata: Array<{ id: string; concept_uri: string; preferred_label: string; code: string }> = [];

  for (let i = 0; i < sortedCandidateUris.length; i += OCC_CHUNK_SIZE) {
    const chunk = sortedCandidateUris.slice(i, i + OCC_CHUNK_SIZE);
    const { data } = await supabase
      .from('esco_occupations')
      .select('id, concept_uri, preferred_label, code')
      .in('concept_uri', chunk);

    if (data) {
      occMetadata.push(...data);
    }
  }

  const occMetaLookup = new Map(occMetadata.map(o => [o.concept_uri, o]));

  // 6. Pre-count exact total skills for candidate occupations in parallel
  const occTotalSkillsMap = new Map<string, number>();
  await Promise.all(
    occMetadata.map(async (meta) => {
      const { count } = await supabase
        .from('esco_occupation_skill_relations')
        .select('*', { count: 'exact', head: true })
        .eq('occupation_uri', meta.concept_uri);
      occTotalSkillsMap.set(meta.concept_uri, count || 1);
    })
  );

  // 7. Score and format each candidate occupation
  const professionalList: CareerPathRecommendation[] = [];
  const technicianList: CareerPathRecommendation[] = [];

  for (const meta of occMetadata) {
    const occUri = meta.concept_uri;
    const matches = occMatchMap.get(occUri);
    if (!matches) continue;

    const totalRelevant = occTotalSkillsMap.get(occUri) || 1;
    const directCount = matches.direct.size;
    const bridgedCount = matches.bridged.size;
    const matchedCount = matches.allMatchedSkills.size;

    const coverageDecimal = matchedCount / totalRelevant;
    const coveragePercentStr = `${(coverageDecimal * 100).toFixed(2)}%`;

    const tierInfo = getIscoProfessionalTier(meta.code);

    // Transparent, bounded scoring formula:
    // - Direct Match: 10 pts per direct skill
    // - Bridged Match: 7 pts per bridged skill
    // - Coverage: up to ~10 pts (coverage * 50)
    // - Professional Tier: 15 pts (Professional Eng), 10 pts (Management), 5 pts (Technician)
    const directSkillsScore = directCount * 10;
    const bridgedSkillsScore = bridgedCount * 7;
    const coverageScore = Math.round(coverageDecimal * 100 * 0.5 * 10) / 10;
    const professionalTierScore = tierInfo.points;

    const totalScore = Math.round((directSkillsScore + bridgedSkillsScore + coverageScore + professionalTierScore) * 10) / 10;

    const breakdown: ScoreBreakdown = {
      directSkillsScore,
      bridgedSkillsScore,
      coverageScore,
      professionalTierScore,
      totalScore
    };

    const explanation = `Matched ${directCount} direct skill(s) (${Array.from(matches.direct).join(', ') || 'none'}) and ${bridgedCount} bridged skill(s) (${Array.from(matches.bridged).join(', ') || 'none'}). Coverage: ${coveragePercentStr} (${matchedCount}/${totalRelevant} ESCO skills). Tier: ${tierInfo.tier}.`;

    const recommendation: CareerPathRecommendation = {
      occupationId: meta.id,
      occupationName: meta.preferred_label,
      iscoCode: meta.code,
      score: totalScore,
      scoreBreakdown: breakdown,
      matchedSkills: Array.from(matches.allMatchedSkills),
      directMatches: Array.from(matches.direct),
      bridgedMatches: Array.from(matches.bridged),
      coverage: coveragePercentStr,
      explanation
    };

    if (tierInfo.isProfessional) {
      professionalList.push(recommendation);
    } else if (meta.code && (meta.code.startsWith('311') || meta.code.startsWith('351'))) {
      technicianList.push(recommendation);
    }
  }

  // Sort descending by totalScore, then directMatches count, then coverage
  const sorter = (a: CareerPathRecommendation, b: CareerPathRecommendation) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.directMatches.length !== a.directMatches.length) return b.directMatches.length - a.directMatches.length;
    return parseFloat(b.coverage) - parseFloat(a.coverage);
  };

  professionalList.sort(sorter);
  technicianList.sort(sorter);

  return {
    totalInputSkills: rawOrNormalizedSkills.length,
    totalEffectiveEscoSkills: distinctEscoUris.length,
    recommendedCareerPaths: professionalList.slice(0, topLimit),
    relatedTechnicalOccupations: technicianList.slice(0, 5)
  };
}
