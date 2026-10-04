import { 
  ExtractedEducation, 
  ExtractedExperience, 
  ExtractedProject 
} from "./resumeSchema";

/**
 * Robust Deterministic Local Section & Entity Extractor
 * 
 * Accurately extracts Education, Experience, Projects, Contact info,
 * and Location even when offline or when LLM API quotas/errors occur.
 */

export interface SectionBlocks {
  summary: string[];
  skills: string[];
  experience: string[];
  education: string[];
  projects: string[];
  certifications: string[];
  achievements: string[];
}

const SECTION_HEADERS: { key: keyof SectionBlocks; regex: RegExp }[] = [
  { key: "education", regex: /^(?:education|academics|academic background|qualifications?|educational qualifications?)(?:\s*(?:&|and)\s*[\w\s]+)?$/i },
  { key: "experience", regex: /^(?:work experience|professional experience|experience|employment history|internships?|work history)(?:\s*(?:&|and)\s*[\w\s]+)?$/i },
  { key: "projects", regex: /^(?:projects|academic projects|personal projects|key projects|technical projects)(?:\s*(?:&|and)\s*[\w\s]+)?$/i },
  { key: "skills", regex: /^(?:technical skills|skills|core competencies|technologies|technical expertise|key skills)(?:\s*(?:&|and)\s*[\w\s]+)?$/i },
  { key: "summary", regex: /^(?:summary|professional summary|about me|profile|career objective|objective)(?:\s*(?:&|and)\s*[\w\s]+)?$/i },
  { key: "certifications", regex: /^(?:certifications?|licenses|courses|certifications & licenses)(?:\s*(?:&|and)\s*[\w\s]+)?$/i },
  { key: "achievements", regex: /^(?:achievements?|awards|honors|extracurricular activities|extracurricular)(?:\s*(?:&|and)\s*[\w\s]+)?$/i },
];

const BULLET_REGEX = /^[•\-*–—\uF0B7\u2022\u25CF\u25E6\u25AA\u25AB\d+\.]\s*/;

export function isBulletLine(line: string): boolean {
  return BULLET_REGEX.test(line.trim());
}

export function cleanBulletLine(line: string): string {
  return line.trim().replace(BULLET_REGEX, "").trim();
}

export function splitResumeIntoSections(rawText: string): SectionBlocks {
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const blocks: SectionBlocks = {
    summary: [],
    skills: [],
    experience: [],
    education: [],
    projects: [],
    certifications: [],
    achievements: []
  };

  let currentSection: keyof SectionBlocks | null = null;

  for (const line of lines) {
    // Check if this line is a section header (clean punctuation, uppercase or bold style)
    const cleanHeader = line.replace(/[:_#*\-=]/g, "").trim();
    let matchedHeader: keyof SectionBlocks | null = null;

    if (cleanHeader.length <= 45 && !isBulletLine(line)) {
      for (const h of SECTION_HEADERS) {
        if (h.regex.test(cleanHeader)) {
          matchedHeader = h.key;
          break;
        }
      }
    }

    if (matchedHeader) {
      currentSection = matchedHeader;
      continue;
    }

    if (currentSection && blocks[currentSection]) {
      blocks[currentSection].push(line);
    }
  }

  return blocks;
}

/**
 * Extracts candidate location from resume text
 */
export function extractLocationFromText(resumeText: string): string | null {
  const lines = resumeText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  
  // 1. Look in top 8 header lines (usually where city, state, country appears)
  const headerLines = lines.slice(0, 8);
  for (const line of headerLines) {
    const parts = line.split(/[|•]/).map(p => p.trim());
    for (const part of parts) {
      // Ignore if it's an email, phone, url, or github/linkedin
      if (part.includes("@") || part.includes("http") || part.includes("linkedin") || part.includes("github") || /^\+?\d[\d\s-]{7,}/.test(part)) {
        continue;
      }
      // Pattern: City, State or City, State, Country
      if (/^[A-Za-z\s]+,\s*[A-Za-z\s]+(?:,\s*[A-Za-z\s]+)?$/.test(part) && part.length <= 60 && part.length >= 4) {
        return part;
      }
    }
  }

  // 2. Common Indian and Global cities check
  const cityRegex = /\b(Mysore|Bengaluru|Bangalore|Hyderabad|Chennai|Mumbai|Pune|Delhi|Noida|Gurugram|Gurgaon|Kolkata|Ahmedabad|Jaipur|Chandigarh|Kochi|Trivandrum|London|New York|San Francisco|Seattle|Austin|Berlin|Singapore|Toronto)\b(?:\s*,\s*[A-Za-z\s]+)?/i;
  for (const line of headerLines) {
    const match = line.match(cityRegex);
    if (match) {
      const matchedPart = match[0].split(/[|•]/)[0].trim();
      return matchedPart;
    }
  }

  return null;
}

/**
 * Extracts structured Education records
 */
export function extractEducationFromText(text: string): ExtractedEducation[] {
  const sections = splitResumeIntoSections(text);
  const eduLines = sections.education;
  if (eduLines.length === 0) {
    return scanForDegreesInText(text);
  }

  const results: ExtractedEducation[] = [];
  const degreeRegex = /(?:bachelor|master|b\.?e\.?|b\.?tech|m\.?tech|b\.?sc|m\.?sc|m\.?s\.?|diploma|ph\.?d|associate|higher secondary|puc|sslc|10th|12th)/i;

  let currentDegree = "";
  let currentInst = "";
  let currentDates: string | null = null;
  let currentField: string | null = null;
  let currentGrade: string | null = null;

  for (let i = 0; i < eduLines.length; i++) {
    const line = eduLines[i];
    
    // Check for dates (e.g. 2024 - 2027 (Expected), 2020-2024, May 2023)
    const dateMatch = line.match(/\b(19\d\d|20\d\d)\s*(?:[-–to]+\s*(?:(19\d\d|20\d\d)|present|expected))?(?:\s*\([A-Za-z]+\))?/i);
    // Check for grade / percentage
    const gradeMatch = line.match(/(?:(?:cgpa|gpa|percentage|grade)\s*[:=]?\s*([0-9.]+(?:\s*%)?(?:\/\s*[0-9.]+)?))|(?:[0-9]{1,2}(?:\.[0-9]+)?%)/i);

    if (degreeRegex.test(line)) {
      if (currentDegree && (currentInst || currentDates)) {
        results.push({
          degree: currentDegree,
          field: currentField,
          institution: currentInst || "Educational Institution",
          start_date: parseStartDate(currentDates),
          end_date: parseEndDate(currentDates),
          grade: currentGrade
        });
        currentDegree = "";
        currentInst = "";
        currentDates = null;
        currentField = null;
        currentGrade = null;
      }

      currentDegree = line.replace(/^[•\-*]\s*/, "").trim();
      // Extract field if in line e.g. "in Electronics and Communication"
      const inFieldMatch = line.match(/\bin\s+([A-Za-z\s&]+)/i);
      if (inFieldMatch) {
        currentField = inFieldMatch[1].trim();
      }
      continue;
    }

    if (dateMatch && !currentDates) {
      currentDates = dateMatch[0].trim();
    }
    if (gradeMatch && !currentGrade) {
      currentGrade = gradeMatch[0].trim();
    }

    // Check for institution keywords
    if (/institute|university|college|school|academy|polytechnic/i.test(line)) {
      // Handle lines like: "Maharaja Institute of Technology Mysore, Mysore, Karnataka, India | 2024 - 2027 (Expected)"
      const beforePipe = line.split(/[|•]/)[0].trim();
      // If there is a comma separating the institution name from the city
      const instParts = beforePipe.split(",");
      if (instParts.length > 1 && /institute|university|college|school|academy|polytechnic/i.test(instParts[0])) {
        currentInst = instParts[0].trim();
      } else {
        currentInst = beforePipe;
      }
    } else if (!currentInst && currentDegree && !dateMatch && !gradeMatch) {
      currentInst = line.split(/[|•]/)[0].trim();
    }
  }

  if (currentDegree) {
    results.push({
      degree: currentDegree,
      field: currentField,
      institution: currentInst || "Educational Institution",
      start_date: parseStartDate(currentDates),
      end_date: parseEndDate(currentDates),
      grade: currentGrade
    });
  }

  return results.length > 0 ? results : scanForDegreesInText(text);
}

function parseStartDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const match = dateStr.match(/\b(19\d\d|20\d\d)\b/);
  return match ? match[1] : null;
}

function parseEndDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  if (/present|current/i.test(dateStr)) return "Present";
  const years = dateStr.match(/\b(19\d\d|20\d\d)\b/g);
  if (years && years.length > 1) {
    return years[1];
  }
  if (years && years.length === 1) {
    return years[0];
  }
  return dateStr.replace(/^[–\-to\s]+/, "").trim();
}

function scanForDegreesInText(text: string): ExtractedEducation[] {
  const results: ExtractedEducation[] = [];
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:Bachelor|Master|B\.?E\.?|B\.?Tech|M\.?Tech|Diploma)[\s\w()&,.-]{4,80}/i.test(line) && !isBulletLine(line)) {
      const nextLine = lines[i + 1] || "";
      const dateMatch = (line + " " + nextLine).match(/\b(19\d\d|20\d\d)\s*[-–to]+\s*(19\d\d|20\d\d|present|expected)/i);
      
      const inFieldMatch = line.match(/\bin\s+([A-Za-z\s&]+)/i);
      results.push({
        degree: line,
        field: inFieldMatch ? inFieldMatch[1].trim() : null,
        institution: /institute|university|college|polytechnic/i.test(nextLine) ? nextLine.split(/[|,-]/)[0].trim() : "Educational Institution",
        start_date: dateMatch ? dateMatch[1] : null,
        end_date: dateMatch ? dateMatch[2] : null,
        grade: null
      });
      break;
    }
  }
  return results;
}

/**
 * Extracts structured Experience records
 */
export function extractExperienceFromText(text: string): ExtractedExperience[] {
  const sections = splitResumeIntoSections(text);
  const expLines = sections.experience;
  if (expLines.length === 0) return [];

  const results: ExtractedExperience[] = [];
  let currentTitle = "";
  let currentCompany = "";
  let currentLocation: string | null = null;
  let currentDates: string | null = null;
  let descriptionLines: string[] = [];

  const roleKeywords = /intern|engineer|developer|analyst|manager|specialist|assistant|associate|architect|lead|consultant|programmer/i;
  const dateRegex = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{4}\s*[-–to]+\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{4}|present)\b/i;
  const yearRangeRegex = /\b(19\d\d|20\d\d)\s*[-–to]+\s*(19\d\d|20\d\d|present)\b/i;

  const pushCurrent = () => {
    if (currentTitle || currentCompany) {
      results.push({
        job_title: currentTitle || "Professional Role",
        company: currentCompany || "Company",
        location: currentLocation,
        start_date: currentDates?.split(/[-–to]+/)[0]?.trim() || null,
        end_date: currentDates?.split(/[-–to]+/)[1]?.trim() || null,
        description: descriptionLines.join("\n"),
        technologies: extractTechnologiesFromLines(descriptionLines),
        evidence: `${currentCompany} - ${currentTitle}`
      });
      currentTitle = "";
      currentCompany = "";
      currentLocation = null;
      currentDates = null;
      descriptionLines = [];
    }
  };

  for (let i = 0; i < expLines.length; i++) {
    const line = expLines[i];
    const isBullet = isBulletLine(line);

    // 1. Check if line is purely or primarily a Date & Location line (e.g., "Mysore, Karnataka | Jan 2024 - Apr 2024")
    const dateMatch = line.match(dateRegex) || line.match(yearRangeRegex);
    if (!isBullet && dateMatch && !roleKeywords.test(line)) {
      currentDates = dateMatch[0];
      const remainder = line.replace(dateMatch[0], "").replace(/[|•]/g, "").trim();
      if (remainder.length > 2) {
        currentLocation = remainder;
      }
      continue;
    }

    // 2. Check if line contains company and role (e.g., "Mindscraft Labs Pvt. Ltd. - Industrial IoT Intern")
    if (!isBullet && (line.includes(" - ") || line.includes(" | ") || line.includes(" at "))) {
      // If we already have a parsed entry, push it before starting the new one
      if (currentTitle || currentCompany) {
        pushCurrent();
      }

      // Check if dates are embedded in this same line
      if (dateMatch) {
        currentDates = dateMatch[0];
      }

      const cleanLine = dateMatch ? line.replace(dateMatch[0], "").replace(/[|•()]/g, "").trim() : line;
      const parts = cleanLine.split(/\s*[-|]\s*/);
      if (parts.length >= 2) {
        if (roleKeywords.test(parts[1])) {
          currentCompany = parts[0].trim();
          currentTitle = parts[1].trim();
        } else if (roleKeywords.test(parts[0])) {
          currentTitle = parts[0].trim();
          currentCompany = parts[1].trim();
        } else {
          currentCompany = parts[0].trim();
          currentTitle = parts[1].trim();
        }
      } else if (line.includes(" at ")) {
        const atParts = cleanLine.split(/\s+at\s+/i);
        currentTitle = atParts[0].trim();
        currentCompany = atParts[1]?.trim() || "Company";
      }
      continue;
    }

    // 3. Line is just a role title or company name alone
    if (!isBullet && (roleKeywords.test(line) || /ltd|inc|corp|technologies|solutions|labs/i.test(line)) && line.length < 70) {
      if (roleKeywords.test(line) && !currentTitle) {
        currentTitle = line.trim();
        continue;
      }
      if (/ltd|inc|corp|technologies|solutions|labs/i.test(line) && !currentCompany) {
        currentCompany = line.trim();
        continue;
      }
    }

    // 4. Bullet points and description text
    if (isBullet || (currentTitle && line.length > 20)) {
      descriptionLines.push(cleanBulletLine(line));
    }
  }

  pushCurrent();
  return results;
}

/**
 * Extracts structured Project records
 */
export function extractProjectsFromText(text: string): ExtractedProject[] {
  const sections = splitResumeIntoSections(text);
  const projLines = sections.projects;
  if (projLines.length === 0) return [];

  const results: ExtractedProject[] = [];
  let currentName = "";
  let currentDesc: string[] = [];
  let currentTech: string[] = [];

  const pushCurrent = () => {
    if (currentName) {
      results.push({
        name: currentName,
        description: currentDesc.join("\n"),
        technologies: [...new Set(currentTech)].slice(0, 10),
        links: null,
        evidence: currentName
      });
      currentName = "";
      currentDesc = [];
      currentTech = [];
    }
  };

  const techIndicators = /\b(python|react|node|javascript|typescript|c\+\+|sql|postgres|supabase|mongodb|flask|django|html|css|docker|aws|api|apis|ml|ai|nlp|opencv|tensorflow|pytorch|gans|vaes|webxr|render|vercel)\b/i;

  let lastLineWasBullet = false;

  for (let i = 0; i < projLines.length; i++) {
    const line = projLines[i];
    const isBullet = isBulletLine(line);

    // 1. Check if line contains a comma-separated list of technologies
    // (e.g. "Python, NLP, LLM APIs, RAG, React.js, Node.js/Express.js, Supabase, PostgreSQL, Unity/XR Toolkit, WebXR")
    if (!isBullet && line.includes(",") && techIndicators.test(line) && line.length < 150) {
      const techs = line.split(/[,\s/]+ExtractTechnologies/i) // placeholder
      const rawTechs = line.split(/[,\s/]+/)
        .map(t => t.trim().replace(/^[:()]+|[:()]+$/g, ""))
        .filter(t => t.length > 1 && !/^(and|using|with|for|the|in|basic)$/i.test(t));
      currentTech.push(...rawTechs);
      lastLineWasBullet = false;
      continue;
    }

    // 2. Project title line (e.g. "InterviewVerse AI - AI-Powered Resume-to-VR Interview Platform", "RaghBodha - Authenticated Web Application", "Generative AI & Computer Vision Experiments")
    const prevLine = i > 0 ? projLines[i - 1].trim() : "";
    const prevEndedWithPeriod = /[.;!]$/.test(prevLine);

    const isWrappedFragment = (
      !prevEndedWithPeriod && (
        /^[a-z]/.test(line) ||
        /^(experiences|guidance|workflows|features|systems|database|models|platform|applications|testing|code)\.?$/i.test(line)
      )
    );

    const isProjectTitle = !isBullet && !isWrappedFragment && line.length < 90 && !line.startsWith("http") && (
      line.includes(" - ") ||
      line.includes(" | ") ||
      !currentName ||
      prevEndedWithPeriod ||
      /^[A-Z][A-Za-z0-9\s&]{2,60}$/.test(line)
    );

    if (isProjectTitle) {
      pushCurrent();

      const parts = line.split(/\s*[-|]\s*/);
      currentName = parts[0].trim();
      if (parts[1]) {
        currentDesc.push(parts.slice(1).join(" - ").trim());
      }
      continue;
    }

    // 3. Bullet points and description lines
    if (isBullet) {
      currentDesc.push(cleanBulletLine(line));
    } else if (currentName) {
      // Continuation of previous description line
      if (currentDesc.length > 0) {
        currentDesc[currentDesc.length - 1] += " " + line.trim();
      } else {
        currentDesc.push(line.trim());
      }
    }
  }

  pushCurrent();
  return results;
}

function extractTechnologiesFromLines(lines: string[]): string[] {
  const text = lines.join(" ");
  const knownTech = [
    "Python", "JavaScript", "TypeScript", "React", "Node.js", "Express",
    "SQL", "PostgreSQL", "Supabase", "Firebase", "MongoDB", "Flask",
    "Docker", "AWS", "IoT", "ESP32", "OpenCV", "TensorFlow", "PyTorch",
    "Git", "REST APIs", "C++", "C", "Java", "HTML", "CSS"
  ];
  return knownTech.filter(t => {
    const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:\\b|\\s)${escaped}(?:\\b|\\s|$)`, "i").test(text);
  });
}

