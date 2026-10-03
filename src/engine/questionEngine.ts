// Interview Question Generation Engine
// Main orchestration: ESCO grounding -> Gemini call -> validation -> fallback
//
// DESIGN DECISIONS:
// - The existing `ai` client in server.ts is not importable (not exported), so we
//   create a LOCAL GoogleGenAI instance scoped to this module only.
// - The existing circuit breaker in server.ts is not importable (not exported), so we
//   maintain a LOCAL circuit breaker state that ONLY affects this module. It does not
//   interfere with the server.ts circuit breaker or any other route.
// - The Supabase client IS imported from src/lib/supabase.ts (it is exported).
// - This module NEVER throws. It always returns a QuestionGenerationResult.

import { GoogleGenAI } from '@google/genai';
import { retrieveGroundedSkills } from './escoRetriever';
import { buildSystemPrompt, buildUserPrompt } from './prompts';
import { getFallbackQuestions } from './fallbackBank';
import type {
  InterviewQuestion,
  QuestionGenerationInput,
  QuestionGenerationResult,
} from '../types/interview';

// Local Gemini client — scoped to this module only
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || 'dummy_key',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Local circuit breaker — does NOT affect server.ts routes
let localCircuitOpenUntil = 0;

const VALID_CATEGORIES = new Set([
  'Technical',
  'RoleSpecific',
  'ResumeSpecific',
  'Behavioral',
  'SkillGap',
]);

function isValidQuestion(q: any): q is Omit<InterviewQuestion, 'id' | 'source'> {
  return (
    q !== null &&
    typeof q === 'object' &&
    typeof q.question === 'string' &&
    q.question.trim().length > 20 &&
    typeof q.category === 'string' &&
    VALID_CATEGORIES.has(q.category)
  );
}

function isQuotaError(err: any): boolean {
  const msg = (err?.message ?? '').toLowerCase();
  const str = (() => { try { return JSON.stringify(err).toLowerCase(); } catch { return ''; } })();
  return (
    msg.includes('429') ||
    msg.includes('quota') ||
    msg.includes('exhausted') ||
    msg.includes('rate_limit') ||
    msg.includes('resource_exhausted') ||
    str.includes('429') ||
    str.includes('quota') ||
    str.includes('resource_exhausted')
  );
}

export async function generateInterviewQuestions(
  input: QuestionGenerationInput
): Promise<QuestionGenerationResult> {
  const warnings: string[] = [];

  // ── Step 1: ESCO grounding ──────────────────────────────────────────────
  let groundedSkills: string[] = [];
  try {
    groundedSkills = await retrieveGroundedSkills([
      ...input.resumeProfile.skills,
      ...input.matchedJob.requiredSkills,
    ]);
  } catch (e: any) {
    warnings.push('ESCO retrieval failed - using raw skills');
    groundedSkills = [...input.resumeProfile.skills];
  }

  // ── Step 2: Local circuit breaker check ────────────────────────────────
  if (Date.now() < localCircuitOpenUntil) {
    const secsLeft = Math.ceil((localCircuitOpenUntil - Date.now()) / 1000);
    warnings.push(`Circuit breaker active (${secsLeft}s remaining) - using fallback`);
    return {
      questions: getFallbackQuestions(input),
      groundedSkills,
      provider: 'fallback',
      warnings,
    };
  }

  // ── Step 3: Gemini call ─────────────────────────────────────────────────
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [
        { role: 'user', parts: [{ text: buildSystemPrompt() }] },
        { role: 'user', parts: [{ text: buildUserPrompt(input, groundedSkills) }] },
      ],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    });

    // ── Step 4: Parse + validate ──────────────────────────────────────────
    const raw = response.text ?? '';
    // Strip markdown fences if present (safety net even with responseMimeType set)
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    let parsed: any[];
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error(`JSON parse failed. Raw: ${raw.slice(0, 200)}`);
    }

    if (!Array.isArray(parsed)) {
      throw new Error('LLM did not return a JSON array');
    }

    const validated: InterviewQuestion[] = parsed
      .filter(isValidQuestion)
      .map((q, i) => ({
        id: `llm-${i}`,
        category: q.category,
        question: q.question.trim(),
        testsSkill: typeof q.testsSkill === 'string' ? q.testsSkill : 'Unspecified',
        expectedDepth: (['junior', 'mid', 'senior'].includes(q.expectedDepth))
          ? q.expectedDepth
          : 'junior',
        followUpHints: Array.isArray(q.followUpHints) ? q.followUpHints : [],
        source: 'llm' as const,
      }));

    // ── Step 5: Merge fallback if needed ─────────────────────────────────
    if (validated.length < 3) {
      warnings.push(`Only ${validated.length} valid LLM questions - merging with fallback`);
      const fallback = getFallbackQuestions(input);
      return {
        questions: [...validated, ...fallback].slice(0, 5),
        groundedSkills,
        provider: 'fallback',
        warnings,
      };
    }

    return {
      questions: validated.slice(0, 5),
      groundedSkills,
      provider: 'gemini',
      warnings,
    };

  } catch (err: any) {
    const msg = err?.message ?? 'unknown error';

    if (isQuotaError(err)) {
      localCircuitOpenUntil = Date.now() + 60_000;
      warnings.push('Gemini rate-limited - local circuit opened for 60s');
    } else {
      warnings.push(`Gemini call failed: ${msg}`);
    }

    console.warn('[QuestionEngine] Falling back to deterministic bank:', msg);

    return {
      questions: getFallbackQuestions(input),
      groundedSkills,
      provider: 'fallback',
      warnings,
    };
  }
}
