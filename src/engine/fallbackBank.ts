// Deterministic Fallback Question Bank
// This is the safety net. When Gemini is unavailable (rate-limited, quota exceeded, etc.),
// this module guarantees 5 high-quality, domain-specific questions are always returned.
// Write REAL questions - this is not a placeholder. This IS the product when LLM fails.

import type { InterviewQuestion, QuestionGenerationInput } from '../types/interview';

type DomainBank = (input: QuestionGenerationInput) => InterviewQuestion[];

const DOMAIN_BANK: Record<string, DomainBank> = {

  // ──────────────────────────── MECHANICAL ────────────────────────────
  Mechanical: (input) => [
    {
      id: 'fb-mech-1',
      category: 'Technical',
      question: `Walk me through how you would perform a thermal or structural FEA analysis on ${input.resumeProfile.projects[0] ?? 'a mechanical component'}. What boundary conditions would you define, and how would you validate that the mesh is adequate?`,
      testsSkill: 'FEA / Simulation methodology',
      expectedDepth: 'mid',
      followUpHints: [
        'Ask about mesh convergence studies',
        'Ask how they choose between linear and non-linear analysis',
      ],
      source: 'fallback',
    },
    {
      id: 'fb-mech-2',
      category: 'RoleSpecific',
      question: `In the ${input.matchedJob.title} role at ${input.matchedJob.company}, tolerance stack-up issues can halt production. Walk me through your process for analysing a tolerance chain in an assembly and deciding whether to tighten tolerances or redesign the interface.`,
      testsSkill: 'GD&T / Tolerance Analysis',
      expectedDepth: 'mid',
      followUpHints: [
        'Ask whether they use worst-case or statistical (RSS) tolerance analysis',
        'Ask about their experience with measurement reports (CMM data)',
      ],
      source: 'fallback',
    },
    {
      id: 'fb-mech-3',
      category: 'ResumeSpecific',
      question: `You listed ${input.resumeProfile.projects[0] ?? 'a design project'} on your resume. What was the most challenging design decision you had to make, and what engineering trade-offs did you weigh — for example between weight, cost, strength, or manufacturability?`,
      testsSkill: 'Engineering design judgment',
      expectedDepth: 'junior',
      followUpHints: [
        'Ask what alternative designs were considered',
        'Ask how the final design was validated or tested',
      ],
      source: 'fallback',
    },
    {
      id: 'fb-mech-4',
      category: 'Behavioral',
      question: `Tell me about a time you caught a design error — whether in a peer's CAD model, a calculation, or a specification — before it reached manufacturing. How did you identify it, and what steps did you take to resolve it without disrupting the timeline?`,
      testsSkill: 'Attention to detail / Quality mindset',
      expectedDepth: 'junior',
      followUpHints: [
        'Ask about the downstream impact if it had not been caught',
        'Ask whether any process was changed afterwards to prevent recurrence',
      ],
      source: 'fallback',
    },
    {
      id: 'fb-mech-5',
      category: 'SkillGap',
      question: `${input.matchedJob.missingSkills[0] ?? 'Advanced FEA'} is listed as a requirement for this role and is not yet in your experience. What resources or projects would you use to close that gap in your first 90 days, and what is the closest skill you have right now that would transfer?`,
      testsSkill: 'Learning agility / Self-development',
      expectedDepth: 'junior',
      followUpHints: [
        'Ask if they have already started any self-study',
        'Ask about how they learned their strongest current skill',
      ],
      source: 'fallback',
    },
  ],

  // ──────────────────────────── CIVIL ────────────────────────────
  Civil: (input) => [
    {
      id: 'fb-civil-1',
      category: 'Technical',
      question: `Explain how you would design a reinforced concrete beam for a simply supported span under combined dead and live loading. Walk through the load combination, moment calculation, reinforcement sizing, and any checks you would perform for deflection and shear.`,
      testsSkill: 'Structural design / IS 456 or equivalent code',
      expectedDepth: 'mid',
      followUpHints: [
        'Ask how they handle crack width checks',
        'Ask about the difference between working stress and limit state design',
      ],
      source: 'fallback',
    },
    {
      id: 'fb-civil-2',
      category: 'RoleSpecific',
      question: `In a ${input.matchedJob.title} position, you will be responsible for site quality control. How would you ensure concrete mix design compliance on a live site where the batch plant is 30 km away and slump tests are failing at pour?`,
      testsSkill: 'Site QA/QC / Construction management',
      expectedDepth: 'mid',
      followUpHints: [
        'Ask about water-cement ratio control',
        'Ask what documentation they would produce',
      ],
      source: 'fallback',
    },
    {
      id: 'fb-civil-3',
      category: 'ResumeSpecific',
      question: `You mentioned ${input.resumeProfile.projects[0] ?? 'a civil engineering project'} in your resume. What was the geotechnical challenge involved, if any, and how did the soil investigation data influence your foundation design or construction methodology?`,
      testsSkill: 'Geotechnical / Foundation engineering',
      expectedDepth: 'junior',
      followUpHints: [
        'Ask about the bearing capacity calculations used',
        'Ask about any settlement concerns',
      ],
      source: 'fallback',
    },
    {
      id: 'fb-civil-4',
      category: 'Behavioral',
      question: `Tell me about a situation where your project faced a significant schedule or cost overrun risk. What actions did you take, who did you involve, and what was the outcome?`,
      testsSkill: 'Project management / Risk handling',
      expectedDepth: 'junior',
      followUpHints: [
        'Ask what early warning signs they noticed',
        'Ask whether they would do anything differently',
      ],
      source: 'fallback',
    },
    {
      id: 'fb-civil-5',
      category: 'SkillGap',
      question: `${input.matchedJob.missingSkills[0] ?? 'STAAD.Pro or similar structural analysis software'} is required for this role. While you may not have direct experience, describe a problem where you used any structural analysis tool or hand calculation to arrive at a design decision, and how you would approach learning the required software.`,
      testsSkill: 'Structural software / Learning transfer',
      expectedDepth: 'junior',
      followUpHints: [
        'Ask about online resources or certifications they have explored',
        'Ask what structural concepts they are confident in regardless of software',
      ],
      source: 'fallback',
    },
  ],

  // ──────────────────────────── EEE ────────────────────────────
  EEE: (input) => [
    {
      id: 'fb-eee-1',
      category: 'Technical',
      question: `${input.resumeProfile.skills.includes('PLC') || input.resumeProfile.skills.some(s => s.toLowerCase().includes('plc')) ? 'You listed PLC programming in your profile.' : 'In an industrial control context,'} walk me through how you would design a motor control circuit — from the power stage to the PLC ladder logic — including overload protection, emergency stop logic, and interlocking.`,
      testsSkill: 'Industrial control / PLC programming',
      expectedDepth: 'mid',
      followUpHints: [
        'Ask about IEC 61508 or safety integrity levels if relevant',
        'Ask about their experience with SCADA or HMI integration',
      ],
      source: 'fallback',
    },
    {
      id: 'fb-eee-2',
      category: 'RoleSpecific',
      question: `The ${input.matchedJob.title} role at ${input.matchedJob.company} involves electrical system commissioning. Describe your systematic approach to commissioning a new LV switchgear panel — what tests you perform, in what sequence, and how you verify insulation integrity and protection relay settings.`,
      testsSkill: 'Commissioning / Electrical testing',
      expectedDepth: 'mid',
      followUpHints: [
        'Ask about IR testing, loop impedance, and earth fault loop tests',
        'Ask about relevant standards (IEC 60364, BS 7671, etc.)',
      ],
      source: 'fallback',
    },
    {
      id: 'fb-eee-3',
      category: 'ResumeSpecific',
      question: `You mentioned ${input.resumeProfile.projects[0] ?? 'an electronics or power project'} on your resume. What was the most significant electrical fault or unexpected result you encountered during testing, and how did you diagnose and resolve it?`,
      testsSkill: 'Fault diagnosis / Electrical troubleshooting',
      expectedDepth: 'junior',
      followUpHints: [
        'Ask about the instruments used (oscilloscope, multimeter, thermal camera)',
        'Ask what root cause was identified',
      ],
      source: 'fallback',
    },
    {
      id: 'fb-eee-4',
      category: 'Behavioral',
      question: `Tell me about a time you had to explain a complex electrical concept — a relay coordination scheme, a power factor correction need, or a harmonic distortion issue — to a non-technical stakeholder. How did you communicate it, and how did they respond?`,
      testsSkill: 'Technical communication',
      expectedDepth: 'junior',
      followUpHints: [
        'Ask about the outcome of that conversation',
        'Ask whether the stakeholder changed any decision as a result',
      ],
      source: 'fallback',
    },
    {
      id: 'fb-eee-5',
      category: 'SkillGap',
      question: `${input.matchedJob.missingSkills[0] ?? 'Power systems analysis (load flow, short circuit)'} is listed as a gap in your profile. What is the closest area of electrical engineering you have worked in, and how would you structure your first 60 days to build competency in the required area?`,
      testsSkill: 'Learning agility / Electrical domain breadth',
      expectedDepth: 'junior',
      followUpHints: [
        'Ask whether they have used any simulation tools (ETAP, DIgSILENT, MATLAB)',
        'Ask what courses or references they would prioritise',
      ],
      source: 'fallback',
    },
  ],

  // ──────────────────────────── SOFTWARE ────────────────────────────
  Software: (input) => [
    {
      id: 'fb-sw-1',
      category: 'Technical',
      question: `You listed ${input.resumeProfile.skills[0] ?? 'a programming language or framework'} as a core skill. Describe how you would design a rate-limiting layer for a public REST API. Walk through the algorithm choice, data structure, distributed considerations, and edge cases.`,
      testsSkill: 'System design / API design',
      expectedDepth: 'mid',
      followUpHints: [
        'Ask about token bucket vs leaky bucket vs fixed window',
        'Ask how they would handle Redis failover',
      ],
      source: 'fallback',
    },
    {
      id: 'fb-sw-2',
      category: 'RoleSpecific',
      question: `The ${input.matchedJob.title} position at ${input.matchedJob.company} involves working with ${input.matchedJob.requiredSkills[0] ?? 'backend systems'}. Walk me through how you would debug a production performance regression that appeared after a deployment — what tools you would use, what you would look at first, and how you would communicate progress.`,
      testsSkill: 'Production debugging / Observability',
      expectedDepth: 'mid',
      followUpHints: [
        'Ask about APM tools they have used (Datadog, New Relic, etc.)',
        'Ask how they would roll back safely if needed',
      ],
      source: 'fallback',
    },
    {
      id: 'fb-sw-3',
      category: 'ResumeSpecific',
      question: `Looking at ${input.resumeProfile.projects[0] ?? 'your main project'} on your resume — what was the hardest technical decision in that project? Why did you make that choice over the alternatives, and what would you do differently now?`,
      testsSkill: 'Architecture decision-making / Reflection',
      expectedDepth: 'junior',
      followUpHints: [
        'Ask about what alternatives were considered',
        'Ask about specific pain points that emerged from the decision made',
      ],
      source: 'fallback',
    },
    {
      id: 'fb-sw-4',
      category: 'Behavioral',
      question: `Tell me about a time you had a technical disagreement with a teammate or senior engineer about implementation approach. How did you handle it, what did you learn, and what was the final outcome?`,
      testsSkill: 'Collaboration / Technical influence',
      expectedDepth: 'junior',
      followUpHints: [
        'Ask whether they changed their mind or convinced the other person',
        'Ask about how the team relationship was affected',
      ],
      source: 'fallback',
    },
    {
      id: 'fb-sw-5',
      category: 'SkillGap',
      question: `${input.matchedJob.missingSkills[0] ?? 'Kubernetes or container orchestration'} is listed as a gap. You may not have production experience with it yet — what do you already understand about containers and orchestration, and how would you structure your learning to get productive in that area within 30 days?`,
      testsSkill: 'Learning strategy / DevOps fundamentals',
      expectedDepth: 'junior',
      followUpHints: [
        'Ask what projects or labs they have done outside of formal experience',
        'Ask how they have learned a new technology quickly in the past',
      ],
      source: 'fallback',
    },
  ],

};

/**
 * Returns 5 domain-specific fallback questions for the given input.
 * Falls back to Software bank if domain is unrecognised.
 * NEVER returns fewer than 5 questions.
 */
export function getFallbackQuestions(input: QuestionGenerationInput): InterviewQuestion[] {
  const domain = input.resumeProfile.domain ?? 'Software';
  const bank = DOMAIN_BANK[domain] ?? DOMAIN_BANK['Software'];
  return bank(input);
}
