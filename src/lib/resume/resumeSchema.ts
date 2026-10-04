import { z } from "zod";

/**
 * Strict Resume Intelligence Zod Schema Contract
 * 
 * Rules:
 * 1. Never hallucinate or invent data.
 * 2. If a field cannot be reliably extracted, value must be null (or empty array for lists).
 * 3. Evidence strings must be exact or near-exact substrings from the source document.
 */

export const ProfileHeaderSchema = z.object({
  name: z.string().nullable().default(null),
  headline: z.string().nullable().default(null),
  location: z.string().nullable().default(null),
  email: z.string().nullable().default(null),
  phone: z.string().nullable().default(null),
  linkedin: z.string().nullable().default(null),
  github: z.string().nullable().default(null),
  portfolio: z.string().nullable().default(null),
});

export const ExtractedSkillSchema = z.object({
  name: z.string(),
  category: z.string().nullable().default(null),
  evidence: z.string().nullable().default(null),
  confidence: z.number().min(0).max(1).nullable().default(null),
});

export const ExtractedExperienceSchema = z.object({
  job_title: z.string(),
  company: z.string(),
  location: z.string().nullable().default(null),
  start_date: z.string().nullable().default(null),
  end_date: z.string().nullable().default(null),
  description: z.string().nullable().default(null),
  technologies: z.array(z.string()).default([]),
  evidence: z.string().nullable().default(null),
});

export const ExtractedEducationSchema = z.object({
  degree: z.string(),
  field: z.string().nullable().default(null),
  institution: z.string(),
  start_date: z.string().nullable().default(null),
  end_date: z.string().nullable().default(null),
  grade: z.string().nullable().default(null),
});

export const ExtractedProjectSchema = z.object({
  name: z.string(),
  description: z.string().nullable().default(null),
  technologies: z.array(z.string()).default([]),
  links: z.string().nullable().default(null),
  evidence: z.string().nullable().default(null),
});

export const ExtractedCertificationSchema = z.object({
  name: z.string(),
  issuer: z.string().nullable().default(null),
  date: z.string().nullable().default(null),
});

export const ExtractedAchievementSchema = z.object({
  title: z.string(),
  description: z.string().nullable().default(null),
});

export const ResumeIntelligenceSchema = z.object({
  profile: ProfileHeaderSchema,
  skills: z.array(ExtractedSkillSchema).default([]),
  experience: z.array(ExtractedExperienceSchema).default([]),
  education: z.array(ExtractedEducationSchema).default([]),
  projects: z.array(ExtractedProjectSchema).default([]),
  certifications: z.array(ExtractedCertificationSchema).default([]),
  achievements: z.array(ExtractedAchievementSchema).default([]),
  extraction_metadata: z.object({
    parser: z.string(),
    page_count: z.number().default(1),
    char_count: z.number().default(0),
    is_scanned: z.boolean().default(false),
    used_ocr: z.boolean().default(false),
    raw_snippet: z.string().nullable().default(null),
  }).optional(),
});

export type ProfileHeader = z.infer<typeof ProfileHeaderSchema>;
export type ExtractedSkill = z.infer<typeof ExtractedSkillSchema>;
export type ExtractedExperience = z.infer<typeof ExtractedExperienceSchema>;
export type ExtractedEducation = z.infer<typeof ExtractedEducationSchema>;
export type ExtractedProject = z.infer<typeof ExtractedProjectSchema>;
export type ExtractedCertification = z.infer<typeof ExtractedCertificationSchema>;
export type ExtractedAchievement = z.infer<typeof ExtractedAchievementSchema>;
export type ResumeIntelligenceData = z.infer<typeof ResumeIntelligenceSchema>;
