/**
 * CANONICAL CANDIDATE PROFILE BUILDER
 * 
 * Unifies fragmented resume parse data into a single, canonical CandidateProfile.
 * Strictly eliminates arbitrary Software / Web Developer fallback contamination.
 * 
 * If confidence is low, sets classificationStatus: "needs_review", domain: "unclassified",
 * and primaryRole: null, rather than guessing a software engineering role.
 */

import {
  CandidateProfile,
  CandidateSkill,
  CandidateAchievement,
  EngineeringDomain,
  ClassificationStatus,
  ClassificationConfidence
} from "../../types/candidateProfile";

interface DomainEvidence {
  domain: EngineeringDomain;
  score: number;
  matchedKeywords: string[];
  canonicalRole: string;
}

const DOMAIN_DICTIONARY: Record<EngineeringDomain, { keywords: string[]; primaryRole: string }> = {
  civil: {
    keywords: [
      "staad", "staad.pro", "etabs", "autocad civil", "civil 3d", "rcc", "reinforced concrete",
      "structural analysis", "structural design", "structural engineering", "concrete design",
      "geotechnical", "soil mechanics", "surveying", "total station", "revit structure",
      "construction management", "site engineer", "quantity surveying", "bill of quantities",
      "boq", "is 456", "is 875", "is 1893", "earthwork", "foundation design", "civil engineering"
    ],
    primaryRole: "Civil Engineer"
  },
  mechanical: {
    keywords: [
      "solidworks", "ansys", "catia", "creo", "autocad mechanical", "fea", "finite element",
      "gd&t", "geometric dimensioning", "thermodynamics", "heat transfer", "fluid mechanics",
      "cfd", "hvac", "cad/cam", "sheet metal", "injection molding", "machining", "cnc",
      "kinematics", "dfma", "manufacturing processes", "mechanical design", "mechanical engineer"
    ],
    primaryRole: "Mechanical Engineer"
  },
  architecture: {
    keywords: [
      "revit architecture", "bim", "sketchup", "lumion", "rhino", "v-ray", "architectural design",
      "urban planning", "interior design", "facade design", "landscape architecture", "floor plans",
      "spatial planning", "3ds max"
    ],
    primaryRole: "Architectural Designer"
  },
  electronics: {
    keywords: [
      "vlsi", "verilog", "vhdl", "fpga", "embedded c", "microcontroller", "arduino", "stm32",
      "pcb design", "altium", "cadence", "rtos", "arm cortex", "i2c", "spi", "uart", "iot",
      "circuit design", "signal processing"
    ],
    primaryRole: "Electronics Engineer"
  },
  electrical: {
    keywords: [
      "electrical", "eee", "electrical & electronics", "electrical engineering", "power systems",
      "switchgear", "transformers", "substation", "high voltage", "power electronics",
      "plc programming", "plc", "scada", "motor drives", "matlab simulink", "simulink", "matlab/simulink",
      "electrical machines", "protection relay", "single line diagram", "sld", "autocad electrical",
      "etap", "proteus", "siemens", "wonderware", "power factor", "apfc", "inverter", "solar grid",
      "panel wiring", "relay coordination", "switchgear inspection", "delta power controls"
    ],
    primaryRole: "Electrical Engineer"
  },
  aerospace: {
    keywords: [
      "aerodynamics", "avionics", "propulsion", "orbital mechanics", "flight dynamics",
      "aircraft structures", "computational fluid dynamics", "aerospace engineering"
    ],
    primaryRole: "Aerospace Engineer"
  },
  chemical: {
    keywords: [
      "chemical reaction engineering", "process simulation", "aspen plus", "hysys",
      "mass transfer", "heat exchanger", "distillation", "chemical plant", "piping and instrumentation", "p&id"
    ],
    primaryRole: "Chemical Process Engineer"
  },
  aiml: {
    keywords: [
      "pytorch", "tensorflow", "deep learning", "nlp", "natural language processing", "computer vision",
      "transformers", "huggingface", "llm", "large language models", "reinforcement learning",
      "neural networks", "fine-tuning", "lora", "scikit-learn", "machine learning"
    ],
    primaryRole: "Machine Learning Engineer"
  },
  data: {
    keywords: [
      "sql", "pandas", "numpy", "apache spark", "pyspark", "hadoop", "tableau", "power bi",
      "snowflake", "databricks", "dbt", "data warehousing", "etl pipeline", "airflow",
      "bigquery", "data modeling"
    ],
    primaryRole: "Data Engineer"
  },
  software: {
    keywords: [
      "react", "angular", "vue", "node.js", "express", "next.js", "typescript", "javascript",
      "django", "fastapi", "spring boot", "docker", "kubernetes", "rest api", "graphql",
      "microservices", "redis", "postgresql", "mongodb", "frontend", "full stack", "backend"
    ],
    primaryRole: "Software Engineer"
  },
  unclassified: {
    keywords: [],
    primaryRole: "Graduate Engineer Trainee"
  }
};

/**
 * Evaluates candidate text and parsed skills to determine domain without bias.
 */
function classifyDomain(
  skills: string[],
  resumeText: string,
  statedRoles: string[]
): {
  domain: EngineeringDomain;
  primaryRole: string | null;
  status: ClassificationStatus;
  confidence: ClassificationConfidence;
  notes: string;
} {
  const normText = (resumeText || "").toLowerCase();
  const lowerSkills = skills.map(s => s.toLowerCase().trim());
  const lowerRoles = statedRoles.map(r => r.toLowerCase().trim());

  const scores: Record<EngineeringDomain, DomainEvidence> = {
    civil: { domain: "civil", score: 0, matchedKeywords: [], canonicalRole: "Civil Engineer" },
    mechanical: { domain: "mechanical", score: 0, matchedKeywords: [], canonicalRole: "Mechanical Engineer" },
    architecture: { domain: "architecture", score: 0, matchedKeywords: [], canonicalRole: "Architectural Designer" },
    electronics: { domain: "electronics", score: 0, matchedKeywords: [], canonicalRole: "Electronics Engineer" },
    electrical: { domain: "electrical", score: 0, matchedKeywords: [], canonicalRole: "Electrical Engineer" },
    aerospace: { domain: "aerospace", score: 0, matchedKeywords: [], canonicalRole: "Aerospace Engineer" },
    chemical: { domain: "chemical", score: 0, matchedKeywords: [], canonicalRole: "Chemical Process Engineer" },
    aiml: { domain: "aiml", score: 0, matchedKeywords: [], canonicalRole: "Machine Learning Engineer" },
    data: { domain: "data", score: 0, matchedKeywords: [], canonicalRole: "Data Engineer" },
    software: { domain: "software", score: 0, matchedKeywords: [], canonicalRole: "Software Engineer" },
    unclassified: { domain: "unclassified", score: 0, matchedKeywords: [], canonicalRole: "Graduate Engineer Trainee" }
  };

  // 1. Check direct role title mentions (highest weight: 20 points)
  for (const [domKey, def] of Object.entries(DOMAIN_DICTIONARY)) {
    const d = domKey as EngineeringDomain;
    if (d === "unclassified") continue;

    for (const role of lowerRoles) {
      if (role.includes(d) || role.includes(def.primaryRole.toLowerCase())) {
        scores[d].score += 20;
        scores[d].matchedKeywords.push(`role:${role}`);
      }
    }

    // Direct match in resume text (title headers)
    const titleRegex = new RegExp(`\\b(${d}|${def.primaryRole.toLowerCase()})\\b`, "i");
    if (titleRegex.test(normText)) {
      scores[d].score += 10;
      scores[d].matchedKeywords.push(`header:${d}`);
    }
  }

  // 2. Keyword & skill matching (verified skills weigh 8 points, text mentions weigh 3 points)
  for (const [domKey, def] of Object.entries(DOMAIN_DICTIONARY)) {
    const d = domKey as EngineeringDomain;
    if (d === "unclassified") continue;

    for (const kw of def.keywords) {
      // Check in extracted skills
      const inSkills = lowerSkills.some(s => s === kw || s.includes(kw));
      if (inSkills) {
        scores[d].score += 8;
        scores[d].matchedKeywords.push(`skill:${kw}`);
        continue;
      }

      // Check word-boundary in resume text
      const kwEscaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const kwRegex = new RegExp(`(^|[^a-z0-9_])${kwEscaped}([^a-z0-9_]|$)`, "i");
      if (kwRegex.test(normText)) {
        scores[d].score += 3;
        scores[d].matchedKeywords.push(`text:${kw}`);
      }
    }
  }

  // 3. Find top scoring domains
  const sortedDomains = Object.values(scores)
    .filter(e => e.domain !== "unclassified")
    .sort((a, b) => b.score - a.score);

  const top = sortedDomains[0];
  const second = sortedDomains[1];

  // 4. Evaluate confidence and eliminate silent fallback
  if (!top || top.score < 8) {
    // Insufficient evidence: represent uncertainty explicitly!
    return {
      domain: "unclassified",
      primaryRole: null,
      status: "needs_review",
      confidence: "low",
      notes: "Resume does not provide definitive indicators for a specific engineering branch. Awaiting candidate selection."
    };
  }

  const confidence: ClassificationConfidence =
    top.score >= 25 ? "high" : top.score >= 14 ? "medium" : "low";

  const status: ClassificationStatus =
    confidence === "high" ? "verified" : "inferred";

  // Check if candidate stated a specific role that matches this domain
  let selectedPrimaryRole = top.canonicalRole;
  const matchingStatedRole = statedRoles.find(r =>
    r.toLowerCase().includes(top.domain) ||
    top.matchedKeywords.some(kw => r.toLowerCase().includes(kw.replace(/^(skill|text|role|header):/, "")))
  );

  if (matchingStatedRole) {
    selectedPrimaryRole = matchingStatedRole;
  }

  return {
    domain: top.domain,
    primaryRole: selectedPrimaryRole,
    status,
    confidence,
    notes: `Classified as ${top.domain} based on competencies: ${top.matchedKeywords.slice(0, 4).join(", ")}`
  };
}

/**
 * Extracts candidate full name from raw resume text.
 */
export function extractCandidateName(resumeText: string): string | undefined {
  if (!resumeText) return undefined;
  const lines = resumeText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  for (const line of lines.slice(0, 6)) {
    if (/phone|email|location|curriculum|resume|page|http|@|experience|education|summary|profile|skills/i.test(line)) {
      continue;
    }
    const cleanLine = line.replace(/[^a-zA-Z\s.-]/g, "").trim();
    const words = cleanLine.split(/\s+/).filter(Boolean);

    if (words.length >= 2 && words.length <= 4) {
      const isNameLike = words.every(w => /^[A-Za-z][a-zA-Z.-]*$/.test(w));
      if (isNameLike) {
        return cleanLine;
      }
    }
  }
  return undefined;
}

/**
 * Builds the canonical CandidateProfile from raw backend parse data and resume text.
 */
export function buildCanonicalProfile(
  parseResult: any,
  mlParseResult: any,
  rawResumeText: string
): CandidateProfile {
  // Extract all available raw and normalized skills
  const rawSkills: any[] = Array.isArray(parseResult?.skills) ? parseResult.skills : [];
  const mlSkills: any[] = Array.isArray(mlParseResult?.technical_skills) ? mlParseResult.technical_skills : [];
  
  const skillNameSet = new Set<string>();
  const technicalSkills: CandidateSkill[] = [];

  for (const s of rawSkills) {
    const skillName = typeof s === "string" ? s : (s && typeof s === "object" ? s.name : undefined);
    const category = s && typeof s === "object" ? s.category : undefined;
    if (typeof skillName === "string" && skillName.trim().length > 0) {
      const clean = skillName.trim();
      const lower = clean.toLowerCase();
      if (!skillNameSet.has(lower)) {
        skillNameSet.add(lower);
        technicalSkills.push({ name: clean, category });
      }
    }
  }

  for (const item of mlSkills) {
    const name = item?.name;
    if (typeof name === "string" && name.trim().length > 0) {
      const clean = name.trim();
      const lower = clean.toLowerCase();
      const existing = technicalSkills.find(ts => ts.name.toLowerCase() === lower);
      if (existing) {
        existing.proficiency = item.proficiency || existing.proficiency;
        existing.years = item.years || existing.years;
      } else {
        skillNameSet.add(lower);
        technicalSkills.push({
          name: clean,
          proficiency: item.proficiency,
          years: item.years
        });
      }
    }
  }

  const allSkills = technicalSkills.map(ts => ts.name);

  // Extract candidate roles
  const statedRoles: string[] = [];
  if (Array.isArray(parseResult?.matchingRoles)) {
    statedRoles.push(...parseResult.matchingRoles.filter((r: any) => typeof r === "string" && r.trim().length > 0));
  }
  if (Array.isArray(mlParseResult?.role_matches)) {
    statedRoles.push(...mlParseResult.role_matches.filter((r: any) => typeof r === "string" && r.trim().length > 0));
  }
  const deduplicatedRoles = [...new Set(statedRoles)];

  // Classify domain without software bias
  const classification = classifyDomain(allSkills, rawResumeText, deduplicatedRoles);

  // Calculate experience years
  let expYears = 0;
  if (typeof mlParseResult?.experience_score === "number") {
    expYears = Math.max(0, Math.round((mlParseResult.experience_score / 10) * 4));
  }
  if (typeof mlParseResult?.extractedYearsExp === "number") {
    expYears = mlParseResult.extractedYearsExp;
  }

  let expLevel: "Entry" | "Junior" | "Mid" | "Senior" | "Lead" = "Entry";
  if (expYears >= 7) expLevel = "Lead";
  else if (expYears >= 5) expLevel = "Senior";
  else if (expYears >= 3) expLevel = "Mid";
  else if (expYears >= 1) expLevel = "Junior";

  // Extract achievements
  const achievements: CandidateAchievement[] = [];
  if (Array.isArray(mlParseResult?.achievements)) {
    for (const ach of mlParseResult.achievements) {
      if (ach?.description) {
        achievements.push({
          description: ach.description,
          metricValue: ach.metric_value,
          impactScore: ach.impact_score,
          type: ach.type
        });
      }
    }
  }

  // Extract candidate full name
  const extractedName =
    parseResult?.profile?.name ||
    parseResult?.candidate_name ||
    mlParseResult?.candidate_name ||
    extractCandidateName(rawResumeText);

  // Extract contact info if present
  const profileHeader = parseResult?.profile;
  const contact = profileHeader ? {
    location: profileHeader.location || null,
    email: profileHeader.email || null,
    phone: profileHeader.phone || null,
    linkedin: profileHeader.linkedin || null,
    github: profileHeader.github || null,
    portfolio: profileHeader.portfolio || null
  } : undefined;

  return {
    fullName: extractedName,
    rawResumeText: rawResumeText.substring(0, 8000),
    domain: classification.domain,
    primaryRole: classification.primaryRole,
    targetRoles: deduplicatedRoles.length > 0
      ? deduplicatedRoles
      : classification.primaryRole
      ? [classification.primaryRole]
      : [],
    classificationStatus: classification.status,
    classificationConfidence: classification.confidence,
    classificationNotes: classification.notes,
    skills: allSkills,
    technicalSkills,
    experienceYears: expYears,
    experienceLevel: expLevel,
    achievements,
    headline: profileHeader?.headline || parseResult?.headline || null,
    contact,
    educationRecords: Array.isArray(parseResult?.education) ? parseResult.education : undefined,
    experienceRecords: Array.isArray(parseResult?.experience) ? parseResult.experience : undefined,
    projects: Array.isArray(parseResult?.projects) ? parseResult.projects : undefined,
    certifications: Array.isArray(parseResult?.certifications) ? parseResult.certifications : undefined,
    parsedResumeIntelligence: parseResult?.profile ? parseResult : undefined,
    updatedAt: new Date().toISOString(),
    source: "resume_upload"
  };
}
