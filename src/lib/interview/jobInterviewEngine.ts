/**
 * PHASE 4: COMPANY & JOB-SPECIFIC INTERVIEW ENGINE
 * 
 * Generates tailored interview preparation questions combining:
 * 1. Candidate's verified skills & domain
 * 2. Selected job title & company
 * 3. Matched skills & explicitly disclosed missing skills (gaps)
 * 4. Stated experience & resume context
 * 
 * Strict Guardrails:
 * - Labeled strictly: "AI-generated questions based on this role and available job requirements."
 * - ZERO fabricated interview history or fake leaked company questions.
 * - Deterministic fallback guarantees 100% availability even when Gemini is rate-limited (429).
 * - Categorizes questions into:
 *     - Technical
 *     - Role-Specific
 *     - Resume-Specific
 *     - Behavioral
 *     - Skill-Gap
 */

export interface CandidateInterviewProfile {
  skills: string[];
  targetRoles: string[];
  domain: string; // "mechanical" | "civil" | "software" | "aiml" | "electrical" | "data" | string
  experienceYears?: number;
  projectsOrAchievements?: string[];
  resumeTextSnippet?: string;
}

export interface SelectedJobContext {
  company: string;
  title: string;
  description: string;
  category?: string;
  matchedSkills?: string[];
  missingSkills?: string[];
  compatibilityScore?: number;
}

export type QuestionCategory =
  | "Technical"
  | "Role-Specific"
  | "Resume-Specific"
  | "Behavioral"
  | "Skill-Gap";

export interface InterviewQuestion {
  id: string;
  category: QuestionCategory;
  question: string;
  whatWeLookFor: string;
  followUpQuestion: string;
  targetedSkillsOrConcepts: string[];
  estimatedTimeSeconds: number;
  difficulty: "Entry" | "Mid" | "Advanced";
}

export interface JobSpecificInterviewSession {
  sessionTitle: string;
  company: string;
  roleTitle: string;
  candidateDomain: string;
  sourceDisclaimer: "AI-generated questions based on this role and available job requirements.";
  compatibilitySummary: {
    overallScore?: number;
    matchedSkills: string[];
    missingSkills: string[];
  };
  questions: InterviewQuestion[];
  generatedAt: string;
  mode: "gemini_contextual" | "deterministic_local_engine";
}

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN-SPECIFIC TECHNICAL QUESTION KNOWLEDGE BASE (LOCAL ENGINE)
// ─────────────────────────────────────────────────────────────────────────────

interface SkillQuestionTemplate {
  question: (company: string, role: string) => string;
  whatWeLookFor: string;
  followUp: string;
  difficulty: "Entry" | "Mid" | "Advanced";
}

const SKILL_QUESTION_TEMPLATES: Record<string, SkillQuestionTemplate> = {
  // ── MECHANICAL ────────────────────────────────────────────────────────────
  "SolidWorks": {
    question: (comp, role) => `In developing mechanical components for ${comp}, how do you structure parametric feature trees and assembly mates in SolidWorks to prevent rebuild errors and ensure seamless design revisions?`,
    whatWeLookFor: "Evaluates disciplined CAD modeling practices: top-down vs bottom-up design, sketch constraints, minimizing circular dependencies, and configurability.",
    followUp: "How do you handle complex sheet metal bends or draft angles for injection molding within SolidWorks?",
    difficulty: "Mid"
  },
  "AutoCAD": {
    question: (comp, role) => `When generating fabrication and shop drawings in AutoCAD for ${comp}, what layer standards, dimensioning rules, and title block conventions do you enforce to eliminate interpretation ambiguity on the shop floor?`,
    whatWeLookFor: "Demonstrates practical drafting discipline, tolerance clarity, multi-view orthographic projections, and compliance with drafting standards (ISO/ASME).",
    followUp: "How do you coordinate external references (Xrefs) and blocks when collaborating across multi-disciplinary drawing sets?",
    difficulty: "Entry"
  },
  "GD&T": {
    question: (comp, role) => `Walk us through how you define datum reference frames and assign positional vs form tolerances using GD&T on a critical mating part at ${comp}.`,
    whatWeLookFor: "Knowledge of ASME Y14.5 or ISO 1101, Maximum Material Condition (MMC) modifiers, tolerance stack-up analysis, and cost-vs-precision trade-offs.",
    followUp: "Can you explain when you would specify a profile of a surface tolerance instead of individual coordinate tolerances?",
    difficulty: "Advanced"
  },
  "ANSYS": {
    question: (comp, role) => `Describe your workflow in ANSYS for validating structural integrity under dynamic or static load cases. How do you select element types and verify mesh convergence?`,
    whatWeLookFor: "Understanding of mesh quality (aspect ratio, skewness), singularity resolution, boundary condition physics, and correlating FEA results with hand calculations.",
    followUp: "What techniques do you employ to detect and resolve artificial stress concentrations caused by point loads or rigid constraints?",
    difficulty: "Advanced"
  },
  "FEA": {
    question: (comp, role) => `When conducting Finite Element Analysis (FEA) for a new component design at ${comp}, how do you substantiate your simulation accuracy before releasing parts for physical prototyping?`,
    whatWeLookFor: "Demonstrates validation methodology: mesh independence studies, theoretical beam/stress calculations, and safety factor selection.",
    followUp: "How do you model non-linear material behavior or plasticity if peak stress exceeds material yield strength?",
    difficulty: "Advanced"
  },
  "Thermodynamics": {
    question: (comp, role) => `How do you assess heat dissipation and thermal expansion in mechanical assemblies operating under fluctuating operational temperatures at ${comp}?`,
    whatWeLookFor: "Applies conduction, convection, and radiation fundamentals; calculates thermal stress and material compatibility (coefficients of thermal expansion).",
    followUp: "How would you optimize fin geometry or heatsink airflow to improve heat transfer under constrained enclosure volumes?",
    difficulty: "Mid"
  },
  "HVAC": {
    question: (comp, role) => `For an HVAC or thermal management system at ${comp}, how do you calculate sensible vs latent heat loads and select appropriate equipment sizing?`,
    whatWeLookFor: "Psychrometric chart interpretation, duct sizing criteria, CFM calculations, and energy efficiency standards (ASHRAE/IS).",
    followUp: "How do you balance acoustic noise levels with required airflow velocity in commercial ventilation design?",
    difficulty: "Mid"
  },

  // ── CIVIL ─────────────────────────────────────────────────────────────────
  "STAAD.Pro": {
    question: (comp, role) => `In STAAD.Pro, how do you define member properties, support conditions, and load combinations (dead, live, seismic, wind) for a multi-story reinforced concrete frame at ${comp}?`,
    whatWeLookFor: "Proper application of design codes (e.g. IS 456, IS 1893, IS 875, or ACI), P-Delta analysis considerations, and evaluating shear force and bending moment envelopes.",
    followUp: "How do you verify whether torsion in irregular structural layouts satisfies code limits in your STAAD model?",
    difficulty: "Advanced"
  },
  "ETABS": {
    question: (comp, role) => `When performing seismic analysis in ETABS for a structure at ${comp}, how do you model shear walls and diaphragms, and how do you evaluate lateral inter-story drift?`,
    whatWeLookFor: "Understanding response spectrum analysis, semi-rigid vs rigid diaphragms, modal mass participation factors, and ductile detailing provisions.",
    followUp: "If the second-order P-Delta effects exceed the code limit in ETABS, what structural redesign adjustments do you recommend?",
    difficulty: "Advanced"
  },
  "RCC Design": {
    question: (comp, role) => `Explain the design philosophy of limit state method in Reinforced Cement Concrete (RCC) design, focusing on flexural and shear reinforcement sizing for ${comp} projects.`,
    whatWeLookFor: "Knowledge of ultimate limit states vs serviceability limit states (deflection, cracking), under-reinforced section behavior, and development length requirements.",
    followUp: "Why is an under-reinforced section preferred over an over-reinforced section in structural concrete design?",
    difficulty: "Mid"
  },
  "Structural Analysis": {
    question: (comp, role) => `How do you approach the structural analysis of an indeterminate structure, and how do you determine internal forces and deflections under extreme environmental loads?`,
    whatWeLookFor: "Clear understanding of moment distribution, slope-deflection, stiffness matrix concepts, and verifying computer software results with equilibrium equations.",
    followUp: "How do you account for foundation settlement and soil-structure interaction during structural analysis?",
    difficulty: "Mid"
  },
  "AutoCAD Civil 3D": {
    question: (comp, role) => `In AutoCAD Civil 3D, how do you model road alignments, profiles, and calculate earthwork cut-and-fill volumes for site infrastructure at ${comp}?`,
    whatWeLookFor: "Surface creation from survey contours, corridor modeling, cross-sections, and mass haul diagram generation.",
    followUp: "How do you resolve corridor surface boundary errors when modeling complex intersections or daylighting into steep topography?",
    difficulty: "Mid"
  },
  "Revit": {
    question: (comp, role) => `How do you implement Building Information Modeling (BIM) workflows in Revit to detect structural clashes with MEP services for ${comp}?`,
    whatWeLookFor: "BIM Level 2 collaboration, family creation, parameter linking, clash detection matrices, and multidisciplinary coordination.",
    followUp: "How do you manage Revit model performance when handling large-scale federated project files?",
    difficulty: "Mid"
  },

  // ── SOFTWARE / WEB ────────────────────────────────────────────────────────
  "TypeScript": {
    question: (comp, role) => `At ${comp}, how do you utilize advanced TypeScript constructs like mapped types, conditional types, and template literal types to build strongly typed, maintainable APIs?`,
    whatWeLookFor: "Evaluates type system mastery: avoiding 'any', understanding covariance/contravariance, generics with constraints, and compile-time validation.",
    followUp: "How do you handle runtime payload validation (e.g. Zod or io-ts) while sharing type definitions with client apps?",
    difficulty: "Advanced"
  },
  "React": {
    question: (comp, role) => `In building responsive UI components for ${comp}, how do you profile component render performance and structure state management to prevent unnecessary renders?`,
    whatWeLookFor: "Understanding React reconciliation, memoization trade-offs (useMemo, useCallback), concurrent features, and colocation of state.",
    followUp: "How would you design a custom hook to encapsulate asynchronous data fetching with optimistic UI updates and error rollback?",
    difficulty: "Mid"
  },
  "Node.js": {
    question: (comp, role) => `How do you architect asynchronous I/O and handle CPU-intensive tasks in Node.js to ensure the event loop remains unblocked under high concurrent traffic at ${comp}?`,
    whatWeLookFor: "Deep understanding of the libuv event loop phases, worker threads, clustering, stream backpressure, and memory leak diagnosis.",
    followUp: "How do you handle unhandled promise rejections and graceful shutdown of database connections during process termination?",
    difficulty: "Mid"
  },
  "Python": {
    question: (comp, role) => `In developing backend services or data pipelines in Python for ${comp}, how do you leverage concurrency (asyncio vs multiprocessing vs threading) and optimize memory consumption?`,
    whatWeLookFor: "Knowledge of the GIL, generator iterators, asyncio event loops, context managers, and memory profiling tools.",
    followUp: "How do you structure your Python testing strategy (pytest, fixtures, mocking) to achieve high test coverage without tight coupling?",
    difficulty: "Mid"
  },
  "Docker": {
    question: (comp, role) => `Describe your strategy for building production-grade, multi-stage Docker images at ${comp} that minimize attack surface, leverage build cache, and maintain minimal image sizes.`,
    whatWeLookFor: "Multi-stage builds, non-root user execution, layer ordering efficiency, .dockerignore discipline, and container vulnerability scanning.",
    followUp: "How do you orchestrate health checks and graceful termination signals (SIGTERM/SIGINT) inside containerized applications?",
    difficulty: "Mid"
  },
  "PostgreSQL": {
    question: (comp, role) => `When designing relational schemas for ${comp}, how do you analyze query execution plans with EXPLAIN ANALYZE and design composite or partial indexes to eliminate sequential scans?`,
    whatWeLookFor: "Index selection (B-tree, GIN, BRIN), query optimization, transaction isolation levels (ACID), and managing lock contention.",
    followUp: "How do you approach database schema migrations with zero downtime on high-throughput production tables?",
    difficulty: "Advanced"
  },
  "AWS": {
    question: (comp, role) => `How would you design a highly available, fault-tolerant cloud architecture on AWS for ${comp}, balancing managed services (e.g. ECS/EKS, RDS, S3, SQS) with cost optimization?`,
    whatWeLookFor: "Multi-AZ redundancy, decoupling via message queues, least-privilege IAM policies, auto-scaling policies, and disaster recovery.",
    followUp: "How do you configure VPC security groups, subnets, and NAT gateways to isolate private database workloads from public ingress?",
    difficulty: "Advanced"
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DETERMINISTIC INTERVIEW QUESTION BUILDER (STANDALONE / FALLBACK)
// ─────────────────────────────────────────────────────────────────────────────

function findSkillQuestionTemplate(skillName: string): { template: SkillQuestionTemplate; canonicalName: string } | null {
  if (!skillName) return null;
  const clean = skillName.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const [key, template] of Object.entries(SKILL_QUESTION_TEMPLATES)) {
    const keyClean = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (clean === keyClean || clean.includes(keyClean) || keyClean.includes(clean)) {
      return { template, canonicalName: key };
    }
  }
  return null;
}

/**
 * Deterministically constructs a comprehensive, 5-category interview session
 * specifically adapted to the candidate's verified profile and selected live job.
 */
export function buildDeterministicInterviewQuestions(
  candidate: CandidateInterviewProfile,
  job: SelectedJobContext
): InterviewQuestion[] {
  const questions: InterviewQuestion[] = [];
  const comp = job.company?.trim() || "the hiring organization";
  const role = job.title?.trim() || "Engineer";
  const domain = (candidate.domain || "general").toLowerCase();

  const matched = Array.isArray(job.matchedSkills) && job.matchedSkills.length > 0 
    ? job.matchedSkills 
    : (candidate.skills || []).slice(0, 3);

  const missing = Array.isArray(job.missingSkills) ? job.missingSkills : [];
  const yearsExp = typeof candidate.experienceYears === "number" ? candidate.experienceYears : 2;

  // 1. TECHNICAL QUESTIONS (Tailored to matched competencies)
  let techCount = 0;
  const usedSkills = new Set<string>();

  for (const skill of matched) {
    if (techCount >= 2) break;
    const match = findSkillQuestionTemplate(skill);
    if (match && !usedSkills.has(match.canonicalName)) {
      usedSkills.add(match.canonicalName);
      questions.push({
        id: `tech-${techCount + 1}`,
        category: "Technical",
        question: match.template.question(comp, role),
        whatWeLookFor: match.template.whatWeLookFor,
        followUpQuestion: match.template.followUp,
        targetedSkillsOrConcepts: [match.canonicalName],
        estimatedTimeSeconds: 150,
        difficulty: match.template.difficulty
      });
      techCount++;
    }
  }

  // If matched skills had fewer than 2 specific templates, supply domain-specific technical questions
  if (techCount < 2) {
    if (domain === "mechanical") {
      questions.push({
        id: `tech-domain-${techCount + 1}`,
        category: "Technical",
        question: `In designing mechanical components at ${comp}, how do you evaluate material selection (e.g. yield strength, fatigue limit, thermal conductivity) against operational stress and manufacturing feasibility?`,
        whatWeLookFor: "Material properties knowledge (stress-strain curves, endurance limits), DFMA principles, and factor of safety calculation.",
        followUpQuestion: "How do you determine whether a part failure was caused by mechanical fatigue, brittle fracture, or yielding?",
        targetedSkillsOrConcepts: ["Mechanical Design", "Material Selection", "DFMA"],
        estimatedTimeSeconds: 120,
        difficulty: "Mid"
      });
    } else if (domain === "civil") {
      questions.push({
        id: `tech-domain-${techCount + 1}`,
        category: "Technical",
        question: `When designing concrete and steel structural members for ${comp}, how do you ensure compliance with limit state deflection and cracking requirements under service load conditions?`,
        whatWeLookFor: "Understanding of serviceability limit states, crack width calculation, long-term creep deflection, and structural durability provisions.",
        followUpQuestion: "How do environmental exposure conditions (e.g. marine or chemical environments) alter your cover and concrete grade specifications?",
        targetedSkillsOrConcepts: ["Structural Engineering", "RCC Design", "Building Codes"],
        estimatedTimeSeconds: 120,
        difficulty: "Mid"
      });
    } else {
      questions.push({
        id: `tech-domain-${techCount + 1}`,
        category: "Technical",
        question: `When designing software services for ${comp}, how do you approach data modeling and API contract definition to maintain backwards compatibility during continuous releases?`,
        whatWeLookFor: "REST/gRPC versioning strategies, schema evolution, database migration safety, and loose coupling between services.",
        followUpQuestion: "How do you handle idempotency and retry semantics for critical transaction endpoints?",
        targetedSkillsOrConcepts: ["API Design", "System Architecture", "Software Engineering"],
        estimatedTimeSeconds: 120,
        difficulty: "Mid"
      });
    }
  }

  // 2. ROLE-SPECIFIC QUESTION (1 question probing specific title and company context)
  questions.push({
    id: "role-spec-1",
    category: "Role-Specific",
    question: `As a ${role} at ${comp}, suppose you are assigned to troubleshoot an urgent design or operational defect identified during testing. How do you isolate the root cause, validate a corrective solution, and prevent regression?`,
    whatWeLookFor: "Demonstrates systematic root cause analysis (5-Whys, fishbone diagram), disciplined verification, and cross-functional communication under delivery pressure.",
    followUpQuestion: "How do you document the failure and integrate lessons learned into the team's ongoing design guidelines?",
    targetedSkillsOrConcepts: [role, "Root Cause Analysis", "Quality Engineering"],
    estimatedTimeSeconds: 120,
    difficulty: "Mid"
  });

  // 3. RESUME-SPECIFIC QUESTION (Probing candidate's actual projects, verified skills, or achievements)
  const achievement = candidate.projectsOrAchievements?.[0];
  const resumeText = (candidate.resumeTextSnippet || "").toLowerCase();
  
  // Check if candidate's resume/skills highlight key technical tools like FEA, ANSYS, STAAD, ETABS, Docker, Python, etc.
  const standoutKeywords = [
    { key: "fea", label: "FEA (Finite Element Analysis)", domain: "mechanical" },
    { key: "ansys", label: "ANSYS simulation", domain: "mechanical" },
    { key: "solidworks", label: "SolidWorks", domain: "mechanical" },
    { key: "staad", label: "STAAD.Pro structural analysis", domain: "civil" },
    { key: "etabs", label: "ETABS seismic modeling", domain: "civil" },
    { key: "revit", label: "Revit BIM modeling", domain: "civil" },
    { key: "docker", label: "Docker containerization", domain: "software" },
    { key: "react", label: "React architecture", domain: "software" },
    { key: "python", label: "Python services", domain: "software" }
  ];

  const candidateSkillStrings = (candidate.skills || []).map(s => s.toLowerCase());
  const foundStandout = standoutKeywords.find(item => 
    candidateSkillStrings.some(s => s.includes(item.key)) || resumeText.includes(item.key)
  );

  if (achievement) {
    questions.push({
      id: "resume-spec-1",
      category: "Resume-Specific",
      question: `In your resume, you noted: "${achievement.slice(0, 120)}...". Walk us through your specific individual contribution, the technical trade-offs you evaluated, and how you measured project success.`,
      whatWeLookFor: "Integrity of resume claims, individual technical ownership vs team contribution, and ability to clearly articulate metrics and outcomes.",
      followUpQuestion: "If you were to rebuild or re-engineer that solution today, what architectural or design choice would you change?",
      targetedSkillsOrConcepts: ["Project Execution", "Technical Ownership"],
      estimatedTimeSeconds: 150,
      difficulty: "Mid"
    });
  } else if (foundStandout) {
    questions.push({
      id: "resume-spec-1",
      category: "Resume-Specific",
      question: `You mention ${foundStandout.label} in your profile and resume. Walk us through a specific project where you applied this, and explain how you validated your ${foundStandout.domain === "mechanical" ? "simulation results against real-world physical behavior" : foundStandout.domain === "civil" ? "structural calculations against safety codes and site constraints" : "implementation against performance benchmarks and edge cases"}.`,
      whatWeLookFor: "Authentic project depth, practical verification methodology, and ability to connect digital tools with physical or operational realities.",
      followUpQuestion: "What assumptions did you make during that analysis, and how did you verify that those assumptions held true?",
      targetedSkillsOrConcepts: [foundStandout.label, "Validation", "Project Ownership"],
      estimatedTimeSeconds: 150,
      difficulty: "Mid"
    });
  } else {
    questions.push({
      id: "resume-spec-1",
      category: "Resume-Specific",
      question: `Reflecting on your ${yearsExp > 1 ? `${yearsExp} years of` : ""} background in ${domain} engineering, describe the most technically challenging project you have delivered. What was the central bottleneck, and how did you overcome it?`,
      whatWeLookFor: "Demonstrates authentic problem-solving depth, overcoming blockers, and technical pride in completed deliverables.",
      followUpQuestion: "How did you validate your engineering output before handoff or production deployment?",
      targetedSkillsOrConcepts: ["Project Architecture", "Problem Solving"],
      estimatedTimeSeconds: 150,
      difficulty: "Mid"
    });
  }

  // 4. BEHAVIORAL QUESTION (Domain-attuned situational collaboration question)
  if (domain === "mechanical") {
    questions.push({
      id: "behav-1",
      category: "Behavioral",
      question: `Tell us about a time in your engineering work where you identified a mechanical design or manufacturing flaw during prototyping, assembly, or testing. How did you communicate the issue to your team or client, and how was it resolved?`,
      whatWeLookFor: "STAR framework delivery: proactive risk identification, cross-functional collaboration with shop floor/vendors, and cost-effective redesign.",
      followUpQuestion: "What quality check or process update did you implement to prevent that flaw from recurring?",
      targetedSkillsOrConcepts: ["Mechanical Problem Solving", "Cross-Functional Collaboration"],
      estimatedTimeSeconds: 120,
      difficulty: "Mid"
    });
  } else if (domain === "civil") {
    questions.push({
      id: "behav-1",
      category: "Behavioral",
      question: `Describe a situation on a structural design or site engineering project where unforeseen site constraints or conflicting design standards arose. How did you navigate the trade-offs and build consensus among stakeholders?`,
      whatWeLookFor: "STAR framework: balancing client expectations, safety codes, contractor feasibility, and calm crisis management.",
      followUpQuestion: "How did you document the revised engineering change order to ensure contractual compliance?",
      targetedSkillsOrConcepts: ["Site Coordination", "Stakeholder Management"],
      estimatedTimeSeconds: 120,
      difficulty: "Mid"
    });
  } else {
    questions.push({
      id: "behav-1",
      category: "Behavioral",
      question: `Describe a situation where you and a senior engineer or product stakeholder strongly disagreed on an architectural decision or technical trade-off. How did you approach the disagreement, and how was the final decision reached?`,
      whatWeLookFor: "STAR framework: objective evaluation using data/benchmarks rather than ego, active listening, and commitment to the team's shared goal.",
      followUpQuestion: "What did that experience teach you about influencing technical decisions across cross-functional teams?",
      targetedSkillsOrConcepts: ["Technical Debate", "Team Alignment"],
      estimatedTimeSeconds: 120,
      difficulty: "Mid"
    });
  }

  // 5. SKILL-GAP QUESTION (Probing missing skills or proactive learning)
  if (missing.length > 0) {
    const topMissing = missing[0];
    const topMatched = matched[0] || "your existing technical foundation";

    questions.push({
      id: "skill-gap-1",
      category: "Skill-Gap",
      question: `The job posting for ${role} at ${comp} highlights ${topMissing} as an operational competency. While your resume showcases strong expertise in ${topMatched}, how would you approach rapidly onboarding onto ${topMissing}, and how do your existing skills transfer?`,
      whatWeLookFor: "Honesty about skill boundaries, learning agility, ability to map transferable mental models from known tools to new stacks, and concrete self-learning methodology.",
      followUpQuestion: `What specific milestone or proof-of-concept project would you set for yourself within the first 30 days to demonstrate proficiency in ${topMissing}?`,
      targetedSkillsOrConcepts: [topMissing, "Learning Agility", "Skill Adaptability"],
      estimatedTimeSeconds: 120,
      difficulty: "Mid"
    });
  } else {
    questions.push({
      id: "skill-gap-1",
      category: "Skill-Gap",
      question: `Given that engineering tools, codes, and methodologies for ${role} positions continue to evolve rapidly, how do you proactively identify gaps in your knowledge and systematically upgrade your skill set?`,
      whatWeLookFor: "Continuous professional development habits: technical documentation, industry certifications, side projects, and peer technical exchanges.",
      followUpQuestion: "What emerging technology or tool in your discipline are you currently exploring?",
      targetedSkillsOrConcepts: ["Continuous Learning", "Industry Adaptability"],
      estimatedTimeSeconds: 120,
      difficulty: "Entry"
    });
  }

  return questions;
}

// ─────────────────────────────────────────────────────────────────────────────
// GEMINI CONTEXTUAL QUESTION GENERATION (WITH FAIL-SAFE FALLBACK)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds the complete Job-Specific Interview Session.
 * Leverages Gemini when available, and seamlessly falls back to the high-fidelity
 * deterministic engine if Gemini is rate limited (429) or offline.
 */
export async function generateJobInterviewSession(
  candidate: CandidateInterviewProfile,
  job: SelectedJobContext,
  geminiClient?: any
): Promise<JobSpecificInterviewSession> {
  const company = job.company?.trim() || "Hiring Company";
  const role = job.title?.trim() || "Engineering Role";
  const domain = candidate.domain || "general";
  const matchedSkills = Array.isArray(job.matchedSkills) ? job.matchedSkills : [];
  const missingSkills = Array.isArray(job.missingSkills) ? job.missingSkills : [];

  const sessionMeta = {
    sessionTitle: `Technical Interview Simulation: ${role} at ${company}`,
    company,
    roleTitle: role,
    candidateDomain: domain,
    sourceDisclaimer: "AI-generated questions based on this role and available job requirements." as const,
    compatibilitySummary: {
      overallScore: job.compatibilityScore,
      matchedSkills,
      missingSkills
    },
    generatedAt: new Date().toISOString()
  };

  // Attempt dynamic generation via Gemini if available
  if (geminiClient && process.env.GEMINI_API_KEY) {
    try {
      const prompt = `TASK: JOB_SPECIFIC_INTERVIEW_PREPARATION_ENGINE
You are an engineering hiring manager at ${company} interviewing candidates for the role of ${role}.

INPUT CONTEXT:
- Candidate Verified Skills: ${candidate.skills?.join(", ") || "General engineering fundamentals"}
- Candidate Domain: ${domain}
- Candidate Experience: ${candidate.experienceYears ?? 2} years
- Matched Competencies with Job: ${matchedSkills.join(", ") || "General engineering foundation"}
- Identified Job Skill Gaps: ${missingSkills.join(", ") || "None disclosed in snippet"}
- Job Description Snippet: "${job.description.slice(0, 300)}"

INSTRUCTIONS:
Generate exactly 5 focused interview questions tailored strictly to this role and candidate context:
1. "Technical": A deep technical question probing candidate's matched skills (${matchedSkills.slice(0, 2).join(", ") || domain}).
2. "Role-Specific": A practical scenario question reflecting operational challenges of a ${role} at ${company}.
3. "Resume-Specific": Probing their background, engineering trade-offs, and project delivery.
4. "Behavioral": A situational question exploring conflict resolution, defect remediation, or cross-functional teamwork.
5. "Skill-Gap": Addressing how the candidate will adapt to ${missingSkills[0] || "emerging domain technologies"} using their transferable skills.

IMPORTANT GUARDRAILS:
- Do NOT claim these are actual questions asked previously by the company.
- Return ONLY valid JSON adhering strictly to this schema:

[
  {
    "id": "q1",
    "category": "Technical",
    "question": "Clear, direct question",
    "whatWeLookFor": "Evaluation criteria",
    "followUpQuestion": "Follow-up question",
    "targetedSkillsOrConcepts": ["Skill1"],
    "estimatedTimeSeconds": 150,
    "difficulty": "Mid"
  }
]`;

      const response = await geminiClient.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          maxOutputTokens: 4096,
          responseMimeType: "application/json"
        }
      });

      const text = (response?.text || "").trim();
      let cleanText = text;
      if (cleanText.startsWith("```json")) cleanText = cleanText.substring(7);
      else if (cleanText.startsWith("```")) cleanText = cleanText.substring(3);
      if (cleanText.endsWith("```")) cleanText = cleanText.substring(0, cleanText.length - 3);
      cleanText = cleanText.trim();

      const parsed: InterviewQuestion[] = JSON.parse(cleanText);
      if (Array.isArray(parsed) && parsed.length >= 3) {
        return {
          ...sessionMeta,
          questions: parsed,
          mode: "gemini_contextual"
        };
      }
    } catch (err: any) {
      console.info(`[Interview Engine] Gemini unavailable or rate-limited (${err?.message || "fallback"}). Using deterministic local engine.`);
    }
  }

  // Deterministic local engine execution (100% reliable fallback)
  const deterministicQuestions = buildDeterministicInterviewQuestions(candidate, job);

  return {
    ...sessionMeta,
    questions: deterministicQuestions,
    mode: "deterministic_local_engine"
  };
}
