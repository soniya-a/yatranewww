// Canonical Interview Question Generation Engine
// Orchestrates: Web Research (Google Search Grounding) -> Dynamic Round Detection ->
// Verified Public Reports -> Deep Resume Intelligence -> AI Predictions -> Canonical Set Persistence

import { GoogleGenAI } from '@google/genai';
import { GEMINI_PRIMARY_MODEL, executeGeminiWithRetry } from '../lib/geminiConfig';
import { supabase, isSupabaseConfigured, getUserSupabase } from '../lib/supabaseServer';
import { getVerifiedCompanyProfile } from './verifiedQuestionBank';
import {
  getCompanyInterviewRounds,
  getVerifiedQuestionsForRound,
  normalizeCompanyName,
  normalizeRoundCategory,
  resolveJobPrimaryDomain,
  type PrimaryJobDomain,
  seedNormalizedDatabaseIfEmpty,
  calculateFreshness,
  calculateIndependentReportsCount,
  calculateTimeFrequencies,
  type NormalizedQuestionRecord
} from './intelligenceRepository';
import crypto from 'crypto';
import type {
  CanonicalInterviewQuestion,
  CanonicalQuestionGenerationInput,
  ConfidenceLevel,
  DetectedRound,
  InterviewQuestionSet,
  InterviewRoundName,
  QuestionCategory,
  ResumeBasedMetadata,
  AIPredictedMetadata,
  InterviewSession,
} from '../types/interview';
import fs from 'fs';
import path from 'path';

// Local Google GenAI instance scoped to engine
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || 'dummy_key',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Cache for persistent retrieval by set_id (in-memory + local file backup)
const canonicalSetsStore = new Map<string, InterviewQuestionSet>();
const CACHE_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'canonicalSetsCache.json');

// Sessions store (in-memory + local file backup)
const SESSIONS_CACHE_FILE = path.join(process.cwd(), 'src', 'data', 'interviewSessionsCache.json');
const sessionsStore = new Map<string, InterviewSession>();

// Ensure cache directory exists and load cache if available
function initLocalStore() {
  try {
    const dir = path.dirname(CACHE_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(CACHE_FILE_PATH)) {
      const data = JSON.parse(fs.readFileSync(CACHE_FILE_PATH, 'utf-8'));
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item?.set_id) {
            canonicalSetsStore.set(item.set_id, item);
          }
        }
      }
    }
    if (fs.existsSync(SESSIONS_CACHE_FILE)) {
      const sessData = JSON.parse(fs.readFileSync(SESSIONS_CACHE_FILE, 'utf-8'));
      if (Array.isArray(sessData)) {
        for (const s of sessData) {
          if (s?.id) {
            sessionsStore.set(s.id, s);
          }
        }
      }
    }
  } catch (e) {
    // Non-fatal cache load error
  }
}
initLocalStore();

function persistLocalSet(set: InterviewQuestionSet) {
  canonicalSetsStore.set(set.set_id, set);
  try {
    const all = Array.from(canonicalSetsStore.values());
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(all, null, 2), 'utf-8');
  } catch (e) {
    // Non-fatal file write error
  }
}

function persistLocalSession(session: InterviewSession) {
  sessionsStore.set(session.id, session);
  try {
    const all = Array.from(sessionsStore.values());
    fs.writeFileSync(SESSIONS_CACHE_FILE, JSON.stringify(all, null, 2), 'utf-8');
  } catch (e) {
    // Non-fatal file write error
  }
}

// Maximum allowable age for a guest session token (24 hours)
const GUEST_SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface SessionRequestContext {
  requesterUid?: string;
  sessionToken?: string;
  authToken?: string;
}

/**
 * Persist or update an Interview Session with cryptographic guest token & zero-trust ownership
 */
export async function saveInterviewSession(
  sessionData: Partial<InterviewSession> & { question_set_id: string },
  context?: SessionRequestContext
): Promise<InterviewSession & { session_id: string; session_token: string }> {
  const sessionId = (sessionData as any).session_id || sessionData.id || `SES_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const existing = sessionsStore.get(sessionId);

  // Zero-Trust Ownership Verification on Existing Sessions
  if (existing) {
    const isAuthedSession = existing.user_id && existing.user_id !== 'guest' && !existing.user_id.startsWith('guest_') && !existing.user_id.startsWith('guest-');
    if (isAuthedSession) {
      if (!context?.requesterUid || context.requesterUid !== existing.user_id) {
        throw new Error("FORBIDDEN: Access denied. Cannot modify another authenticated candidate's interview session.");
      }
    } else {
      if (!context?.sessionToken || !existing.session_token || existing.session_token !== context.sessionToken) {
        throw new Error("FORBIDDEN: Access denied. Invalid guest session credential.");
      }
      const createdAtMs = new Date(existing.created_at || existing.updated_at).getTime();
      if (Date.now() - createdAtMs > GUEST_SESSION_MAX_AGE_MS) {
        throw new Error("FORBIDDEN: Guest session token has expired. Please initiate a new interview session.");
      }
    }
  }

  // Generate or preserve high-entropy cryptographic session token (64-character hex)
  const sessionToken = sessionData.session_token || existing?.session_token || crypto.randomBytes(32).toString('hex');
  const userId = sessionData.user_id || existing?.user_id || (context?.requesterUid || 'guest');

  const session: InterviewSession = {
    id: sessionId,
    user_id: userId,
    session_token: sessionToken,
    question_set_id: sessionData.question_set_id,
    company: sessionData.company || existing?.company || '',
    role: sessionData.role || existing?.role || '',
    current_question_id: sessionData.current_question_id || existing?.current_question_id || 'Q001',
    current_question_order: sessionData.current_question_order !== undefined ? sessionData.current_question_order : (existing?.current_question_order || 0),
    answers: { ...(existing?.answers || {}), ...(sessionData.answers || {}) },
    is_completed: sessionData.is_completed !== undefined ? sessionData.is_completed : (existing?.is_completed || false),
    interview_mode: sessionData.interview_mode || existing?.interview_mode || 'normal',
    created_at: sessionData.created_at || existing?.created_at || new Date().toISOString(),
    updated_at: sessionData.updated_at || new Date().toISOString(),
  };

  persistLocalSession(session);

  if (isSupabaseConfigured) {
    try {
      const client = getUserSupabase(context?.authToken);
      await client.from('interview_sessions').upsert({
        id: session.id,
        user_id: session.user_id,
        session_token: session.session_token,
        question_set_id: session.question_set_id,
        company: session.company,
        role: session.role,
        current_question_id: session.current_question_id,
        current_question_order: session.current_question_order,
        answers: session.answers,
        is_completed: session.is_completed,
        interview_mode: session.interview_mode,
        updated_at: session.updated_at
      });
    } catch (e) {
      console.warn('[QuestionEngine] Non-fatal Supabase session save warning:', e);
    }
  }

  return { ...session, session_id: session.id, session_token: sessionToken };
}

/**
 * Retrieve an Interview Session by its ID with ownership validation
 */
export async function getInterviewSession(
  sessionId: string,
  context?: SessionRequestContext
): Promise<(InterviewSession & { session_id: string }) | null> {
  let s: InterviewSession | null = null;
  if (sessionsStore.has(sessionId)) {
    s = sessionsStore.get(sessionId)!;
  } else if (isSupabaseConfigured) {
    try {
      const client = getUserSupabase(context?.authToken);
      const { data, error } = await client
        .from('interview_sessions')
        .select('*')
        .eq('id', sessionId)
        .maybeSingle();
      if (data && !error) {
        s = data as any;
        if (s) sessionsStore.set(s.id, s);
      }
    } catch (e) {}
  }

  if (!s) return null;

  // Verify ownership
  const isAuthedSession = s.user_id && s.user_id !== 'guest' && !s.user_id.startsWith('guest_') && !s.user_id.startsWith('guest-');
  if (isAuthedSession) {
    if (!context?.requesterUid || context.requesterUid !== s.user_id) {
      throw new Error("FORBIDDEN: You do not have permission to view this authenticated interview session.");
    }
  } else {
    if (!context?.sessionToken || !s.session_token || s.session_token !== context.sessionToken) {
      throw new Error("FORBIDDEN: Invalid or mismatched guest session credentials.");
    }
    const createdAtMs = new Date(s.created_at || s.updated_at).getTime();
    if (Date.now() - createdAtMs > GUEST_SESSION_MAX_AGE_MS) {
      throw new Error("FORBIDDEN: Guest session token has expired. Please initiate a new interview session.");
    }
  }

  return { ...s, session_id: s.id };
}

/**
 * Retrieve the latest session for a given question_set_id with ownership validation
 */
export async function getSessionByQuestionSet(
  questionSetId: string,
  context?: SessionRequestContext
): Promise<(InterviewSession & { session_id: string }) | null> {
  let candidates: InterviewSession[] = [];
  for (const s of sessionsStore.values()) {
    if (s.question_set_id === questionSetId) {
      candidates.push(s);
    }
  }

  if (candidates.length === 0 && isSupabaseConfigured) {
    try {
      const client = getUserSupabase(context?.authToken);
      const { data, error } = await client
        .from('interview_sessions')
        .select('*')
        .eq('question_set_id', questionSetId)
        .order('updated_at', { ascending: false });
      if (data && !error && Array.isArray(data)) {
        candidates = data as any;
        candidates.forEach(s => sessionsStore.set(s.id, s));
      }
    } catch (e) {}
  }

  for (const s of candidates) {
    const isAuthedSession = s.user_id && s.user_id !== 'guest' && !s.user_id.startsWith('guest_') && !s.user_id.startsWith('guest-');
    if (isAuthedSession) {
      if (context?.requesterUid && context.requesterUid === s.user_id) {
        return { ...s, session_id: s.id };
      }
    } else {
      if (!context?.sessionToken || s.session_token === context.sessionToken) {
        const createdAtMs = new Date(s.created_at || s.updated_at).getTime();
        if (Date.now() - createdAtMs > GUEST_SESSION_MAX_AGE_MS) {
          throw new Error("FORBIDDEN: Guest session token has expired. Please initiate a new interview session.");
        }
        return { ...s, session_id: s.id };
      }
    }
  }

  return null;
}


/**
 * Retrieve a persisted Canonical Question Set by its stable set_id
 */
export async function getCanonicalQuestionSet(setId: string): Promise<InterviewQuestionSet | null> {
  // 1. Check in-memory store
  if (canonicalSetsStore.has(setId)) {
    return canonicalSetsStore.get(setId)!;
  }

  // 2. Check Supabase database
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('interview_question_sets')
        .select('*')
        .eq('set_id', setId)
        .maybeSingle();

      if (data && !error) {
        const set: InterviewQuestionSet = {
          set_id: data.set_id,
          company: data.company,
          role: data.role,
          job_description: data.job_description,
          generated_at: data.created_at || new Date().toISOString(),
          evidence_window: data.evidence_window || 'last_90_days',
          rounds: data.rounds || [],
          questions: data.questions || [],
          overall_confidence: (data.overall_confidence as ConfidenceLevel) || 'high',
          provider: (data.provider as any) || 'verified_offline_engine',
          warnings: data.metadata?.warnings || [],
        };
        canonicalSetsStore.set(setId, set);
        return set;
      }
    } catch (e) {
      console.warn('[QuestionEngine] Supabase retrieval error:', e);
    }
  }

  return null;
}

/**
 * Extract structured resume claims from parsed resume or fallback profile
 */
function extractResumeClaims(parsedResume: any, candidateSkillsStr?: string): {
  skills: string[];
  projects: { name: string; description: string; tech: string[]; metrics: string[] }[];
  experience: { company: string; role: string; desc: string; tech: string[] }[];
  education: { degree: string; institution: string; field: string }[];
  certifications: string[];
} {
  const skills: string[] = [];
  const rawSkills = parsedResume?.skills || parsedResume?.structuredSkills || parsedResume?.profile?.skills || [];
  for (const s of rawSkills) {
    const name = typeof s === 'string' ? s : (s?.name || s?.skill);
    if (name && typeof name === 'string' && name.trim()) {
      skills.push(name.trim());
    }
  }

  // Fallback to comma-separated candidateSkills if parsed skills list is empty
  if (skills.length === 0 && candidateSkillsStr && typeof candidateSkillsStr === 'string') {
    const tokens = candidateSkillsStr.split(/[,;|]/).map(t => t.trim()).filter(Boolean);
    skills.push(...tokens);
  }

  const projects: { name: string; description: string; tech: string[]; metrics: string[] }[] = [];
  const rawProjects = parsedResume?.projects || parsedResume?.candidateProfile?.projects || [];
  for (const p of rawProjects) {
    if (p && typeof p === 'object') {
      const name = p.name || p.title || p.projectName || 'Technical Project';
      const desc = p.description || p.summary || p.details || '';
      const tech = Array.isArray(p.technologies) ? p.technologies : (Array.isArray(p.tech) ? p.tech : (p.techStack ? p.techStack.split(/[,;]/).map((t: string) => t.trim()) : []));
      // Look for claims/numbers/percentages in description
      const metrics: string[] = [];
      const percentMatches = desc.match(/\b\d+(\.\d+)?%\b/g);
      if (percentMatches) metrics.push(...percentMatches);
      const scaleMatches = desc.match(/\b\d+[kKmMbB]?\+?\s*(users|requests|queries|rps|fps|records|data points|ms|sec)\b/gi);
      if (scaleMatches) metrics.push(...scaleMatches);

      projects.push({
        name,
        description: desc,
        tech,
        metrics
      });
    }
  }

  const experience: { company: string; role: string; desc: string; tech: string[] }[] = [];
  const rawExp = parsedResume?.experience || parsedResume?.experienceRecords || [];
  for (const e of rawExp) {
    if (e && typeof e === 'object') {
      experience.push({
        company: e.company || e.companyName || 'Company',
        role: e.job_title || e.role || e.title || 'Role',
        desc: e.description || e.summary || '',
        tech: Array.isArray(e.technologies) ? e.technologies : []
      });
    }
  }

  const education: { degree: string; institution: string; field: string }[] = [];
  const rawEd = parsedResume?.education || [];
  for (const ed of rawEd) {
    if (ed && typeof ed === 'object') {
      education.push({
        degree: ed.degree || 'Degree',
        institution: ed.institution || ed.university || 'University',
        field: ed.field || ed.major || 'Engineering'
      });
    }
  }

  const certifications: string[] = [];
  const rawCerts = parsedResume?.certifications || [];
  for (const c of rawCerts) {
    const certName = typeof c === 'string' ? c : c?.name;
    if (certName && typeof certName === 'string') {
      certifications.push(certName.trim());
    }
  }

  return { skills, projects, experience, education, certifications };
}

/**
 * Strictly determines whether a question explicitly requires writing code, implementing an algorithm,
 * solving a programming problem, or writing an SQL query.
 * Conceptual questions (e.g. "Explain DBMS normalization", "Explain inheritance", "Explain transformer operation")
 * return requires_coding = false.
 */
export function evaluateQuestionCodingRequirement(
  questionText: string,
  roundName?: string,
  primaryDomain?: PrimaryJobDomain,
  explicitFlag?: boolean
): { requires_coding: boolean; coding_language?: string } {
  const qNorm = (questionText || '').toLowerCase().trim();

  // 1. Explicit conceptual / non-coding prompts NEVER open the coding editor
  const isConceptualOnly =
    /^(explain|describe|discuss|compare|contrast|what is|what are|why is|why do|tell me about|walk me through|how does a transformer|how do you enforce|how do you coordinate|imagine you are|in structural engineering|in mechanical design|in electrical power|when developing embedded|for a production ai)/i.test(qNorm) &&
    !/\b(write a[n]?\s+(?:\w+\s+)?(?:program|function|query|sql|script|code)|implement a[n]?\s+(?:\w+\s+)?(?:function|algorithm|class|data structure|method|binary search|cache|queue|buffer)|complete the function|solve this coding)\b/i.test(qNorm);

  if (isConceptualOnly) {
    return { requires_coding: false };
  }

  // 2. Non-software / non-coding branches (Electrical, Civil, Mechanical) should only show editor if prompt explicitly asks to write code/script
  if (primaryDomain === 'electrical' || primaryDomain === 'civil' || primaryDomain === 'mechanical') {
    const explicitNonSoftCode = /\b(write a[n]?\s+(?:python|c|c\+\+|matlab|plc|sql)\s+(?:program|script|function|query)|implement a[n]?\s+(?:function|algorithm) in)\b/i.test(qNorm);
    if (!explicitNonSoftCode) {
      return { requires_coding: false };
    }
  }

  // 3. Explicit SQL query requirement
  if (/\b(write a[n]?\s+sql\s+query|sql\s+query\s+to\s+(?:find|select|retrieve|calculate|join|group|update|delete)|write\s+a\s+query\s+in\s+sql)\b/i.test(qNorm)) {
    return { requires_coding: true, coding_language: 'sql' };
  }

  // 4. Explicit programming / algorithmic implementation requirement
  const hasCodingAction =
    /\b(write a[n]?\s+(?:python|java|c\+\+|c|javascript|typescript|go|rust|verilog)?\s*(?:program|function|code|script|method|solution)|implement\s+(?:a[n]?\s+|the\s+)?(?:data structure|algorithm|function|class|method|lru cache|binary search|ring buffer|circular queue|rate limiter|bounded blocking queue|topological sort|bfs|dfs|merge sort|quick sort|stack|queue|linked list|hash map)|given an array of integers|given the root of a binary tree|given an m x n grid|there are a total of numcourses|return the ordering of courses|return the total count of contiguous subarrays|return the minimum minutes)\b/i.test(qNorm);

  if (hasCodingAction || explicitFlag === true) {
    let lang = 'python';
    if (/\b(sql)\b/i.test(qNorm)) lang = 'sql';
    else if (/\b(embedded c|in c\b|c program|uart|isr|ring buffer)\b/i.test(qNorm)) lang = 'c';
    else if (/\b(c\+\+|cpp)\b/i.test(qNorm)) lang = 'cpp';
    else if (/\b(java)\b/i.test(qNorm) && !/\b(javascript)\b/i.test(qNorm)) lang = 'java';
    else if (/\b(javascript|typescript|node|react)\b/i.test(qNorm)) lang = 'javascript';
    else if (/\b(verilog|systemverilog)\b/i.test(qNorm)) lang = 'verilog';
    return { requires_coding: true, coding_language: lang };
  }

  return { requires_coding: false };
}

/**
 * Checks whether a question text is contaminated with off-domain topics for the selected job's primary technical domain.
 */
export function isQuestionRelevantToJobDomain(
  questionText: string,
  primaryDomain: PrimaryJobDomain,
  role?: string | null,
  jobDescription?: string | null
): boolean {
  const qNorm = (questionText || '').toLowerCase();
  const roleAndJd = `${role || ''} ${jobDescription || ''}`.toLowerCase();

  if (primaryDomain === 'electrical') {
    // Reject ML/AI, DBMS, OS, Web/React, and automotive ECU firmware questions unless explicitly in JD
    const hasOffDomain =
      /\b(machine learning|deep learning|neural network|vanishing\/exploding gradients|backpropagation|learning rate schedules|batch normalization|transformer architectures|self-attention|rag|llm|pytorch|tensorflow|dbms|b-tree|lsm-tree|sql query|explain plans|virtual dom|single-page application|react|usememo|microservice|5xx latency|jwt access tokens|ecu\b)\b/i.test(qNorm);
    if (hasOffDomain && !/\b(machine learning|react|dbms)\b/i.test(roleAndJd)) {
      return false;
    }
  }

  if (primaryDomain === 'civil') {
    const hasOffDomain =
      /\b(machine learning|deep learning|vanishing\/exploding gradients|backpropagation|pytorch|tensorflow|dbms|b-tree|lsm-tree|virtual dom|react|microservice|5xx latency|jwt access tokens|i2c|spi|uart|vlsi|cmos)\b/i.test(qNorm);
    if (hasOffDomain) return false;
  }

  if (primaryDomain === 'mechanical') {
    const hasOffDomain =
      /\b(machine learning|deep learning|vanishing\/exploding gradients|backpropagation|pytorch|tensorflow|dbms|b-tree|lsm-tree|virtual dom|react|microservice|5xx latency|jwt access tokens)\b/i.test(qNorm);
    if (hasOffDomain) return false;
  }

  if (primaryDomain === 'ece') {
    const hasOffDomain =
      /\b(vanishing\/exploding gradients|backpropagation|learning rate schedules|batch normalization|virtual dom|single-page application|react|usememo|zero-downtime database schema migration|b-tree vs lsm-tree)\b/i.test(qNorm);
    if (hasOffDomain && !/\b(machine learning|ai)\b/i.test(roleAndJd)) {
      return false;
    }
  }

  return true;
}

export function mapDomainToBranchLabel(domain: PrimaryJobDomain): string {
  switch (domain) {
    case 'electrical': return 'Electrical Engineering (EEE)';
    case 'ece': return 'Electronics & Communication Engineering (ECE)';
    case 'civil': return 'Civil & Structural Engineering';
    case 'mechanical': return 'Mechanical Engineering';
    case 'aiml': return 'Artificial Intelligence & Machine Learning';
    case 'software':
    default:
      return 'Computer Science & Software Engineering (CSE)';
  }
}

/**
 * Generate deep, realistic RESUME_BASED questions from candidate's verified resume items,
 * strictly gated by the selected job's primary technical domain so unrelated keywords never override the job domain.
 */
function generateResumeBasedQuestions(
  company: string,
  role: string,
  claims: ReturnType<typeof extractResumeClaims>,
  targetRound?: string,
  primaryDomain: PrimaryJobDomain = 'software',
  jobDescription?: string | null
): CanonicalInterviewQuestion[] {
  const assignedRound = targetRound || "Project & Resume Deep Dive";
  const questions: CanonicalInterviewQuestion[] = [];
  const branchLabel = mapDomainToBranchLabel(primaryDomain);
  const roleLow = (role || '').toLowerCase();

  // Helper to check if a project or skill item aligns with the selected job's primary domain
  const isItemAlignedWithDomain = (text: string): boolean => {
    const tLow = text.toLowerCase();
    if (primaryDomain === 'electrical') {
      // Do not generate ML/AI, Web, or unrelated software questions for an Electrical T&D / Power role
      if (/\b(machine learning|deep learning|neural network|nlp|computer vision|llm|react|frontend|django|mongodb|blockchain)\b/i.test(tLow)) {
        return false;
      }
      return true;
    }
    if (primaryDomain === 'civil') {
      if (/\b(machine learning|deep learning|neural network|react|nodejs|blockchain|vlsi|embedded)\b/i.test(tLow)) {
        return false;
      }
      return true;
    }
    if (primaryDomain === 'mechanical') {
      if (/\b(machine learning|deep learning|neural network|react|nodejs|blockchain|vlsi)\b/i.test(tLow)) {
        return false;
      }
      return true;
    }
    if (primaryDomain === 'ece') {
      if (/\b(react|frontend|css|tailwind|mongodb|civil|concrete)\b/i.test(tLow)) {
        return false;
      }
      return true;
    }
    return true;
  };

  // 1. Target specific project claims that align with the job domain
  for (const proj of claims.projects) {
    const projCombined = `${proj.name} ${proj.description} ${proj.tech.join(' ')}`;
    if (!isItemAlignedWithDomain(projCombined)) continue;

    if (proj.metrics && proj.metrics.length > 0 && (primaryDomain === 'aiml' || primaryDomain === 'software')) {
      const metric = proj.metrics[0];
      questions.push({
        question_id: 'Q_RESUME_TEMP',
        question_text: `In your project "${proj.name}", you claim to have achieved ${metric}. Can you walk me through the exact baseline you compared against, the evaluation dataset or testbench used, and how you verified this performance?`,
        company,
        role,
        branch: branchLabel,
        round: assignedRound,
        category: "RESUME_BASED",
        confidence: "high",
        relevance_score: 96,
        requires_coding: false,
        what_we_look_for: "Empirical rigor: baseline comparison, test methodology, edge-case validation, and measurable engineering metrics.",
        expected_points: ["Explains baseline comparison and evaluation methodology", "Details how edge cases and error margins were validated"],
        follow_up_hint: "What were the primary failure modes or edge cases encountered by your implementation?",
        expected_depth: "mid",
        time_limit_seconds: 150,
        resume_metadata: {
          resume_section: "projects",
          resume_item: `${proj.name} (${metric})`,
          reason_generated: `Probing specific metric claim of ${metric} stated in project description`
        }
      });
    } else if (proj.name && proj.description) {
      const techList = proj.tech.length > 0 ? proj.tech.slice(0, 2).join(' and ') : 'your engineering tools';
      const domainContextPrompt =
        primaryDomain === 'electrical'
          ? `In your electrical project "${proj.name}", how did you perform load sizing, fault/protection calculations, or single-line diagram validation, and what industry standards (IEEE/IEC/IS) did you follow?`
          : primaryDomain === 'ece'
          ? `In your electronics/VLSI project "${proj.name}" using ${techList}, what were the critical timing, signal integrity, or power constraints you encountered, and how did you verify the hardware/firmware implementation?`
          : primaryDomain === 'civil'
          ? `In your civil/structural project "${proj.name}", how did you validate load combinations, safety factors, and code compliance during design and analysis?`
          : primaryDomain === 'mechanical'
          ? `In your mechanical project "${proj.name}", how did you validate stress/thermal constraints, tolerances, and manufacturability?`
          : `In your project "${proj.name}" built with ${techList}, what was the most difficult architectural bottleneck you hit, and what technical trade-offs did you evaluate before resolving it?`;

      questions.push({
        question_id: 'Q_RESUME_TEMP',
        question_text: domainContextPrompt,
        company,
        role,
        branch: branchLabel,
        round: assignedRound,
        category: "RESUME_BASED",
        confidence: "high",
        relevance_score: 95,
        requires_coding: false,
        what_we_look_for: "Hands-on engineering ownership, design calculations, trade-off analysis, and verification under real constraints.",
        expected_points: ["Explains core design parameters and engineering methodology", "Details trade-offs, verification steps, and standards compliance"],
        follow_up_hint: "What would you redesign if the operating capacity or load requirement doubled?",
        expected_depth: "junior",
        time_limit_seconds: 140,
        resume_metadata: {
          resume_section: "projects",
          resume_item: proj.name,
          reason_generated: "Probing domain-aligned engineering decisions and hands-on implementation details from resume project"
        }
      });
    }
  }

  // 2. Target specific technical skills from candidate's verified skills ONLY if aligned with the selected job's primary domain
  const keySkills = claims.skills.slice(0, 6);
  for (const skill of keySkills) {
    const sLower = skill.toLowerCase();

    if (primaryDomain === 'aiml' && (sLower.includes('machine learning') || sLower.includes('deep learning') || sLower.includes('pytorch') || sLower.includes('tensorflow') || sLower.includes('nlp') || sLower.includes('llm'))) {
      questions.push({
        question_id: 'Q_RESUME_TEMP',
        question_text: `You have highlighted ${skill} on your resume. How do you handle vanishing/exploding gradients during training, and what is your practical approach to tuning learning rate schedules and batch normalization?`,
        company,
        role,
        branch: branchLabel,
        round: assignedRound,
        category: "RESUME_BASED",
        confidence: "high",
        relevance_score: 94,
        requires_coding: false,
        what_we_look_for: "Deep conceptual grasp of optimization, backpropagation mechanics, and practical ML hygiene.",
        expected_points: ["Explains gradient clipping, weight initialization (He/Xavier), and residual skip connections", "Details learning rate warmup, cosine annealing, and batch/layer normalization mechanics"],
        follow_up_hint: "Why can too large of a batch size hurt generalization?",
        expected_depth: "junior",
        time_limit_seconds: 140,
        resume_metadata: {
          resume_section: "skills",
          resume_item: skill,
          reason_generated: `Direct verification of candidate's stated proficiency in ${skill}`
        }
      });
    } else if (primaryDomain === 'electrical' && (sLower.includes('power') || sLower.includes('transmission') || sLower.includes('substation') || sLower.includes('switchgear') || sLower.includes('plc') || sLower.includes('scada') || sLower.includes('etap') || sLower.includes('sld') || sLower.includes('single line') || sLower.includes('relay') || sLower.includes('transformer') || sLower.includes('simulink') || sLower.includes('matlab') || sLower.includes('autocad') || sLower.includes('electrical') || sLower.includes('circuit') || sLower.includes('high voltage') || sLower.includes('protection'))) {
      questions.push({
        question_id: 'Q_RESUME_TEMP',
        question_text: `Your resume lists proficiency in ${skill}. For a Transmission & Distribution (T&D) or substation engineering project at ${company}, how do you interpret Single-Line Diagrams (SLDs), perform short-circuit fault and voltage-drop calculations, and coordinate protection relays (overcurrent, distance, and differential) with circuit breakers?`,
        company,
        role,
        branch: branchLabel,
        round: assignedRound,
        category: "RESUME_BASED",
        confidence: "high",
        relevance_score: 95,
        requires_coding: false,
        what_we_look_for: "Single-Line Diagram (SLD) interpretation, Time-Current Characteristic (TCC) relay coordination, CT/PT sizing, impedance/voltage drop, and circuit breaker interrupting rating.",
        expected_points: ["Explains SLD protection zones, CT/PT connections, and relay coordination margins", "Addresses symmetrical/unsymmetrical fault current calculation and circuit breaker sizing"],
        follow_up_hint: "How do you prevent differential relay mal-operation during power transformer magnetizing inrush?",
        expected_depth: "junior",
        time_limit_seconds: 140,
        resume_metadata: {
          resume_section: "skills",
          resume_item: skill,
          reason_generated: `Technical verification of electrical T&D and power systems competency in ${skill}`
        }
      });
    } else if (primaryDomain === 'ece' && (sLower.includes('vlsi') || sLower.includes('verilog') || sLower.includes('systemverilog') || sLower.includes('vhdl') || sLower.includes('fpga') || sLower.includes('asic') || sLower.includes('cmos') || sLower.includes('digital') || sLower.includes('embedded') || sLower.includes('microcontroller') || sLower.includes('stm32') || sLower.includes('arm') || sLower.includes('rtos') || sLower.includes('pcb') || sLower.includes('circuit') || sLower.includes('electronics') || sLower.includes('cadence') || sLower.includes('synopsys'))) {
      const isVlsiSkill = /vlsi|verilog|systemverilog|vhdl|fpga|asic|cmos|digital|cadence|synopsys/i.test(sLower) || /vlsi|semiconductor|asic|fpga|chip/i.test(roleLow);
      questions.push({
        question_id: 'Q_RESUME_TEMP',
        question_text: isVlsiSkill
          ? `You have listed ${skill} in your technical toolkit. In CMOS digital VLSI design, how do you analyze static and dynamic power dissipation, resolve setup and hold time violations during Static Timing Analysis (STA), and prevent latch-up or metastability across clock domain crossings?`
          : `You have listed ${skill} in your technical toolkit. In an embedded hardware/firmware system, how do you ensure deterministic interrupt latency, prevent bus contention on I2C/SPI interfaces, and maintain signal integrity across mixed-signal PCB traces?`,
        company,
        role,
        branch: branchLabel,
        round: assignedRound,
        category: "RESUME_BASED",
        confidence: "high",
        relevance_score: 95,
        requires_coding: false,
        what_we_look_for: isVlsiSkill
          ? "CMOS switching/leakage power equations, setup/hold slack equations, clock skew, 2-FF synchronizers, and RTL synthesis constraints."
          : "ISR determinism, volatile registers, pull-up sizing, ground planes, decoupling capacitors, and EMI isolation.",
        expected_points: isVlsiSkill
          ? ["Explains CMOS dynamic (alpha*C*Vdd^2*f) and static leakage power trade-offs", "Details setup and hold time equations and metastability mitigation via synchronizers"]
          : ["Explains interrupt latency, volatile hardware registers, and protocol timing", "Details signal integrity, decoupling placement, and noise isolation"],
        follow_up_hint: isVlsiSkill
          ? "Why is hold time violation independent of clock frequency, and how is it fixed post-synthesis?"
          : "What happens to return current inductance if a high-speed trace crosses a split ground plane?",
        expected_depth: "junior",
        time_limit_seconds: 140,
        resume_metadata: {
          resume_section: "skills",
          resume_item: skill,
          reason_generated: `Probing practical ${isVlsiSkill ? 'semiconductor & VLSI' : 'electronics & embedded'} engineering competency in ${skill}`
        }
      });
    } else if (primaryDomain === 'software' && (sLower.includes('react') || sLower.includes('javascript') || sLower.includes('typescript'))) {
      questions.push({
        question_id: 'Q_RESUME_TEMP',
        question_text: `Your resume lists proficiency in ${skill}. In a complex single-page application, how do you diagnose unwanted re-renders, and how do you decide when to use memoization versus restructuring component state?`,
        company,
        role,
        branch: branchLabel,
        round: assignedRound,
        category: "RESUME_BASED",
        confidence: "high",
        relevance_score: 92,
        requires_coding: false,
        what_we_look_for: "Virtual DOM reconciliation understanding, state colocation, React profiler usage.",
        expected_points: ["Explains referential equality, state colocation, and profiler flamegraphs", "Analyzes trade-offs of useMemo/useCallback memory overhead"],
        follow_up_hint: "What is the computational overhead of overusing useMemo or useCallback everywhere?",
        expected_depth: "junior",
        time_limit_seconds: 130,
        resume_metadata: {
          resume_section: "skills",
          resume_item: skill,
          reason_generated: `Technical verification of frontend competency in ${skill}`
        }
      });
    } else if (primaryDomain === 'software' && (sLower.includes('sql') || sLower.includes('database') || sLower.includes('mongodb') || sLower.includes('postgres'))) {
      questions.push({
        question_id: 'Q_RESUME_TEMP',
        question_text: `You have ${skill} listed in your core tools. Write an SQL query to find the second highest salary in each department from an Employees(id, name, department_id, salary) table, and explain how composite B-Tree indexing speeds up the query.`,
        company,
        role,
        branch: branchLabel,
        round: assignedRound,
        category: "RESUME_BASED",
        confidence: "high",
        relevance_score: 93,
        requires_coding: true,
        coding_language: "sql",
        what_we_look_for: "DENSE_RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) = 2, handling ties, and composite index on (department_id, salary DESC).",
        expected_points: ["Writes valid SQL using DENSE_RANK() or correlated subquery partitioned by department_id", "Explains composite B-Tree index scan on (department_id, salary)"],
        follow_up_hint: "How does DENSE_RANK() differ from ROW_NUMBER() and RANK() when two employees share the top salary?",
        expected_depth: "junior",
        time_limit_seconds: 150,
        resume_metadata: {
          resume_section: "skills",
          resume_item: skill,
          reason_generated: `Probing practical SQL query writing and database indexing skills from resume`
        }
      });
    } else if (primaryDomain === 'civil' && (sLower.includes('civil') || sLower.includes('structural') || sLower.includes('staad') || sLower.includes('civil 3d') || sLower.includes('etabs') || sLower.includes('revit') || sLower.includes('concrete') || sLower.includes('steel') || sLower.includes('autocad'))) {
      questions.push({
        question_id: 'Q_RESUME_TEMP',
        question_text: `You have highlighted ${skill} on your resume. When performing structural analysis or modeling with this tool, how do you verify boundary conditions and ensure that load combinations (dead, live, seismic) conform to standard building codes like IS 456 or Eurocodes?`,
        company,
        role,
        branch: branchLabel,
        round: assignedRound,
        category: "RESUME_BASED",
        confidence: "high",
        relevance_score: 94,
        requires_coding: false,
        what_we_look_for: "Understanding of structural modeling, load paths, boundary conditions, and design code compliance.",
        expected_points: ["Explains support fixity, load path verification, and equilibrium checks", "Details limit state load combinations under IS 456 / IS 1893 / Eurocode"],
        follow_up_hint: "How do you detect and rectify instability or anomalous stress concentrations in your model?",
        expected_depth: "junior",
        time_limit_seconds: 140,
        resume_metadata: {
          resume_section: "skills",
          resume_item: skill,
          reason_generated: `Direct verification of candidate's stated proficiency in ${skill}`
        }
      });
    } else if (primaryDomain === 'mechanical' && (sLower.includes('mechanical') || sLower.includes('solidworks') || sLower.includes('catia') || sLower.includes('ansys') || sLower.includes('fea') || sLower.includes('thermal') || sLower.includes('manufacturing') || sLower.includes('gd&t') || sLower.includes('autocad'))) {
      questions.push({
        question_id: 'Q_RESUME_TEMP',
        question_text: `Your resume lists proficiency in ${skill}. When developing 3D models or performing FEA simulations, how do you determine mesh convergence and select appropriate safety factors for high-stress regions?`,
        company,
        role,
        branch: branchLabel,
        round: assignedRound,
        category: "RESUME_BASED",
        confidence: "high",
        relevance_score: 94,
        requires_coding: false,
        what_we_look_for: "Mesh refinement strategies, stress singularity detection, material yield limits, and DFM considerations.",
        expected_points: ["Explains h-refinement mesh convergence and avoiding geometric singularities", "Details von Mises yield criteria and safety factor selection"],
        follow_up_hint: "What is your approach to validating finite element results against hand calculations?",
        expected_depth: "junior",
        time_limit_seconds: 140,
        resume_metadata: {
          resume_section: "skills",
          resume_item: skill,
          reason_generated: `Technical verification of mechanical design and simulation competency in ${skill}`
        }
      });
    }
  }

  // 3. Target experience or education
  if (claims.experience.length > 0) {
    const exp = claims.experience[0];
    questions.push({
      question_id: 'Q_RESUME_TEMP',
      question_text: `During your role as ${exp.role} at ${exp.company}, what was an instance where technical specifications or site/system requirements were ambiguous, and how did you validate your engineering assumptions before execution?`,
      company,
      role,
      branch: branchLabel,
      round: assignedRound,
      category: "RESUME_BASED",
      confidence: "high",
      relevance_score: 90,
      requires_coding: false,
      what_we_look_for: "Self-direction, requirements verification, stakeholder alignment, proactive engineering communication.",
      expected_points: ["Describes specific engineering ambiguity and methodical verification steps", "Explains stakeholder alignment and risk mitigation before implementation"],
      follow_up_hint: "Did you need to push back on any specification? How did you handle that?",
      expected_depth: "junior",
      time_limit_seconds: 120,
      resume_metadata: {
        resume_section: "experience",
        resume_item: `${exp.role} at ${exp.company}`,
        reason_generated: "Evaluating workplace initiative and engineering delivery from stated past role"
      }
    });
  }

  return questions;
}

/**
 * Generate AI-Predicted questions based on company + role + JD requirements + candidate profile
 */
async function generateAIPredictedQuestions(
  company: string,
  role: string,
  jobDescription: string | null | undefined,
  claims: ReturnType<typeof extractResumeClaims>,
  targetRound?: string,
  primaryDomain: PrimaryJobDomain = 'software'
): Promise<{ questions: CanonicalInterviewQuestion[]; isGeminiGenerated: boolean }> {
  const assignedRound = targetRound || "Domain-Specific Technical";
  const comp = company || "Enterprise";
  const branchLabel = mapDomainToBranchLabel(primaryDomain);
  const rLower = (role || "").toLowerCase();
  const isTAndDElectrical = primaryDomain === 'electrical' && /\b(transmission|t&d|t\s*&\s*d|substation|distribution|line|power|burns\s*&\s*mcdonnell)\b/i.test(`${comp} ${role} ${jobDescription || ''}`);
  const isVlsiOrSemiconductor = primaryDomain === 'ece' && /\b(vlsi|semiconductor|cmos|asic|fpga|rtl|verilog|systemverilog|digital design|physical design)\b/i.test(`${comp} ${role} ${jobDescription || ''}`);

  // 1. Attempt live Gemini AI synthesis first if API key is present
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'dummy_key') {
    try {
      const domainDirective =
        primaryDomain === 'electrical'
          ? `CRITICAL DOMAIN RESTRICTION: This is an ELECTRICAL ENGINEERING (${isTAndDElectrical ? 'Transmission & Distribution / T&D / Power Systems' : 'Power Systems & Electrical Machines'}) interview. Prioritize Generation, Transmission and Distribution (T&D), power systems, transformers, circuit breakers & protection relays, single-line diagrams (SLD), power factor, transmission line fundamentals (Ferranti effect, surge impedance loading, sag/tension, corona), and electrical machines. NEVER generate Machine Learning, AI, DBMS, Operating Systems, or generic software/web questions.`
          : primaryDomain === 'ece'
          ? `CRITICAL DOMAIN RESTRICTION: This is an ELECTRONICS & COMMUNICATION / ${isVlsiOrSemiconductor ? 'SEMICONDUCTOR & VLSI' : 'EMBEDDED SYSTEMS'} interview. Prioritize electronics, digital design, CMOS inverter characteristics, static timing analysis (setup/hold time), Verilog/RTL, metastability, and hardware protocols. NEVER generate Machine Learning, DBMS, or web development questions.`
          : primaryDomain === 'civil'
          ? `CRITICAL DOMAIN RESTRICTION: This is a CIVIL & STRUCTURAL ENGINEERING interview. Prioritize structural analysis, RCC/steel design, IS 456/Eurocodes, geotechnical foundations, and STAAD.Pro/ETABS. NEVER generate software, ML, or DBMS questions.`
          : primaryDomain === 'mechanical'
          ? `CRITICAL DOMAIN RESTRICTION: This is a MECHANICAL ENGINEERING interview. Prioritize mechanics of materials, thermodynamics, fluid mechanics, GD&T, and CAD/FEA. NEVER generate software, ML, or DBMS questions.`
          : `Focus on core technical competencies required for ${role} (${branchLabel}).`;

      const prompt = `You are a Principal Interviewer at ${comp} conducting a ${assignedRound} interview for the position of ${role} (${branchLabel}).
${domainDirective}
Generate 2 realistic, high-signal, company-tailored interview questions for this candidate.
Job Description snippet: ${jobDescription ? jobDescription.substring(0, 300) : "Industry standard requirements for " + role}

Return strictly valid JSON with an array named "questions" containing 2 objects with:
- "question_text": The detailed interview question
- "what_we_look_for": Evaluation focus and engineering depth expected
- "follow_up_hint": Follow-up question to probe deeper
- "expected_depth": "junior" | "mid" | "senior"
- "reason_generated": Explanation of why ${comp} asks this for ${role}`;

      const geminiRes = await executeGeminiWithRetry(
        () => ai.models.generateContent({
          model: GEMINI_PRIMARY_MODEL,
          contents: prompt,
          config: {
            thinkingConfig: { thinkingBudget: 0 },
            responseMimeType: 'application/json',
            temperature: 0.3,
            maxOutputTokens: 2048
          }
        }),
        {
          maxRetries: 2,
          initialDelayMs: 1000,
          timeoutMs: 8000,
          operationName: 'QuestionEngineAI'
        }
      );
      const jsonText = geminiRes.text?.trim() || "";
      const parsed = JSON.parse(jsonText);
      const qArray = Array.isArray(parsed) ? parsed : (parsed.questions || []);

      if (Array.isArray(qArray) && qArray.length > 0) {
        const geminiQuestions: CanonicalInterviewQuestion[] = qArray
          .slice(0, 2)
          .map(gq => {
            const qText = gq.question_text || gq.question || '';
            const codingInfo = evaluateQuestionCodingRequirement(qText, assignedRound, primaryDomain);
            return {
              question_id: 'Q_PREDICT_TEMP',
              question_text: qText,
              company,
              role,
              branch: branchLabel,
              round: assignedRound,
              category: 'AI_PREDICTED' as QuestionCategory,
              confidence: 'high' as ConfidenceLevel,
              relevance_score: 92,
              requires_coding: codingInfo.requires_coding,
              coding_language: codingInfo.coding_language,
              what_we_look_for: gq.what_we_look_for || `Core competencies required for ${role} at ${comp}`,
              follow_up_hint: gq.follow_up_hint || 'Can you walk through your trade-off analysis?',
              expected_depth: gq.expected_depth || 'mid',
              time_limit_seconds: 150,
              prediction_metadata: {
                reason_generated: gq.reason_generated || `Generated dynamically by Gemini AI for ${comp} ${role}`,
                inputs_used: [`Company: ${comp}`, `Role: ${role}`, `Branch: ${branchLabel}`, `Round: ${assignedRound}`],
                prediction_confidence: "high" as ConfidenceLevel
              }
            };
          })
          .filter(q => q.question_text && isQuestionRelevantToJobDomain(q.question_text, primaryDomain, role, jobDescription));

        if (geminiQuestions.length > 0) {
          console.log(`[QuestionEngine] Successfully generated ${geminiQuestions.length} domain-verified AI_PREDICTED questions via Gemini.`);
          return { questions: geminiQuestions, isGeminiGenerated: true };
        }
      }
    } catch (geminiErr: any) {
      console.warn('[QuestionEngine] Gemini live question generation fallback:', geminiErr?.message);
    }
  }

  // 2. Deterministic domain fallback if offline or API key missing
  const isAIEngineer = primaryDomain === 'aiml';
  const isElectrical = primaryDomain === 'electrical';
  const isECE = primaryDomain === 'ece';
  const isSoftware = primaryDomain === 'software';
  const isCivil = primaryDomain === 'civil';
  const isMechanical = primaryDomain === 'mechanical';

  const predicted: CanonicalInterviewQuestion[] = [];

  if (isAIEngineer) {
    predicted.push({
      question_id: 'Q_PREDICT_TEMP',
      question_text: `For a production AI service at ${comp}, how would you architect an inference pipeline to handle real-time streaming queries with sub-200ms latency while guarding against model hallucinations?`,
      company,
      role,
      branch: branchLabel,
      round: assignedRound,
      category: "AI_PREDICTED",
      confidence: "high",
      relevance_score: 88,
      requires_coding: false,
      what_we_look_for: "Model quantization, caching layer (Redis/Semantic cache), async batching, guardrail evaluation.",
      follow_up_hint: "How would you monitor model drift and latency degradation over time?",
      expected_depth: "mid",
      time_limit_seconds: 160,
      prediction_metadata: {
        reason_generated: `Predicted based on ${comp}'s enterprise AI deployment patterns for ${role}`,
        inputs_used: [`Company: ${comp}`, `Role: ${role}`, "Current industry emphasis on real-time GenAI latency"],
        prediction_confidence: "high"
      }
    });
  } else if (isElectrical) {
    predicted.push({
      question_id: 'Q_PREDICT_TEMP',
      question_text: `For a Transmission & Distribution (T&D) engineering project at ${comp}, explain the Ferranti Effect and Surge Impedance Loading (SIL) on long high-voltage transmission lines, and how shunt reactors and series capacitors are coordinated to maintain voltage profiles and line stability.`,
      company,
      role,
      branch: branchLabel,
      round: assignedRound,
      category: "AI_PREDICTED",
      confidence: "high",
      relevance_score: 94,
      requires_coding: false,
      what_we_look_for: "ABCD transmission parameters, line charging capacitance under light load, Surge Impedance Z_c = sqrt(L/C), SIL = V^2/Z_c, and reactive power compensation.",
      expected_points: [
        "Explains Ferranti receiving-end voltage rise due to distributed line capacitance under light/no load",
        "Defines Surge Impedance Loading (SIL = V^2 / sqrt(L/C)) and shunt reactor / series capacitor compensation"
      ],
      follow_up_hint: "How do conductor bundling (ACSR) and transposition reduce corona loss and inductive reactance on 220kV/400kV overhead lines?",
      expected_depth: "junior",
      time_limit_seconds: 150,
      prediction_metadata: {
        reason_generated: `Predicted based on ${comp}'s Transmission & Distribution (T&D) and High-Voltage Power Systems engineering requirements`,
        inputs_used: [`Company: ${comp}`, `Role: ${role}`, "T&D Transmission Line & Power Systems Engineering"],
        prediction_confidence: "high"
      }
    });
    predicted.push({
      question_id: 'Q_PREDICT_TEMP',
      question_text: `When preparing or reviewing a Substation Single-Line Diagram (SLD) at ${comp}, how do you arrange busbar schemes (Main-and-Transfer vs. Breaker-and-a-Half), position Current Transformers (CTs), Potential Transformers (PTs), and Lightning Arresters (LA), and coordinate distance (21) and differential (87T) protection zones?`,
      company,
      role,
      branch: branchLabel,
      round: "Protection Relays, Switchgear & PLC/SCADA Automation",
      category: "AI_PREDICTED",
      confidence: "high",
      relevance_score: 93,
      requires_coding: false,
      what_we_look_for: "SLD equipment sequence (Line -> LA -> CVT/PT -> Wave Trap -> Isolator -> CB -> CT -> Busbar), overlapping CT protection zones to eliminate blind spots, Zone 1/2/3 impedance reach settings.",
      expected_points: [
        "Details exact substation equipment order from incoming transmission line to busbar",
        "Explains overlapping CT differential protection zones and Zone 1 (80-85% line length) distance relay coordination"
      ],
      follow_up_hint: "Why must a Lightning Arrester (Surge Arrester) be placed as close as possible to the power transformer bushings?",
      expected_depth: "junior",
      time_limit_seconds: 150,
      prediction_metadata: {
        reason_generated: `Predicted based on ${comp}'s T&D Substation Design and Protection Engineering workflow`,
        inputs_used: [`Company: ${comp}`, `Role: ${role}`, "Single-Line Diagrams (SLD) & Protection Relay Coordination"],
        prediction_confidence: "high"
      }
    });
  } else if (isECE) {
    predicted.push({
      question_id: 'Q_PREDICT_TEMP',
      question_text: `In CMOS digital VLSI and semiconductor design at ${comp}, explain the voltage transfer characteristic (VTC) and noise margins of a CMOS inverter, the components of dynamic and static leakage power dissipation, and how you fix setup and hold time violations in Static Timing Analysis (STA).`,
      company,
      role,
      branch: branchLabel,
      round: "Digital Electronics, VLSI & Communication Protocols",
      category: "AI_PREDICTED",
      confidence: "high",
      relevance_score: 94,
      requires_coding: false,
      what_we_look_for: "PMOS/NMOS threshold sizing, switching power P = alpha*C*Vdd^2*f, subthreshold/gate-oxide leakage, setup slack (T_clk - T_cq - T_comb - T_setup >= 0) vs hold slack (T_cq + T_comb >= T_hold).",
      expected_points: [
        "Explains CMOS inverter VTC regions, noise margins, and dynamic/leakage power equations",
        "Differentiates setup time fixes (pipelining, upsizing drivers, LVT cells) from hold time fixes (delay buffers)"
      ],
      follow_up_hint: "Why can setup violations be resolved by lowering the clock frequency, whereas hold violations cannot?",
      expected_depth: "junior",
      time_limit_seconds: 150,
      prediction_metadata: {
        reason_generated: `Predicted based on ${comp}'s semiconductor, CMOS, and digital VLSI design interview standards`,
        inputs_used: [`Company: ${comp}`, `Role: ${role}`, "CMOS VLSI & Static Timing Analysis"],
        prediction_confidence: "high"
      }
    });
  } else if (isCivil) {
    predicted.push({
      question_id: 'Q_PREDICT_TEMP',
      question_text: `At ${comp}, large-scale infrastructure projects require strict adherence to safety and material standards. How do you approach calculating load distributions and ensuring the structural integrity of your designs under extreme conditions?`,
      company,
      role,
      branch: branchLabel,
      round: assignedRound,
      category: "AI_PREDICTED",
      confidence: "high",
      relevance_score: 89,
      requires_coding: false,
      what_we_look_for: "Understanding of structural analysis, material properties, safety factors, and building codes.",
      follow_up_hint: "What software tools do you prefer for finite element analysis?",
      expected_depth: "junior",
      time_limit_seconds: 150,
      prediction_metadata: {
        reason_generated: `Predicted based on civil/structural engineering requirements typical of ${comp}`,
        inputs_used: [`Company: ${comp}`, `Role: ${role}`, "Structural engineering principles"],
        prediction_confidence: "high"
      }
    });
  } else if (isMechanical) {
     predicted.push({
      question_id: 'Q_PREDICT_TEMP',
      question_text: `At ${comp}, mechanical components often undergo significant stress and thermal cycling. Can you describe your process for selecting materials and performing stress analysis for a high-fatigue component?`,
      company,
      role,
      branch: branchLabel,
      round: assignedRound,
      category: "AI_PREDICTED",
      confidence: "high",
      relevance_score: 89,
      requires_coding: false,
      what_we_look_for: "Knowledge of material science, thermodynamics, CAD/FEA tools, and fatigue analysis.",
      follow_up_hint: "How would you design for manufacturability (DFM)?",
      expected_depth: "junior",
      time_limit_seconds: 150,
      prediction_metadata: {
        reason_generated: `Predicted based on mechanical engineering requirements typical of ${comp}`,
        inputs_used: [`Company: ${comp}`, `Role: ${role}`, "Mechanical engineering principles"],
        prediction_confidence: "high"
      }
    });
  } else if (isSoftware) {
    predicted.push({
      question_id: 'Q_PREDICT_TEMP',
      question_text: `Write a function to implement binary search on a rotated sorted array of distinct integers to find a target value in O(log N) time complexity, and handle edge cases where the array is empty or not rotated.`,
      company,
      role,
      branch: branchLabel,
      round: "Coding / Online Assessment",
      category: "AI_PREDICTED",
      confidence: "high",
      relevance_score: 92,
      requires_coding: true,
      coding_language: "python",
      expected_complexity: { time: "O(log N)", space: "O(1)" },
      what_we_look_for: "Modified binary search identifying the sorted half (nums[left] <= nums[mid]) in each iteration, O(log N) time and O(1) space.",
      follow_up_hint: "How does the worst-case time complexity change if the array contains duplicate elements?",
      expected_depth: "junior",
      time_limit_seconds: 150,
      prediction_metadata: {
        reason_generated: `Predicted coding & DSA question for ${role} at ${comp}`,
        inputs_used: [`Company: ${comp}`, `Role: ${role}`, "Data Structures & Algorithms (DSA)"],
        prediction_confidence: "high"
      }
    });
  }

  return { questions: predicted, isGeminiGenerated: false };
}

/**
 * Domain-specific practice pool for non-verified companies across Civil, Mechanical, ECE, Electrical, AI/ML, and Software disciplines.
 * Strictly uses resolveJobPrimaryDomain so role & JD take priority over resume keywords.
 */
function getDomainPracticePool(
  company: string,
  role: string,
  jd?: string | null,
  candidateSkills?: string | null,
  parsedResume?: any
): Array<{ text: string; round: string; what_we_look_for: string; hint: string; requires_coding?: boolean; coding_language?: string }> {
  const primaryDomain = resolveJobPrimaryDomain(role, jd, parsedResume, candidateSkills);
  const isCivil = primaryDomain === 'civil';
  const isMech = primaryDomain === 'mechanical';
  const isAIML = primaryDomain === 'aiml';
  const isECE = primaryDomain === 'ece';
  const isElec = primaryDomain === 'electrical';

  if (isCivil) {
    return [
      {
        text: `In structural engineering at ${company}, how do you evaluate load paths and compute bending moments and shear forces for a continuous reinforced concrete beam under both dead and live loads according to building codes (such as IS 456 or Eurocode 2)?`,
        round: "Civil and Structural Technical Fundamentals",
        what_we_look_for: "Limit state method, bending moment envelopes, shear reinforcement detailing, and factor of safety.",
        hint: "How does the redistribution of moments affect support and span sections?"
      },
      {
        text: `When utilizing finite element analysis and structural modeling tools like STAAD.Pro or ETABS, how do you verify boundary conditions, model rigid diaphragms, and interpret modal analysis results for seismic lateral forces?`,
        round: "Structural Design, Codes and Engineering Tools",
        what_we_look_for: "Accurate modeling of fixity/pinned supports, master-slave kinematics for diaphragms, response spectrum analysis.",
        hint: "What checks do you perform if modal mass participation fails to reach 90%?"
      },
      {
        text: `Walk me through your methodology for selecting concrete mix grades and detailing steel reinforcement to control crack widths and ensure deflection limits in water-retaining or foundation structures.`,
        round: "Civil and Structural Technical Fundamentals",
        what_we_look_for: "Permissible stress vs limit state for water retaining, serviceability limits, bar spacing, cover requirements.",
        hint: "How does heat of hydration affect early thermal cracking in mass concrete pours?"
      },
      {
        text: `On a major infrastructure project managed by ${company}, unforeseen site conditions often require immediate structural modifications. How do you evaluate and approve design changes under tight schedule constraints while strictly safeguarding structural integrity?`,
        round: "Project and Site Engineering Deep Dive",
        what_we_look_for: "Change management workflows, risk assessment, site team communication, geotechnical re-evaluation.",
        hint: "How would you utilize digital engineering tools or BIM workflows to expedite structural re-analysis?"
      },
      {
        text: `Describe a structural engineering project you worked on. What were the critical engineering assumptions you made during preliminary sizing, and how did you validate them against actual site or laboratory tests?`,
        round: "Project and Site Engineering Deep Dive",
        what_we_look_for: "Engineering judgment, load assumptions, soil report interpretation, material testing protocols.",
        hint: "Did you encounter any variance between theoretical calculations and site constraints?"
      },
      {
        text: `How do you enforce construction site safety protocols (such as excavation shoring, scaffolding inspections, and PPE adherence) and manage ethical dilemmas when faced with contractor pressure to cut corners?`,
        round: "HR, Safety and Behavioral",
        what_we_look_for: "Safety-first mindset, OSHA/safety standards compliance, ethical integrity, and assertive communication.",
        hint: "Can you describe a situation where you had to halt or question work due to an imminent safety or quality risk?"
      },
      {
        text: `Explain the critical criteria for designing deep foundations (such as bored cast-in-situ piles) in weak or expansive soils, including skin friction, end bearing, and negative skin friction.`,
        round: "Civil and Structural Technical Fundamentals",
        what_we_look_for: "Soil mechanics, geotechnical borehole logs, pile settlement calculations, pile group efficiency.",
        hint: "Under what conditions does negative skin friction occur and how do you mitigate its impact?"
      },
      {
        text: `How do you coordinate structural models with architectural and MEP services in a BIM (Building Information Modeling) environment to detect and resolve geometric clashes before procurement?`,
        round: "Structural Design, Codes and Engineering Tools",
        what_we_look_for: "BIM Level 2 coordination, Navisworks clash detection, clearance tolerance standards, multi-disciplinary review.",
        hint: "What protocol do you follow when a primary structural beam clashes with high-priority HVAC ductwork?"
      }
    ];
  }

  if (isMech) {
    return [
      {
        text: `In mechanical design at ${company}, how do you establish datum references and apply Geometric Dimensioning and Tolerancing (GD&T) to ensure proper assembly fit while minimizing manufacturing costs?`,
        round: "Mechanical Engineering Fundamentals & Design",
        what_we_look_for: "Datum reference frames, feature control frames, MMC/LMC bonus tolerances, and tolerance stack-up analysis.",
        hint: "How do you decide between maximum material condition and regardless of feature size?"
      },
      {
        text: `Describe your approach to performing thermal stress analysis and selecting materials for a mechanical component subjected to severe cyclic temperature variations.`,
        round: "Thermal, Fluid & Materials Analysis",
        what_we_look_for: "Thermal expansion coefficients, thermal conductivity, thermal fatigue, finite element mesh density.",
        hint: "How does constrained thermal expansion lead to plastic deformation over repeated thermal cycles?"
      },
      {
        text: `When designing a fluid delivery or hydraulic system, how do you calculate system head losses, prevent pump cavitation (NPSH margin), and size appropriate valving?`,
        round: "Thermal, Fluid & Materials Analysis",
        what_we_look_for: "Darcy-Weisbach equation, friction factors, Moody chart, NPSHa vs NPSHr calculations, water hammer mitigation.",
        hint: "What physical indicators on an impeller indicate damage from cavitation?"
      },
      {
        text: `In high-stress rotating machinery, how do you assess fatigue life using S-N curves and Goodman/Soderberg failure criteria under combined alternating and mean stresses?`,
        round: "Mechanical Engineering Fundamentals & Design",
        what_we_look_for: "Stress concentration factors (Kt/Kf), endurance limit modification factors, mean stress corrections.",
        hint: "Why is surface finish critical when estimating the fatigue endurance limit?"
      },
      {
        text: `Can you walk through your Design for Manufacturability (DFM) and Design for Assembly (DFA) review process for a precision CNC-machined or injection-molded component?`,
        round: "Manufacturing & Project Deep Dive",
        what_we_look_for: "Tool accessibility, draft angles, uniform wall thickness, standard stock sizing, minimizing fixture changes.",
        hint: "How do internal sharp corners impact tooling life and stress concentration?"
      },
      {
        text: `When setting up a Finite Element Analysis (FEA) simulation in ANSYS or SolidWorks Simulation, how do you validate mesh independence and verify that your boundary conditions accurately reflect real physical constraints?`,
        round: "Mechanical Engineering Fundamentals & Design",
        what_we_look_for: "Mesh convergence study, h-refinement vs p-refinement, avoiding artificial stress singularities, hand-calculation verification.",
        hint: "How do you distinguish a genuine stress concentration from a numerical mesh singularity?"
      },
      {
        text: `Explain how you perform a failure mode and effects analysis (DFMEA/PFMEA) on an electro-mechanical assembly before releasing it to production.`,
        round: "Manufacturing & Project Deep Dive",
        what_we_look_for: "Severity, Occurrence, and Detection ratings, Risk Priority Number (RPN), corrective design actions.",
        hint: "Why should high-severity failure modes be prioritized regardless of a moderate RPN?"
      },
      {
        text: `Tell me about a time you encountered a conflict between manufacturing schedule demands and quality/safety tolerance standards. How did you resolve it?`,
        round: "HR, Safety and Behavioral",
        what_we_look_for: "Quality ownership, root-cause investigation, structured risk assessment, constructive stakeholder negotiation.",
        hint: "What process change did you introduce to prevent similar quality escapes in the future?"
      }
    ];
  }

  if (isECE) {
    return [
      {
        text: `In synchronous digital VLSI/FPGA design using Verilog or SystemVerilog, what causes setup and hold time violations, and how do you resolve metastability across asynchronous clock domain crossings (CDC)?`,
        round: "Digital Electronics, VLSI & Communication Protocols",
        what_we_look_for: "Setup/hold equations, clock skew, two-flop synchronizers for control signals, asynchronous FIFOs with Gray code pointers.",
        hint: "Why must multi-bit buses use Gray coding or handshake protocols across clock domains?"
      },
      {
        text: `In CMOS digital design at ${company}, explain the CMOS inverter voltage transfer curve (VTC), how beta ratio (Wp/Wn) affects switching threshold, and how you minimize dynamic switching power and static subthreshold leakage in deep-submicron nodes.`,
        round: "Digital Electronics, VLSI & Communication Protocols",
        what_we_look_for: "Symmetric VTC with Wp/Wn ~ 2-2.5 for equal mobility compensation, dynamic power P = alpha*C*Vdd^2*f, clock gating, multi-Vt cells, and power gating.",
        hint: "How does velocity saturation in short-channel MOSFETs alter the quadratic saturation current equation?"
      },
      {
        text: `How do you debug an intermittent communication failure on an I2C or SPI bus when using an oscilloscope or logic analyzer under loaded conditions?`,
        round: "Digital Electronics, VLSI & Communication Protocols",
        what_we_look_for: "Rise-time measurements, pull-up resistor sizing, bus capacitance, clock stretching, CPOL/CPHA modes.",
        hint: "If signal rise time is too slow on I2C, what trade-off occurs when lowering pull-up resistance?"
      },
      {
        text: `When developing embedded firmware for real-time applications at ${company}, how do you structure interrupt service routines (ISRs) and prevent priority inversion in an RTOS environment?`,
        round: "Embedded Systems & Microcontroller Architecture",
        what_we_look_for: "Keeping ISRs minimal, deferred interrupt processing, priority inheritance mutexes, volatile keyword usage.",
        hint: "Why is acquiring a blocking semaphore inside an ISR dangerous?"
      },
      {
        text: `In high-speed mixed-signal PCB and IC packaging design, how do you maintain signal integrity, control trace impedance, and isolate noise between digital switching circuits and analog front-ends?`,
        round: "Digital Electronics, VLSI & Communication Protocols",
        what_we_look_for: "Continuous ground return planes, decoupling capacitor placement, differential pair routing, star grounding, crosstalk mitigation.",
        hint: "What happens to return current inductance when a high-speed trace crosses a split in the ground plane?"
      },
      {
        text: `Explain how DMA (Direct Memory Access) improves throughput in microcontroller and SoC architectures (such as ARM Cortex / AXI interconnects) and how you handle cache coherency or buffer overrun issues.`,
        round: "Embedded Systems & Microcontroller Architecture",
        what_we_look_for: "Circular DMA buffers, half-transfer and transfer-complete interrupts, CPU offloading, bus arbitration.",
        hint: "How do you prevent race conditions between the DMA controller writing to a ring buffer and the CPU reading from it?"
      },
      {
        text: `In power supply design for electronics and semiconductor boards, what are the trade-offs between linear LDO regulators and switching buck converters regarding efficiency, thermal dissipation, and output ripple?`,
        round: "Hardware Project & Lab Troubleshooting Deep Dive",
        what_we_look_for: "LDO efficiency (Vout/Vin), switching frequency EMI, inductor saturation, PSRR for sensitive RF/analog rails.",
        hint: "When would you cascade an LDO downstream of a switching buck regulator?"
      },
      {
        text: `Describe a project where you had to debug a failing hardware prototype, RTL simulation timing bug, or embedded firmware defect under tight deadlines. How did you methodically isolate the root cause?`,
        round: "HR, Safety and Behavioral",
        what_we_look_for: "Methodical test plans, waveform/oscilloscope troubleshooting, hardware-software boundary isolation, teamwork.",
        hint: "Did the fix require an RTL/PCB revision or a constraint/firmware workaround?"
      }
    ];
  }

  if (isElec) {
    return [
      {
        text: `In high-voltage Transmission & Distribution (T&D) lines engineered at ${company}, how do you calculate transmission line parameters (inductance, capacitance, sag-tension, and string efficiency of suspension insulators), and how do Grading Rings and arcing horns improve insulator string performance?`,
        round: "Power Systems, Electrical Machines & Circuit Analysis",
        what_we_look_for: "GMD/GMR inductance & capacitance formulas, parabolic/catenary sag calculation with wind & ice loading, shunt capacitance across disc insulators causing unequal voltage distribution, grading ring equalization.",
        hint: "Why does the insulator disc nearest to the phase conductor experience the highest electrical stress?"
      },
      {
        text: `In electrical power distribution and transmission networks at ${company}, how do you perform symmetrical and unsymmetrical (L-G, L-L, L-L-G) short-circuit fault analysis using symmetrical components, and coordinate distance (21), overcurrent (50/51), and differential (87) protection relays?`,
        round: "Protection Relays, Switchgear & PLC/SCADA Automation",
        what_we_look_for: "Positive, negative, and zero-sequence networks, Time-Current Characteristic (TCC) grading margins, differential relay percentage bias & 2nd-harmonic inrush restraint, CT saturation.",
        hint: "How does harmonic restraint prevent differential relay nuisance tripping during power transformer energization?"
      },
      {
        text: `Explain why power transformers are rated in MVA/kVA rather than MW/kW, how vector groups (such as Dyn11 vs. YNd1) are selected in transmission and distribution substations, and how Buchholz and Sudden Pressure relays protect transformers against internal faults.`,
        round: "Power Systems, Electrical Machines & Circuit Analysis",
        what_we_look_for: "Core loss (voltage-dependent) vs copper loss (current-dependent) independent of load power factor, delta winding circulating 3rd-harmonic currents and zero-sequence fault isolation, incipient gas accumulation in Buchholz relay.",
        hint: "Why is a delta-star (Dyn11) vector group universally preferred for step-down distribution transformers?"
      },
      {
        text: `Compare the arc-quenching mechanisms, dielectric recovery principles, and T&D application domains of SF6, Vacuum (VCB), and Air Circuit Breakers (ACB) across low, medium, and extra-high-voltage (EHV) substations.`,
        round: "Protection Relays, Switchgear & PLC/SCADA Automation",
        what_we_look_for: "Electronegative SF6 gas arc cooling for 66kV-765kV EHV GIS/AIS, high vacuum dielectric strength & current chopping in 11kV-33kV VCBs, arc chutes in 415V ACBs, interrupting capacity vs making current.",
        hint: "What is current chopping in a Vacuum Circuit Breaker, and how do surge arresters protect inductive loads from the resulting voltage spike?"
      },
      {
        text: `When designing a Transmission & Distribution substation or industrial load center at ${company}, how do you develop Single-Line Diagrams (SLDs), size power cables and busbars, and evaluate voltage drop, thermal ampacity derating, and short-circuit withstand (I^2*t)?`,
        round: "Electrical Design & Project Deep Dive",
        what_we_look_for: "SLD bay layout, continuous current capacity, ambient temperature & grouping derating factors, adiabatic short-circuit temperature rise equation, <=3-5% voltage drop compliance.",
        hint: "How does the X/R ratio of the power system at the fault point affect the asymmetrical peak making current of a circuit breaker?"
      },
      {
        text: `In power systems analysis (using tools like ETAP, PLS-CADD, or MATLAB Simulink), how do you model load flow (Newton-Raphson vs. Fast Decoupled), evaluate power factor correction, and prevent harmonic resonance when sizing capacitor banks?`,
        round: "Power Systems, Electrical Machines & Circuit Analysis",
        what_we_look_for: "Slack/PV/PQ bus definitions, Jacobian matrix convergence, active (MW) vs reactive (MVAR) power triangle, detuned series reactors (5.67% or 7%) to shift parallel resonance below the 5th harmonic.",
        hint: "Why does improving the power factor of an inductive load reduce transmission line I^2*R losses and release transformer MVA capacity?"
      },
      {
        text: `Walk me through the critical requirements for high-voltage substation earthing (grounding) grid design and lightning protection (shield wires / lightning masts) to keep Step Potential and Touch Potential within safe IEEE 80 limits during an earth fault.`,
        round: "Electrical Design & Project Deep Dive",
        what_we_look_for: "Wenner 4-pin soil resistivity testing, grid conductor & ground rod sizing, Ground Potential Rise (GPR), high-resistivity crushed rock surface layer (3000-5000 ohm-m), rolling sphere method for lightning shielding.",
        hint: "Why is a 100-150 mm layer of high-resistivity crushed stone spread across an outdoor switchyard?"
      },
      {
        text: `Explain the operating principles of 3-phase synchronous generators and induction motors, and describe how you enforce Lockout/Tagout (LOTO), minimum approach distances, and arc-flash safety procedures during T&D substation commissioning at ${company}.`,
        round: "HR, High-Voltage Safety and Behavioral",
        what_we_look_for: "Synchronous machine excitation (over-excited supplying MVAR vs under-excited absorbing MVAR), induction motor slip-torque curve, LOTO zero-energy verification, earthing switches, PPE arc-flash categories.",
        hint: "What safety verification steps must be completed after opening a circuit breaker and isolator before applying portable earth leads on a transmission bay?"
      }
    ];
  }

  if (isAIML) {
    return [
      {
        text: `For a production AI service at ${company}, how would you architect a Retrieval-Augmented Generation (RAG) and inference pipeline to handle real-time queries with low latency while mitigating model hallucinations?`,
        round: "Applied AI, Transformers & Model Optimization",
        what_we_look_for: "Hybrid search (dense vector + BM25), cross-encoder reranking, semantic caching, KV-cache optimization, groundedness guardrails.",
        hint: "How do you evaluate retrieval recall separately from generation faithfulness?"
      },
      {
        text: `Explain the scaled dot-product self-attention mechanism in Transformer architectures. Why is the dot product scaled by 1/sqrt(d_k), and what is the computational complexity with respect to sequence length?`,
        round: "Machine Learning & Deep Learning Fundamentals",
        what_we_look_for: "Query-Key-Value projections, preventing softmax saturation into vanishing gradient regions for large d_k, O(N^2) complexity.",
        hint: "How do techniques like FlashAttention or Grouped-Query Attention (GQA) reduce memory bandwidth bottlenecks?"
      },
      {
        text: `When training a machine learning classifier on a severely imbalanced dataset (e.g., 0.2% positive fraud or anomaly rate), why is accuracy misleading, and how do you select loss functions and evaluation metrics?`,
        round: "Machine Learning & Deep Learning Fundamentals",
        what_we_look_for: "Precision-Recall AUC vs ROC-AUC, Focal Loss, class-weighted cross-entropy, stratified cross-validation, threshold calibration.",
        hint: "Why can SMOTE oversampling cause data leakage if applied before splitting train and validation folds?"
      },
      {
        text: `How do you diagnose and prevent data leakage, overfitting, and distribution shift between offline training datasets and live production inference features?`,
        round: "AI/ML Project & Dataset Deep Dive",
        what_we_look_for: "Time-based train/val splits, point-in-time feature stores, L1/L2/Dropout regularization, PSI (Population Stability Index) drift alerts.",
        hint: "What happens if target encoding or feature normalization is computed across the full dataset before train/test splitting?"
      },
      {
        text: `Compare parameter-efficient fine-tuning (PEFT) methods like LoRA/QLoRA against full fine-tuning and prompt engineering when adapting a foundation model to a domain-specific task.`,
        round: "Applied AI, Transformers & Model Optimization",
        what_we_look_for: "Low-rank decomposition matrices (A and B) freezing base weights, VRAM reduction, catastrophic forgetting prevention.",
        hint: "How do you choose the rank r and alpha hyperparameters in LoRA?"
      },
      {
        text: `How do you optimize deep learning model inference latency and memory footprint for production deployment using quantization (INT8/FP16), pruning, or knowledge distillation?`,
        round: "Applied AI, Transformers & Model Optimization",
        what_we_look_for: "Post-Training Quantization (PTQ) vs Quantization-Aware Training (QAT), ONNX/TensorRT compilation, dynamic batching.",
        hint: "How do you measure and bound accuracy degradation after quantizing weights from FP16 to INT8?"
      },
      {
        text: `Walk me through an AI/ML project you built end-to-end. How did you establish the baseline model, perform error analysis on failure slices, and validate measurable improvement?`,
        round: "AI/ML Project & Dataset Deep Dive",
        what_we_look_for: "Simple heuristic/linear baseline first, confusion matrix slice analysis, ablation studies, reproducible experiment tracking.",
        hint: "What was the most surprising failure mode you discovered during error analysis?"
      },
      {
        text: `Tell me about a time when a stakeholder requested an complex AI/deep learning solution for a problem that could be solved more reliably with a simpler statistical model or heuristic. How did you handle it?`,
        round: "HR & Behavioral",
        what_we_look_for: "Engineering pragmatism, communicating cost/latency/interpretability trade-offs, data-driven alignment.",
        hint: "How did you benchmark both approaches to convince the team?"
      }
    ];
  }

  // Default Software / CSE Track (8 questions)
  return [
    {
      text: `At ${company}, how would you approach diagnosing and remediating an intermittent 5xx latency spike in a microservice where CPU and memory usage remain normal?`,
      round: "Domain-Specific Technical",
      what_we_look_for: "Connection pool exhaustion, thread starvation, database query lock wait times, downstream dependency timeouts.",
      hint: "How would you inspect APM traces or TCP connection states?"
    },
    {
      text: `Describe your methodology for executing a zero-downtime database schema migration on a high-throughput production table with millions of active writes.`,
      round: "Project & Resume Deep Dive",
      what_we_look_for: "Expand-contract pattern, dual-writing, backward-compatible API layers, asynchronous backfills.",
      hint: "How do you handle transactional rollback if a failure occurs halfway?"
    },
    {
      text: `Design the core API and data structures for an idempotent distributed payment processing queue at ${company}.`,
      round: "System Design / Low-Level Design",
      what_we_look_for: "Idempotency keys, distributed locks, at-least-once vs exactly-once semantics, dead-letter queues.",
      hint: "What happens if the network drops right after the payment gateway charges the customer?"
    },
    {
      text: `Given an array of intervals or stream of timestamped requests, how would you implement a sliding-window rate limiter in O(1) amortized time per check, and what concurrency controls are required?`,
      round: "Coding / Online Assessment",
      what_we_look_for: "Token bucket or sliding window counter, deque/ring buffer, atomic Redis Lua scripts or mutex synchronization.",
      hint: "How do you avoid race conditions when multiple worker threads check and decrement the quota simultaneously?"
    },
    {
      text: `Explain how database indexing (B-Tree vs LSM-Tree) affects read vs write amplification, and how you diagnose a query where the optimizer ignores a composite index.`,
      round: "Domain-Specific Technical",
      what_we_look_for: "Leftmost prefix rule in composite B-Tree indexes, cardinality/selectivity, write-ahead log + memtable in LSM trees.",
      hint: "When does a full table sequential scan outperform an index lookup?"
    },
    {
      text: `How do you design an authentication and session management architecture using short-lived JWT access tokens and rotating refresh tokens while supporting immediate revocation?`,
      round: "System Design / Low-Level Design",
      what_we_look_for: "HttpOnly Secure cookies, refresh token rotation family detection, Redis deny-list for compromised sessions, CSRF protection.",
      hint: "How do you detect and respond when a stolen refresh token is replayed?"
    },
    {
      text: `Tell me about a technical decision you made where you faced conflicting priorities between rapid delivery and long-term code quality. How did you resolve it?`,
      round: "HR & Behavioral",
      what_we_look_for: "Structured STAR framework, ownership, pragmatic trade-offs, clear communication with stakeholders.",
      hint: "What would you do differently if faced with that situation today?"
    },
    {
      text: `Explain how you evaluate the trade-offs between asynchronous event-driven messaging (e.g. Kafka/SQS) and synchronous REST/gRPC communication between services.`,
      round: "Domain-Specific Technical",
      what_we_look_for: "Coupling, latency guarantees, backpressure, failure isolation, operational complexity.",
      hint: "How do you guarantee ordering in partitioned event streams?"
    }
  ];
}

/**
 * Deduplicate semantically similar questions and ensure diverse coverage
 */
function deduplicateAndOrderQuestions(
  rawList: CanonicalInterviewQuestion[],
  rounds: DetectedRound[]
): CanonicalInterviewQuestion[] {
  const seenTexts = new Set<string>();
  const uniqueList: CanonicalInterviewQuestion[] = [];

  for (const q of rawList) {
    const textNorm = q.question_text.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
    const shortPrefix = textNorm.substring(0, 45);
    if (!seenTexts.has(shortPrefix)) {
      seenTexts.add(shortPrefix);
      uniqueList.push(q);
    }
  }

  // Group by round
  const questionsByRound = new Map<string, CanonicalInterviewQuestion[]>();
  rounds.forEach(r => questionsByRound.set(r.round_name.toLowerCase(), []));
  
  const unassigned: CanonicalInterviewQuestion[] = [];

  uniqueList.forEach(q => {
    const roundKey = q.round.toLowerCase();
    let found = false;
    for (const r of rounds) {
      if (r.round_name.toLowerCase() === roundKey) {
        questionsByRound.get(roundKey)!.push(q);
        found = true;
        break;
      }
    }
    if (!found) {
      unassigned.push(q);
    }
  });

  const finalStructuredList: CanonicalInterviewQuestion[] = [];

  // Sort function to prioritize high relevance and verified categories
  const sortQuestions = (a: CanonicalInterviewQuestion, b: CanonicalInterviewQuestion) => {
     const categoryRank = (cat: string) => {
        if (cat === 'REPORTED') return 4;
        if (cat === 'OFFICIAL_DERIVED') return 3;
        if (cat === 'RESUME_BASED') return 2;
        return 1; // AI_PREDICTED
     };
     const rankA = categoryRank(a.category);
     const rankB = categoryRank(b.category);
     if (rankA !== rankB) return rankB - rankA;
     return b.relevance_score - a.relevance_score;
  };

  // For each round, ensure balanced selection:
  // If technical/coding round: pick 1 verified benchmark question + 1 candidate-specific RESUME_BASED question (if available)!
  rounds.forEach(r => {
    const roundKey = r.round_name.toLowerCase();
    const qs = questionsByRound.get(roundKey) || [];
    const isTech = (roundKey.includes('technical') || roundKey.includes('coding') || roundKey.includes('design') || roundKey.includes('dsa') || roundKey.includes('domain'));
    const isManagerialOrProjects = (roundKey.includes('managerial') || roundKey.includes('project') || roundKey.includes('behavioral'));

    if (isTech) {
      // Pick top verified (REPORTED / OFFICIAL_DERIVED)
      const verified = qs.filter(q => q.category === 'REPORTED' || q.category === 'OFFICIAL_DERIVED').sort(sortQuestions);
      // Pick top candidate resume-based question
      const resume = qs.filter(q => q.category === 'RESUME_BASED').sort(sortQuestions);

      if (verified.length > 0) finalStructuredList.push(verified[0]);
      if (resume.length > 0) {
        finalStructuredList.push(resume[0]);
      } else if (verified.length > 1) {
        finalStructuredList.push(verified[1]);
      } else if (qs.length > 1) {
        const remaining = qs.filter(q => !finalStructuredList.includes(q)).sort(sortQuestions);
        if (remaining.length > 0) finalStructuredList.push(remaining[0]);
      }
    } else if (isManagerialOrProjects) {
      // If there is a project or experience resume question, prioritize it here
      const resumeProject = qs.filter(q => q.category === 'RESUME_BASED' && q.resume_metadata?.resume_section === 'projects').sort(sortQuestions);
      if (resumeProject.length > 0) {
        finalStructuredList.push(resumeProject[0]);
      } else if (qs.length > 0) {
        qs.sort(sortQuestions);
        finalStructuredList.push(qs[0]);
      }
    } else {
      // Single selection for OA / Aptitude / HR
      if (qs.length > 0) {
        qs.sort(sortQuestions);
        finalStructuredList.push(qs[0]);
      } else if (unassigned.length > 0) {
        unassigned.sort(sortQuestions);
        const fallback = unassigned.shift()!;
        fallback.round = r.round_name;
        finalStructuredList.push(fallback);
      }
    }
  });

  // SAFETY GUARANTEE: If candidate provided resume claims, ensure at least 1 top resume question is in the plan!
  const hasResumeQ = finalStructuredList.some(q => q.category === 'RESUME_BASED');
  if (!hasResumeQ) {
    const anyResumeQ = uniqueList.find(q => q.category === 'RESUME_BASED');
    if (anyResumeQ) {
      finalStructuredList.splice(Math.min(1, finalStructuredList.length), 0, anyResumeQ);
    }
  }

  // Assign stable sequential question_ids: Q001, Q002, etc.
  return finalStructuredList.map((q, idx) => ({
    ...q,
    question_id: `Q${String(idx + 1).padStart(3, '0')}`,
    question: q.question_text
  }));
}


/**
 * MAIN ORCHESTRATION: Generate Canonical Interview Question Set
 * Follows the 10-Slot Allocation Algorithm with multi-source evidence provenance (LeetCode Discuss & Katkat model)
 */
export async function generateCanonicalQuestionSet(
  input: CanonicalQuestionGenerationInput
): Promise<InterviewQuestionSet> {
  const rawCompany = input.company?.trim() || "Amazon";
  const company = normalizeCompanyName(rawCompany);
  const role = input.role?.trim() || "Software Engineer";
  const jd = input.jobDescription?.trim() || null;
  const warnings: string[] = [];

  // Generate stable Set ID
  const sanitizedCompany = company.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8) || 'COMP';
  const sanitizedRole = role.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8) || 'ROLE';
  const setId = `SET_${sanitizedCompany}_${sanitizedRole}_${Date.now()}`;

  // ── Step 1: Evidence-Supported Round Configuration & Primary Domain Resolution ─────────
  const primaryDomain = resolveJobPrimaryDomain(role, jd, input.parsedResume, input.candidateSkills);
  const resolvedBranchLabel = input.branch || mapDomainToBranchLabel(primaryDomain);
  const dbRounds = await getCompanyInterviewRounds(company, role, jd, input.parsedResume);
  const detectedRounds: DetectedRound[] = dbRounds.map(r => ({
    round_name: r.round_name,
    description: r.description || '',
    evidence: r.evidence_summary || '',
    confidence: 'high' as ConfidenceLevel,
    order: r.round_order
  }));

  // Target Round: use provided roundName or default to primary technical round
  const targetRound = input.roundName || (detectedRounds[0]?.round_name) || 'Domain-Specific Technical';

  // ── Step 2: Extract Verified Resume Claims (Strictly Filtered to Selected Job Domain) ────
  const resumeClaims = extractResumeClaims(input.parsedResume, input.candidateSkills || undefined);
  const hasRealResumeClaims = Boolean(
    input.parsedResume &&
    (resumeClaims.projects.length > 0 || (resumeClaims.skills.length > 0 && input.parsedResume.skills))
  );
  const resumeRoundName = detectedRounds.find(r => /project|deep dive/i.test(r.round_name))?.round_name || targetRound;
  const resumeQuestions = hasRealResumeClaims
    ? generateResumeBasedQuestions(company, role, resumeClaims, resumeRoundName, primaryDomain, jd)
    : [];
  const { questions: predictedQuestions, isGeminiGenerated } = await generateAIPredictedQuestions(
    company,
    role,
    jd,
    resumeClaims,
    targetRound,
    primaryDomain
  );

  // ── Step 3: Query Normalized Intelligence Repository (Round-Aware) ────────
  let repoQuestions: NormalizedQuestionRecord[] = [];
  if (input.roundName) {
    repoQuestions = await getVerifiedQuestionsForRound(company, role, targetRound);
  } else {
    // Collect across all detected rounds for the complete placement interview set
    for (const r of detectedRounds) {
      const rq = await getVerifiedQuestionsForRound(company, role, r.round_name);
      for (const q of rq) {
        if (!repoQuestions.some(existing => existing.id === q.id || existing.canonical_title === q.canonical_title)) {
          repoQuestions.push(q);
        }
      }
    }
  }

  let canonicalQuestions: CanonicalInterviewQuestion[] = [];
  let provider: 'gemini_grounded' | 'verified_offline_engine' = isGeminiGenerated ? 'gemini_grounded' : 'verified_offline_engine';

  if (repoQuestions.length > 0) {
    // ── Step 4A: 10-Slot Allocation Algorithm (Evidence-Backed) ──────────────
    // Target distribution per round:
    // Slots 1 to 6: Up to 6 actual candidate-reported questions (REPORTED)
    // Slots 7 to 8: Up to 2 officially derived practice questions (OFFICIAL_DERIVED)
    // Slots 9 to 10: 2 candidate-specific / AI questions (RESUME_BASED / AI_PREDICTED)
    // Exactly 10 questions total. Never fabricate REPORTED tags.

    const reportedPool = repoQuestions.filter(q => q.category === 'REPORTED');
    const officialPool = repoQuestions.filter(q => q.category === 'OFFICIAL_DERIVED');

    const slotItems: Array<{
      canonical_title: string;
      question_text: string;
      category: QuestionCategory;
      round: string;
      difficulty?: string;
      what_we_look_for: string;
      follow_up_hint: string;
      expected_depth?: 'junior' | 'mid' | 'senior';
      time_limit_seconds?: number;
      evidence_list?: any[];
      independent_reports_count?: number;
      frequency_3m?: number;
      frequency_6m?: number;
      source?: any;
      freshness?: string;
      resume_metadata?: any;
      prediction_metadata?: any;
      // ── Round-specific assessment fields ──────────────────────────────────
      aptitude_options?: string[];
      correct_answer?: string;
      explanation?: string;
      constraints?: string[];
      examples?: Array<{ input: string; output: string; explanation?: string }>;
      expected_complexity?: { time: string; space: string };
      expected_points?: string[];
      scoring_rubric?: Array<{ criterion: string; weight: number; description: string }> | string;
      behavioral_criteria?: {
        competency?: string;
        positive_indicators?: string[];
        negative_indicators?: string[];
      };
      discussion_context?: string;
      key_perspectives?: string[];
    }> = [];

    // Slots 1-6: Take up to 6 REPORTED questions
    const reportedToTake = reportedPool.slice(0, 6);
    reportedToTake.forEach(q => {
      const primaryEv = q.evidence && q.evidence[0];
      const distinctCount = calculateIndependentReportsCount(q.evidence);
      const timeFreqs = calculateTimeFrequencies(q.evidence);
      const dynFreshness = calculateFreshness(primaryEv?.published_date || null);
      
      // Strict Integrity Gate: Downgrade from REPORTED if no verified distinct reports exist
      const verifiedCategory: QuestionCategory = distinctCount > 0 ? 'REPORTED' : 'AI_PREDICTED';

      slotItems.push({
        canonical_title: q.canonical_title,
        question_text: q.problem_statement,
        category: verifiedCategory,
        round: q.round_type || targetRound,
        difficulty: q.difficulty,
        what_we_look_for: q.what_we_look_for,
        follow_up_hint: q.follow_up_hint,
        expected_depth: q.expected_depth,
        time_limit_seconds: q.time_limit_seconds,
        evidence_list: q.evidence,
        independent_reports_count: distinctCount,
        frequency_3m: timeFreqs.frequency3m,
        frequency_6m: timeFreqs.frequency6m,
        freshness: dynFreshness,
        source: primaryEv ? {
          platform: primaryEv.platform,
          url: primaryEv.url,
          title: primaryEv.title,
          published_date: primaryEv.published_date || null,
          interview_date: primaryEv.interview_date || null,
          location: primaryEv.location || null,
          candidate_type: primaryEv.candidate_type || null,
          evidence_summary: primaryEv.excerpt || ''
        } : null,
        // Round-specific assessment fields
        aptitude_options: q.aptitude_options,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        constraints: q.constraints,
        examples: q.examples,
        expected_complexity: q.expected_complexity,
        expected_points: q.expected_points,
        scoring_rubric: q.scoring_rubric,
        behavioral_criteria: q.behavioral_criteria,
        discussion_context: q.discussion_context,
        key_perspectives: q.key_perspectives,
      });
    });

    // Slots 7-8: Take up to 2 OFFICIAL_DERIVED questions
    const officialToTake = officialPool.slice(0, 2);
    officialToTake.forEach(q => {
      const primaryEv = q.evidence && q.evidence[0];
      const timeFreqs = calculateTimeFrequencies(q.evidence);
      const dynFreshness = calculateFreshness(primaryEv?.published_date || null);
      slotItems.push({
        canonical_title: q.canonical_title,
        question_text: q.problem_statement,
        category: 'OFFICIAL_DERIVED',
        round: q.round_type || targetRound,
        difficulty: q.difficulty,
        what_we_look_for: q.what_we_look_for,
        follow_up_hint: q.follow_up_hint,
        expected_depth: q.expected_depth,
        time_limit_seconds: q.time_limit_seconds,
        evidence_list: q.evidence,
        independent_reports_count: 1,
        frequency_3m: timeFreqs.frequency3m,
        frequency_6m: timeFreqs.frequency6m,
        freshness: dynFreshness,
        source: primaryEv ? {
          platform: primaryEv.platform,
          url: primaryEv.url,
          title: primaryEv.title,
          published_date: primaryEv.published_date || null
        } : null,
        // Round-specific assessment fields
        aptitude_options: q.aptitude_options,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        constraints: q.constraints,
        examples: q.examples,
        expected_complexity: q.expected_complexity,
        expected_points: q.expected_points,
        scoring_rubric: q.scoring_rubric,
        behavioral_criteria: q.behavioral_criteria,
        discussion_context: q.discussion_context,
        key_perspectives: q.key_perspectives,
      });
    });

    // Slots 9-10: Take up to 2 RESUME_BASED questions if real resume was provided
    if (hasRealResumeClaims && resumeQuestions.length > 0) {
      const resumeToAdd = resumeQuestions.slice(0, 2);
      for (const rq of resumeToAdd) {
        if (slotItems.length >= 10) break;
        slotItems.push({
          canonical_title: `Resume Verification: ${rq.resume_metadata?.resume_item || 'Project'}`,
          question_text: rq.question_text,
          category: 'RESUME_BASED',
          round: targetRound || rq.round,
          what_we_look_for: rq.what_we_look_for || 'Empirical evidence and architectural depth',
          follow_up_hint: rq.follow_up_hint || '',
          expected_depth: rq.expected_depth || 'junior',
          time_limit_seconds: rq.time_limit_seconds || 140,
          resume_metadata: rq.resume_metadata,
          freshness: '0-30_days'
        });
      }
    }

    // Fill remaining slots up to 10 honestly with AI_PREDICTED (explicit disclosure, diverse domain prompts)
    const diverseFallbacks = getDomainPracticePool(company, role, jd, input.candidateSkills, input.parsedResume);

    let predIdx = 0;
    let fallbackIdx = 0;
    while (slotItems.length < 10) {
      let qText = '';
      let qRound = targetRound;
      let qLookFor = 'Architectural trade-off analysis and technical depth';
      let qHint = '';

      if (predIdx < predictedQuestions.length) {
        const pq = predictedQuestions[predIdx++];
        qText = pq.question_text;
        qRound = pq.round || targetRound;
        qLookFor = pq.what_we_look_for || qLookFor;
        qHint = pq.follow_up_hint || '';
      } else {
        const fb = diverseFallbacks[fallbackIdx % diverseFallbacks.length];
        fallbackIdx++;
        qText = fb.text;
        qRound = fb.round;
        qLookFor = fb.what_we_look_for;
        qHint = fb.hint;
      }
      
      slotItems.push({
        canonical_title: hasRealResumeClaims ? `Role Competency: ${role}` : `Role Competency: ${role} (${qRound})`,
        question_text: qText,
        category: 'AI_PREDICTED',
        round: qRound,
        what_we_look_for: qLookFor,
        follow_up_hint: qHint,
        expected_depth: 'junior',
        time_limit_seconds: 150,
        freshness: '0-30_days',
        prediction_metadata: {
          reason_generated: hasRealResumeClaims 
            ? `Supplementary practice for ${company} ${role}` 
            : "Candidate did not upload a parsed resume; serving role-competency practice question",
          inputs_used: [`Company: ${company}`, `Role: ${role}`, `Branch: ${resolvedBranchLabel}`, `Round: ${qRound}`],
          prediction_confidence: "high"
        }
      });
    }

    // Build final 10 questions with stable IDs Q001 - Q010 and complete Issue 4 domain & coding validation metadata
    canonicalQuestions = slotItems.slice(0, 10).map((item, idx) => {
      const codingMeta = evaluateQuestionCodingRequirement(item.question_text, item.round, primaryDomain);
      return {
        question_id: `Q${String(idx + 1).padStart(3, '0')}`,
        canonical_title: item.canonical_title,
        question_text: item.question_text,
        company,
        role,
        branch: resolvedBranchLabel,
        round: item.round,
        category: item.category,
        confidence: 'high' as ConfidenceLevel,
        freshness: item.freshness || 'historical',
        relevance_score: Math.max(75, 98 - idx * 2),
        requires_coding: codingMeta.requires_coding,
        coding_language: codingMeta.coding_language,
        difficulty: item.difficulty,
        what_we_look_for: item.what_we_look_for || `Core ${resolvedBranchLabel} engineering principles for ${role}`,
        follow_up_hint: item.follow_up_hint,
        expected_depth: item.expected_depth || 'junior',
        time_limit_seconds: item.time_limit_seconds || 150,
        evidence_list: item.evidence_list || [],
        independent_reports_count: item.independent_reports_count !== undefined ? item.independent_reports_count : 0,
        frequency_3m: item.frequency_3m !== undefined ? item.frequency_3m : 0,
        frequency_6m: item.frequency_6m !== undefined ? item.frequency_6m : 0,
        source: item.source || null,
        resume_metadata: item.resume_metadata || null,
        prediction_metadata: item.prediction_metadata || null,
        // ── Round-specific assessment fields (passed through from repository) ──
        aptitude_options: item.aptitude_options,
        correct_answer: item.correct_answer,
        explanation: item.explanation,
        constraints: item.constraints,
        examples: item.examples,
        expected_complexity: item.expected_complexity,
        expected_points: item.expected_points,
        scoring_rubric: item.scoring_rubric,
        behavioral_criteria: item.behavioral_criteria,
        discussion_context: item.discussion_context,
        key_perspectives: item.key_perspectives,
        slot_number: idx + 1
      };
    });

  } else {
    // ── Step 4B: Honest Role-Based Slot Allocation (When No Verified Company Reports Exist) ──
    // Prioritize core domain & role-specific technical questions FIRST (Slots 1-6),
    // followed by verified domain-aligned RESUME_BASED questions (Slots 7-8) and Behavioral/HR (Slots 9-10).
    // Never mark AI questions as REPORTED or OFFICIAL_DERIVED.
    const domainPool = getDomainPracticePool(company, role, jd, input.candidateSkills, input.parsedResume);
    const rawList: CanonicalInterviewQuestion[] = [];

    // 1. Add core domain-specific technical & AI_PREDICTED questions first so the interview starts with core role questions
    for (const pq of predictedQuestions) {
      if (rawList.length >= 2) break;
      if (isQuestionRelevantToJobDomain(pq.question_text, primaryDomain, role, jd)) {
        rawList.push({
          ...pq,
          question_id: 'Q_TEMP',
          company,
          role,
          branch: resolvedBranchLabel,
          category: 'AI_PREDICTED',
          evidence_list: [],
          independent_reports_count: 0,
          frequency_3m: 0,
          frequency_6m: 0,
          source: null,
          freshness: '0-30_days'
        });
      }
    }

    // 2. Add core domain practice questions up to slot 7 (reserving 2 slots for RESUME_BASED if available + 1 HR slot)
    const maxDomainSlotsBeforeResume = hasRealResumeClaims && resumeQuestions.length > 0 ? 7 : 9;
    let domainIdx = 0;
    while (rawList.length < maxDomainSlotsBeforeResume && domainPool.length > 0) {
      const dq = domainPool[domainIdx % domainPool.length];
      domainIdx++;
      if (!rawList.some(item => item.question_text === dq.text)) {
        rawList.push({
          question_id: 'Q_TEMP',
          canonical_title: `Role Competency: ${role} (${dq.round})`,
          question_text: dq.text,
          company,
          role,
          branch: resolvedBranchLabel,
          round: dq.round,
          category: 'AI_PREDICTED',
          confidence: 'high' as ConfidenceLevel,
          freshness: '0-30_days',
          relevance_score: Math.max(75, 96 - rawList.length * 2),
          what_we_look_for: dq.what_we_look_for,
          follow_up_hint: dq.hint,
          expected_depth: 'junior',
          time_limit_seconds: 150,
          evidence_list: [],
          independent_reports_count: 0,
          frequency_3m: 0,
          frequency_6m: 0,
          source: null,
          prediction_metadata: {
            reason_generated: `Role-competency question generated for ${company} ${role} (${resolvedBranchLabel})`,
            inputs_used: [`Company: ${company}`, `Role: ${role}`, `Branch: ${resolvedBranchLabel}`, `Round: ${dq.round}`],
            prediction_confidence: 'high'
          }
        });
      }
      if (domainIdx > domainPool.length * 2) break;
    }

    // 3. Add up to 2 domain-aligned RESUME_BASED questions in the Project/Resume Deep Dive portion
    if (hasRealResumeClaims && resumeQuestions.length > 0) {
      const validResumeQs = resumeQuestions
        .filter(rq => isQuestionRelevantToJobDomain(rq.question_text, primaryDomain, role, jd))
        .slice(0, 2);
      for (const rq of validResumeQs) {
        if (rawList.length >= 9) break;
        rawList.push({
          ...rq,
          question_id: 'Q_TEMP',
          company,
          role,
          branch: resolvedBranchLabel,
          category: 'RESUME_BASED',
          evidence_list: [],
          independent_reports_count: 0,
          frequency_3m: 0,
          frequency_6m: 0,
          source: null,
          freshness: '0-30_days'
        });
      }
    }

    // 4. Fill remaining slots up to 10 from domainPool (including HR/Safety/Behavioral)
    while (rawList.length < 10 && domainPool.length > 0) {
      const dq = domainPool[domainIdx % domainPool.length];
      domainIdx++;
      const isDuplicate = rawList.some(item => item.question_text === dq.text);
      if (!isDuplicate || domainIdx > domainPool.length) {
        const variantSuffix = isDuplicate ? ` (Elaborate on practical design calculations, protective coordination, and industry standard compliance at ${company}.)` : '';
        rawList.push({
          question_id: 'Q_TEMP',
          canonical_title: `Role Competency: ${role} (${dq.round})`,
          question_text: `${dq.text}${variantSuffix}`,
          company,
          role,
          branch: resolvedBranchLabel,
          round: dq.round,
          category: 'AI_PREDICTED',
          confidence: 'high' as ConfidenceLevel,
          freshness: '0-30_days',
          relevance_score: Math.max(75, 96 - rawList.length * 2),
          what_we_look_for: dq.what_we_look_for,
          follow_up_hint: dq.hint,
          expected_depth: 'junior',
          time_limit_seconds: 150,
          evidence_list: [],
          independent_reports_count: 0,
          frequency_3m: 0,
          frequency_6m: 0,
          source: null,
          prediction_metadata: {
            reason_generated: `Role-competency question generated for ${company} ${role} (${resolvedBranchLabel})`,
            inputs_used: [`Company: ${company}`, `Role: ${role}`, `Branch: ${resolvedBranchLabel}`, `Round: ${dq.round}`],
            prediction_confidence: 'high'
          }
        });
      }
      if (domainIdx > domainPool.length * 3) break;
    }

    // Build final 10 questions with sequential stable IDs Q001 - Q010 and complete Issue 4 domain & coding validation metadata
    canonicalQuestions = rawList.slice(0, 10).map((q, idx) => {
      const codingMeta = evaluateQuestionCodingRequirement(q.question_text, q.round, primaryDomain, q.requires_coding);
      return {
        ...q,
        question_id: `Q${String(idx + 1).padStart(3, '0')}`,
        company,
        role,
        branch: q.branch || resolvedBranchLabel,
        category: q.category === 'RESUME_BASED' ? 'RESUME_BASED' : 'AI_PREDICTED', // STRICT GUARANTEE: Never fake REPORTED or OFFICIAL_DERIVED
        requires_coding: codingMeta.requires_coding,
        coding_language: q.coding_language || codingMeta.coding_language,
        what_we_look_for: q.what_we_look_for || `Core ${resolvedBranchLabel} engineering principles for ${role}`,
        evidence_list: [], // No fake evidence for unverified companies
        independent_reports_count: 0,
        frequency_3m: 0,
        frequency_6m: 0,
        source: null,
        slot_number: idx + 1
      };
    });
  }

  const finalSet: InterviewQuestionSet = {
    set_id: setId,
    company,
    role,
    job_description: jd,
    generated_at: new Date().toISOString(),
    evidence_window: 'last_90_days',
    rounds: detectedRounds,
    questions: canonicalQuestions,
    overall_confidence: 'high',
    provider,
    warnings
  };

  // ── Step 5: Persist to Local Store and Supabase ────────────────────────────
  persistLocalSet(finalSet);

  if (isSupabaseConfigured) {
    try {
      await supabase.from('interview_question_sets').upsert({
        set_id: finalSet.set_id,
        company: finalSet.company,
        role: finalSet.role,
        job_description: finalSet.job_description,
        user_id: input.user_id || 'guest',
        evidence_window: finalSet.evidence_window,
        rounds: finalSet.rounds,
        questions: finalSet.questions,
        overall_confidence: finalSet.overall_confidence,
        provider: finalSet.provider,
        metadata: {
          warnings: finalSet.warnings,
          questions_count: finalSet.questions.length,
          ten_slot_allocated: true
        }
      });
      console.log(`[QuestionEngine] Successfully persisted question set ${finalSet.set_id} to Supabase.`);
    } catch (dbErr) {
      console.warn('[QuestionEngine] Non-fatal Supabase persistence warning:', dbErr);
    }
  }

  return finalSet;
}

// ── BACKWARD COMPATIBILITY ADAPTER ───────────────────────────────────────────
export async function generateInterviewQuestions(input: any): Promise<any> {
  const company = input?.matchedJob?.company || input?.company || 'TCS';
  const role = input?.matchedJob?.title || input?.role || 'Software Engineer';
  const parsedResume = {
    skills: input?.resumeProfile?.skills || [],
    projects: (input?.resumeProfile?.projects || []).map((p: string) => ({ name: p, description: p })),
    experience: []
  };

  const canonicalSet = await generateCanonicalQuestionSet({
    company,
    role,
    jobDescription: input?.matchedJob?.description,
    parsedResume
  });

  return {
    questions: canonicalSet.questions.map(q => ({
      id: q.question_id,
      category: q.category,
      question: q.question_text,
      testsSkill: q.round,
      expectedDepth: q.expected_depth || 'junior',
      followUpHints: q.follow_up_hint ? [q.follow_up_hint] : [],
      source: q.category === 'REPORTED' ? 'llm' : 'fallback'
    })),
    groundedSkills: input?.resumeProfile?.skills || [],
    provider: canonicalSet.provider === 'gemini_grounded' ? 'gemini' : 'fallback',
    warnings: canonicalSet.warnings,
    canonicalSet
  };
}
