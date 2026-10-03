// Prompt Templates for Interview Question Generation
// These prompts are the primary quality lever. Do not shorten or paraphrase.

import type { QuestionGenerationInput } from '../types/interview';

/**
 * System prompt: establishes the hiring manager persona and non-negotiable rules.
 */
export function buildSystemPrompt(): string {
  return `You are a senior hiring manager at a top-tier company conducting a real interview.

RULES - NON-NEGOTIABLE:
1. Every question MUST reference a SPECIFIC skill, project, or experience from the candidate's resume OR a specific requirement from the job description.
2. NEVER ask generic questions like "Tell me about yourself" or "What are your strengths?" or "Where do you see yourself in 5 years?"
3. If the candidate is from a NON-SOFTWARE domain (Mechanical, Civil, EEE, Chemical, Aerospace, etc.), DO NOT ask software engineering questions (algorithms, system design, coding, etc.).
4. Ask about the actual tools, methods, simulation techniques, standards, and domain-specific problems relevant to that engineering discipline.
5. Each question must have a clear purpose - what competency it tests.
6. The "Behavioral" question must still be grounded in this specific role's context, not generic.
7. The "SkillGap" question must acknowledge the candidate does not have the skill yet, and test their learning approach or closest transferable knowledge.
8. Return ONLY valid JSON. No markdown. No preamble. No explanation outside the JSON array. No trailing commas.

You will output a JSON array of exactly 5 question objects.`;
}

/**
 * User prompt: injects all candidate and job context plus grounded ESCO skills.
 */
export function buildUserPrompt(input: QuestionGenerationInput, groundedSkills: string[]): string {
  const { resumeProfile, matchedJob } = input;

  return `
CANDIDATE PROFILE:
- Domain: ${resumeProfile.domain}
- Core Skills: ${resumeProfile.skills.join(', ') || 'Not specified'}
- Projects: ${resumeProfile.projects.join(' | ') || 'Not specified'}
- Experience: ${resumeProfile.experienceYears !== undefined ? `${resumeProfile.experienceYears} years` : 'Entry level / Fresh graduate'}

TARGET JOB:
- Title: ${matchedJob.title}
- Company: ${matchedJob.company}
- Required Skills: ${matchedJob.requiredSkills.join(', ') || 'Not specified'}
- Missing Skills (candidate gaps): ${matchedJob.missingSkills.join(', ') || 'None identified'}
- Job Description Excerpt:
${matchedJob.description.slice(0, 1200)}

VERIFIED ESCO SKILLS (factual grounding - use these exact labels where possible):
${groundedSkills.join(', ') || 'Using raw skills from profile'}

Generate exactly 5 questions - one from each category below:
1. Technical      - A deep dive on a specific skill or tool listed in ESCO skills or candidate profile
2. RoleSpecific   - Tied directly to a specific responsibility or requirement in the job description
3. ResumeSpecific - About a specific project listed on the candidate's resume; name the project
4. Behavioral     - A "tell me about a time..." scenario grounded in this role's actual challenges
5. SkillGap       - About one missing skill; test the candidate's learning approach or nearest transferable experience

OUTPUT FORMAT - strict JSON array, no other text:
[
  {
    "category": "Technical",
    "question": "...",
    "testsSkill": "...",
    "expectedDepth": "junior",
    "followUpHints": ["...", "..."]
  },
  {
    "category": "RoleSpecific",
    "question": "...",
    "testsSkill": "...",
    "expectedDepth": "junior",
    "followUpHints": ["...", "..."]
  },
  {
    "category": "ResumeSpecific",
    "question": "...",
    "testsSkill": "...",
    "expectedDepth": "junior",
    "followUpHints": ["...", "..."]
  },
  {
    "category": "Behavioral",
    "question": "...",
    "testsSkill": "...",
    "expectedDepth": "junior",
    "followUpHints": ["...", "..."]
  },
  {
    "category": "SkillGap",
    "question": "...",
    "testsSkill": "...",
    "expectedDepth": "junior",
    "followUpHints": ["...", "..."]
  }
]`;
}
