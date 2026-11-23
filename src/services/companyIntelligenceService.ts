import { GoogleGenAI } from '@google/genai';
import { GEMINI_PRIMARY_MODEL, executeGeminiWithRetry } from '../lib/geminiConfig';
import fs from 'fs';
import path from 'path';
import {
  SEED_QUESTIONS,
  normalizeCompanyName,
} from '../engine/intelligenceRepository';
import {
  generateCanonicalQuestionSet,
  getCanonicalQuestionSet,
} from '../engine/questionEngine';

export type EngineeringBranch = 'ECE' | 'CSE' | 'EEE' | 'Mechanical' | 'Civil' | 'Other';

export type CanonicalRoundCategory =
  | 'Aptitude'
  | 'Technical'
  | 'Coding / Practical'
  | 'Managerial'
  | 'HR';

export type IntelligenceSearchPeriod = '6m' | '1y';

export interface CompanyIntelligenceQuestion {
  id: string;
  company: string;
  role: string;
  branch: EngineeringBranch;
  round: CanonicalRoundCategory;
  question: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: 'REPORTED' | 'OFFICIAL_DERIVED' | 'AI_PREDICTED';
  source_title: string | null;
  source_url: string | null;
  published_date: string | null;
  interview_date: string | null;
  what_we_look_for?: string;
  follow_up_hint?: string;
}

export interface RoundMetadata {
  round: CanonicalRoundCategory;
  is_evidence_supported: boolean;
  label: string;
  description: string;
  question_count: number;
}

export interface CompanyIntelligenceResponse {
  cache_key: string;
  company: string;
  role: string;
  branch: EngineeringBranch;
  branch_topics: string[];
  period: IntelligenceSearchPeriod;
  search_provider_used: 'tavily' | 'serper' | 'verified_repository' | 'offline_branch_engine';
  retrieved_at: string;
  canonical_set_id: string;
  rounds: RoundMetadata[];
  evidence_supported_rounds: CanonicalRoundCategory[];
  suggested_preparation_rounds: CanonicalRoundCategory[];
  reported_questions: CompanyIntelligenceQuestion[];
  official_derived_questions: CompanyIntelligenceQuestion[];
  ai_predicted_questions: CompanyIntelligenceQuestion[];
  total_verified_count: number;
  notice?: string;
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || 'dummy_key',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const CACHE_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'companyIntelligenceCache.json');
const intelligenceCache = new Map<string, CompanyIntelligenceResponse>();

function loadCacheFromDisk() {
  try {
    const dir = path.dirname(CACHE_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(CACHE_FILE_PATH)) {
      const raw = fs.readFileSync(CACHE_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item?.cache_key) {
            intelligenceCache.set(item.cache_key, item);
          }
        }
      }
    }
  } catch (e) {
    // Non-fatal cache read error
  }
}
loadCacheFromDisk();

function saveCacheToDisk(entry: CompanyIntelligenceResponse) {
  intelligenceCache.set(entry.cache_key, entry);
  try {
    const all = Array.from(intelligenceCache.values());
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(all, null, 2), 'utf-8');
  } catch (e) {
    // Non-fatal cache write error
  }
}

/**
 * Detects the candidate's engineering branch from resume profile domain, role title, skills, and job description.
 */
export function detectEngineeringBranch(
  domain?: string | null,
  role?: string | null,
  skills?: string[] | string | null,
  jobDescription?: string | null
): EngineeringBranch {
  const skillStr = Array.isArray(skills) ? skills.join(' ') : (skills || '');
  const roleAndDomain = `${domain || ''} ${role || ''}`.toLowerCase();
  const fullContext = `${roleAndDomain} ${skillStr} ${jobDescription || ''}`.toLowerCase();

  // Check explicit role & domain first so target job/resume domain takes priority
  if (/\b(civil|structural|geotechnical|construction|site engineer|staad|etabs|bim|surveying|transportation|concrete)\b/i.test(roleAndDomain)) {
    return 'Civil';
  }
  if (/\b(mechanical|automotive|aerospace|thermal|thermodynamics|hvac|manufacturing|solidworks|catia|ansys|fea|fluid|mechatronics)\b/i.test(roleAndDomain)) {
    return 'Mechanical';
  }
  if (/\b(eee|electrical|transmission|t&d|t\s*&\s*d|power systems|electrical machines|high voltage|switchgear|substation|power electronics|control systems|transformer|distribution)\b/i.test(roleAndDomain)) {
    return 'EEE';
  }
  if (/\b(ece|electronics|embedded|vlsi|semiconductor|cmos|verilog|systemverilog|vhdl|fpga|asic|microcontroller|signal processing|telecom|communication systems|pcb|iot|firmware)\b/i.test(roleAndDomain)) {
    return 'ECE';
  }
  if (/\b(cse|computer science|software|developer|frontend|backend|fullstack|full stack|sde|data scientist|machine learning|ai|devops|cloud|cyber)\b/i.test(roleAndDomain)) {
    return 'CSE';
  }

  // Fallback to full context including skills and JD
  if (/\b(civil|structural|staad|etabs|autocad civil|reinforced concrete|geotechnical)\b/i.test(fullContext)) {
    return 'Civil';
  }
  if (/\b(mechanical|solidworks|catia|thermodynamics|ansys|gd&t|cnc|fluid mechanics)\b/i.test(fullContext)) {
    return 'Mechanical';
  }
  if (/\b(power systems|electrical machines|control systems|switchgear|transformer|plc|scada)\b/i.test(fullContext)) {
    return 'EEE';
  }
  if (/\b(embedded|microcontroller|verilog|vlsi|fpga|digital electronics|rtos|stm32|arduino)\b/i.test(fullContext)) {
    return 'ECE';
  }
  if (/\b(react|node|python|java|javascript|typescript|sql|dsa|algorithms|dbms|operating systems|software)\b/i.test(fullContext)) {
    return 'CSE';
  }

  return 'Other';
}

/**
 * Core preparation topics for each engineering branch
 */
export function getBranchCoreTopics(branch: EngineeringBranch, role: string): string[] {
  switch (branch) {
    case 'ECE':
      return ['C / Embedded C', 'C++', 'Digital Electronics', 'Microcontrollers & RTOS', 'Communication Protocols (I2C, SPI, UART)', 'Signal Processing & VLSI'];
    case 'CSE':
      return ['Data Structures & Algorithms (DSA)', 'DBMS & SQL', 'Operating Systems', 'Object-Oriented Programming (OOP)', 'System Design & APIs', 'Programming Languages'];
    case 'EEE':
      return ['Electrical Machines', 'Power Systems & Protection', 'Control Systems', 'Power Electronics & Drives', 'Circuit Analysis', 'Instrumentation & PLC'];
    case 'Mechanical':
      return ['Strength of Materials & Mechanics', 'Thermodynamics & Heat Transfer', 'Fluid Mechanics', 'CAD / FEA (SolidWorks, ANSYS)', 'Manufacturing Processes & GD&T', 'Machine Design'];
    case 'Civil':
      return ['Structural Analysis & RCC Design', 'Building Codes (IS 456, IS 1893, Eurocodes)', 'STAAD.Pro / ETABS / AutoCAD', 'Concrete Technology & Steel Structures', 'Geotechnical & Foundation Engineering', 'Site Execution & Safety'];
    default:
      return [`Core ${role} Fundamentals`, 'Problem Solving & Analytical Reasoning', 'Domain Tools & Workflows', 'Project Architecture', 'Professional Communication'];
  }
}

/**
 * Maps any round string into one of the 5 required canonical rounds:
 * 1. Aptitude
 * 2. Technical
 * 3. Coding / Practical
 * 4. Managerial
 * 5. HR
 */
export function mapToFiveCanonicalRounds(rawRound?: string | null, branch?: EngineeringBranch): CanonicalRoundCategory {
  const norm = (rawRound || '').toLowerCase().trim();
  if (norm.includes('aptitude') || norm.includes('quant') || norm.includes('logical') || norm.includes('reasoning') || norm.includes('nqt')) {
    return 'Aptitude';
  }
  if (norm.includes('hr') || norm.includes('human resource') || norm.includes('cultural') || norm.includes('safety and behavioral')) {
    return 'HR';
  }
  if (norm.includes('managerial') || norm.includes('project') || norm.includes('resume') || norm.includes('leadership') || norm.includes('behavioral')) {
    return 'Managerial';
  }
  if (norm.includes('coding') || norm.includes('practical') || norm.includes('oa') || norm.includes('online assessment') || norm.includes('dsa') || norm.includes('tools') || norm.includes('cad')) {
    return 'Coding / Practical';
  }
  return 'Technical';
}

/**
 * Validates an ISO date string independently and checks if it falls within the selected period (6m = 180 days, 1y = 365 days).
 * Never treats missing or invalid dates as recent.
 */
export function isValidDateWithinPeriod(dateStr: string | null | undefined, period: IntelligenceSearchPeriod): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const trimmed = dateStr.trim();
  if (!/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return false;
  const parsed = new Date(trimmed).getTime();
  if (isNaN(parsed)) return false;

  const now = Date.now();
  // Reject future dates beyond 24h clock skew
  if (parsed > now + 24 * 60 * 60 * 1000) return false;

  const maxAgeMs = (period === '6m' ? 180 : 365) * 24 * 60 * 60 * 1000;
  return (now - parsed) <= maxAgeMs;
}

export function sanitizeIsoDate(dateStr: string | null | undefined): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const match = dateStr.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  if (!match) return null;
  const ts = new Date(match[1]).getTime();
  if (isNaN(ts) || ts > Date.now() + 24 * 60 * 60 * 1000) return null;
  return match[1];
}

interface RawSearchItem {
  title: string;
  url: string;
  content: string;
  published_date: string | null;
}

/**
 * Primary Search Provider: Tavily Search API (Server-Side Only)
 */
async function searchWithTavily(
  company: string,
  role: string,
  branch: EngineeringBranch,
  period: IntelligenceSearchPeriod
): Promise<{ items: RawSearchItem[]; used: boolean }> {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey || apiKey === 'dummy_key' || apiKey.includes('placeholder')) {
    return { items: [], used: false };
  }

  const branchKeyword = branch !== 'Other' ? branch : '';
  const query = `"${company}" "${role}" ${branchKeyword} interview questions experience rounds`.trim();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'basic',
        max_results: 8,
        days: period === '6m' ? 180 : 365,
        include_answer: false,
        include_raw_content: false,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`[CompanyIntelligence] Tavily HTTP ${res.status}`);
      return { items: [], used: false };
    }

    const data: any = await res.json();
    const results = Array.isArray(data?.results) ? data.results : [];
    const items: RawSearchItem[] = results
      .filter((r: any) => r && typeof r.url === 'string' && r.url.startsWith('http'))
      .map((r: any) => ({
        title: String(r.title || `${company} Interview Experience`),
        url: String(r.url),
        content: String(r.content || r.snippet || ''),
        published_date: sanitizeIsoDate(r.published_date || null),
      }));

    return { items, used: true };
  } catch (err: any) {
    console.warn('[CompanyIntelligence] Tavily search error:', err?.message);
    return { items: [], used: false };
  }
}

/**
 * Secondary Search Provider: Serper API (Only used if Tavily is unconfigured or fails)
 */
async function searchWithSerper(
  company: string,
  role: string,
  branch: EngineeringBranch,
  period: IntelligenceSearchPeriod
): Promise<{ items: RawSearchItem[]; used: boolean }> {
  const apiKey = process.env.SERPER_API_KEY?.trim();
  if (!apiKey || apiKey === 'dummy_key' || apiKey.includes('placeholder')) {
    return { items: [], used: false };
  }

  const branchKeyword = branch !== 'Other' ? branch : '';
  const q = `"${company}" "${role}" ${branchKeyword} interview questions experience (site:geeksforgeeks.org OR site:ambitionbox.com OR site:glassdoor.com OR site:leetcode.com)`.trim();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q,
        num: 8,
        tbs: period === '6m' ? 'qdr:m6' : 'qdr:y',
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      return { items: [], used: false };
    }

    const data: any = await res.json();
    const organic = Array.isArray(data?.organic) ? data.organic : [];
    const items: RawSearchItem[] = organic
      .filter((r: any) => r && typeof r.link === 'string' && r.link.startsWith('http'))
      .map((r: any) => ({
        title: String(r.title || `${company} Interview Experience`),
        url: String(r.link),
        content: String(r.snippet || ''),
        published_date: sanitizeIsoDate(r.date || null),
      }));

    return { items, used: true };
  } catch (err: any) {
    console.warn('[CompanyIntelligence] Serper search error:', err?.message);
    return { items: [], used: false };
  }
}

/**
 * Extracts verified REPORTED / OFFICIAL_DERIVED questions from real search snippets via Gemini
 * Never invents URLs or dates — every URL is cross-checked against the allowed map of search result URLs.
 */
async function extractVerifiedQuestionsFromSearchResults(
  company: string,
  role: string,
  branch: EngineeringBranch,
  period: IntelligenceSearchPeriod,
  searchItems: RawSearchItem[]
): Promise<CompanyIntelligenceQuestion[]> {
  if (searchItems.length === 0) return [];
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'dummy_key') return [];

  const allowedByUrl = new Map<string, RawSearchItem>();
  searchItems.forEach((item) => allowedByUrl.set(item.url, item));

  const prompt = `You are a strict technical interview evidence extractor.
Target Company: "${company}"
Target Role: "${role}"
Engineering Branch: "${branch}"

Below are real public web search snippets retrieved for "${company}":
${JSON.stringify(searchItems, null, 2)}

Extract ONLY actual interview questions explicitly mentioned in the search snippets for "${company}" and relevant to "${role}" (${branch}).
Rules:
1. NEVER invent or guess reported questions. If a snippet does not mention a specific question or topic asked at "${company}", skip it.
2. Do NOT include questions belonging to a different company or an unrelated engineering branch.
3. For each extracted question, set "source_url" to the EXACT "url" from the snippet above.
4. Set "category" to "OFFICIAL_DERIVED" if the URL is from "${company}"'s official career domain, otherwise "REPORTED".
5. Set "round" to one of: "Aptitude", "Technical", "Coding / Practical", "Managerial", "HR".
6. Set "difficulty" to one of: "Easy", "Medium", "Hard".
7. Set "published_date" (YYYY-MM-DD) ONLY if stated in the snippet, otherwise null.
8. Set "interview_date" (YYYY-MM-DD) ONLY if explicitly stated in the snippet as the date of the interview (never copy published_date into interview_date), otherwise null.

Return strictly valid JSON:
{
  "questions": [
    {
      "question": "Clear interview question text",
      "round": "Technical",
      "difficulty": "Medium",
      "category": "REPORTED",
      "source_url": "https://...",
      "source_title": "...",
      "published_date": "YYYY-MM-DD or null",
      "interview_date": "YYYY-MM-DD or null",
      "what_we_look_for": "Key concepts expected"
    }
  ]
}`;

  try {
    const res = await executeGeminiWithRetry(
      () => ai.models.generateContent({
        model: GEMINI_PRIMARY_MODEL,
        contents: prompt,
        config: {
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: 'application/json',
          temperature: 0.1,
          maxOutputTokens: 2048,
        },
      }),
      {
        maxRetries: 2,
        initialDelayMs: 1000,
        timeoutMs: 8000,
        operationName: 'CompanyIntelligenceExtract'
      }
    );
    const parsed = JSON.parse(res.text?.trim() || '{}');
    const rawList = Array.isArray(parsed?.questions) ? parsed.questions : [];

    const verified: CompanyIntelligenceQuestion[] = [];
    const seenTexts = new Set<string>();

    for (const q of rawList) {
      if (!q?.question || !q?.source_url) continue;
      // Strict provenance check: URL MUST exist in the actual search results
      const matchedSource = allowedByUrl.get(q.source_url);
      if (!matchedSource) continue;

      const cleanText = String(q.question).trim();
      const normKey = cleanText.toLowerCase();
      if (cleanText.length < 15 || seenTexts.has(normKey)) continue;

      const pubDate = sanitizeIsoDate(q.published_date) || matchedSource.published_date;
      const intDate = sanitizeIsoDate(q.interview_date);

      // If a date is present, verify it falls within the selected period (6m or 1y)
      if (pubDate && !isValidDateWithinPeriod(pubDate, period)) continue;
      if (intDate && !isValidDateWithinPeriod(intDate, period)) continue;

      seenTexts.add(normKey);

      verified.push({
        id: `LIVE_${verified.length + 1}_${Date.now()}`,
        company,
        role,
        branch,
        round: mapToFiveCanonicalRounds(q.round, branch),
        question: cleanText,
        difficulty: ['Easy', 'Medium', 'Hard'].includes(q.difficulty) ? q.difficulty : 'Medium',
        category: q.category === 'OFFICIAL_DERIVED' ? 'OFFICIAL_DERIVED' : 'REPORTED',
        source_title: String(q.source_title || matchedSource.title),
        source_url: matchedSource.url,
        published_date: pubDate,
        interview_date: intDate && intDate !== pubDate ? intDate : null,
        what_we_look_for: String(q.what_we_look_for || `Domain proficiency in ${branch} for ${role}`),
      });
    }

    return verified;
  } catch (err: any) {
    console.warn('[CompanyIntelligence] Gemini extraction notice:', err?.message);
    return [];
  }
}

/**
 * Generates branch-specific and role-specific AI_PREDICTED practice questions (using Gemini with deterministic fallback)
 * Never attaches fake source links.
 */
async function generateBranchPracticeQuestions(
  company: string,
  role: string,
  branch: EngineeringBranch,
  candidateSkills: string[],
  jobDescription?: string | null
): Promise<CompanyIntelligenceQuestion[]> {
  const topics = getBranchCoreTopics(branch, role);
  const skillsText = candidateSkills.length > 0 ? candidateSkills.slice(0, 8).join(', ') : topics.join(', ');

  // 1. Try Gemini live generation first
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'dummy_key') {
    try {
      const prompt = `You are a Principal Engineering Interviewer at "${company}" hiring for "${role}" (Engineering Branch: ${branch}).
Candidate Skills: ${skillsText}
Core Branch Topics: ${topics.join(', ')}
Job Description Excerpt: ${(jobDescription || '').substring(0, 400) || `Standard ${branch} requirements for ${role}`}

Generate 6 realistic, high-signal practice interview questions tailored specifically to "${company}", "${role}", and the "${branch}" engineering branch.
CRITICAL RULES:
- Match the engineering branch strictly (${branch}). If the branch is Civil, Mechanical, EEE, or ECE, do NOT generate unrelated web/software DSA questions unless the role is explicitly software.
- Cover these rounds across the 6 questions: "Aptitude", "Technical", "Coding / Practical", "Managerial", "HR".
- Vary difficulty across "Easy", "Medium", and "Hard".

Return strictly valid JSON:
{
  "questions": [
    {
      "question": "Detailed question text...",
      "round": "Technical",
      "difficulty": "Medium",
      "what_we_look_for": "Key concepts evaluated...",
      "follow_up_hint": "Follow-up probe..."
    }
  ]
}`;

      const res = await executeGeminiWithRetry(
        () => ai.models.generateContent({
          model: GEMINI_PRIMARY_MODEL,
          contents: prompt,
          config: {
            thinkingConfig: { thinkingBudget: 0 },
            responseMimeType: 'application/json',
            temperature: 0.35,
            maxOutputTokens: 2048,
          },
        }),
        {
          maxRetries: 2,
          initialDelayMs: 1000,
          timeoutMs: 7500,
          operationName: 'CompanyIntelligenceBranch'
        }
      );
      const parsed = JSON.parse(res.text?.trim() || '{}');
      const qList = Array.isArray(parsed?.questions) ? parsed.questions : [];

      if (qList.length >= 4) {
        return qList.slice(0, 6).map((q: any, idx: number) => ({
          id: `AI_PRAC_${idx + 1}`,
          company,
          role,
          branch,
          round: mapToFiveCanonicalRounds(q.round, branch),
          question: String(q.question || '').trim(),
          difficulty: ['Easy', 'Medium', 'Hard'].includes(q.difficulty) ? q.difficulty : 'Medium',
          category: 'AI_PREDICTED',
          source_title: null,
          source_url: null,
          published_date: null,
          interview_date: null,
          what_we_look_for: String(q.what_we_look_for || `Core ${branch} competency for ${role}`),
          follow_up_hint: String(q.follow_up_hint || 'Can you walk through a practical example?'),
        }));
      }
    } catch (e: any) {
      console.warn('[CompanyIntelligence] Using deterministic branch practice fallback:', e?.message);
    }
  }

  // 2. Deterministic Branch-Specific Practice Fallback (Guaranteed relevant for ECE, CSE, EEE, Mechanical, Civil)
  const fallbackTemplates: Record<EngineeringBranch, Array<{ round: CanonicalRoundCategory; difficulty: 'Easy' | 'Medium' | 'Hard'; question: string; lookFor: string }>> = {
    ECE: [
      {
        round: 'Aptitude',
        difficulty: 'Easy',
        question: `In a digital signal transmission system at ${company}, a communication link operates at 4800 baud using 16-QAM modulation. What is the bit rate in kbps, and how does SNR affect symbol error probability?`,
        lookFor: 'Bit rate = Baud rate * log2(16) = 19.2 kbps; constellation spacing and noise tolerance.',
      },
      {
        round: 'Technical',
        difficulty: 'Medium',
        question: `Explain the difference between volatile and const volatile qualifiers in Embedded C when accessing memory-mapped peripheral status registers on a microcontroller.`,
        lookFor: 'Preventing compiler register caching optimization; hardware-modified read-only registers.',
      },
      {
        round: 'Technical',
        difficulty: 'Medium',
        question: `Compare I2C, SPI, and UART communication protocols in terms of duplex capability, clock synchronization, bus capacitance limits, and multi-master arbitration.`,
        lookFor: 'Open-drain pull-ups in I2C, push-pull full-duplex in SPI, asynchronous framing in UART.',
      },
      {
        round: 'Coding / Practical',
        difficulty: 'Hard',
        question: `Write or describe a lock-free ring buffer (circular queue) implementation in C for transferring bytes between a UART RX Interrupt Service Routine (ISR) and a main application loop without race conditions.`,
        lookFor: 'Head/tail volatile indices, power-of-two masking, single-producer single-consumer atomic safety.',
      },
      {
        round: 'Managerial',
        difficulty: 'Medium',
        question: `During hardware-firmware integration for a ${role} project, a prototype board intermittently resets under peak load. How do you systematically isolate whether the root cause is power rail brownout, stack overflow, or watchdog timeout?`,
        lookFor: 'MCU reset cause register inspection, oscilloscope DSO trigger on VCC rail, stack watermark analysis.',
      },
      {
        round: 'HR',
        difficulty: 'Easy',
        question: `Why are you interested in starting your ${role} career at ${company}, and how do your ECE projects align with our engineering domain?`,
        lookFor: 'Genuine interest in company domain, clarity of career goals, hands-on project alignment.',
      },
    ],
    CSE: [
      {
        round: 'Aptitude',
        difficulty: 'Easy',
        question: `A distributed cluster processes batch jobs where 3 nodes complete 600 tasks in 4 hours. At the same per-node throughput, how many nodes are required to process 2500 tasks in 5 hours?`,
        lookFor: 'Rate per node = 50 tasks/hr; 2500 / (50 * 5) = 10 nodes.',
      },
      {
        round: 'Technical',
        difficulty: 'Medium',
        question: `In DBMS and Operating Systems, compare optimistic vs. pessimistic concurrency control, and explain how deadlock detection differs from deadlock prevention.`,
        lookFor: 'MVCC versioning, row locks, wait-for graph cycle detection, Coffman conditions.',
      },
      {
        round: 'Coding / Practical',
        difficulty: 'Medium',
        question: `Design and analyze an algorithm to find the length of the longest substring without repeating characters in O(N) time complexity and O(min(N, M)) space.`,
        lookFor: 'Sliding window with two pointers and hash map / index array tracking last seen position.',
      },
      {
        round: 'Coding / Practical',
        difficulty: 'Hard',
        question: `How would you design an idempotent rate limiter and request deduplication cache for a high-throughput microservice API at ${company}?`,
        lookFor: 'Token bucket / sliding window in Redis, atomic Lua script, idempotency key TTL.',
      },
      {
        round: 'Managerial',
        difficulty: 'Medium',
        question: `Walk through the architecture of the most complex software project on your resume. What were the primary scalability bottlenecks and how did you test edge cases?`,
        lookFor: 'End-to-end ownership, trade-off reasoning, observability, and empirical testing.',
      },
      {
        round: 'HR',
        difficulty: 'Easy',
        question: `Tell me about a time you had to learn an unfamiliar technology stack rapidly to deliver a project milestone. How did you validate code quality?`,
        lookFor: 'Growth mindset, structured problem solving, and team collaboration.',
      },
    ],
    EEE: [
      {
        round: 'Aptitude',
        difficulty: 'Easy',
        question: `A 3-phase, 415V, 50Hz induction motor draws 20A at a power factor of 0.85 lagging. Calculate the active power (kW), reactive power (kVAR), and apparent power (kVA).`,
        lookFor: 'S = sqrt(3)*V*I = 14.37 kVA; P = S*0.85 = 12.22 kW; Q = S*sin(acos(0.85)) = 7.57 kVAR.',
      },
      {
        round: 'Technical',
        difficulty: 'Medium',
        question: `Why is a transformer rating specified in kVA rather than kW, and how do open-circuit and short-circuit tests separately determine core losses and copper losses?`,
        lookFor: 'Iron loss depends on voltage, copper loss depends on current, independent of load power factor.',
      },
      {
        round: 'Technical',
        difficulty: 'Hard',
        question: `In power system protection and control systems, explain the coordination of differential relays and Buchholz relays for power transformers, and how PID controllers stabilize voltage regulation.`,
        lookFor: 'Inrush current harmonic restraint, incipient fault gas accumulation, closed-loop stability margins.',
      },
      {
        round: 'Coding / Practical',
        difficulty: 'Medium',
        question: `How do you size a circuit breaker, select cable cross-sectional area, and calculate voltage drop for an industrial motor feeder at ${company}?`,
        lookFor: 'Starting current derating factors, short-circuit withstand capacity, thermal ampacity, <=3-5% voltage drop.',
      },
      {
        round: 'Managerial',
        difficulty: 'Medium',
        question: `Describe a practical electrical lab or capstone project you worked on. How did you ensure electrical safety compliance, earthing continuity, and harmonic mitigation?`,
        lookFor: 'IEEE/IEC standard adherence, LOTO safety procedures, practical troubleshooting.',
      },
      {
        round: 'HR',
        difficulty: 'Easy',
        question: `What motivates you to pursue the ${role} position at ${company}, and how do you handle high-responsibility field or plant environments?`,
        lookFor: 'Safety discipline, adaptability, teamwork, and long-term commitment.',
      },
    ],
    Mechanical: [
      {
        round: 'Aptitude',
        difficulty: 'Easy',
        question: `A hydraulic press has a ram diameter of 200 mm and a plunger diameter of 25 mm. Neglecting friction, what force is required on the plunger to lift a load of 32 kN on the ram?`,
        lookFor: 'Area ratio = (200/25)^2 = 64; Force = 32000 / 64 = 500 N.',
      },
      {
        round: 'Technical',
        difficulty: 'Medium',
        question: `Compare von Mises (Distortion Energy) and Tresca (Maximum Shear Stress) failure theories. Which do you select when validating ductile steel components in FEA at ${company}?`,
        lookFor: 'Yield locus ellipse vs hexagon, octohedral shear stress, safety factor conservatism.',
      },
      {
        round: 'Technical',
        difficulty: 'Medium',
        question: `In thermodynamics and fluid mechanics, explain cavitation in centrifugal pumps, how Net Positive Suction Head (NPSHa vs NPSHr) is calculated, and how to prevent impeller damage.`,
        lookFor: 'Vapor pressure threshold, suction line losses, impeller eye pressure drop.',
      },
      {
        round: 'Coding / Practical',
        difficulty: 'Hard',
        question: `Given an engineering drawing for a precision shaft-bearing assembly, how do you specify GD&T tolerances (concentricity, runout, datum targets) and perform a 1D tolerance stack-up analysis?`,
        lookFor: 'ASME Y14.5 principles, MMC/LMC modifiers, worst-case vs RSS statistical tolerance stack.',
      },
      {
        round: 'Managerial',
        difficulty: 'Medium',
        question: `Walk through a mechanical design or simulation project from your resume. How did you verify mesh convergence in ANSYS/SolidWorks and optimize the part for manufacturability (DFM)?`,
        lookFor: 'Hand-calculation sanity check, h-refinement convergence, tooling accessibility, cost reduction.',
      },
      {
        round: 'HR',
        difficulty: 'Easy',
        question: `How does your mechanical engineering background prepare you for the ${role} role at ${company}, and how do you collaborate across design and shop-floor teams?`,
        lookFor: 'Practical mindset, cross-functional communication, safety awareness.',
      },
    ],
    Civil: [
      {
        round: 'Aptitude',
        difficulty: 'Easy',
        question: `For an M30 concrete mix design with a target mean strength of 38.25 MPa and a water-cement ratio of 0.42, if the water content per cubic meter is 186 kg, calculate the required cement content and check compliance with IS 456 minimum/maximum limits.`,
        lookFor: 'Cement = 186 / 0.42 = 442.8 kg/m3; verification against IS 456 exposure condition and 450 kg/m3 cap.',
      },
      {
        round: 'Technical',
        difficulty: 'Medium',
        question: `In structural analysis for ${company}, compare Limit State Design and Working Stress Design in reinforced concrete structures. Why are partial safety factors different for concrete (1.5) and steel (1.15)?`,
        lookFor: 'Material variability, quality control in mill vs on-site casting, ductile under-reinforced failure modes.',
      },
      {
        round: 'Technical',
        difficulty: 'Medium',
        question: `Explain how shear force and bending moment distributions behave in a continuous beam vs. a simply supported beam, and where contraflexure points require top vs. bottom main reinforcement.`,
        lookFor: 'Hogging moment over intermediate supports, sagging at mid-span, development length and curtailment rules.',
      },
      {
        round: 'Coding / Practical',
        difficulty: 'Hard',
        question: `When modeling a multi-storey RCC or steel structure in STAAD.Pro / ETABS for ${role}, how do you define seismic load combinations (IS 1893 / Eurocode 8), check story drift limits, and resolve P-Delta instability?`,
        lookFor: 'Seismic zone factor, response reduction factor (R), mass source participation >= 90%, inter-story drift < 0.004h.',
      },
      {
        round: 'Managerial',
        difficulty: 'Medium',
        question: `On an infrastructure project at ${company}, unexpected geotechnical soil test results show lower safe bearing capacity (SBC) than assumed in tender drawings. How do you manage the redesign and coordinate with site teams?`,
        lookFor: 'Foundation alternative analysis (raft/pile vs isolated footing), differential settlement control, schedule risk communication.',
      },
      {
        round: 'HR',
        difficulty: 'Easy',
        question: `How do you uphold site safety standards, quality assurance checks, and ethical engineering practices when working under tight project deadlines at ${company}?`,
        lookFor: 'Zero compromise on structural integrity and site safety, clear documentation, collaborative problem solving.',
      },
    ],
    Other: [
      {
        round: 'Aptitude',
        difficulty: 'Easy',
        question: `Explain your quantitative approach to estimating project resource requirements, timelines, and error margins when starting a new assignment at ${company}.`,
        lookFor: 'Structured estimation, buffer allocation, critical path awareness.',
      },
      {
        round: 'Technical',
        difficulty: 'Medium',
        question: `What are the core technical principles and industry standards that govern quality and reliability for a ${role} at ${company}?`,
        lookFor: 'Domain fundamentals, standard operating procedures, quality metrics.',
      },
      {
        round: 'Coding / Practical',
        difficulty: 'Medium',
        question: `Walk through a practical case study or tool workflow you would use to diagnose a recurring technical failure in a ${role} workflow.`,
        lookFor: 'Root cause analysis (5 Whys / Fishbone), empirical measurement, verification.',
      },
      {
        round: 'Managerial',
        difficulty: 'Medium',
        question: `Describe the most challenging academic or industry project on your resume and explain the trade-offs you made to deliver it on time.`,
        lookFor: 'Project ownership, stakeholder communication, problem-solving depth.',
      },
      {
        round: 'HR',
        difficulty: 'Easy',
        question: `Why have you chosen ${company} for the ${role} position, and what key strengths from your background will you bring to the team?`,
        lookFor: 'Role alignment, communication clarity, professional motivation.',
      },
    ],
  };

  const selectedTemplates = fallbackTemplates[branch] || fallbackTemplates.Other;
  return selectedTemplates.map((t, idx) => ({
    id: `AI_PRAC_${idx + 1}`,
    company,
    role,
    branch,
    round: t.round,
    question: t.question,
    difficulty: t.difficulty,
    category: 'AI_PREDICTED',
    source_title: null,
    source_url: null,
    published_date: null,
    interview_date: null,
    what_we_look_for: t.lookFor,
    follow_up_hint: 'Can you illustrate this with a practical calculation or project example?',
  }));
}

/**
 * Main Entry Point: Fetches or generates simple, fast Company-Specific Interview Intelligence
 */
export async function getCompanyInterviewIntelligence(params: {
  company: string;
  role: string;
  domain?: string | null;
  candidateSkills?: string[] | string | null;
  jobDescription?: string | null;
  parsedResume?: any;
  period?: IntelligenceSearchPeriod;
  userId?: string;
  forceRefresh?: boolean;
}): Promise<CompanyIntelligenceResponse> {
  const rawCompany = (params.company || '').trim() || 'Company';
  const canonicalCompany = normalizeCompanyName(rawCompany);
  const role = (params.role || '').trim() || 'Engineer';
  const period: IntelligenceSearchPeriod = params.period === '1y' ? '1y' : '6m';

  const skillList: string[] = Array.isArray(params.candidateSkills)
    ? params.candidateSkills
    : typeof params.candidateSkills === 'string'
      ? params.candidateSkills.split(/[,;|]/).map((s) => s.trim()).filter(Boolean)
      : Array.isArray(params.parsedResume?.skills)
        ? params.parsedResume.skills.map((s: any) => (typeof s === 'string' ? s : s?.name || '')).filter(Boolean)
        : [];

  const branch = detectEngineeringBranch(params.domain, role, skillList, params.jobDescription);
  const cacheKey = `${canonicalCompany.toLowerCase()}__${role.toLowerCase()}__${branch.toLowerCase()}__${period}`;

  if (!params.forceRefresh && intelligenceCache.has(cacheKey)) {
    const cached = intelligenceCache.get(cacheKey)!;
    // Ensure canonical set still exists in questionEngine
    const existingSet = await getCanonicalQuestionSet(cached.canonical_set_id);
    if (existingSet) {
      return cached;
    }
  }

  let searchProviderUsed: CompanyIntelligenceResponse['search_provider_used'] = 'offline_branch_engine';
  const verifiedQuestions: CompanyIntelligenceQuestion[] = [];
  const seenQuestions = new Set<string>();

  // 1. Check local verified seed repository for exact company & branch match within selected period
  const isCandidateSoftware = branch === 'CSE';
  for (const sq of SEED_QUESTIONS) {
    if (sq.company.toLowerCase() !== canonicalCompany.toLowerCase()) continue;
    const isSeedSoftware = /software|developer|sde|digital/i.test(sq.role || '');
    if (isCandidateSoftware !== isSeedSoftware) continue;

    const primaryEv = sq.evidence?.[0];
    if (!primaryEv?.url) continue;

    const pubDate = sanitizeIsoDate(primaryEv.published_date);
    const intDate = sanitizeIsoDate(primaryEv.interview_date);
    const isOfficial = sq.category === 'OFFICIAL_DERIVED';

    // For REPORTED questions, strictly enforce selected time period (6m or 1y).
    // For OFFICIAL_DERIVED official company career guides for this exact company & branch, retain with real published date.
    const withinWindow =
      isOfficial ||
      (intDate && isValidDateWithinPeriod(intDate, period)) ||
      (pubDate && isValidDateWithinPeriod(pubDate, period));

    if (!withinWindow) continue;

    const qKey = sq.problem_statement.trim().toLowerCase();
    if (seenQuestions.has(qKey)) continue;
    seenQuestions.add(qKey);

    verifiedQuestions.push({
      id: sq.id,
      company: canonicalCompany,
      role,
      branch,
      round: mapToFiveCanonicalRounds(sq.round_type, branch),
      question: sq.problem_statement,
      difficulty: (['Easy', 'Medium', 'Hard'].includes(sq.difficulty) ? sq.difficulty : 'Medium') as 'Easy' | 'Medium' | 'Hard',
      category: sq.category === 'OFFICIAL_DERIVED' ? 'OFFICIAL_DERIVED' : 'REPORTED',
      source_title: primaryEv.title || `${canonicalCompany} Interview Report`,
      source_url: primaryEv.url,
      published_date: pubDate,
      interview_date: intDate && intDate !== pubDate ? intDate : null,
      what_we_look_for: sq.what_we_look_for,
      follow_up_hint: sq.follow_up_hint,
    });
  }

  if (verifiedQuestions.length > 0) {
    searchProviderUsed = 'verified_repository';
  }

  // 2. Live Web Search via Tavily (Primary), or Serper (Secondary fallback)
  let rawSearchResults: RawSearchItem[] = [];
  const tavilyRes = await searchWithTavily(canonicalCompany, role, branch, period);
  if (tavilyRes.used && tavilyRes.items.length > 0) {
    rawSearchResults = tavilyRes.items;
    searchProviderUsed = 'tavily';
  } else {
    const serperRes = await searchWithSerper(canonicalCompany, role, branch, period);
    if (serperRes.used && serperRes.items.length > 0) {
      rawSearchResults = serperRes.items;
      searchProviderUsed = 'serper';
    }
  }

  if (rawSearchResults.length > 0) {
    const extracted = await extractVerifiedQuestionsFromSearchResults(
      canonicalCompany,
      role,
      branch,
      period,
      rawSearchResults
    );
    for (const eq of extracted) {
      const qKey = eq.question.toLowerCase();
      if (!seenQuestions.has(qKey)) {
        seenQuestions.add(qKey);
        verifiedQuestions.push(eq);
      }
    }
  }

  // Separate verified into REPORTED and OFFICIAL_DERIVED (never manufacture counts!)
  const reportedQuestions = verifiedQuestions.filter((q) => q.category === 'REPORTED');
  const officialDerivedQuestions = verifiedQuestions.filter((q) => q.category === 'OFFICIAL_DERIVED');

  // 3. Generate branch-specific & role-specific AI_PREDICTED practice questions
  const aiPredictedQuestions = await generateBranchPracticeQuestions(
    canonicalCompany,
    role,
    branch,
    skillList,
    params.jobDescription
  );

  // 4. Organize under the 5 Canonical Rounds: Aptitude, Technical, Coding / Practical, Managerial, HR
  const allRoundOrder: CanonicalRoundCategory[] = [
    'Aptitude',
    'Technical',
    'Coding / Practical',
    'Managerial',
    'HR',
  ];

  const evidenceSupportedRoundsSet = new Set<CanonicalRoundCategory>();
  for (const vq of verifiedQuestions) {
    evidenceSupportedRoundsSet.add(vq.round);
  }
  const evidenceSupportedRounds = allRoundOrder.filter((r) => evidenceSupportedRoundsSet.has(r));
  const suggestedPreparationRounds = allRoundOrder.filter((r) => !evidenceSupportedRoundsSet.has(r));

  const roundDescriptions: Record<CanonicalRoundCategory, string> = {
    Aptitude: `Quantitative, analytical, and engineering problem-solving aptitude for ${branch}`,
    Technical: `Core ${branch} fundamentals and domain concepts for ${role}`,
    'Coding / Practical':
      branch === 'CSE'
        ? 'Data Structures, Algorithms, and practical coding implementation'
        : branch === 'ECE'
          ? 'Embedded C/C++, Microcontroller firmware, and circuit logic practicals'
          : branch === 'Civil'
            ? 'Practical structural design calculations, IS/Eurocode checks, and STAAD.Pro/AutoCAD workflows'
            : branch === 'Mechanical'
              ? 'Practical CAD/FEA simulation, GD&T tolerance analysis, and design calculations'
              : branch === 'EEE'
                ? 'Practical electrical load sizing, circuit protection, and control logic'
                : `Practical tool workflows and applied scenarios for ${role}`,
    Managerial: 'Resume project deep dive, engineering trade-offs, and decision-making',
    HR: 'Behavioral fit, safety/ethics alignment, and career motivation',
  };

  const allQuestions = [...reportedQuestions, ...officialDerivedQuestions, ...aiPredictedQuestions];
  const rounds: RoundMetadata[] = allRoundOrder.map((r) => ({
    round: r,
    is_evidence_supported: evidenceSupportedRoundsSet.has(r),
    label: evidenceSupportedRoundsSet.has(r) ? 'Evidence-Supported Round' : 'Suggested Preparation Round',
    description: roundDescriptions[r],
    question_count: allQuestions.filter((q) => q.round === r).length,
  }));

  // 5. Ensure a matching Canonical Question Set exists in questionEngine for Direct & VR Interview launch
  const canonicalSet = await generateCanonicalQuestionSet({
    company: canonicalCompany,
    role,
    jobDescription: params.jobDescription || undefined,
    candidateSkills: skillList.join(', '),
    parsedResume: params.parsedResume,
    user_id: params.userId || 'guest',
  });

  const periodLabel = period === '6m' ? 'the last 6 months' : 'the last 1 year';
  let notice: string | undefined;
  if (verifiedQuestions.length === 0) {
    notice = `No verified public candidate reports with valid dates in ${periodLabel} were found for ${canonicalCompany} (${role} - ${branch}). Showing clearly labeled branch-matched AI_PREDICTED preparation questions.`;
  }

  const response: CompanyIntelligenceResponse = {
    cache_key: cacheKey,
    company: canonicalCompany,
    role,
    branch,
    branch_topics: getBranchCoreTopics(branch, role),
    period,
    search_provider_used: searchProviderUsed,
    retrieved_at: new Date().toISOString(),
    canonical_set_id: canonicalSet.set_id,
    rounds,
    evidence_supported_rounds: evidenceSupportedRounds,
    suggested_preparation_rounds: suggestedPreparationRounds,
    reported_questions: reportedQuestions,
    official_derived_questions: officialDerivedQuestions,
    ai_predicted_questions: aiPredictedQuestions,
    total_verified_count: verifiedQuestions.length,
    notice,
  };

  saveCacheToDisk(response);
  return response;
}
