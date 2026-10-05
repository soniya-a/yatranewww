// Canonical Interview Question Generation Engine
// Orchestrates: Web Research (Google Search Grounding) -> Dynamic Round Detection ->
// Verified Public Reports -> Deep Resume Intelligence -> AI Predictions -> Canonical Set Persistence

import { GoogleGenAI } from '@google/genai';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getVerifiedCompanyProfile } from './verifiedQuestionBank';
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

/**
 * Persist or update an Interview Session
 */
export async function saveInterviewSession(sessionData: Partial<InterviewSession> & { question_set_id: string }): Promise<InterviewSession & { session_id: string }> {
  const sessionId = (sessionData as any).session_id || sessionData.id || `SES_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const existing = sessionsStore.get(sessionId);

  const session: InterviewSession = {
    id: sessionId,
    user_id: sessionData.user_id || existing?.user_id || 'guest',
    question_set_id: sessionData.question_set_id,
    company: sessionData.company || existing?.company || '',
    role: sessionData.role || existing?.role || '',
    current_question_id: sessionData.current_question_id || existing?.current_question_id || 'Q001',
    current_question_order: sessionData.current_question_order !== undefined ? sessionData.current_question_order : (existing?.current_question_order || 0),
    answers: { ...(existing?.answers || {}), ...(sessionData.answers || {}) },
    is_completed: sessionData.is_completed !== undefined ? sessionData.is_completed : (existing?.is_completed || false),
    interview_mode: sessionData.interview_mode || existing?.interview_mode || 'normal',
    created_at: existing?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  persistLocalSession(session);

  if (isSupabaseConfigured) {
    try {
      await supabase.from('interview_sessions').upsert({
        id: session.id,
        user_id: session.user_id,
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

  return { ...session, session_id: session.id };
}

/**
 * Retrieve an Interview Session by its ID
 */
export async function getInterviewSession(sessionId: string): Promise<(InterviewSession & { session_id: string }) | null> {
  if (sessionsStore.has(sessionId)) {
    const s = sessionsStore.get(sessionId)!;
    return { ...s, session_id: s.id };
  }
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('interview_sessions')
        .select('*')
        .eq('id', sessionId)
        .maybeSingle();
      if (data && !error) {
        const s: InterviewSession = data as any;
        sessionsStore.set(s.id, s);
        return { ...s, session_id: s.id };
      }
    } catch (e) {}
  }
  return null;
}

/**
 * Retrieve the latest session for a given question_set_id
 */
export async function getSessionByQuestionSet(questionSetId: string): Promise<(InterviewSession & { session_id: string }) | null> {
  // Check memory store first
  for (const s of sessionsStore.values()) {
    if (s.question_set_id === questionSetId) {
      return { ...s, session_id: s.id };
    }
  }
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('interview_sessions')
        .select('*')
        .eq('question_set_id', questionSetId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data && !error) {
        const s: InterviewSession = data as any;
        sessionsStore.set(s.id, s);
        return { ...s, session_id: s.id };
      }
    } catch (e) {}
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
function extractResumeClaims(parsedResume: any): {
  skills: string[];
  projects: { name: string; description: string; tech: string[]; metrics: string[] }[];
  experience: { company: string; role: string; desc: string; tech: string[] }[];
  education: { degree: string; institution: string; field: string }[];
  certifications: string[];
} {
  const skills: string[] = [];
  const rawSkills = parsedResume?.skills || [];
  for (const s of rawSkills) {
    const name = typeof s === 'string' ? s : s?.name;
    if (name && typeof name === 'string' && name.trim()) {
      skills.push(name.trim());
    }
  }

  const projects: { name: string; description: string; tech: string[]; metrics: string[] }[] = [];
  const rawProjects = parsedResume?.projects || [];
  for (const p of rawProjects) {
    if (p && typeof p === 'object') {
      const name = p.name || p.title || 'Technical Project';
      const desc = p.description || p.summary || '';
      const tech = Array.isArray(p.technologies) ? p.technologies : (p.tech || []);
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
  const rawExp = parsedResume?.experience || [];
  for (const e of rawExp) {
    if (e && typeof e === 'object') {
      experience.push({
        company: e.company || 'Company',
        role: e.job_title || e.role || 'Role',
        desc: e.description || '',
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
  claims: ReturnType<typeof extractResumeClaims>
): CanonicalInterviewQuestion[] {
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
        round: "Technical DSA",
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
        round: "Technical DSA",
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
        round: "AI/ML Domain Technical",
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
        round: "Technical DSA",
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
        round: "Technical DSA",
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
        round: "Technical DSA",
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
      round: "Managerial",
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
  claims: ReturnType<typeof extractResumeClaims>
): CanonicalInterviewQuestion[] {
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
      round: "AI/ML Domain Technical",
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
      round: "AI/ML Domain Technical",
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
      round: "Technical DSA", // Often falls under technical round
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
      round: "Technical Core",
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
      round: "Technical Core",
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
      round: "Technical DSA",
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
      round: "Technical Core",
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
      round: "Behavioral",
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
      round: "Behavioral",
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

  // For each round, pick top 1 (or up to 2 if it's a technical round and we need depth)
  rounds.forEach(r => {
    const roundKey = r.round_name.toLowerCase();
    const qs = questionsByRound.get(roundKey)!;
    qs.sort(sortQuestions);
    
    // Pick 1 for HR/Managerial, up to 2 for Technical/Coding
    const limit = (roundKey.includes('technical') || roundKey.includes('coding') || roundKey.includes('design') || roundKey.includes('dsa')) ? 2 : 1;
    
    if (qs.length > 0) {
      finalStructuredList.push(...qs.slice(0, limit));
    } else {
      // If no question matched this round exactly, try to pull from unassigned if category matches vaguely
      if (unassigned.length > 0) {
        unassigned.sort(sortQuestions);
        const fallback = unassigned.shift()!;
        fallback.round = r.round_name; // Re-align to this round
        finalStructuredList.push(fallback);
      }
    }
  });

  // Assign stable sequential question_ids: Q001, Q002, etc.
  return finalStructuredList.map((q, idx) => ({
    ...q,
    question_id: `Q${String(idx + 1).padStart(3, '0')}`,
    question: q.question_text
  }));
}


/**
 * MAIN ORCHESTRATION: Generate Canonical Interview Question Set
 */
export async function generateCanonicalQuestionSet(
  input: CanonicalQuestionGenerationInput
): Promise<InterviewQuestionSet> {
  const company = input.company?.trim() || "Technology Company";
  const role = input.role?.trim() || "Software Engineer";
  const jd = input.jobDescription?.trim() || null;
  const warnings: string[] = [];

  // Generate stable Set ID
  const sanitizedCompany = company.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8) || 'COMP';
  const sanitizedRole = role.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8) || 'ROLE';
  const setId = `SET_${sanitizedCompany}_${sanitizedRole}_${Date.now()}`;

  // ── Step 1: Dynamic Round Detection & Company Knowledge ───────────────────
  const companyProfile = getVerifiedCompanyProfile(company, role);
  const detectedRounds: DetectedRound[] = companyProfile.rounds;

  // ── Step 2: Extract Resume Claims ─────────────────────────────────────────
  const resumeClaims = extractResumeClaims(input.parsedResume);

  // ── Step 3: Collect Reported & Official Questions ─────────────────────────
  const reportedQuestions: CanonicalInterviewQuestion[] = companyProfile.reportedQuestions.map(q => ({
    ...q,
    question_id: 'Q_TEMP',
    company,
    role
  }));

  const officialQuestions: CanonicalInterviewQuestion[] = companyProfile.officialDerivedQuestions.map(q => ({
    ...q,
    question_id: 'Q_TEMP',
    company,
    role
  }));

  // ── Step 4: Generate Deep Resume-Based Questions ──────────────────────────
  const resumeQuestions = generateResumeBasedQuestions(company, role, resumeClaims);

  // ── Step 5: Generate AI-Predicted Questions ───────────────────────────────
  const predictedQuestions = generateAIPredictedQuestions(company, role, jd, resumeClaims);

  // ── Step 6: Web Research with Gemini Search Grounding (if accessible) ─────
  let provider: 'gemini_grounded' | 'verified_offline_engine' = 'verified_offline_engine';
  const groundedQuestions: CanonicalInterviewQuestion[] = [];

  if (process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('dummy')) {
    try {
      const prompt = `Search the public web for real interview experiences and questions specifically for the "${role}" role at "${company}" within the last 12 months.
IMPORTANT: Ensure the questions are strictly relevant to the domain of "${role}". DO NOT include Software Engineering (DSA, System Design, Coding) questions unless the role is explicitly software-related.
Cite source URLs and exact platforms (Glassdoor, Reddit, specific industry forums) where available.
Return EXACTLY a JSON array of up to 3 objects conforming to this structure:
[{
  "question_text": "The technical or behavioral question asked",
  "round": "Technical DSA",
  "category": "REPORTED",
  "confidence": "high",
  "freshness": "31-90_days",
  "relevance_score": 90,
  "what_we_look_for": "Brief evaluation criteria",
  "expected_depth": "junior",
  "time_limit_seconds": 150,
  "source": {
    "platform": "Platform Name (e.g., GeeksforGeeks, Glassdoor)",
    "url": "https://...",
    "title": "Title of the post",
    "published_date": "YYYY-MM-DD",
    "interview_date": "YYYY-MM-DD",
    "evidence_summary": "Context summary"
  }
}]
Ensure the output is strictly valid JSON without markdown code blocks.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json"
        }
      });

      if (response && response.text) {
        let text = response.text.trim();
        if (text.startsWith("```json")) text = text.substring(7);
        else if (text.startsWith("```")) text = text.substring(3);
        if (text.endsWith("```")) text = text.substring(0, text.length - 3);
        
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            parsed.forEach((q: any) => {
              groundedQuestions.push({
                ...q,
                question_id: 'Q_TEMP',
                company,
                role
              });
            });
            provider = 'gemini_grounded';
          }
        } catch (e) {
          warnings.push('Failed to parse search grounded JSON response.');
        }
      }
    } catch (apiError: any) {
      const errMsg = apiError?.message || '';
      if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
        warnings.push('Gemini live search grounded quota rate-limited. Seamlessly utilized verified public interview repository.');
      } else {
        warnings.push(`Live search research fallback: ${errMsg.slice(0, 100)}`);
      }
      provider = 'verified_offline_engine';
    }
  } else {
    warnings.push('Live Gemini key not set; serving verified public knowledge repository.');
  }

  // ── Step 7: Combine, Deduplicate, Order & Assign Stable IDs ───────────────
  const combined = [
    ...reportedQuestions,
    ...officialQuestions,
    ...resumeQuestions,
    ...predictedQuestions,
    ...groundedQuestions
  ];

  const canonicalQuestions = deduplicateAndOrderQuestions(combined, detectedRounds);

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

  // ── Step 8: Persist to Supabase Database and Local Store ──────────────────
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
          questions_count: finalSet.questions.length
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
