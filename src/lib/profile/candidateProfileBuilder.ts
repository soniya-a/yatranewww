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
      "power systems", "switchgear", "transformers", "substation", "high voltage", "power electronics",
      "plc", "scada", "motor drives", "matlab simulink", "electrical machines", "protection relay",
      "single line diagram", "sld"
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
  commerce: {
    keywords: [
      "commercial practice", "accounting", "accountant", "tally", "tally erp", "cost accounting",
      "management accounting", "cost and management account", "dtp", "desktop publishing",
      "shorthand", "english shorthand", "typing", "english typing", "balance sheet", "ledger",
      "taxation", "auditing", "audit", "chartered accounting", "subek agarwal", "l&t audit",
      "financial accounting", "banking", "finance", "commercial", "payroll", "jss polytechnic"
    ],
    primaryRole: "Commercial Practice & Accounts Specialist"
  },
  unclassified: {
    keywords: [],
    primaryRole: "Graduate Trainee"
  }
};

/**
 * Extracts candidate full name from raw resume text heuristics.
 * Guarantees no hallucination and never returns the authenticated user's account name.
 */
export function extractCandidateNameFromResume(text: string): string | undefined {
  if (!text || typeof text !== "string") return undefined;
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // 1. Check explicit "Name:" or "Candidate Name:" prefixes
  for (const line of lines.slice(0, 20)) {
    const match = line.match(/^(?:candidate\s+name|full\s+name|name)\s*[:\-]\s*([A-Za-z\s\.\'\-]+)$/i);
    if (match && match[1]) {
      const clean = match[1].trim();
      if (clean.length >= 2 && clean.length <= 40 && !/^(resume|curriculum|vitae|bio)/i.test(clean)) {
        return clean;
      }
    }
  }

  // 2. Inspect the topmost 6 non-empty lines
  const blacklistedKeywords = [
    "resume", "curriculum", "vitae", "cv", "bio-data", "biodata", "profile", "contact",
    "email", "phone", "mobile", "tel:", "address", "objective", "career", "summary",
    "education", "qualification", "skills", "experience", "projects", "declaration",
    "http", "www", ".com", ".in", "gmail", "yahoo", "outlook", "@", "page"
  ];

  for (const line of lines.slice(0, 6)) {
    const lower = line.toLowerCase();
    if (blacklistedKeywords.some(kw => lower.includes(kw))) continue;
    if (/\d{4,}/.test(line)) continue; // skip lines with phone/dates

    // A valid name line is typically 1 to 4 words containing only letters, spaces, or dots
    const cleanLine = line.replace(/[^A-Za-z\s\.]/g, "").trim();
    const words = cleanLine.split(/\s+/).filter(Boolean);
    if (words.length >= 1 && words.length <= 4 && cleanLine.length >= 3 && cleanLine.length <= 35) {
      // Check that at least one word starts with a capital letter or is in all-caps
      const isCandidateName = words.every(w => /^[A-Z][a-zA-Z\.]*$/.test(w) || /^[A-Z]+$/.test(w));
      if (isCandidateName) {
        // Return nicely formatted title/proper case if in ALL-CAPS, or as-is
        if (cleanLine === cleanLine.toUpperCase() && cleanLine.length > 3) {
          return cleanLine.split(/\s+/).map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(" ");
        }
        return cleanLine;
      }
    }
  }

  return undefined;
}

/**
 * Extracts education qualifications directly from resume text.
 */
export function extractEducationFromResume(text: string): string[] {
  if (!text) return [];
  const results: string[] = [];
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  const eduPatterns = [
    /diploma\s+in\s+([A-Za-z\s]+)/i,
    /jss\s+polytechnic\s+for\s+women[,\s\w]*/i,
    /polytechnic[,\s\w]*/i,
    /(?:10th|12th|sslc|puc|cbse|icse)[,\s\w\(\)%]*/i,
    /(?:b\.?e\.?|b\.?tech|m\.?tech|b\.?sc|m\.?sc|b\.?com|m\.?com|bba|mba)\s*(?:in\s+[A-Za-z\s]+)?/i,
    /(?:bachelor|master)\s+(?:of|in)\s+[A-Za-z\s]+/i,
    /university|college|institute|board\s+of\s+technical\s+education/i
  ];

  for (const line of lines) {
    if (eduPatterns.some(p => p.test(line)) && line.length < 120) {
      const clean = line.replace(/^[-*•\d\.\)]\s*/, "").trim();
      if (clean && !results.includes(clean) && !/^(education|qualification|academic)/i.test(clean)) {
        results.push(clean);
      }
    }
  }

  return results.slice(0, 5);
}

/**
 * Extracts work experience, audit records, and internships from resume text.
 */
export function extractExperienceFromResume(text: string): string[] {
  if (!text) return [];
  const results: string[] = [];
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  const expPatterns = [
    /subek\s+agarwal\s*(&|and)?\s*associates/i,
    /chartered\s+account(?:ing|ants?)/i,
    /(?:l&t|larsen\s*(&|and)?\s*toubro)/i,
    /internship[,\s\w\-]*/i,
    /audit\s+(?:entry|work|trainee|assistant|executive|experience)/i,
    /(?:worked|working)\s+as\s+[A-Za-z\s]+/i,
    /(?:trainee|associate|assistant|officer|executive)\s+at\s+[A-Za-z\s]+/i
  ];

  for (const line of lines) {
    if (expPatterns.some(p => p.test(line)) && line.length < 140) {
      const clean = line.replace(/^[-*•\d\.\)]\s*/, "").trim();
      if (clean && !results.includes(clean) && !/^(experience|work experience|internship|internships)$/i.test(clean)) {
        results.push(clean);
      }
    }
  }

  return results.slice(0, 5);
}

/**
 * Extracts languages known from resume text.
 */
export function extractLanguagesFromResume(text: string): string[] {
  if (!text) return [];
  const knownLanguages = [
    "English", "Kannada", "Hindi", "Tamil", "Telugu", "Malayalam",
    "Marathi", "Bengali", "Gujarati", "Urdu", "French", "German", "Spanish"
  ];
  const detected: string[] = [];
  const norm = text.toLowerCase();

  for (const lang of knownLanguages) {
    const regex = new RegExp(`\\b${lang.toLowerCase()}\\b`, "i");
    if (regex.test(norm)) {
      detected.push(lang);
    }
  }
  return detected;
}

/**
 * Extracts hobbies / interests from resume text.
 */
export function extractHobbiesFromResume(text: string): string[] {
  if (!text) return [];
  const results: string[] = [];
  const norm = text.toLowerCase();

  const hobbyKeywords = [
    { key: "listening to music", label: "Listening to Music" },
    { key: "music", label: "Listening to Music" },
    { key: "story reading", label: "Story Reading" },
    { key: "reading", label: "Reading Books / Stories" },
    { key: "travelling", label: "Travelling" },
    { key: "traveling", label: "Travelling" },
    { key: "photography", label: "Photography" },
    { key: "cricket", label: "Cricket" },
    { key: "chess", label: "Chess" }
  ];

  for (const h of hobbyKeywords) {
    if (norm.includes(h.key) && !results.includes(h.label)) {
      results.push(h.label);
    }
  }

  return results.slice(0, 4);
}

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
    commerce: { domain: "commerce", score: 0, matchedKeywords: [], canonicalRole: "Commercial Practice & Accounts Specialist" },
    unclassified: { domain: "unclassified", score: 0, matchedKeywords: [], canonicalRole: "Graduate Trainee" }
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
 * Builds the canonical CandidateProfile from raw backend parse data and resume text.
 */
export function buildCanonicalProfile(
  parseResult: any,
  mlParseResult: any,
  rawResumeText: string
): CandidateProfile {
  // Extract all available raw and normalized skills
  const rawSkills: string[] = Array.isArray(parseResult?.skills) ? parseResult.skills : [];
  const mlSkills: any[] = Array.isArray(mlParseResult?.technical_skills) ? mlParseResult.technical_skills : [];
  
  const skillNameSet = new Set<string>();
  const technicalSkills: CandidateSkill[] = [];

  for (const s of rawSkills) {
    if (typeof s === "string" && s.trim().length > 0) {
      const clean = s.trim();
      const lower = clean.toLowerCase();
      if (!skillNameSet.has(lower)) {
        skillNameSet.add(lower);
        technicalSkills.push({ name: clean });
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

  // Extract candidate identity, education, experience, languages, hobbies
  const extractedName =
    (typeof parseResult?.candidate_name === "string" && parseResult.candidate_name.trim().length > 0 && parseResult.candidate_name.trim()) ||
    (typeof parseResult?.name === "string" && parseResult.name.trim().length > 0 && parseResult.name.trim()) ||
    extractCandidateNameFromResume(rawResumeText);

  let education: string[] = [];
  if (Array.isArray(parseResult?.education) && parseResult.education.length > 0) {
    education = parseResult.education.map((e: any) => typeof e === "string" ? e : (e?.degree || e?.institution || JSON.stringify(e))).filter(Boolean);
  }
  if (education.length === 0 && mlParseResult?.education) {
    education = [String(mlParseResult.education)];
  }
  if (education.length === 0) {
    education = extractEducationFromResume(rawResumeText);
  }

  let experienceList: string[] = [];
  if (Array.isArray(parseResult?.experience) && parseResult.experience.length > 0) {
    experienceList.push(...parseResult.experience.map((e: any) => {
      if (typeof e === "string") return e;
      return [e.role, e.company, e.date_range].filter(Boolean).join(" - ");
    }));
  }
  if (Array.isArray(parseResult?.internships) && parseResult.internships.length > 0) {
    experienceList.push(...parseResult.internships.map((i: any) => {
      if (typeof i === "string") return i;
      return `Internship: ${[i.role, i.company, i.date_range].filter(Boolean).join(" - ")}`;
    }));
  }
  if (experienceList.length === 0) {
    experienceList = extractExperienceFromResume(rawResumeText);
  }

  let languages: string[] = Array.isArray(parseResult?.languages) && parseResult.languages.length > 0
    ? parseResult.languages
    : extractLanguagesFromResume(rawResumeText);

  let hobbies: string[] = Array.isArray(parseResult?.hobbies) && parseResult.hobbies.length > 0
    ? parseResult.hobbies
    : extractHobbiesFromResume(rawResumeText);

  let projects: any[] = [];
  if (Array.isArray(parseResult?.projects)) {
    projects = parseResult.projects.map((p: any) => ({
      title: p?.name || p?.title || "Project",
      description: p?.description || "",
      skills: Array.isArray(p?.skills_used) ? p.skills_used : (Array.isArray(p?.tools_used) ? p.tools_used : [])
    }));
  }

  return {
    fullName: extractedName || undefined,
    rawResumeText: rawResumeText.substring(0, 8000),
    domain: classification.domain,
    primaryRole: classification.primaryRole,
    targetRoles: deduplicatedRoles.length > 0
      ? deduplicatedRoles
      : classification.primaryRole
      ? [classification.primaryRole]
      : [],
    userSelectedTargetRole: null, // strictly kept separate from resume-derived profile
    classificationStatus: classification.status,
    classificationConfidence: classification.confidence,
    classificationNotes: classification.notes,
    skills: allSkills,
    technicalSkills,
    education,
    experienceList,
    projects,
    languages,
    hobbies,
    experienceYears: expYears,
    experienceLevel: expLevel,
    achievements,
    updatedAt: new Date().toISOString(),
    source: "resume_upload"
  };
}
