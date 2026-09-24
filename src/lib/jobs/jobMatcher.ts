/**
 * DETERMINISTIC LIVE JOB MATCHING & COMPATIBILITY ENGINE
 * 
 * Binds Candidate Profile (verified skills, target roles, engineering domain, experience)
 * to live job postings (Adzuna / real listings).
 * 
 * Principles:
 * - 100% deterministic (ZERO AI / Gemini / random calls).
 * - Multi-domain dictionary normalization (Mechanical, Civil, Software, AI/ML, Electrical, Data).
 * - Word-boundary regex matching prevents false-positive token overlaps.
 * - Does NOT fabricate missing skills if job description does not specify requirements.
 * - Raw, calibrated calculation without artificial score clamping.
 * - Transparent 50/35/15 weighting:
 *     - Skill Match: 50%
 *     - Role Match: 35%
 *     - Experience Fit: 15%
 */

export interface CandidateProfile {
  skills: string[];
  targetRoles: string[];
  domain: string; // "mechanical" | "civil" | "software" | "aiml" | "electrical" | "data" | string
  experienceYears?: number;
}

export interface JobListing {
  title: string;
  description: string;
  category?: string;
  company?: string;
}

export type MatchTier = "Strong Match" | "Good Match" | "Partial Match" | "Low Match";

export interface JobMatchResult {
  skillScore: number;       // 0 - 100
  roleScore: number;        // 0 - 100
  experienceScore: number;  // 0 - 100
  overallScore: number;     // 0 - 100
  matchedSkills: string[];
  missingSkills: string[];
  rationale: string;
  matchTier: MatchTier;
  diagnostics: {
    extractedJobSkills: string[];
    statedExperienceRange?: { min: number; max?: number };
    domainAlignment: "aligned" | "adjacent" | "divergent";
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CANONICAL SKILL REGISTRY WITH MULTI-DOMAIN SYNONYMS & ALIASES
// ─────────────────────────────────────────────────────────────────────────────

interface CanonicalSkillDef {
  canonical: string;
  domain: "mechanical" | "civil" | "software" | "aiml" | "electrical" | "data" | "general";
  aliases: string[];
}

const CANONICAL_SKILL_REGISTRY: CanonicalSkillDef[] = [
  // ── MECHANICAL ENGINEERING ────────────────────────────────────────────────
  { canonical: "AutoCAD", domain: "mechanical", aliases: ["autocad", "auto cad", "acad"] },
  { canonical: "SolidWorks", domain: "mechanical", aliases: ["solidworks", "solid works", "dassault solidworks"] },
  { canonical: "CATIA", domain: "mechanical", aliases: ["catia", "catia v5", "catia v6"] },
  { canonical: "Creo", domain: "mechanical", aliases: ["creo", "creo parametric", "pro/engineer", "pro engineer", "pro-e"] },
  { canonical: "Inventor", domain: "mechanical", aliases: ["autodesk inventor", "inventor"] },
  { canonical: "ANSYS", domain: "mechanical", aliases: ["ansys", "ansys workbench", "ansys fluent", "ansys mechanical"] },
  { canonical: "FEA", domain: "mechanical", aliases: ["fea", "finite element analysis", "finite element method", "fem"] },
  { canonical: "CFD", domain: "mechanical", aliases: ["cfd", "computational fluid dynamics", "fluent"] },
  { canonical: "GD&T", domain: "mechanical", aliases: ["gd&t", "gdt", "geometric dimensioning and tolerancing", "geometric dimensioning & tolerancing", "geometric tolerancing"] },
  { canonical: "Thermodynamics", domain: "mechanical", aliases: ["thermodynamics", "thermal engineering", "heat transfer"] },
  { canonical: "Fluid Mechanics", domain: "mechanical", aliases: ["fluid mechanics", "hydraulics and pneumatics", "pneumatics", "hydraulics"] },
  { canonical: "HVAC", domain: "mechanical", aliases: ["hvac", "hvac design", "refrigeration and air conditioning", "air conditioning"] },
  { canonical: "CNC Machining", domain: "mechanical", aliases: ["cnc machining", "cnc programming", "cnc", "cam programming"] },
  { canonical: "CAM", domain: "mechanical", aliases: ["cam", "computer aided manufacturing", "mastercam"] },
  { canonical: "DFMA", domain: "mechanical", aliases: ["dfma", "design for manufacturing", "design for assembly", "dfm", "dfa"] },
  { canonical: "Six Sigma", domain: "mechanical", aliases: ["six sigma", "lean six sigma", "lean manufacturing", "kaizen", "5s"] },
  { canonical: "Mechatronics", domain: "mechanical", aliases: ["mechatronics", "robotics", "actuators", "servos"] },
  { canonical: "MATLAB", domain: "mechanical", aliases: ["matlab", "simulink"] },

  // ── CIVIL ENGINEERING ─────────────────────────────────────────────────────
  { canonical: "AutoCAD Civil 3D", domain: "civil", aliases: ["autocad civil 3d", "civil 3d", "civil-3d", "autocad civil"] },
  { canonical: "STAAD.Pro", domain: "civil", aliases: ["staad.pro", "staad pro", "staad-pro", "staad"] },
  { canonical: "ETABS", domain: "civil", aliases: ["etabs", "etab", "csi etabs"] },
  { canonical: "SAP2000", domain: "civil", aliases: ["sap2000", "sap 2000", "csi sap2000"] },
  { canonical: "Revit", domain: "civil", aliases: ["revit", "revit structure", "autodesk revit", "revit architecture"] },
  { canonical: "Primavera P6", domain: "civil", aliases: ["primavera p6", "primavera", "p6", "oracle primavera"] },
  { canonical: "MS Project", domain: "civil", aliases: ["ms project", "microsoft project", "msp"] },
  { canonical: "Structural Analysis", domain: "civil", aliases: ["structural analysis", "structural design", "structural engineering"] },
  { canonical: "RCC Design", domain: "civil", aliases: ["rcc design", "reinforced cement concrete", "rcc", "reinforced concrete"] },
  { canonical: "Steel Structure Design", domain: "civil", aliases: ["steel design", "steel structures", "steel structural design", "structural steel"] },
  { canonical: "Geotechnical Engineering", domain: "civil", aliases: ["geotechnical engineering", "soil mechanics", "foundation engineering", "geotech"] },
  { canonical: "Surveying", domain: "civil", aliases: ["surveying", "total station", "land surveying", "leveling", "gis", "arcgis"] },
  { canonical: "Concrete Technology", domain: "civil", aliases: ["concrete technology", "mix design", "quality of concrete"] },
  { canonical: "Highway Engineering", domain: "civil", aliases: ["highway engineering", "pavement design", "transportation engineering", "road design"] },
  { canonical: "Quantity Surveying", domain: "civil", aliases: ["quantity surveying", "estimation and costing", "estimation & costing", "boq preparation", "boq", "bar bending schedule", "bbs"] },
  { canonical: "Construction Management", domain: "civil", aliases: ["construction management", "site supervision", "site management", "site engineering"] },
  { canonical: "Building Codes", domain: "civil", aliases: ["is codes", "is 456", "is 800", "is 1893", "aci codes", "eurocode", "building codes", "nbc"] },

  // ── SOFTWARE / WEB DEVELOPMENT ────────────────────────────────────────────
  { canonical: "Python", domain: "software", aliases: ["python", "python3", "py"] },
  { canonical: "JavaScript", domain: "software", aliases: ["javascript", "es6", "ecmascript", "vanilla js"] },
  { canonical: "TypeScript", domain: "software", aliases: ["typescript", "ts"] },
  { canonical: "React", domain: "software", aliases: ["react", "react.js", "reactjs", "react native"] },
  { canonical: "Node.js", domain: "software", aliases: ["node.js", "nodejs", "node js", "node"] },
  { canonical: "Next.js", domain: "software", aliases: ["next.js", "nextjs", "next js"] },
  { canonical: "Angular", domain: "software", aliases: ["angular", "angularjs", "angular 2+"] },
  { canonical: "Vue.js", domain: "software", aliases: ["vue.js", "vuejs", "vue"] },
  { canonical: "Java", domain: "software", aliases: ["java", "core java", "j2ee"] },
  { canonical: "Spring Boot", domain: "software", aliases: ["spring boot", "springboot", "spring framework"] },
  { canonical: "C++", domain: "software", aliases: ["c++", "cpp", "c plus plus"] },
  { canonical: "C#", domain: "software", aliases: ["c#", "csharp", "c sharp", ".net", "dotnet", ".net core"] },
  { canonical: "Go", domain: "software", aliases: ["golang", "go language"] },
  { canonical: "Rust", domain: "software", aliases: ["rust", "rustlang"] },
  { canonical: "SQL", domain: "software", aliases: ["sql", "structured query language"] },
  { canonical: "PostgreSQL", domain: "software", aliases: ["postgresql", "postgres", "psql"] },
  { canonical: "MySQL", domain: "software", aliases: ["mysql"] },
  { canonical: "MongoDB", domain: "software", aliases: ["mongodb", "mongo"] },
  { canonical: "Redis", domain: "software", aliases: ["redis"] },
  { canonical: "Docker", domain: "software", aliases: ["docker", "docker containerization", "containers"] },
  { canonical: "Kubernetes", domain: "software", aliases: ["kubernetes", "k8s"] },
  { canonical: "AWS", domain: "software", aliases: ["aws", "amazon web services", "ec2", "s3", "lambda"] },
  { canonical: "Azure", domain: "software", aliases: ["azure", "microsoft azure"] },
  { canonical: "Google Cloud", domain: "software", aliases: ["gcp", "google cloud", "google cloud platform"] },
  { canonical: "Git", domain: "software", aliases: ["git", "github", "gitlab"] },
  { canonical: "REST APIs", domain: "software", aliases: ["rest apis", "rest api", "restful", "restful api", "restful apis"] },
  { canonical: "GraphQL", domain: "software", aliases: ["graphql"] },
  { canonical: "FastAPI", domain: "software", aliases: ["fastapi", "fast api"] },
  { canonical: "Django", domain: "software", aliases: ["django", "django rest framework"] },
  { canonical: "Flask", domain: "software", aliases: ["flask"] },
  { canonical: "CI/CD", domain: "software", aliases: ["ci/cd", "cicd", "ci cd", "continuous integration", "github actions"] },
  { canonical: "Microservices", domain: "software", aliases: ["microservices", "microservice architecture"] },
  { canonical: "Linux", domain: "software", aliases: ["linux", "unix", "bash", "shell scripting"] },

  // ── ARTIFICIAL INTELLIGENCE & MACHINE LEARNING ────────────────────────────
  { canonical: "Machine Learning", domain: "aiml", aliases: ["machine learning", "ml"] },
  { canonical: "Deep Learning", domain: "aiml", aliases: ["deep learning", "neural networks", "dl"] },
  { canonical: "PyTorch", domain: "aiml", aliases: ["pytorch", "torch"] },
  { canonical: "TensorFlow", domain: "aiml", aliases: ["tensorflow", "tf", "keras"] },
  { canonical: "Scikit-Learn", domain: "aiml", aliases: ["scikit-learn", "sklearn"] },
  { canonical: "Computer Vision", domain: "aiml", aliases: ["computer vision", "opencv", "object detection", "yolo"] },
  { canonical: "NLP", domain: "aiml", aliases: ["nlp", "natural language processing", "text processing"] },
  { canonical: "Large Language Models", domain: "aiml", aliases: ["large language models", "llm", "llms", "transformers", "hugging face", "langchain"] },

  // ── DATA SCIENCE & ENGINEERING ────────────────────────────────────────────
  { canonical: "Pandas", domain: "data", aliases: ["pandas"] },
  { canonical: "NumPy", domain: "data", aliases: ["numpy"] },
  { canonical: "Tableau", domain: "data", aliases: ["tableau"] },
  { canonical: "Power BI", domain: "data", aliases: ["power bi", "powerbi"] },
  { canonical: "Apache Spark", domain: "data", aliases: ["apache spark", "spark", "pyspark"] },
  { canonical: "ETL Pipelines", domain: "data", aliases: ["etl", "etl pipelines", "data pipelines", "data warehousing"] },

  // ── ELECTRICAL & EMBEDDED ─────────────────────────────────────────────────
  { canonical: "Embedded Systems", domain: "electrical", aliases: ["embedded systems", "embedded c", "microcontrollers", "firmware"] },
  { canonical: "Arduino", domain: "electrical", aliases: ["arduino", "raspberry pi"] },
  { canonical: "PCB Design", domain: "electrical", aliases: ["pcb design", "altium", "altium designer", "kicad", "eagle"] },
  { canonical: "PLC Programming", domain: "electrical", aliases: ["plc", "plc programming", "scada", "plc automation", "industrial automation"] },
  { canonical: "VHDL / Verilog", domain: "electrical", aliases: ["vhdl", "verilog", "fpga", "vlsi"] }
];

// ─────────────────────────────────────────────────────────────────────────────
// FAST LOOKUP TABLES & NORMALIZATION UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

// Build reverse map: normalized alias -> canonical skill definition
const ALIAS_TO_DEF_MAP = new Map<string, CanonicalSkillDef>();

for (const def of CANONICAL_SKILL_REGISTRY) {
  // Map canonical name itself
  ALIAS_TO_DEF_MAP.set(normalizeKey(def.canonical), def);
  for (const alias of def.aliases) {
    ALIAS_TO_DEF_MAP.set(normalizeKey(alias), def);
  }
}

// Pre-sorted list of aliases by length descending for regex / string extraction
const SORTED_ALIASES = Array.from(ALIAS_TO_DEF_MAP.keys()).sort((a, b) => b.length - a.length);

/**
 * Standardize text key for lookup: lowercase, remove punctuation, collapse whitespace.
 */
export function normalizeKey(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[._\-]/g, " ")
    .replace(/[^a-z0-9#+& ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalizes an input skill name to its canonical string representation if known.
 * Falls back to trimmed original name.
 */
export function normalizeSkill(skill: string): string {
  const key = normalizeKey(skill);
  const def = ALIAS_TO_DEF_MAP.get(key);
  return def ? def.canonical : skill.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// DETERMINISTIC EXTRACTION: JOB SKILLS & EXPERIENCE REQUIREMENTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts explicitly referenced technical skills from a job posting's title and description.
 * Strictly avoids fabricating skills not present in the text.
 */
export function extractSkillsFromJobText(title: string, description: string): string[] {
  const combinedText = `${title || ""} ${description || ""}`;
  if (!combinedText.trim()) return [];

  let normText = ` ${normalizeKey(combinedText)} `;
  const extracted = new Set<string>();

  for (const alias of SORTED_ALIASES) {
    // Avoid single-letter false matches unless specifically intended (e.g. C / R)
    if (alias.length < 2 && !["c", "r"].includes(alias)) continue;

    // Use boundary pattern in normalized space
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`, "i");

    if (pattern.test(normText)) {
      const def = ALIAS_TO_DEF_MAP.get(alias);
      if (def) {
        extracted.add(def.canonical);
        // Mask matched keyword with equivalent whitespace so sub-tokens don't duplicate
        normText = normText.replace(new RegExp(`(\\s)${escaped}(\\s)`, "gi"), "$1" + " ".repeat(alias.length) + "$2");
      }
    }
  }

  return Array.from(extracted);
}

/**
 * Extracts stated years of experience from job text.
 * Returns { min: number, max?: number } or undefined if not disclosed.
 */
export function extractStatedExperience(text: string): { min: number; max?: number } | undefined {
  if (!text) return undefined;

  // Patterns like "3-5 years", "3 to 5 yrs", "2+ years", "minimum 4 years"
  const rangeMatch = text.match(/(\d+)\s*(?:-|to)\s*(\d+)\s*(?:years?|yrs?)/i);
  if (rangeMatch) {
    const min = parseInt(rangeMatch[1], 10);
    const max = parseInt(rangeMatch[2], 10);
    if (!isNaN(min) && !isNaN(max) && min <= 20) {
      return { min, max };
    }
  }

  const plusMatch = text.match(/(?:minimum\s+|at\s+least\s+)?(\d+)\+?\s*(?:years?|yrs?)(?:\s+(?:of\s+)?experience)?/i);
  if (plusMatch) {
    const min = parseInt(plusMatch[1], 10);
    if (!isNaN(min) && min <= 20) {
      return { min };
    }
  }

  // Common keywords for entry / junior / senior
  if (/\b(fresher|freshers|entry[-\s]level|trainee|intern|graduate\s+engineer)\b/i.test(text)) {
    return { min: 0, max: 1 };
  }
  if (/\b(senior|sr\.?|lead|principal)\b/i.test(text)) {
    return { min: 5 };
  }

  return undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN ALIGNMENT EVALUATION
// ─────────────────────────────────────────────────────────────────────────────

const DOMAIN_INDICATORS: Record<string, string[]> = {
  mechanical: [
    "mechanical", "cad", "cam", "cae", "hvac", "thermal", "automotive", "tool design",
    "piping", "fea", "solidworks", "ansys", "manufacturing", "machining", "aerospace"
  ],
  civil: [
    "civil", "structural", "site engineer", "construction", "geotechnical", "surveyor",
    "quantity surveyor", "billing engineer", "etabs", "staad", "infrastructure", "rcc"
  ],
  software: [
    "software", "developer", "full stack", "frontend", "backend", "web", "react", "node",
    "python", "java", "typescript", "devops", "cloud", "engineer", "programmer", "coding"
  ],
  aiml: [
    "machine learning", "ai", "artificial intelligence", "data scientist", "deep learning",
    "nlp", "computer vision", "mlops", "pytorch", "tensorflow"
  ],
  data: [
    "data analyst", "data engineer", "business analyst", "tableau", "power bi", "etl", "sql"
  ],
  electrical: [
    "electrical", "electronics", "embedded", "vlsi", "firmware", "pcb", "power systems",
    "instrumentation", "plc", "scada", "circuits"
  ]
};

/**
 * Determines primary engineering domain of a job listing.
 */
export function detectJobDomain(title: string, description: string, category: string = ""): string {
  const text = `${title} ${description} ${category}`.toLowerCase();
  const domainScores: Record<string, number> = {
    mechanical: 0,
    civil: 0,
    software: 0,
    aiml: 0,
    data: 0,
    electrical: 0
  };

  for (const [domain, keywords] of Object.entries(DOMAIN_INDICATORS)) {
    for (const kw of keywords) {
      // Title matches carry 3x weight
      if (title.toLowerCase().includes(kw)) {
        domainScores[domain] += 3;
      }
      if (text.includes(kw)) {
        domainScores[domain] += 1;
      }
    }
  }

  let topDomain = "software";
  let maxScore = -1;
  for (const [domain, score] of Object.entries(domainScores)) {
    if (score > maxScore && score > 0) {
      maxScore = score;
      topDomain = domain;
    }
  }

  return topDomain;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT SCORING CALCULATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates deterministic Skill Match Score (0 - 100).
 * 
 * Rules:
 * - Compares candidate normalized verified skills vs extracted job requirements.
 * - If job explicitly discloses requirements:
 *     overlapRatio = matchedSkills.length / extractedJobSkills.length
 * - If job description discloses NO requirements (short snippet):
 *     Does NOT penalize candidate with 0%; evaluates domain relevance of candidate skills.
 * - Never invents missing skills if the job text doesn't ask for them.
 */
function calculateSkillScore(
  candidateCanonicalSet: Set<string>,
  candidateSkills: string[],
  extractedJobSkills: string[],
  domainAlignment: "aligned" | "adjacent" | "divergent"
): { skillScore: number; matchedSkills: string[]; missingSkills: string[] } {
  // When job lists explicit requirements:
  if (extractedJobSkills.length > 0) {
    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];

    for (const req of extractedJobSkills) {
      if (candidateCanonicalSet.has(req)) {
        matchedSkills.push(req);
      } else {
        missingSkills.push(req);
      }
    }

    const overlapRatio = matchedSkills.length / extractedJobSkills.length;
    let score = Math.round(overlapRatio * 100);

    // If candidate has strong additional verified skills in the same domain, give a slight depth boost (up to 8%)
    if (domainAlignment === "aligned" && candidateSkills.length > extractedJobSkills.length && matchedSkills.length > 0) {
      const extraBreadth = Math.min(8, (candidateSkills.length - matchedSkills.length) * 1.5);
      score = Math.min(100, Math.round(score + extraBreadth));
    }

    return {
      skillScore: Math.max(0, Math.min(100, score)),
      matchedSkills,
      missingSkills
    };
  }

  // When job description has NO explicit technical skills disclosed (generic/short snippet):
  // Rule 3: Do not count a skill as missing if the job description does not provide enough information.
  if (domainAlignment === "aligned") {
    // Candidate has verified skills matching the job's domain, but job snippet lacks specifics
    const score = candidateSkills.length >= 5 ? 78 : candidateSkills.length >= 2 ? 68 : 55;
    return {
      skillScore: score,
      matchedSkills: candidateSkills.slice(0, 3), // Show candidate's primary domain skills as relevant
      missingSkills: [] // No requirements disclosed -> NO invented missing skills
    };
  } else if (domainAlignment === "adjacent") {
    return {
      skillScore: 45,
      matchedSkills: [],
      missingSkills: []
    };
  } else {
    // Divergent domain (e.g. Mechanical candidate for a Software vacancy without skill list)
    return {
      skillScore: 15,
      matchedSkills: [],
      missingSkills: []
    };
  }
}

/**
 * Calculates deterministic Role Compatibility Score (0 - 100).
 * Evaluates semantic and title affinity between candidate's target roles and the job title.
 */
function calculateRoleScore(
  candidateDomain: string,
  candidateTargetRoles: string[],
  jobTitle: string,
  jobDomain: string
): { roleScore: number; domainAlignment: "aligned" | "adjacent" | "divergent" } {
  const cleanCandDomain = (candidateDomain || "").toLowerCase().trim();
  const cleanJobTitle = (jobTitle || "").toLowerCase().trim();

  // Determine domain alignment relationship
  let domainAlignment: "aligned" | "adjacent" | "divergent" = "divergent";

  if (cleanCandDomain === jobDomain) {
    domainAlignment = "aligned";
  } else if (
    (cleanCandDomain === "software" && (jobDomain === "aiml" || jobDomain === "data")) ||
    (cleanCandDomain === "aiml" && (jobDomain === "software" || jobDomain === "data")) ||
    (cleanCandDomain === "mechanical" && jobDomain === "electrical") // Mechatronics/Automotive overlap
  ) {
    domainAlignment = "adjacent";
  } else {
    domainAlignment = "divergent";
  }

  // 1. Direct Target Role Overlap check
  let highestRoleSimilarity = 0;

  for (const role of candidateTargetRoles) {
    const cleanRole = role.toLowerCase().trim();
    if (!cleanRole) continue;

    if (cleanJobTitle === cleanRole) {
      highestRoleSimilarity = Math.max(highestRoleSimilarity, 100);
    } else if (cleanJobTitle.includes(cleanRole) || cleanRole.includes(cleanJobTitle)) {
      highestRoleSimilarity = Math.max(highestRoleSimilarity, 90);
    } else {
      // Token intersection
      const roleTokens = cleanRole.split(/\s+/).filter(t => t.length > 2 && !["and", "for", "the"].includes(t));
      const jobTokens = new Set(cleanJobTitle.split(/\s+/).filter(t => t.length > 2));
      
      let tokenMatches = 0;
      for (const token of roleTokens) {
        if (jobTokens.has(token)) tokenMatches++;
      }

      if (roleTokens.length > 0) {
        const tokenRatio = tokenMatches / roleTokens.length;
        if (tokenRatio >= 0.66) {
          highestRoleSimilarity = Math.max(highestRoleSimilarity, 82);
        } else if (tokenRatio >= 0.33) {
          highestRoleSimilarity = Math.max(highestRoleSimilarity, 65);
        }
      }
    }
  }

  // 2. Compute final Role Score based on alignment & similarity
  let finalRoleScore: number;

  if (highestRoleSimilarity > 0) {
    // If target roles directly matched words in the title
    if (domainAlignment === "aligned") {
      finalRoleScore = highestRoleSimilarity;
    } else if (domainAlignment === "adjacent") {
      finalRoleScore = Math.round(highestRoleSimilarity * 0.85);
    } else {
      // Even if generic words match (like "Engineer"), cap severely if domains diverge
      finalRoleScore = Math.min(35, Math.round(highestRoleSimilarity * 0.35));
    }
  } else {
    // No direct role string match: fallback to domain baseline
    if (domainAlignment === "aligned") {
      finalRoleScore = 70; // Same domain engineering role
    } else if (domainAlignment === "adjacent") {
      finalRoleScore = 45;
    } else {
      finalRoleScore = 15; // Completely different engineering discipline
    }
  }

  return {
    roleScore: Math.max(0, Math.min(100, finalRoleScore)),
    domainAlignment
  };
}

/**
 * Calculates deterministic Experience Fit Score (0 - 100).
 * Compares candidate experience years against job stated requirements.
 */
function calculateExperienceScore(
  candidateExpYears: number,
  statedRange?: { min: number; max?: number }
): number {
  // Rule 10: If experience is not stated in the job, do not penalize the candidate heavily
  if (!statedRange) {
    return 80;
  }

  const { min, max } = statedRange;

  // Exact fit within bracket
  if (candidateExpYears >= min && (max === undefined || candidateExpYears <= max)) {
    return 95;
  }

  // Candidate is within 1 year of minimum requirement
  if (candidateExpYears < min) {
    const diff = min - candidateExpYears;
    if (diff <= 1) return 75;
    if (diff <= 2) return 55;
    return Math.max(20, 40 - (diff - 2) * 10);
  }

  // Candidate has more experience than max (overqualified or senior)
  if (max !== undefined && candidateExpYears > max) {
    const over = candidateExpYears - max;
    if (over <= 2) return 90;
    return 80;
  }

  return 80;
}

/**
 * Generates clear, human-readable match rationale based on calculated factors.
 */
function generateMatchRationale(
  skillScore: number,
  roleScore: number,
  overallScore: number,
  matchedSkills: string[],
  missingSkills: string[],
  domainAlignment: "aligned" | "adjacent" | "divergent",
  hasStatedRequirements: boolean
): string {
  if (domainAlignment === "divergent") {
    return `Discipline mismatch: Job requires a different engineering specialty. Core competencies do not align with this position.`;
  }

  const parts: string[] = [];

  if (overallScore >= 80) {
    parts.push("Strong candidate match.");
  } else if (overallScore >= 65) {
    parts.push("Good alignment for this role.");
  } else {
    parts.push("Partial match with specific skill or domain gaps.");
  }

  if (matchedSkills.length > 0) {
    parts.push(`Directly matches ${matchedSkills.length} key requirement${matchedSkills.length > 1 ? "s" : ""}: ${matchedSkills.slice(0, 3).join(", ")}.`);
  }

  if (missingSkills.length > 0) {
    parts.push(`Skill gap identified based on job description: ${missingSkills.slice(0, 3).join(", ")}.`);
  } else if (!hasStatedRequirements) {
    parts.push("Match estimated based on job title and discipline profile (detailed requirements not specified in job snippet).");
  }

  return parts.join(" ");
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORTED COMPATIBILITY MATCH ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Evaluates compatibility between a candidate profile and a live job listing.
 * Strictly deterministic, transparent, and unpadded.
 */
export function matchCandidateToJob(
  candidate: CandidateProfile,
  job: JobListing
): JobMatchResult {
  const candidateSkills = Array.isArray(candidate?.skills) ? candidate.skills : [];
  const candidateTargetRoles = Array.isArray(candidate?.targetRoles) ? candidate.targetRoles : [];
  const candidateExpYears = typeof candidate?.experienceYears === "number" ? candidate.experienceYears : 2;

  // 1. Normalize candidate skills to canonical definitions
  const candidateCanonicalSet = new Set<string>();
  for (const s of candidateSkills) {
    candidateCanonicalSet.add(normalizeSkill(s));
  }

  // 2. Extract job skills and stated experience from job text
  const extractedJobSkills = extractSkillsFromJobText(job.title, job.description);
  const statedExperience = extractStatedExperience(`${job.title} ${job.description}`);
  const jobDomain = detectJobDomain(job.title, job.description, job.category);

  // 3. Evaluate Role Compatibility (35% weight)
  const { roleScore, domainAlignment } = calculateRoleScore(
    candidate.domain,
    candidateTargetRoles,
    job.title,
    jobDomain
  );

  // 4. Evaluate Skill Match (50% weight)
  const { skillScore, matchedSkills, missingSkills } = calculateSkillScore(
    candidateCanonicalSet,
    candidateSkills,
    extractedJobSkills,
    domainAlignment
  );

  // 5. Evaluate Experience Fit (15% weight)
  const experienceScore = calculateExperienceScore(candidateExpYears, statedExperience);

  // 6. Calculate Transparent Composite Overall Score (50/35/15)
  // overallScore = round(skill * 0.50 + role * 0.35 + experience * 0.15)
  const overallScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(skillScore * 0.50 + roleScore * 0.35 + experienceScore * 0.15)
    )
  );

  // 7. Classify into Transparent Match Tier:
  // 85–100: Strong Match
  // 70–84:  Good Match
  // 55–69:  Partial Match
  // <55:    Low Match
  let matchTier: MatchTier;
  if (overallScore >= 85) {
    matchTier = "Strong Match";
  } else if (overallScore >= 70) {
    matchTier = "Good Match";
  } else if (overallScore >= 55) {
    matchTier = "Partial Match";
  } else {
    matchTier = "Low Match";
  }

  // 8. Generate Rationale
  const rationale = generateMatchRationale(
    skillScore,
    roleScore,
    overallScore,
    matchedSkills,
    missingSkills,
    domainAlignment,
    extractedJobSkills.length > 0
  );

  return {
    skillScore,
    roleScore,
    experienceScore,
    overallScore,
    matchedSkills,
    missingSkills,
    rationale,
    matchTier,
    diagnostics: {
      extractedJobSkills,
      statedExperienceRange: statedExperience,
      domainAlignment
    }
  };
}
