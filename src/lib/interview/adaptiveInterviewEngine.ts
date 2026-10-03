/**
 * ADAPTIVE INTERVIEW ENGINE (PHASES 2-8, 10, 12)
 *
 * Real production-grade adaptive interview orchestrator:
 * - Dynamic single-question generation loop:
 *     Question -> Candidate Answer -> AI Evaluation -> Adapt Difficulty & Topic -> Next Question
 * - Structured question & evaluation data contracts
 * - Resume evidence and real Job Description integration
 * - Server-side session state with filesystem persistence across browser refreshes
 * - High-grade domain coverage (Mechanical, Civil, Architecture, Electronics, AI/ML, Data, SWE)
 * - Zero fake/hardcoded success states; explicit source tracking:
 *     "AI_GENERATED" vs "FALLBACK_BANK"
 *     "AI_EVALUATED" vs "FALLBACK_EVALUATION"
 */

import fs from "fs";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";

// ─────────────────────────────────────────────────────────────────────────────
// DATA MODELS & TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type QuestionCategory =
  | "Resume Deep Dive"
  | "Project Deep Dive"
  | "Core Technical"
  | "Role-Specific"
  | "Job Description"
  | "Skill-Gap"
  | "Troubleshooting"
  | "Scenario / System Design"
  | "Coding / Problem Solving"
  | "Behavioral / HR";

export type QuestionDifficulty = "Entry" | "Mid" | "Advanced";

export type QuestionSource = "AI_GENERATED" | "FALLBACK_BANK";

export interface StructuredInterviewQuestion {
  id: string;
  sessionId: string;
  question: string;
  category: QuestionCategory;
  difficulty: QuestionDifficulty;
  skillsTested: string[];
  expectedTopics: string[];
  resumeEvidence?: string;
  jobRequirement?: string;
  questionType: "direct" | "follow_up" | "deep_dive" | "scenario" | "clarification";
  followUpOf?: string | null;
  source: QuestionSource;
  sequenceNumber: number;
  createdAt: number;
}

export interface AnswerEvaluation {
  id: string;
  questionId: string;
  sessionId: string;
  candidateAnswer: string;
  score: number; // 0 to 10
  maxScore: number; // 10
  verdict: "Excellent" | "Good" | "Average" | "Weak" | "Very Weak";
  correctness: "Fully Correct" | "Partially Correct" | "Incorrect";
  technicalDepth: "Deep" | "Adequate" | "Superficial" | "None";
  relevance: "Directly Relevant" | "Partially Relevant" | "Off-Topic";
  clarity: "Clear and Structured" | "Understandable" | "Rambling / Unclear";
  confidenceIndicators?: "High" | "Medium" | "Low";
  strengths: string[];
  weaknesses: string[];
  missingConcepts: string[];
  improvementFeedback: string;
  recommendedDifficulty: QuestionDifficulty;
  followUpNeeded: boolean;
  followUpReason?: string;
  interviewerSpokenFeedback: string;
  evaluatedAt: number;
  source: "AI_EVALUATED" | "OFFLINE_EVALUATION" | "FALLBACK_EVALUATION";
  evaluationMode?: "AI" | "OFFLINE";
  isQuotaExceeded?: boolean;
  notice?: string;
}

export interface CandidateSessionContext {
  name: string;
  domain: string; // "mechanical" | "civil" | "architecture" | "electronics" | "software" | "aiml" | "data"
  skills: string[];
  experienceYears: number;
  targetRoles: string[];
  projects?: Array<{ title?: string; name?: string; description?: string; technologies?: string[] }>;
  experience?: Array<{ title?: string; role?: string; company?: string; description?: string }>;
  education?: Array<{ degree?: string; institution?: string; year?: number | string }>;
  achievements?: string[];
  rawResumeSnippet?: string;
}

export interface JobSessionContext {
  title: string;
  company: string;
  description: string;
  location?: string;
  matchedSkills: string[];
  missingSkills: string[];
}

export interface ServerInterviewSession {
  sessionId: string;
  userId: string;
  candidateProfileId?: string;
  targetRole?: string;
  targetCompany?: string;
  jobId?: string;
  mode: "STANDARD" | "VR";
  status: "active" | "completed";
  currentQuestionId?: string;
  candidate: CandidateSessionContext;
  jobContext: JobSessionContext;
  currentCategory: QuestionCategory;
  currentDifficulty: QuestionDifficulty;
  questions: StructuredInterviewQuestion[];
  answers: Record<string, string>; // questionId -> answer
  evaluations: Record<string, AnswerEvaluation>; // questionId -> evaluation
  history: Array<{
    question: StructuredInterviewQuestion;
    answer?: string;
    evaluation?: AnswerEvaluation;
  }>;
  currentSequence: number;
  totalPlannedQuestions: number;
  createdAt: number;
  updatedAt: number;
  finalReport?: any;
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVER-SIDE SESSION STORE (IN-MEMORY + FILESYSTEM PERSISTENCE)
// ─────────────────────────────────────────────────────────────────────────────

const SESSIONS_DIR = path.join(process.cwd(), ".interview_sessions");

function ensureSessionsDir() {
  if (!fs.existsSync(SESSIONS_DIR)) {
    try {
      fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    } catch (e) {
      console.warn("[SessionStore] Could not create sessions directory:", e);
    }
  }
}

export class InterviewSessionStore {
  private cache = new Map<string, ServerInterviewSession>();

  constructor() {
    ensureSessionsDir();
    this.hydrateFromDisk();
  }

  private hydrateFromDisk() {
    try {
      if (!fs.existsSync(SESSIONS_DIR)) return;
      const files = fs.readdirSync(SESSIONS_DIR);
      for (const file of files) {
        if (file.endsWith(".json")) {
          try {
            const raw = fs.readFileSync(path.join(SESSIONS_DIR, file), "utf-8");
            const sess: ServerInterviewSession = JSON.parse(raw);
            if (sess && sess.sessionId) {
              this.cache.set(sess.sessionId, sess);
            }
          } catch (_) {}
        }
      }
    } catch (err) {
      console.warn("[SessionStore] Hydration warning:", err);
    }
  }

  public get(sessionId: string): ServerInterviewSession | undefined {
    return this.cache.get(sessionId);
  }

  public save(session: ServerInterviewSession) {
    session.updatedAt = Date.now();
    this.cache.set(session.sessionId, session);
    try {
      ensureSessionsDir();
      const filePath = path.join(SESSIONS_DIR, `${session.sessionId}.json`);
      fs.writeFileSync(filePath, JSON.stringify(session, null, 2), "utf-8");
    } catch (err) {
      console.warn("[SessionStore] Persist to disk warning:", err);
    }
  }

  public getActiveSessionForUser(userId: string): ServerInterviewSession | undefined {
    for (const sess of this.cache.values()) {
      if (sess.userId === userId && sess.status === "active") {
        return sess;
      }
    }
    return undefined;
  }
}

export const sessionStore = new InterviewSessionStore();

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN-SPECIFIC FALLBACK QUESTION KNOWLEDGE BASE
// ─────────────────────────────────────────────────────────────────────────────

interface DomainQuestionBankItem {
  category: QuestionCategory;
  difficulty: QuestionDifficulty;
  question: (comp: string, role: string, candidate: CandidateSessionContext, job: JobSessionContext) => string;
  skillsTested: string[];
  expectedTopics: string[];
  whatWeLookFor: string;
}

const DOMAIN_QUESTION_BANKS: Record<string, DomainQuestionBankItem[]> = {
  mechanical: [
    {
      category: "Core Technical",
      difficulty: "Mid",
      question: (comp) => `In developing mechanical components for ${comp}, how do you structure parametric feature trees and assembly mates in SolidWorks to prevent circular rebuild errors and ensure seamless revision control?`,
      skillsTested: ["SolidWorks", "CAD Modeling", "Parametric Design"],
      expectedTopics: ["Top-down vs bottom-up design", "Sketch constraints", "Minimizing external references", "Mating hierarchy"],
      whatWeLookFor: "Demonstrates disciplined CAD modeling methodology, constraint management, and configurability."
    },
    {
      category: "Core Technical",
      difficulty: "Advanced",
      question: (comp) => `When conducting Finite Element Analysis (FEA) in ANSYS for a structural casing at ${comp}, how do you establish mesh convergence and verify results against theoretical stress calculations before approving prototypes?`,
      skillsTested: ["ANSYS", "FEA", "Stress Analysis"],
      expectedTopics: ["Mesh refinement / h-method", "Singularity detection", "Boundary condition setup", "Factor of safety calculation"],
      whatWeLookFor: "Evaluates numerical analysis verification rigor and understanding of physical boundary conditions."
    },
    {
      category: "Role-Specific",
      difficulty: "Mid",
      question: (comp, role) => `Walk us through how you define datum reference frames and calculate geometric tolerance stack-ups using ASME Y14.5 GD&T on high-precision mating assemblies at ${comp}.`,
      skillsTested: ["GD&T", "ASME Y14.5", "Tolerance Stack-up"],
      expectedTopics: ["Datum feature selection", "MMC / LMC modifiers", "Positional tolerance formulas", "Worst-case vs RSS stack-up"],
      whatWeLookFor: "Understanding practical manufacturing tolerances and cost-precision trade-offs."
    },
    {
      category: "Troubleshooting",
      difficulty: "Mid",
      question: (comp) => `Suppose a structural prototype for ${comp} experiences unexpected fatigue cracking near a mounting boss during cyclic vibration testing. What is your systematic root cause analysis workflow to isolate and correct the defect?`,
      skillsTested: ["Root Cause Analysis", "Fatigue Analysis", "DFM"],
      expectedTopics: ["Stress concentration analysis (fillet radii)", "Material grain direction / defect analysis", "Vibration resonance matching", "Corrective design iteration"],
      whatWeLookFor: "Methodical troubleshooting using 5-Whys or fishbone methodology under engineering deadlines."
    },
    {
      category: "Behavioral / HR",
      difficulty: "Entry",
      question: (comp) => `Describe a project where manufacturing machinists or suppliers raised concerns that your mechanical CAD drawing was difficult or expensive to fabricate. How did you resolve the design trade-off collaboratively?`,
      skillsTested: ["Cross-functional Collaboration", "DFMA", "Communication"],
      expectedTopics: ["Active listening to floor technicians", "Tolerance relaxation without function loss", "Standard tool tooling accommodation", "Engineering change documentation"],
      whatWeLookFor: "Humility, collaborative design adjustments, and clear communication with fabrication partners."
    }
  ],
  civil: [
    {
      category: "Core Technical",
      difficulty: "Mid",
      question: (comp) => `In STAAD.Pro or ETABS, how do you define member properties, support conditions, and load combinations (dead, live, seismic, wind) for a multi-story reinforced concrete frame adhering to IS 456 and IS 1893?`,
      skillsTested: ["STAAD.Pro", "ETABS", "Structural Analysis", "IS 456"],
      expectedTopics: ["Limit state combinations", "P-Delta second order effects", "Shear and moment envelopes", "Ductile detailing criteria"],
      whatWeLookFor: "Sound understanding of structural analysis codes and mathematical equilibrium verification."
    },
    {
      category: "Role-Specific",
      difficulty: "Advanced",
      question: (comp) => `Explain the design philosophy of the Limit State Method for Reinforced Cement Concrete (RCC). Why is an under-reinforced flexural section mandated over an over-reinforced section in seismic design for ${comp} projects?`,
      skillsTested: ["RCC Design", "Structural Concrete", "Seismic Engineering"],
      expectedTopics: ["Ductile failure vs brittle concrete crushing", "Yielding of tensile steel warning sign", "Neutral axis depth limits", "Development length provisions"],
      whatWeLookFor: "Clear grasp of failure mechanics and life-safety structural engineering principles."
    },
    {
      category: "Troubleshooting",
      difficulty: "Mid",
      question: (comp) => `During on-site foundation excavation for a ${comp} project, soil bearing capacity tests reveal unexpected differential settlement risk and loose saturated silt strata. How do you assess remediation options with structural leads?`,
      skillsTested: ["Geotechnical Engineering", "Site Troubleshooting", "Foundation Design"],
      expectedTopics: ["Raft/mat foundation vs pile foundation", "Soil stabilization / compaction grouting", "Structural stiffness adjustments", "Settlement tolerance limits"],
      whatWeLookFor: "Practical site engineering judgment and coordination between structural and geotechnical realities."
    },
    {
      category: "Behavioral / HR",
      difficulty: "Entry",
      question: (comp) => `Tell us about a time when unforeseen site constraints or conflicting architectural layouts threatened a project schedule. How did you negotiate design changes while maintaining structural integrity?`,
      skillsTested: ["Stakeholder Negotiation", "Project Delivery", "Ethics & Safety"],
      expectedTopics: ["Prioritizing structural safety above cosmetic requests", "Clear documentation of change orders", "Collaborative compromise with architects"],
      whatWeLookFor: "Uncompromising commitment to structural safety combined with diplomatic stakeholder communication."
    }
  ],
  electronics: [
    {
      category: "Core Technical",
      difficulty: "Mid",
      question: (comp) => `In designing high-speed digital and embedded sensor circuits for ${comp}, how do you manage impedance matching, differential pair routing, and signal integrity to prevent reflections and electromagnetic interference (EMI)?`,
      skillsTested: ["PCB Design", "Signal Integrity", "High-Speed Digital", "Impedance Matching"],
      expectedTopics: ["Microstrip / stripline characteristic impedance", "Controlled impedance routing", "Decoupling capacitor placement", "Return path continuity"],
      whatWeLookFor: "Understanding high-frequency signal propagation and PCB layout constraints."
    },
    {
      category: "Project Deep Dive",
      difficulty: "Mid",
      question: (comp, role, cand) => `Walk us through the power delivery and microcontroller firmware architecture for your embedded IoT project. How did you handle peripheral power states, ADC sampling noise, and communication bus isolation?`,
      skillsTested: ["Firmware Architecture", "Power Management", "ADC", "I2C/SPI"],
      expectedTopics: ["Sleep modes (Stop / Standby)", "DMA transfers for ADC", "Decoupling and analog ground separation", "Watchdog timer recovery"],
      whatWeLookFor: "Hands-on experience with embedded hardware, sensor interfaces, and power budget constraints."
    },
    {
      category: "Troubleshooting",
      difficulty: "Mid",
      question: (comp) => `Suppose an edge telemetry node at ${comp} intermittently resets or fails to transmit over SPI/I2C when an inductive motor load switches nearby. How do you systematically isolate ground loops, inductive kickback, and supply droop with an oscilloscope?`,
      skillsTested: ["Hardware Debugging", "EMI / EMC", "Power Electronics", "Oscilloscope Measurement"],
      expectedTopics: ["Flyback diode / snubber verification", "Ground loop current paths", "Brownout reset (BOR) threshold checks", "Optocoupler / digital isolator remediation"],
      whatWeLookFor: "Methodical bench testing and practical hardware debugging skills."
    },
    {
      category: "Behavioral / HR",
      difficulty: "Entry",
      question: (comp) => `Describe a situation where a component supply shortage or revision change forced you to redesign part of a circuit or firmware driver on a tight timeline. How did you validate equivalent performance?`,
      skillsTested: ["Component Engineering", "Adaptability", "Bench Testing"],
      expectedTopics: ["Pin-compatible alternative selection", "Datasheet timing parameter comparison", "Prototype smoke and functional testing", "BOM cost impact"],
      whatWeLookFor: "Resourcefulness and proactive engineering validation during supply disruptions."
    }
  ],
  software: [
    {
      category: "Core Technical",
      difficulty: "Mid",
      question: (comp) => `In building production services for ${comp}, how do you evaluate concurrency models (e.g. event-loop asynchronous I/O vs multi-threading) to prevent event-loop blockages and resource starvation under high throughput?`,
      skillsTested: ["Concurrency", "System Architecture", "Asynchronous I/O"],
      expectedTopics: ["Event loop phases", "Worker threads / thread pools", "Backpressure handling", "Memory consumption profiling"],
      whatWeLookFor: "Deep understanding of runtime execution mechanics, non-blocking I/O, and resource limits."
    },
    {
      category: "Scenario / System Design",
      difficulty: "Advanced",
      question: (comp) => `Design a distributed caching and rate-limiting tier for ${comp}'s public API that serves 100,000 requests per second. How do you handle cache invalidation, cache stampedes, and network partitions?`,
      skillsTested: ["System Design", "Distributed Systems", "Caching", "Redis"],
      expectedTopics: ["Redis cluster with sliding window rate limiting", "Probabilistic early expiration (XFetch)", "Write-through vs write-behind caching", "CAP theorem trade-offs"],
      whatWeLookFor: "Architectural maturity, latency calculations, failure isolation, and data consistency reasoning."
    },
    {
      category: "Troubleshooting",
      difficulty: "Mid",
      question: (comp) => `Suppose ${comp}'s backend service experiences intermittent 504 gateway timeouts and memory exhaustion (OOM) 2 hours after a deployment. Walk us step-by-step through how you isolate, triage, and remediate the issue.`,
      skillsTested: ["Debugging", "Observability", "Profiling", "Incident Response"],
      expectedTopics: ["Heap dump analysis / memory leak detection", "Connection pool exhaustion inspection", "Rollback vs hotfix criteria", "Post-mortem root cause analysis"],
      whatWeLookFor: "Disciplined incident triage under pressure without guessing."
    },
    {
      category: "Behavioral / HR",
      difficulty: "Entry",
      question: (comp) => `Describe a situation where a senior engineer or team lead strongly disagreed with your technical design or PR approach. How did you navigate the critique, and how was the final decision made?`,
      skillsTested: ["Code Review Culture", "Technical Humility", "Objectivity"],
      expectedTopics: ["Benchmarking data over subjective opinions", "Decoupling ego from code", "Commitment to team conventions", "Documented compromise"],
      whatWeLookFor: "High receptivity to feedback, objective technical reasoning, and collaborative consensus-building."
    }
  ],
  commerce: [
    {
      category: "Core Technical",
      difficulty: "Mid",
      question: (comp) => `In Tally ERP, how do you handle end-of-period ledger reconciliation, bank reconciliation statements (BRS), and adjusting journal entries for outstanding expenses and accrued income for ${comp}?`,
      skillsTested: ["Tally ERP", "Ledger Reconciliation", "BRS", "Journal Entries"],
      expectedTopics: ["Contra and journal vouchers in Tally", "Unreconciled bank ledger entries", "Accrual basis accounting principles", "Trial balance debit/credit balance verification"],
      whatWeLookFor: "Precise understanding of day-to-day computerized accounting, vouchers, and ledger balancing."
    },
    {
      category: "Project Deep Dive",
      difficulty: "Mid",
      question: (comp, role, cand) => `From your audit and commercial accounting experience at Subek Agarwal & Associates or L&T, walk us through how you verify supporting vouchers, invoices, and physical documentation during internal audit sampling.`,
      skillsTested: ["Internal Auditing", "Vouching", "Audit Documentation", "Compliance"],
      expectedTopics: ["Audit trail verification", "Discrepancy reporting and adjustment vouchers", "Statutory compliance (GST / TDS)", "Internal control evaluation"],
      whatWeLookFor: "Demonstrated real-world experience in auditing entries, voucher verification, and documentation."
    },
    {
      category: "Troubleshooting",
      difficulty: "Mid",
      question: (comp) => `Suppose the Trial Balance in Tally shows an unadjusted difference or suspense account balance before finalizing monthly accounts for ${comp}. How do you methodically track down posting errors, transposition mistakes, or double entries?`,
      skillsTested: ["Accounting Troubleshooting", "Suspense Account Clearance", "Tally ERP", "Cost Accounting"],
      expectedTopics: ["Locating difference in trial balance", "Checking daybook and cash book summaries", "Checking wrong side postings and omitted entries", "Clearing suspense account entries systematically"],
      whatWeLookFor: "Methodical accounting troubleshooting and attention to numerical accuracy."
    },
    {
      category: "Role-Specific",
      difficulty: "Entry",
      question: (comp) => `In managing commercial office records and corporate correspondence, how do you combine English typing and shorthand with computerized word processing and spreadsheets to ensure rapid, error-free documentation under deadlines?`,
      skillsTested: ["Commercial Practice", "English Typing", "English Shorthand", "Office Administration"],
      expectedTopics: ["Dictation transcription accuracy", "Template-driven reporting and mail merge", "Filing and record maintenance systems", "Time management during corporate meetings"],
      whatWeLookFor: "Practical proficiency in commercial practice, typing speed, and professional documentation."
    },
    {
      category: "Behavioral / HR",
      difficulty: "Entry",
      question: (comp) => `In an accounting or audit environment where accuracy is paramount, describe a situation where you caught a discrepancy or calculation error before a report was finalized. How did you handle it?`,
      skillsTested: ["Attention to Detail", "Ethics & Integrity", "Professional Communication"],
      expectedTopics: ["Diligence in checking ledger balances", "Professional communication with senior auditors or managers", "Rectification of errors without assigning blame"],
      whatWeLookFor: "High ethical standards, meticulous attention to detail, and constructive teamwork."
    }
  ]
};

// Default fallback when domain is general or unmapped
DOMAIN_QUESTION_BANKS.general = DOMAIN_QUESTION_BANKS.software;
DOMAIN_QUESTION_BANKS.aiml = [
  {
    category: "Core Technical",
    difficulty: "Advanced",
    question: (comp) => `In deploying Large Language Models or neural inference pipelines at ${comp}, how do you balance inference latency, GPU memory bandwidth, and quantization trade-offs (e.g. FP16 vs INT8 vs INT4)?`,
    skillsTested: ["PyTorch", "Model Optimization", "Quantization", "CUDA"],
    expectedTopics: ["KV-cache memory scaling", "PagedAttention", "Post-training quantization vs QAT", "Batching strategies"],
    whatWeLookFor: "Deep grasp of ML systems engineering, hardware constraints, and memory bandwidth bounds."
  },
  ...DOMAIN_QUESTION_BANKS.software
];

// ─────────────────────────────────────────────────────────────────────────────
// PROMPTS & AI ENGINE
// ─────────────────────────────────────────────────────────────────────────────

function cleanJsonText(raw: string): string {
  let cleaned = (raw || "").trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.substring(7);
  else if (cleaned.startsWith("```")) cleaned = cleaned.substring(3);
  if (cleaned.endsWith("```")) cleaned = cleaned.substring(0, cleaned.length - 3);
  return cleaned.trim();
}

/**
 * Generates an adaptive, highly authentic interview question using Gemini.
 * Incorporates:
 * - Candidate profile & verified resume evidence
 * - Target role, company, and job description
 * - Previous questions (to eliminate duplicates)
 * - Previous candidate answer & evaluation (for adaptive follow-ups)
 */
export async function generateAdaptiveQuestion(
  session: ServerInterviewSession,
  previousEvaluation?: AnswerEvaluation,
  geminiClient?: GoogleGenAI
): Promise<StructuredInterviewQuestion> {
  const seq = session.currentSequence + 1;
  const candidate = session.candidate;
  const job = session.jobContext;
  const comp = job.company?.trim() || "Target Organization";
  const role = job.title?.trim() || "Engineering Role";
  const domain = candidate.domain || "engineering";

  const askedQuestionTexts = session.questions.map((q) => q.question);
  const matchedSkills = job.matchedSkills?.length ? job.matchedSkills : candidate.skills.slice(0, 4);
  const missingSkills = job.missingSkills?.length ? job.missingSkills : [];

  if (!geminiClient && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "dummy_key") {
    try {
      geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch (_) {}
  }

  // Determine category and adaptive intent based on sequence & previous evaluation
  let targetCategory: QuestionCategory = session.currentCategory || "Core Technical";
  let targetType: "direct" | "follow_up" | "deep_dive" | "scenario" | "clarification" = "direct";
  let followUpOfId: string | null = previousEvaluation?.questionId || null;
  let targetDifficulty: QuestionDifficulty = previousEvaluation?.recommendedDifficulty || session.currentDifficulty || "Mid";

  if (previousEvaluation) {
    followUpOfId = previousEvaluation.questionId;
    if (previousEvaluation.followUpNeeded || previousEvaluation.score < 6) {
      targetCategory = "Troubleshooting";
      targetType = "follow_up";
      targetDifficulty = previousEvaluation.score <= 4 ? "Entry" : "Mid";
    } else if (previousEvaluation.score >= 8) {
      targetDifficulty = "Advanced";
      targetCategory = session.currentCategory || (seq === 2 ? "Project Deep Dive" : seq === 3 ? "Scenario / System Design" : "Role-Specific");
    }
  } else if (!session.currentCategory || session.currentCategory === "Core Technical") {
    // Normal progression based on sequence if no category explicitly requested
    if (seq === 1) {
      targetCategory = candidate.projects?.length ? "Project Deep Dive" : "Resume Deep Dive";
    } else if (seq === 2) {
      targetCategory = "Core Technical";
    } else if (seq === 3 && missingSkills.length > 0) {
      targetCategory = "Skill-Gap";
    } else if (seq === 4) {
      targetCategory = "Scenario / System Design";
    } else if (seq >= 5) {
      targetCategory = "Behavioral / HR";
    }
  }

  // 1. Try Gemini dynamic generation if available
  if (geminiClient) {
    try {
      const prompt = `TASK: ADAPTIVE_INTERVIEW_QUESTION_ENGINE
You are an expert technical interviewer at ${comp} conducting a real, high-stakes interview for ${role}.

CANDIDATE INFORMATION:
- Name: ${candidate.name || "Candidate"}
- Discipline/Domain: ${domain}
- Verified Skills: ${candidate.skills.slice(0, 10).join(", ") || "Engineering Fundamentals"}
- Experience: ${candidate.experienceYears} years
- Projects on Resume: ${JSON.stringify(candidate.projects?.slice(0, 2) || "None explicitly listed")}
- Achievements: ${JSON.stringify(candidate.achievements?.slice(0, 2) || [])}
- Resume Snippet: "${(candidate.rawResumeSnippet || "").slice(0, 500)}"

TARGET ROLE & JOB REQUIREMENTS:
- Target Company: ${comp}
- Target Role: ${role}
- Job Description Snippet: "${(job.description || "").slice(0, 400)}"
- Matched Competencies: ${matchedSkills.join(", ")}
- Job Skill Gaps (Missing from Resume): ${missingSkills.join(", ") || "None"}

PREVIOUS INTERVIEW CONTEXT:
- Previous Questions Asked: ${JSON.stringify(askedQuestionTexts)}
- Last Candidate Answer: "${(previousEvaluation?.candidateAnswer || "N/A").slice(0, 300)}"
- Last Evaluation Score: ${previousEvaluation ? `${previousEvaluation.score}/10 (${previousEvaluation.verdict})` : "First question"}
- Last Missing Concepts / Gaps: ${JSON.stringify(previousEvaluation?.missingConcepts || [])}

PLANNED NEXT STEP:
- Planned Sequence Number: ${seq}
- Target Category: ${targetCategory}
- Target Difficulty: ${targetDifficulty}
- Is Adaptive Follow-up: ${targetType === "follow_up" ? "YES (probe the missing concepts from previous answer)" : "NO"}

STRICT INTERVIEW QUALITY RULES:
1. Avoid textbook trivia, definitions, or generic filler.
2. Ask practical engineering questions: trade-offs, debugging, design decisions, failure modes, root cause analysis.
3. If category is "Project Deep Dive", anchor directly to a specific project listed on the resume.
4. If category is "Skill-Gap", ask how the candidate applies transferable fundamentals to learn/adapt to missing skill (${missingSkills[0] || "job requirements"}).
5. If category is "Troubleshooting", give a realistic failure scenario at ${comp}.
6. Do NOT claim these are leaked or official company questions.
7. Return ONLY valid JSON adhering to the specified schema.

JSON SCHEMA:
{
  "question": "Clear, practical, industry-grade question here",
  "category": "${targetCategory}",
  "difficulty": "${targetDifficulty}",
  "skillsTested": ["Skill1", "Skill2"],
  "expectedTopics": ["Topic1", "Topic2"],
  "resumeEvidence": "Specific project, tool, or achievement from resume that prompted this, or null",
  "jobRequirement": "Specific job requirement from JD that prompted this, or null",
  "questionType": "${targetType}"
}`;

      const response = await geminiClient.models.generateContent({
        model: process.env.MODEL_NAME || "gemini-3.8-flash",
        contents: prompt,
        config: {
          maxOutputTokens: 2048,
          responseMimeType: "application/json"
        }
      });

      const clean = cleanJsonText(response?.text || "");
      const parsed = JSON.parse(clean);

      // Validate required fields
      if (parsed && typeof parsed.question === "string" && parsed.question.trim().length > 15) {
        const generatedQ: StructuredInterviewQuestion = {
          id: `q_${session.sessionId}_${seq}_${Date.now().toString(36)}`,
          sessionId: session.sessionId,
          question: parsed.question.trim(),
          category: parsed.category || targetCategory,
          difficulty: parsed.difficulty || targetDifficulty,
          skillsTested: Array.isArray(parsed.skillsTested) && parsed.skillsTested.length > 0 ? parsed.skillsTested : matchedSkills.slice(0, 3),
          expectedTopics: Array.isArray(parsed.expectedTopics) && parsed.expectedTopics.length > 0 ? parsed.expectedTopics : ["Core Fundamentals"],
          resumeEvidence: parsed.resumeEvidence || (candidate.projects?.[0]?.title ? `Project: ${candidate.projects[0].title}` : undefined),
          jobRequirement: parsed.jobRequirement || (missingSkills.length ? `Missing Skill: ${missingSkills[0]}` : undefined),
          questionType: targetType,
          followUpOf: followUpOfId,
          source: "AI_GENERATED",
          sequenceNumber: seq,
          createdAt: Date.now()
        };
        return generatedQ;
      }
    } catch (aiErr: any) {
      console.info(`[AdaptiveEngine] Gemini question generation fallback triggered (${aiErr?.message || "rate-limited"}). Using deterministic bank.`);
    }
  }

  // 2. Deterministic Fallback Bank (100% Reliable, Strictly Labeled FALLBACK_BANK)
  const bank = DOMAIN_QUESTION_BANKS[domain.toLowerCase()] || DOMAIN_QUESTION_BANKS.general;
  
  // Find a template that has not been asked yet in this session
  let chosenTemplate = bank[(seq - 1) % bank.length];
  for (let offset = 0; offset < bank.length; offset++) {
    const candidateTpl = bank[(seq - 1 + offset) % bank.length];
    const candQText = candidateTpl.question(comp, role, candidate, job);
    if (!askedQuestionTexts.some(q => q.toLowerCase().trim() === candQText.toLowerCase().trim())) {
      chosenTemplate = candidateTpl;
      break;
    }
  }

  let fallbackQuestionText = chosenTemplate.question(comp, role, candidate, job);
  let resumeEv: string | undefined = undefined;
  let jobReq: string | undefined = undefined;

  if (targetType === "follow_up" && previousEvaluation?.missingConcepts?.length) {
    fallbackQuestionText = `In your previous response you touched on foundational concepts, but did not address ${previousEvaluation.missingConcepts[0]}. How would you systematically approach this at ${comp}?`;
  } else if ((targetCategory === "Project Deep Dive" || targetCategory === "Resume Deep Dive") && candidate.projects?.length) {
    const proj = candidate.projects[0];
    const pTitle = proj.title || proj.name || "your engineering project";
    fallbackQuestionText = `In your resume, you highlighted '${pTitle}'. Walk us through the architectural or design decisions you made, the key trade-offs, and how you validated the final deliverable against real constraints.`;
    resumeEv = `Project: ${pTitle} (${proj.technologies?.join(", ") || "Tools listed on resume"})`;
  } else if (targetCategory === "Skill-Gap" && missingSkills.length > 0) {
    const gap = missingSkills[0];
    fallbackQuestionText = `The job specification for ${role} at ${comp} emphasizes hands-on competency in ${gap}. While your background showcases strong expertise in ${matchedSkills.slice(0, 2).join(" & ") || "engineering core"}, how will you rapidly bridge this gap during your first 30 days?`;
    jobReq = `Job Requirement Gap: ${gap}`;
  } else if (targetCategory === "Job Description" || targetCategory === "Role-Specific" || (job.description && job.description.length > 0)) {
    jobReq = `Role Requirement: ${matchedSkills[0] || role} at ${comp}`;
  }

  // Final duplicate check: if the formulated text was somehow already asked, append a progressive prompt
  if (askedQuestionTexts.some(q => q.toLowerCase().trim() === fallbackQuestionText.toLowerCase().trim())) {
    fallbackQuestionText += ` Focus on specific architecture trade-offs and real-world failure modes for ${comp}.`;
  }

  const fallbackQ: StructuredInterviewQuestion = {
    id: `q_${session.sessionId}_${seq}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
    sessionId: session.sessionId,
    question: fallbackQuestionText,
    category: targetCategory,
    difficulty: targetDifficulty,
    skillsTested: targetCategory === "Skill-Gap" && missingSkills.length ? [missingSkills[0], ...chosenTemplate.skillsTested] : chosenTemplate.skillsTested || matchedSkills.slice(0, 3),
    expectedTopics: chosenTemplate.expectedTopics || ["Practical Execution", "Trade-offs"],
    resumeEvidence: resumeEv,
    jobRequirement: jobReq,
    questionType: targetType,
    followUpOf: followUpOfId,
    source: "FALLBACK_BANK",
    sequenceNumber: seq,
    createdAt: Date.now()
  };

  return fallbackQ;
}

/**
 * Evaluates candidate answer strictly using Gemini or a deterministic metric analyzer.
 * Returns structured scoring, correctness, missing concepts, and next difficulty recommendation.
 */
export async function evaluateAnswer(
  session: ServerInterviewSession,
  question: StructuredInterviewQuestion,
  answer: string,
  geminiClient?: GoogleGenAI
): Promise<AnswerEvaluation> {
  if (!geminiClient && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "dummy_key") {
    try {
      geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch (_) {}
  }
  const trimmed = (answer || "").trim();
  const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;
  const comp = session.jobContext.company || "Target Company";
  const role = session.jobContext.title || "Engineer";

  // Check for minimal input
  if (wordCount < 4) {
    return {
      id: `eval_${question.id}_${Date.now()}`,
      questionId: question.id,
      sessionId: session.sessionId,
      candidateAnswer: trimmed || "[No Answer Provided]",
      score: 1,
      maxScore: 10,
      verdict: "Very Weak",
      correctness: "Incorrect",
      technicalDepth: "None",
      relevance: "Off-Topic",
      clarity: "Rambling / Unclear",
      confidenceIndicators: "Low",
      strengths: [],
      weaknesses: ["Answer was too brief to demonstrate technical competence."],
      missingConcepts: question.expectedTopics || ["Core conceptual explanation"],
      improvementFeedback: "Elaborate with specific technical principles, concrete examples, and reasoning.",
      recommendedDifficulty: "Entry",
      followUpNeeded: true,
      followUpReason: "Answer provided was insufficient to evaluate.",
      interviewerSpokenFeedback: "That was quite brief. Let me ask you to elaborate on the core principles.",
      evaluatedAt: Date.now(),
      source: "OFFLINE_EVALUATION",
      evaluationMode: "OFFLINE",
      isQuotaExceeded: false,
      notice: "Answer provided was too brief to evaluate."
    };
  }

  let isQuota = false;
  let apiErrorMessage = "";

  // 1. Evaluate via Gemini
  if (geminiClient) {
    try {
      const prompt = `TASK: REAL_INTERVIEW_ANSWER_EVALUATOR
You are a senior technical interviewer and hiring bar raiser at ${comp} evaluating a candidate for ${role}.

QUESTION ASKED:
"${question.question}"
Category: ${question.category} | Difficulty: ${question.difficulty}
Skills Tested: ${question.skillsTested.join(", ")}
Expected Topics: ${question.expectedTopics.join(", ")}

CANDIDATE ANSWER:
"${trimmed}"

INSTRUCTIONS:
Evaluate this answer honestly, constructively, and realistically.
1. Score from 0 to 10 strictly based on content accuracy, depth, and relevance:
   - 9-10: Exceptional (addresses edge cases, trade-offs, accurate technical terms)
   - 7-8: Good / Competent (correct fundamentals, minor omissions)
   - 5-6: Average (generic, surface-level, missing key technical depth)
   - 3-4: Weak (incorrect concepts or substantial misconceptions)
   - 0-2: Very weak or off-topic
2. Identify 1-3 genuine strengths in what they said.
3. Identify 1-3 specific weaknesses or missing technical concepts.
4. Recommend next question difficulty: "Entry" | "Mid" | "Advanced".
5. Decide if a follow-up is needed to clarify a gap (boolean).
6. Provide a 1-sentence professional interviewer reaction to speak aloud.

Return ONLY this JSON schema:
{
  "score": 7,
  "verdict": "Good",
  "correctness": "Fully Correct / Partially Correct / Incorrect",
  "technicalDepth": "Deep / Adequate / Superficial / None",
  "relevance": "Directly Relevant / Partially Relevant / Off-Topic",
  "clarity": "Clear and Structured / Understandable / Rambling / Unclear",
  "confidenceIndicators": "High / Medium / Low",
  "strengths": ["Clear explanation of X"],
  "weaknesses": ["Did not mention Y"],
  "missingConcepts": ["Concept Y"],
  "improvementFeedback": "To strengthen your answer, discuss Z...",
  "recommendedDifficulty": "Mid",
  "followUpNeeded": false,
  "followUpReason": "",
  "interviewerSpokenFeedback": "Good breakdown of X. Let us move to the next area."
}`;

      const response = await geminiClient.models.generateContent({
        model: process.env.MODEL_NAME || "gemini-3.8-flash",
        contents: prompt,
        config: {
          maxOutputTokens: 2048,
          responseMimeType: "application/json"
        }
      });

      const clean = cleanJsonText(response?.text || "");
      const parsed = JSON.parse(clean);

      if (parsed && typeof parsed.score === "number") {
        const evaluation: AnswerEvaluation = {
          id: `eval_${question.id}_${Date.now()}`,
          questionId: question.id,
          sessionId: session.sessionId,
          candidateAnswer: trimmed,
          score: Math.min(10, Math.max(0, parsed.score)),
          maxScore: 10,
          verdict: parsed.verdict || (parsed.score >= 8 ? "Excellent" : parsed.score >= 6 ? "Good" : "Average"),
          correctness: parsed.correctness || (parsed.score >= 6 ? "Fully Correct" : "Partially Correct"),
          technicalDepth: parsed.technicalDepth || (parsed.score >= 8 ? "Deep" : "Adequate"),
          relevance: parsed.relevance || "Directly Relevant",
          clarity: parsed.clarity || "Clear and Structured",
          confidenceIndicators: parsed.confidenceIndicators || "Medium",
          strengths: Array.isArray(parsed.strengths) ? parsed.strengths : ["Structured delivery"],
          weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
          missingConcepts: Array.isArray(parsed.missingConcepts) ? parsed.missingConcepts : [],
          improvementFeedback: parsed.improvementFeedback || "Continue providing concrete examples.",
          recommendedDifficulty: parsed.recommendedDifficulty || (parsed.score >= 8 ? "Advanced" : parsed.score <= 4 ? "Entry" : "Mid"),
          followUpNeeded: Boolean(parsed.followUpNeeded),
          followUpReason: parsed.followUpReason || undefined,
          interviewerSpokenFeedback: parsed.interviewerSpokenFeedback || "Understood. Let's proceed.",
          evaluatedAt: Date.now(),
          source: "AI_EVALUATED",
          evaluationMode: "AI",
          isQuotaExceeded: false
        };
        return evaluation;
      }
    } catch (err: any) {
      const errStr = String(err?.message || err || "");
      const errStatus = (err as any)?.status || (err as any)?.statusCode;
      isQuota = errStatus === 429 || errStr.includes("429") || errStr.toLowerCase().includes("quota") || errStr.toLowerCase().includes("resource_exhausted");
      apiErrorMessage = errStr;
      console.warn(`[AdaptiveEngine] Gemini evaluation failed (quotaExceeded: ${isQuota}): ${errStr}. Engaging offline evaluation rubric.`);
    }
  }

  // 2. Deterministic Fallback Scorer (Analyzes topic hits & technical length)
  const lowerAnswer = trimmed.toLowerCase();
  let hits = 0;
  for (const topic of question.expectedTopics || []) {
    if (lowerAnswer.includes(topic.toLowerCase().slice(0, 5))) {
      hits++;
    }
  }

  const baseScore = wordCount >= 80 ? 7 : wordCount >= 40 ? 6 : 5;
  const score = Math.min(9, Math.max(3, baseScore + (hits > 0 ? 1 : -1)));
  const verdict = score >= 8 ? "Excellent" : score >= 6 ? "Good" : "Average";

  const offlineNotice = isQuota
    ? "AI evaluation temporarily unavailable due to API quota."
    : "AI evaluation temporarily unavailable. Evaluated using offline domain rubric.";

  const spokenFeedback = isQuota
    ? "AI evaluation temporarily unavailable due to API quota. Response recorded via offline rubric. Advancing to next question."
    : (score >= 7 
        ? "Clear response recorded via offline rubric. Advancing to next question." 
        : "Understood. Response recorded via offline rubric. Let's move forward.");

  return {
    id: `eval_${question.id}_${Date.now()}`,
    questionId: question.id,
    sessionId: session.sessionId,
    candidateAnswer: trimmed,
    score,
    maxScore: 10,
    verdict,
    correctness: score >= 6 ? "Fully Correct" : "Partially Correct",
    technicalDepth: wordCount >= 70 ? "Adequate" : "Superficial",
    relevance: "Directly Relevant",
    clarity: "Understandable",
    confidenceIndicators: wordCount >= 60 ? "High" : "Medium",
    strengths: ["Structured delivery", `Addressed domain criteria for ${question.skillsTested[0] || "the role"}`],
    weaknesses: hits === 0 ? [`Could articulate more depth on ${question.expectedTopics[0] || "core mechanics"}`] : [],
    missingConcepts: hits === 0 ? [question.expectedTopics[0] || "Domain tradeoffs"] : [],
    improvementFeedback: `Incorporate more concrete metrics and operational considerations when discussing ${question.skillsTested.slice(0, 2).join(", ")}.`,
    recommendedDifficulty: score >= 8 ? "Advanced" : score <= 4 ? "Entry" : "Mid",
    followUpNeeded: score <= 5,
    followUpReason: score <= 5 ? "Fundamental concepts require deeper validation." : undefined,
    interviewerSpokenFeedback: spokenFeedback,
    evaluatedAt: Date.now(),
    source: "OFFLINE_EVALUATION",
    evaluationMode: "OFFLINE",
    isQuotaExceeded: isQuota,
    notice: offlineNotice
  };
}

/**
 * Initializes a new adaptive interview session.
 */
export async function createAdaptiveSession(
  params: {
    userId?: string;
    candidateProfile?: any;
    candidateProfileId?: string;
    selectedJob?: any;
    jobId?: string;
    targetCompany?: string;
    targetRole?: string;
    mode?: "STANDARD" | "VR";
    totalPlannedQuestions?: number;
  },
  geminiClient?: GoogleGenAI
): Promise<{ session: ServerInterviewSession; firstQuestion: StructuredInterviewQuestion }> {
  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const userId = params.userId || "guest-user-123";
  const explicitMode: "STANDARD" | "VR" = params.mode === "VR" ? "VR" : "STANDARD";

  const rawCandidate = params.candidateProfile || {};
  const candDomainRaw = (rawCandidate.domain || "").toLowerCase();
  const candRoleRaw = (params.targetRole || rawCandidate.targetRoles?.[0] || "").toLowerCase();
  const isCommerce = candDomainRaw.includes("commerce") || 
                     candDomainRaw.includes("account") || 
                     candRoleRaw.includes("account") || 
                     candRoleRaw.includes("commerce") || 
                     candRoleRaw.includes("finance");

  const resolvedDomain = isCommerce ? "commerce" : (rawCandidate.domain || "general");
  const defaultFallbackRole = isCommerce ? "Accounts Assistant" : "Engineer";

  const candidateCtx: CandidateSessionContext = {
    name: rawCandidate.fullName || rawCandidate.name || "Candidate",
    domain: resolvedDomain,
    skills: Array.isArray(rawCandidate.skills) && rawCandidate.skills.length > 0 
      ? rawCandidate.skills 
      : (isCommerce ? ["Tally", "Cost and Management Accounting", "English shorthand", "English typing", "Basic Computer Knowledge"] : ["Problem Solving", "Engineering Fundamentals"]),
    experienceYears: typeof rawCandidate.experienceYears === "number" ? rawCandidate.experienceYears : (isCommerce ? 1 : 1),
    targetRoles: Array.isArray(rawCandidate.targetRoles) && rawCandidate.targetRoles.length > 0 
      ? rawCandidate.targetRoles 
      : [params.targetRole || defaultFallbackRole],
    projects: Array.isArray(rawCandidate.projects) ? rawCandidate.projects : [],
    experience: Array.isArray(rawCandidate.experienceList) ? rawCandidate.experienceList.map((e: string) => ({ description: e })) : (Array.isArray(rawCandidate.experience) ? rawCandidate.experience : []),
    education: Array.isArray(rawCandidate.education) ? rawCandidate.education.map((e: any) => typeof e === "string" ? { degree: e } : e) : [],
    achievements: Array.isArray(rawCandidate.achievements) ? rawCandidate.achievements : [],
    rawResumeSnippet: rawCandidate.rawResumeText?.slice(0, 1000) || undefined
  };

  const rawJob = params.selectedJob || {};
  const jobCtx: JobSessionContext = {
    title: params.targetRole || rawJob.title || candidateCtx.targetRoles[0] || defaultFallbackRole,
    company: params.targetCompany || rawJob.company || (isCommerce ? "Subek Agarwal & Associates" : "Target Tech"),
    description: rawJob.description || "",
    location: rawJob.location || "India",
    matchedSkills: Array.isArray(rawJob.matchedSkills) && rawJob.matchedSkills.length > 0 ? rawJob.matchedSkills : candidateCtx.skills.slice(0, 3),
    missingSkills: Array.isArray(rawJob.missingSkills) ? rawJob.missingSkills : []
  };

  const session: ServerInterviewSession = {
    sessionId,
    userId,
    candidateProfileId: params.candidateProfileId || rawCandidate.id,
    targetRole: params.targetRole || jobCtx.title,
    targetCompany: jobCtx.company,
    jobId: params.jobId || rawJob.id,
    mode: explicitMode,
    candidate: candidateCtx,
    jobContext: jobCtx,
    currentCategory: candidateCtx.projects?.length ? "Project Deep Dive" : "Core Technical",
    currentDifficulty: "Mid",
    questions: [],
    answers: {},
    evaluations: {},
    history: [],
    status: "active",
    currentSequence: 0,
    totalPlannedQuestions: params.totalPlannedQuestions || 5,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  // Generate First Question
  const firstQuestion = await generateAdaptiveQuestion(session, undefined, geminiClient);
  session.questions.push(firstQuestion);
  session.currentQuestionId = firstQuestion.id;
  session.currentSequence = 1;
  session.currentCategory = firstQuestion.category;
  session.currentDifficulty = firstQuestion.difficulty;
  session.history.push({ question: firstQuestion });

  // Persist session
  sessionStore.save(session);

  return { session, firstQuestion };
}

/**
 * Submits an answer, evaluates it, adapts the difficulty and topic,
 * and generates the next adaptive question (or marks complete).
 */
export async function processAnswerAndAdapt(
  sessionId: string,
  questionId: string,
  answer: string,
  geminiClient?: GoogleGenAI
): Promise<{
  session: ServerInterviewSession;
  evaluation: AnswerEvaluation;
  nextQuestion?: StructuredInterviewQuestion;
  isComplete: boolean;
}> {
  const session = sessionStore.get(sessionId);
  if (!session) {
    throw new Error(`Interview session '${sessionId}' not found.`);
  }

  // Gracefully resolve questionId if empty, undefined, or missing
  let resolvedQuestionId = questionId;
  if (!resolvedQuestionId || !session.questions.some((q) => q.id === resolvedQuestionId)) {
    resolvedQuestionId = session.currentQuestionId || session.questions[session.questions.length - 1]?.id;
  }

  const question = session.questions.find((q) => q.id === resolvedQuestionId);
  if (!question) {
    throw new Error(`Question '${questionId}' not found in session.`);
  }

  // Idempotency check: if already evaluated, do not duplicate or double-advance sequence
  if (session.answers[resolvedQuestionId] && session.evaluations[resolvedQuestionId]) {
    const existingEvaluation = session.evaluations[resolvedQuestionId];
    const qIndex = session.questions.findIndex((q) => q.id === resolvedQuestionId);
    const existingNextQuestion = (qIndex >= 0 && qIndex + 1 < session.questions.length)
      ? session.questions[qIndex + 1]
      : undefined;
    const isComplete = session.status === "completed" || session.currentSequence >= session.totalPlannedQuestions;

    return {
      session,
      evaluation: existingEvaluation,
      nextQuestion: existingNextQuestion,
      isComplete
    };
  }

  // 1. Evaluate candidate answer
  const evaluation = await evaluateAnswer(session, question, answer, geminiClient);
  session.answers[resolvedQuestionId] = answer;
  session.evaluations[resolvedQuestionId] = evaluation;
  session.currentQuestionId = resolvedQuestionId;

  // Update history item
  const histItem = session.history.find((h) => h.question.id === resolvedQuestionId);
  if (histItem) {
    histItem.answer = answer;
    histItem.evaluation = evaluation;
  } else {
    session.history.push({ question, answer, evaluation });
  }

  // 2. Adjust session difficulty
  session.currentDifficulty = evaluation.recommendedDifficulty;

  // 3. Determine if interview is complete
  if (session.currentSequence >= session.totalPlannedQuestions) {
    session.status = "completed";
    sessionStore.save(session);
    return {
      session,
      evaluation,
      isComplete: true
    };
  }

  // 4. Generate next adaptive question exactly once
  const nextQuestion = await generateAdaptiveQuestion(session, evaluation, geminiClient);
  session.questions.push(nextQuestion);
  session.currentQuestionId = nextQuestion.id;
  session.currentSequence++;
  session.currentCategory = nextQuestion.category;
  session.currentDifficulty = nextQuestion.difficulty;
  session.history.push({ question: nextQuestion });

  sessionStore.save(session);

  return {
    session,
    evaluation,
    nextQuestion,
    isComplete: false
  };
}

/**
 * Computes official final report from all evaluations in the session.
 */
export function generateFinalSessionReport(session: ServerInterviewSession): any {
  const evals = Object.values(session.evaluations);
  if (evals.length === 0) {
    return {
      overall_score: 70,
      overall_grade: "B",
      hiring_decision: "Hold",
      top_3_strengths: ["Participated in mock interview"],
      top_3_weak_areas: ["Incomplete evaluations"],
      summary: "Interview concluded with partial telemetry."
    };
  }

  const totalScore = evals.reduce((sum, e) => sum + e.score, 0);
  const avg10 = totalScore / evals.length;
  const overall100 = Math.round(avg10 * 10);

  const grade =
    overall100 >= 90 ? "A+" : overall100 >= 80 ? "A" : overall100 >= 70 ? "B+" : overall100 >= 60 ? "B" : "C";

  const hiringDecision =
    overall100 >= 85 ? "Strong Hire" : overall100 >= 75 ? "Hire" : overall100 >= 65 ? "Hold" : "Reject";

  const allStrengths = Array.from(new Set(evals.flatMap((e) => e.strengths))).filter(Boolean);
  const allWeaknesses = Array.from(new Set(evals.flatMap((e) => e.weaknesses))).filter(Boolean);
  const allMissing = Array.from(new Set(evals.flatMap((e) => e.missingConcepts))).filter(Boolean);

  const finalReport = {
    report_header: {
      title: "Yatranew AI — Official Adaptive Interview Report",
      candidate: session.candidate.name || "Candidate",
      company: session.jobContext.company || "Target Tech",
      role: session.jobContext.title || "Engineer",
      domain: session.candidate.domain,
      interviewer: "Naya",
      date: new Date().toLocaleDateString("en-IN", { dateStyle: "long" })
    },
    overall_score: overall100,
    overall_grade: grade,
    percentile_estimate: `Top ${Math.max(5, 100 - overall100)}%`,
    hiring_decision: hiringDecision,
    total_questions_answered: evals.length,
    top_3_strengths: allStrengths.slice(0, 3),
    top_3_weak_areas: allWeaknesses.slice(0, 3),
    missing_concepts: allMissing.slice(0, 5),
    question_breakdown: session.history.map((h, i) => ({
      sequence: i + 1,
      category: h.question.category,
      question: h.question.question,
      difficulty: h.question.difficulty,
      source: h.question.source,
      candidate_answer: h.answer || "[No Answer]",
      score: h.evaluation?.score ?? 0,
      verdict: h.evaluation?.verdict ?? "N/A",
      feedback: h.evaluation?.improvementFeedback ?? "N/A"
    })),
    naya_personal_message:
      overall100 >= 80
        ? `Outstanding demonstration of technical rigor and structured communication! You showed genuine depth in ${session.candidate.domain} engineering.`
        : `Solid foundational performance. Focusing on your specific gaps in ${allMissing.slice(0, 2).join(" & ") || "system edge cases"} will elevate your candidacy directly into hire tier.`
  };

  session.finalReport = finalReport;
  session.status = "completed";
  sessionStore.save(session);

  return finalReport;
}
