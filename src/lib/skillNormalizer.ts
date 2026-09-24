import { supabase, isSupabaseConfigured } from './supabase';

export type NormalizationMethod = "alias" | "exact" | "normalized_exact" | "unmatched";

export interface SkillDiagnostic {
  raw: string;
  canonical: string | null;
  method: NormalizationMethod;
  matchedSource?: "known_alias" | "canonical_skills" | "esco_skills";
}

export interface NormalizationResult {
  normalizedSkills: string[];
  unmatchedSkills: string[];
  normalizationDiagnostics: SkillDiagnostic[];
  stats: {
    rawCount: number;
    normalizedCount: number;
    unmatchedCount: number;
    duplicatesRemovedCount: number;
  };
}

/**
 * Deterministic Industry Engineering Aliases
 * Strictly bounded: converts known synonyms to their standard canonical display name.
 * NEVER makes semantic leaps (e.g. "cloud" does NOT become "AWS", "database" does NOT become "PostgreSQL").
 */
export const KNOWN_TECH_ALIASES: Record<string, string> = {
  // Programming Languages
  "golang": "Go",
  "go lang": "Go",
  "go language": "Go",
  "go": "Go",
  "python": "Python",
  "python3": "Python",
  "python 3": "Python",
  "py": "Python",
  "typescript": "TypeScript",
  "ts": "TypeScript",
  "javascript": "JavaScript",
  "js": "JavaScript",
  "java": "Java",
  "c++": "C++",
  "cpp": "C++",
  "c plus plus": "C++",
  "c#": "C#",
  "c sharp": "C#",
  "csharp": "C#",
  "sql": "SQL",
  "structured query language": "SQL",
  "rust": "Rust",
  "ruby": "Ruby",
  "php": "PHP",
  "kotlin": "Kotlin",
  "swift": "Swift",
  "dart": "Dart",
  "scala": "Scala",

  // Databases & Caching & Streaming
  "postgres": "PostgreSQL",
  "postgresql": "PostgreSQL",
  "postgre": "PostgreSQL",
  "redis": "Redis",
  "kafka": "Kafka",
  "apache kafka": "Kafka",
  "mysql": "MySQL",
  "mongodb": "MongoDB",
  "mongo": "MongoDB",
  "sqlite": "SQLite",
  "cassandra": "Apache Cassandra",
  "elasticsearch": "Elasticsearch",

  // Cloud Providers, Services & Containers
  "k8s": "Kubernetes",
  "kubernetes": "Kubernetes",
  "docker": "Docker",
  "docker containerization": "Docker",
  "terraform": "Terraform",
  "ci/cd": "CI/CD",
  "ci cd": "CI/CD",
  "cicd": "CI/CD",
  "continuous integration": "CI/CD",
  "continuous deployment": "CI/CD",
  "continuous integration and deployment": "CI/CD",
  "continuous integration & continuous deployment": "CI/CD",
  "github actions": "GitHub Actions",
  "github action": "GitHub Actions",
  "aws": "AWS",
  "amazon web services": "AWS",
  "ec2": "Amazon EC2",
  "aws ec2": "Amazon EC2",
  "amazon ec2": "Amazon EC2",
  "s3": "Amazon S3",
  "aws s3": "Amazon S3",
  "amazon s3": "Amazon S3",
  "lambda": "AWS Lambda",
  "aws lambda": "AWS Lambda",
  "eks": "Amazon EKS",
  "aws eks": "Amazon EKS",
  "amazon eks": "Amazon EKS",
  "gcp": "Google Cloud Platform",
  "google cloud": "Google Cloud Platform",
  "azure": "Microsoft Azure",

  // Frameworks & Libraries
  "react": "React",
  "reactjs": "React",
  "react.js": "React",
  "react native": "React Native",
  "nextjs": "Next.js",
  "next.js": "Next.js",
  "nodejs": "Node.js",
  "node.js": "Node.js",
  "node js": "Node.js",
  "express": "Express",
  "expressjs": "Express",
  "express.js": "Express",
  "fastapi": "FastAPI",
  "fast api": "FastAPI",
  "spring boot": "Spring Boot",
  "springboot": "Spring Boot",
  "spring": "Spring Boot",
  "tailwind css": "Tailwind CSS",
  "tailwind": "Tailwind CSS",
  "tailwindcss": "Tailwind CSS",
  "pytorch": "PyTorch",
  "torch": "PyTorch",
  "tensorflow": "TensorFlow",
  "vue": "Vue.js",
  "vuejs": "Vue.js",
  "vue.js": "Vue.js",
  "angular": "Angular",
  "angularjs": "Angular",
  "django": "Django",
  "flask": "Flask",
  "graphql": "GraphQL",

  // Networking, Protocols & Architecture
  "grpc": "gRPC",
  "rest": "RESTful APIs",
  "restful api": "RESTful APIs",
  "restful apis": "RESTful APIs",
  "rest api": "RESTful APIs",
  "rest apis": "RESTful APIs",
  "distributed systems": "Distributed Systems",
  "distributed computing": "Distributed Systems",
  "system design": "System Design",
  "microservices": "Microservices",
  "microservice": "Microservices",
  "microservice architecture": "Microservices",
  "microservices architecture": "Microservices",
  "data structures & algorithms": "Data Structures & Algorithms",
  "data structures and algorithms": "Data Structures & Algorithms",
  "data structures": "Data Structures & Algorithms",
  "algorithms": "Data Structures & Algorithms",
  "dsa": "Data Structures & Algorithms",
  "object-oriented design": "Object-Oriented Design",
  "object oriented design": "Object-Oriented Design",
  "object-oriented programming": "Object-Oriented Programming",
  "object oriented programming": "Object-Oriented Programming",
  "oop": "Object-Oriented Programming",
  "ood": "Object-Oriented Design",
  "jwt": "JWT",
  "json web token": "JWT",
  "gemini api": "Gemini API"
};

/**
 * Punctuation and whitespace normalization helper for canonical comparison
 */
export function normalizeKey(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[._\-]/g, ' ')
    .replace(/\s+/g, ' ');
}

// In-memory cache for Supabase canonical taxonomy
let isTaxonomyLoaded = false;
const canonicalSkillsExact = new Map<string, string>(); // lowercase -> canonical display name
const canonicalSkillsNormalized = new Map<string, string>(); // normalizedKey -> canonical display name

/**
 * Loads canonical skills taxonomy from Supabase into memory cache.
 */
export async function loadCanonicalTaxonomy(): Promise<void> {
  if (isTaxonomyLoaded || !isSupabaseConfigured) return;

  try {
    const { data, error } = await supabase
      .from('canonical_skills')
      .select('preferred_name');

    if (!error && data) {
      for (const row of data) {
        if (row.preferred_name && typeof row.preferred_name === 'string') {
          const display = row.preferred_name.trim();
          canonicalSkillsExact.set(display.toLowerCase(), display);
          canonicalSkillsNormalized.set(normalizeKey(display), display);
        }
      }
      isTaxonomyLoaded = true;
    }
  } catch (err) {
    console.error("[SkillNormalizer] Failed to load canonical skills taxonomy:", err);
  }
}

/**
 * Normalizes an individual skill deterministically.
 * Returns provenance diagnostic including canonical name and method.
 */
export async function normalizeSkill(rawSkill: string): Promise<SkillDiagnostic> {
  if (!rawSkill || typeof rawSkill !== 'string') {
    return { raw: String(rawSkill ?? ''), canonical: null, method: "unmatched" };
  }

  const trimmed = rawSkill.trim();
  if (trimmed.length === 0) {
    return { raw: rawSkill, canonical: null, method: "unmatched" };
  }

  const lower = trimmed.toLowerCase();
  const normalized = normalizeKey(trimmed);

  // Ensure canonical taxonomy is loaded
  if (!isTaxonomyLoaded && isSupabaseConfigured) {
    await loadCanonicalTaxonomy();
  }

  // 1. Check Known Safe Tech Aliases
  if (KNOWN_TECH_ALIASES[lower]) {
    const canonical = KNOWN_TECH_ALIASES[lower];
    let method: NormalizationMethod = "alias";
    if (trimmed === canonical) {
      method = "exact";
    } else if (lower === canonical.toLowerCase()) {
      method = "normalized_exact";
    }
    return { raw: rawSkill, canonical, method, matchedSource: "known_alias" };
  }

  if (KNOWN_TECH_ALIASES[normalized]) {
    const canonical = KNOWN_TECH_ALIASES[normalized];
    let method: NormalizationMethod = "alias";
    if (trimmed === canonical) {
      method = "exact";
    } else if (lower === canonical.toLowerCase()) {
      method = "normalized_exact";
    }
    return { raw: rawSkill, canonical, method, matchedSource: "known_alias" };
  }

  // 2. Check Supabase canonical_skills taxonomy
  if (canonicalSkillsExact.has(lower)) {
    const canonical = canonicalSkillsExact.get(lower)!;
    const method: NormalizationMethod = trimmed === canonical ? "exact" : "normalized_exact";
    return { raw: rawSkill, canonical, method, matchedSource: "canonical_skills" };
  }

  if (canonicalSkillsNormalized.has(normalized)) {
    const canonical = canonicalSkillsNormalized.get(normalized)!;
    return { raw: rawSkill, canonical, method: "normalized_exact", matchedSource: "canonical_skills" };
  }

  // 3. Check Supabase public.esco_skills table (exact case-insensitive match)
  if (isSupabaseConfigured) {
    try {
      const { data: escoMatch } = await supabase
        .from('esco_skills')
        .select('preferred_label')
        .ilike('preferred_label', trimmed)
        .limit(1);

      if (escoMatch && escoMatch.length > 0 && escoMatch[0].preferred_label) {
        const canonical = escoMatch[0].preferred_label.trim();
        const method: NormalizationMethod = trimmed === canonical ? "exact" : "normalized_exact";
        return { raw: rawSkill, canonical, method, matchedSource: "esco_skills" };
      }
    } catch {
      // Non-fatal, proceed to unmatched
    }
  }

  // 4. Unknown / Insufficient Confidence: NEVER fabricate or force broad semantic leap
  return { raw: rawSkill, canonical: null, method: "unmatched" };
}

/**
 * Normalizes an array of raw skills deterministically.
 * Deduplicates canonical representations while preserving all diagnostics and unmatched skills.
 */
export async function normalizeSkills(rawSkills: string[]): Promise<NormalizationResult> {
  const normalizedSkills: string[] = [];
  const unmatchedSkills: string[] = [];
  const normalizationDiagnostics: SkillDiagnostic[] = [];

  const seenCanonical = new Set<string>();
  const seenUnmatched = new Set<string>();
  let duplicatesRemovedCount = 0;

  for (const raw of rawSkills) {
    const diagnostic = await normalizeSkill(raw);
    normalizationDiagnostics.push(diagnostic);

    if (diagnostic.canonical) {
      const canonicalKey = diagnostic.canonical.toLowerCase();
      if (!seenCanonical.has(canonicalKey)) {
        seenCanonical.add(canonicalKey);
        normalizedSkills.push(diagnostic.canonical);
      } else {
        duplicatesRemovedCount++;
      }
    } else {
      const unmatchedKey = raw.trim().toLowerCase();
      if (!seenUnmatched.has(unmatchedKey)) {
        seenUnmatched.add(unmatchedKey);
        unmatchedSkills.push(raw.trim());
      } else {
        duplicatesRemovedCount++;
      }
    }
  }

  return {
    normalizedSkills,
    unmatchedSkills,
    normalizationDiagnostics,
    stats: {
      rawCount: rawSkills.length,
      normalizedCount: normalizedSkills.length,
      unmatchedCount: unmatchedSkills.length,
      duplicatesRemovedCount
    }
  };
}
