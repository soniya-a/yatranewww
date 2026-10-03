// Interview Question Generation Types
// Phase: Interview Engine - YATRA platform

export type QuestionCategory =
  | 'Technical'
  | 'RoleSpecific'
  | 'ResumeSpecific'
  | 'Behavioral'
  | 'SkillGap';

export interface InterviewQuestion {
  id: string;
  category: QuestionCategory;
  question: string;
  testsSkill: string;           // what competency this actually tests
  expectedDepth: 'junior' | 'mid' | 'senior';
  followUpHints?: string[];     // for adaptive follow-ups in a later phase
  source: 'llm' | 'fallback';
}

export interface QuestionGenerationInput {
  resumeProfile: {
    domain: string;             // e.g. "Mechanical", "EEE", "Civil", "Software"
    skills: string[];
    projects: string[];
    experienceYears?: number;
  };
  matchedJob: {
    title: string;
    company: string;
    description: string;
    requiredSkills: string[];
    missingSkills: string[];
  };
}

export interface QuestionGenerationResult {
  questions: InterviewQuestion[];
  groundedSkills: string[];     // ESCO-verified skill labels used for grounding
  provider: 'gemini' | 'fallback';
  warnings: string[];
}
