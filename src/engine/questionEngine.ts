// Canonical Interview Question Generation Engine
// Orchestrates: Web Research (Google Search Grounding) -> Dynamic Round Detection ->
// Verified Public Reports -> Deep Resume Intelligence -> AI Predictions -> Canonical Set Persistence

import { GoogleGenAI } from '@google/genai';
import { supabase, isSupabaseConfigured } from '../lib/supabaseServer';
import { getVerifiedCompanyProfile } from './verifiedQuestionBank';
import {
  getCompanyInterviewRounds,
  getVerifiedQuestionsForRound,
  normalizeCompanyName,
  normalizeRoundCategory,
  seedNormalizedDatabaseIfEmpty,
  calculateFreshness,
  calculateIndependentReportsCount,
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
      await supabase.from('interview_sessions').upsert({
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
      const { data, error } = await supabase
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
      const { data, error } = await supabase
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
      if (context?.sessionToken && s.session_token === context.sessionToken) {
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
 * Generate deep, realistic RESUME_BASED questions from candidate's verified resume items
 */
function generateResumeBasedQuestions(
  company: string,
  role: string,
  claims: ReturnType<typeof extractResumeClaims>,
  targetRound?: string
): CanonicalInterviewQuestion[] {
  const assignedRound = targetRound || "Technical DSA";
  const questions: CanonicalInterviewQuestion[] = [];

  // 1. Target specific project metric claims (e.g. 92% accuracy, latency, scale)
  for (const proj of claims.projects) {
    if (proj.metrics && proj.metrics.length > 0) {
      const metric = proj.metrics[0];
      questions.push({
        question_id: 'Q_RESUME_TEMP',
        question_text: `In your project "${proj.name}", you claim to have achieved ${metric}. Can you walk me through the exact baseline you compared against, the evaluation dataset used, and how you verified this was not due to overfitting?`,
        company,
        role,
        round: assignedRound,
        category: "RESUME_BASED",
        confidence: "high",
        relevance_score: 98,
        what_we_look_for: "Empirical rigor: train/validation/test split, data leakage avoidance, baseline comparison, validation protocol.",
        follow_up_hint: "What were the primary failure modes or false positive cases encountered by your implementation?",
        expected_depth: "mid",
        time_limit_seconds: 150,
        resume_metadata: {
          resume_section: "projects",
          resume_item: `${proj.name} (${metric})`,
          reason_generated: `Probing specific metric claim of ${metric} stated in project description`
        }
      });
    } else if (proj.name && proj.description) {
      const techList = proj.tech.length > 0 ? proj.tech.slice(0, 2).join(' and ') : 'the stack';
      questions.push({
        question_id: 'Q_RESUME_TEMP',
        question_text: `In your project "${proj.name}" built with ${techList}, what was the most difficult architectural bottleneck you hit, and what technical trade-offs did you evaluate before resolving it?`,
        company,
        role,
        round: assignedRound,
        category: "RESUME_BASED",
        confidence: "high",
        relevance_score: 95,
        what_we_look_for: "Hands-on engineering ownership, trade-off analysis, debugging under constraints.",
        follow_up_hint: "If you had to scale this architecture to 10x current load, where would it break first?",
        expected_depth: "junior",
        time_limit_seconds: 140,
        resume_metadata: {
          resume_section: "projects",
          resume_item: proj.name,
          reason_generated: "Probing architecture decisions and hands-on implementation details from resume project"
        }
      });
    }
  }

  // 2. Target specific technical skills from candidate's verified skills
  const keySkills = claims.skills.slice(0, 3);
  for (const skill of keySkills) {
    const sLower = skill.toLowerCase();
    if (sLower.includes('python') || sLower.includes('machine learning') || sLower.includes('pytorch') || sLower.includes('tensorflow')) {
      questions.push({
        question_id: 'Q_RESUME_TEMP',
        question_text: `You have highlighted ${skill} on your resume. How do you handle vanishing/exploding gradients during training, and what is your practical approach to tuning learning rate schedules and batch normalization?`,
        company,
        role,
        round: assignedRound,
        category: "RESUME_BASED",
        confidence: "high",
        relevance_score: 94,
        what_we_look_for: "Deep conceptual grasp of optimization, backpropagation mechanics, and practical ML hygiene.",
        follow_up_hint: "Why can too large of a batch size hurt generalization?",
        expected_depth: "junior",
        time_limit_seconds: 140,
        resume_metadata: {
          resume_section: "skills",
          resume_item: skill,
          reason_generated: `Direct verification of candidate's stated proficiency in ${skill}`
        }
      });
    } else if (sLower.includes('react') || sLower.includes('javascript') || sLower.includes('typescript')) {
      questions.push({
        question_id: 'Q_RESUME_TEMP',
        question_text: `Your resume lists proficiency in ${skill}. In a complex single-page application, how do you diagnose unwanted re-renders, and how do you decide when to use memoization versus restructuring component state?`,
        company,
        role,
        round: assignedRound,
        category: "RESUME_BASED",
        confidence: "high",
        relevance_score: 92,
        what_we_look_for: "Virtual DOM reconciliation understanding, state colocation, React profiler usage.",
        follow_up_hint: "What is the computational overhead of overusing useMemo or useCallback everywhere?",
        expected_depth: "junior",
        time_limit_seconds: 130,
        resume_metadata: {
          resume_section: "skills",
          resume_item: skill,
          reason_generated: `Technical verification of frontend competency in ${skill}`
        }
      });
    } else if (sLower.includes('sql') || sLower.includes('database') || sLower.includes('mongodb') || sLower.includes('postgres')) {
      questions.push({
        question_id: 'Q_RESUME_TEMP',
        question_text: `You have ${skill} listed in your core tools. Suppose a critical query is taking 8 seconds in production. How would you use EXPLAIN plans and index structures to isolate and fix the problem?`,
        company,
        role,
        round: assignedRound,
        category: "RESUME_BASED",
        confidence: "high",
        relevance_score: 93,
        what_we_look_for: "Query execution plan interpretation, index scan vs sequential scan, composite indexes, B-tree behavior.",
        follow_up_hint: "Why might a query planner ignore an index you explicitly created?",
        expected_depth: "junior",
        time_limit_seconds: 130,
        resume_metadata: {
          resume_section: "skills",
          resume_item: skill,
          reason_generated: `Probing practical database performance and indexing skills from resume`
        }
      });
    } else if (sLower.includes('electrical') || sLower.includes('circuit') || sLower.includes('pcb') || sLower.includes('embedded') || sLower.includes('verilog') || sLower.includes('microcontroller') || sLower.includes('electronics')) {
      questions.push({
        question_id: 'Q_RESUME_TEMP',
        question_text: `You have listed ${skill} in your technical toolkit. In a high-speed mixed-signal design, what techniques do you use to ensure signal integrity and prevent noise coupling between analog and digital sections?`,
        company,
        role,
        round: assignedRound,
        category: "RESUME_BASED",
        confidence: "high",
        relevance_score: 93,
        what_we_look_for: "Ground planes, component placement, decoupling capacitors, trace routing, and EMI considerations.",
        follow_up_hint: "What happens to the parasitic inductance if you increase the length of the trace between the decoupling capacitor and the IC pin?",
        expected_depth: "junior",
        time_limit_seconds: 130,
        resume_metadata: {
          resume_section: "skills",
          resume_item: skill,
          reason_generated: `Probing practical hardware engineering and signal integrity skills from resume`
        }
      });
    }
  }

  // 3. Target experience or education
  if (claims.experience.length > 0) {
    const exp = claims.experience[0];
    questions.push({
      question_id: 'Q_RESUME_TEMP',
      question_text: `During your role as ${exp.role} at ${exp.company}, what was an instance where requirements were ambiguous, and how did you validate your assumptions before writing code?`,
      company,
      role,
      round: assignedRound,
      category: "RESUME_BASED",
      confidence: "high",
      relevance_score: 90,
      what_we_look_for: "Self-direction, requirements gathering, stakeholder alignment, proactive communication.",
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
function generateAIPredictedQuestions(
  company: string,
  role: string,
  jobDescription: string | null | undefined,
  claims: ReturnType<typeof extractResumeClaims>,
  targetRound?: string
): CanonicalInterviewQuestion[] {
  const assignedRound = targetRound || "Technical DSA";
  const rLower = (role || "").toLowerCase();
  const isAIEngineer = rLower.includes("ai") || rLower.includes("ml") || rLower.includes("data");
  const isElectrical = rLower.includes("electrical") || rLower.includes("electronics") || rLower.includes("hardware") || rLower.includes("embedded");
  const isSoftware = rLower.includes("software") || rLower.includes("developer") || rLower.includes("frontend") || rLower.includes("backend") || rLower.includes("fullstack");
  const isCivil = rLower.includes("civil") || rLower.includes("structural") || rLower.includes("construction");
  const isMechanical = rLower.includes("mechanical") || rLower.includes("manufacturing") || rLower.includes("automotive");
  const comp = company || "Enterprise";

  const predicted: CanonicalInterviewQuestion[] = [];

  if (isAIEngineer) {
    predicted.push({
      question_id: 'Q_PREDICT_TEMP',
      question_text: `For a production AI service at ${comp}, how would you architect an inference pipeline to handle real-time streaming queries with sub-200ms latency while guarding against model hallucinations?`,
      company,
      role,
      round: assignedRound,
      category: "AI_PREDICTED",
      confidence: "high",
      relevance_score: 88,
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

    predicted.push({
      question_id: 'Q_PREDICT_TEMP',
      question_text: `When training a model on enterprise text data, how do you handle privacy-sensitive entities (PII) and ensure data compliance before fine-tuning or vector indexing?`,
      company,
      role,
      round: assignedRound,
      category: "AI_PREDICTED",
      confidence: "high",
      relevance_score: 87,
      what_we_look_for: "Named Entity Recognition (NER) anonymization, hashing, compliance (GDPR/HIPAA), differential privacy awareness.",
      follow_up_hint: "What is the performance penalty of on-the-fly anonymization pipelines?",
      expected_depth: "junior",
      time_limit_seconds: 130,
      prediction_metadata: {
        reason_generated: `Predicted based on ${comp}'s data governance requirements in client-facing AI systems`,
        inputs_used: [`Company: ${comp}`, `Domain: AI/ML Data Governance`],
        prediction_confidence: "high"
      }
    });
  } else if (isElectrical) {
    predicted.push({
      question_id: 'Q_PREDICT_TEMP',
      question_text: `At ${comp}, hardware designs often must meet strict power and thermal constraints. How do you approach component selection and board layout to minimize power dissipation and manage thermal hot spots?`,
      company,
      role,
      round: assignedRound,
      category: "AI_PREDICTED",
      confidence: "high",
      relevance_score: 89,
      what_we_look_for: "Derating components, thermal vias, heatsinking, switching regulator efficiency, and layout considerations.",
      follow_up_hint: "How do you test your thermal design before mass production?",
      expected_depth: "junior",
      time_limit_seconds: 150,
      prediction_metadata: {
        reason_generated: `Predicted based on hardware constraints typical of ${comp}`,
        inputs_used: [`Company: ${comp}`, `Role: ${role}`, "Hardware and thermal design principles"],
        prediction_confidence: "high"
      }
    });
  } else if (isCivil) {
    predicted.push({
      question_id: 'Q_PREDICT_TEMP',
      question_text: `At ${comp}, large-scale infrastructure projects require strict adherence to safety and material standards. How do you approach calculating load distributions and ensuring the structural integrity of your designs under extreme conditions?`,
      company,
      role,
      round: assignedRound,
      category: "AI_PREDICTED",
      confidence: "high",
      relevance_score: 89,
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
      round: assignedRound,
      category: "AI_PREDICTED",
      confidence: "high",
      relevance_score: 89,
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
      question_text: `At ${comp}, teams frequently build services consumed by millions of enterprise users. How would you design a rate limiter to protect downstream services from burst traffic, and what data structure would you use?`,
      company,
      role,
      round: assignedRound,
      category: "AI_PREDICTED",
      confidence: "high",
      relevance_score: 89,
      what_we_look_for: "Token bucket or Leaky bucket algorithm, Redis sliding window counter, handling distributed clock skew.",
      follow_up_hint: "What happens if the Redis cache node storing rate-limit counters crashes?",
      expected_depth: "junior",
      time_limit_seconds: 150,
      prediction_metadata: {
        reason_generated: `Predicted based on high-concurrency enterprise service architecture typical of ${comp}`,
        inputs_used: [`Company: ${comp}`, `Role: ${role}`, "High-concurrency API resilience"],
        prediction_confidence: "high"
      }
    });
  } else {
    predicted.push({
      question_id: 'Q_PREDICT_TEMP',
      question_text: `For a ${role} position at ${comp}, what do you consider the most critical technical challenges, and what framework or methodology do you use to systematically solve them?`,
      company,
      role,
      round: assignedRound,
      category: "AI_PREDICTED",
      confidence: "high",
      relevance_score: 85,
      what_we_look_for: "Core domain knowledge, systematic problem-solving methodology, and familiarity with industry-standard tools.",
      follow_up_hint: "Can you provide a specific example from a past project?",
      expected_depth: "junior",
      time_limit_seconds: 150,
      prediction_metadata: {
        reason_generated: `Predicted based on generic requirements for ${role} at ${comp}`,
        inputs_used: [`Company: ${comp}`, `Role: ${role}`],
        prediction_confidence: "medium"
      }
    });
  }

  // Situational prediction
  if (isSoftware) {
    predicted.push({
      question_id: 'Q_PREDICT_TEMP',
      question_text: `Imagine you are assigned to a cross-functional squad at ${comp} where the product manager wants a feature shipped in 3 days, but technical debt makes it risky to release without thorough refactoring. How do you negotiate?`,
      company,
      role,
      round: assignedRound,
      category: "AI_PREDICTED",
      confidence: "high",
      relevance_score: 86,
      what_we_look_for: "Pragmatic balance: feature flag/MVP rollout with documented follow-up sprint, transparent risk communication.",
      follow_up_hint: "How do you present the risk in business terms (outage cost, reputation) rather than pure engineering complaints?",
      expected_depth: "junior",
      time_limit_seconds: 120,
      prediction_metadata: {
        reason_generated: `Predicted situational question assessing client delivery vs engineering trade-offs at ${comp}`,
        inputs_used: [`Company: ${comp}`, "Enterprise client delivery pressure"],
        prediction_confidence: "high"
      }
    });
  } else {
    predicted.push({
      question_id: 'Q_PREDICT_TEMP',
      question_text: `Imagine a critical project at ${comp} is facing severe delays due to unforeseen technical constraints, and a key stakeholder is demanding immediate results. How do you communicate the issue and adjust the project plan?`,
      company,
      role,
      round: assignedRound,
      category: "AI_PREDICTED",
      confidence: "high",
      relevance_score: 86,
      what_we_look_for: "Clear communication of risks, root cause analysis, proactive stakeholder management, and proposing viable alternatives.",
      follow_up_hint: "How do you ensure safety and quality standards aren't compromised in the rush to deliver?",
      expected_depth: "junior",
      time_limit_seconds: 120,
      prediction_metadata: {
        reason_generated: `Predicted situational question assessing project delivery and stakeholder management at ${comp}`,
        inputs_used: [`Company: ${comp}`, `Role: ${role}`],
        prediction_confidence: "high"
      }
    });
  }

  return predicted;
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

  // ── Step 1: Evidence-Supported Round Configuration ─────────────────────────
  const dbRounds = await getCompanyInterviewRounds(company, role);
  const detectedRounds: DetectedRound[] = dbRounds.map(r => ({
    round_name: r.round_name,
    description: r.description || '',
    evidence: r.evidence_summary || '',
    confidence: 'high' as ConfidenceLevel,
    order: r.round_order
  }));

  // Target Round: use provided roundName or default to primary technical round
  const targetRound = input.roundName || (detectedRounds[0]?.round_name) || 'Technical DSA';

  // ── Step 2: Extract Verified Resume Claims ─────────────────────────────────
  const resumeClaims = extractResumeClaims(input.parsedResume, input.candidateSkills || undefined);
  const hasRealResumeClaims = Boolean(
    input.parsedResume &&
    (resumeClaims.projects.length > 0 || (resumeClaims.skills.length > 0 && input.parsedResume.skills))
  );
  const resumeQuestions = hasRealResumeClaims ? generateResumeBasedQuestions(company, role, resumeClaims, targetRound) : [];
  const predictedQuestions = generateAIPredictedQuestions(company, role, jd, resumeClaims, targetRound);

  // ── Step 3: Query Normalized Intelligence Repository (Round-Aware) ────────
  const repoQuestions = await getVerifiedQuestionsForRound(company, role, targetRound);

  let canonicalQuestions: CanonicalInterviewQuestion[] = [];
  let provider: 'gemini_grounded' | 'verified_offline_engine' = 'verified_offline_engine';

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

    // Fill remaining slots up to 10 honestly with AI_PREDICTED (explicit disclosure)
    let predIdx = 0;
    while (slotItems.length < 10) {
      const pq = predictedQuestions[predIdx++] || {
        question_text: `For a ${role} position at ${company}, how do you evaluate architectural trade-offs between low latency and eventual consistency in distributed systems?`,
        round: targetRound,
        what_we_look_for: 'Distributed systems trade-offs, CAP theorem, consensus protocols.',
        follow_up_hint: 'How would you measure p99 latency in production?',
        expected_depth: 'junior',
        time_limit_seconds: 150
      };
      
      slotItems.push({
        canonical_title: hasRealResumeClaims ? `Role Competency: ${role}` : `Role Competency (No Resume Provided)`,
        question_text: pq.question_text,
        category: 'AI_PREDICTED',
        round: pq.round || targetRound,
        what_we_look_for: pq.what_we_look_for || 'Architectural trade-off analysis',
        follow_up_hint: pq.follow_up_hint || '',
        expected_depth: pq.expected_depth || 'junior',
        time_limit_seconds: pq.time_limit_seconds || 150,
        freshness: '0-30_days',
        prediction_metadata: {
          reason_generated: hasRealResumeClaims 
            ? `Supplementary practice for ${company} ${role}` 
            : "Candidate did not upload a parsed resume; serving role-competency practice question",
          inputs_used: [`Company: ${company}`, `Role: ${role}`, `Round: ${targetRound}`],
          prediction_confidence: "high"
        }
      });
    }

    // Build final 10 questions with stable IDs Q001 - Q010
    canonicalQuestions = slotItems.slice(0, 10).map((item, idx) => ({
      question_id: `Q${String(idx + 1).padStart(3, '0')}`,
      canonical_title: item.canonical_title,
      question_text: item.question_text,
      company,
      role,
      round: item.round,
      category: item.category,
      confidence: 'high' as ConfidenceLevel,
      freshness: item.freshness || 'historical',
      relevance_score: Math.max(75, 98 - idx * 2),
      difficulty: item.difficulty,
      what_we_look_for: item.what_we_look_for,
      follow_up_hint: item.follow_up_hint,
      expected_depth: item.expected_depth || 'junior',
      time_limit_seconds: item.time_limit_seconds || 150,
      evidence_list: item.evidence_list || [],
      independent_reports_count: item.independent_reports_count !== undefined ? item.independent_reports_count : 0,
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
    }));

  } else {
    // ── Step 4B: Fallback Bank with Honest Slot Allocation ────────────────────
    const companyProfile = getVerifiedCompanyProfile(company, role);
    const reportedPool = companyProfile.reportedQuestions;
    const officialPool = companyProfile.officialDerivedQuestions;

    const rawList: CanonicalInterviewQuestion[] = [];

    // Up to 6 reported
    reportedPool.slice(0, 6).forEach(q => {
      rawList.push({
        ...q,
        question_id: 'Q_TEMP',
        company,
        role
      });
    });

    // Up to 2 official
    officialPool.slice(0, 2).forEach(q => {
      rawList.push({
        ...q,
        question_id: 'Q_TEMP',
        company,
        role
      });
    });

    // 2 Resume / Predicted
    resumeQuestions.slice(0, 2).forEach(q => {
      rawList.push(q);
    });

    while (rawList.length < 10 && predictedQuestions.length > 0) {
      const nextPred = predictedQuestions.shift();
      if (nextPred) rawList.push(nextPred);
      else break;
    }

    canonicalQuestions = rawList.slice(0, 10).map((q, idx) => ({
      ...q,
      question_id: `Q${String(idx + 1).padStart(3, '0')}`,
      slot_number: idx + 1
    }));
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
