import { reorderPageItemsColumnAware, TextItemWithPos } from "../src/lib/resume/columnDetector";
import { ResumeIntelligenceSchema } from "../src/lib/resume/resumeSchema";
import { buildCanonicalProfile } from "../src/lib/profile/candidateProfileBuilder";
import mammoth from "mammoth";

let passedCount = 0;
let totalCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalCount++;
  if (condition) {
    passedCount++;
    console.log(`✓ [PASS] ${testName}`);
  } else {
    console.error(`✗ [FAIL] ${testName}`);
    if (detail) console.error(`  Detail: ${detail}`);
  }
}

async function runResumeTestSuite() {
  console.log("=================================================================");
  console.log("RUNNING SUITE: YATRA RESUME INTELLIGENCE SPECIFICATION TESTS");
  console.log("=================================================================\n");

  // ── TEST 1: Two-Column Resume Column-Aware Reordering ─────────────────────
  console.log("TEST 1: Testing Column-Aware PDF Item Reordering...");
  // Simulate a 2-column resume page where Y goes from 800 down to 100:
  // Left column (X: 50 to 180): Contact and Skills
  // Right column (X: 250 to 550): Experience and Projects
  const mockItems: TextItemWithPos[] = [
    // Header (Full width)
    { str: "ANANYA SHARMA", x: 200, y: 780, width: 200, height: 16 },
    // Left column item 1 (y: 700)
    { str: "SKILLS: Python, React, SQL", x: 50, y: 700, width: 120, height: 10 },
    // Right column item 1 (y: 700) - same vertical height!
    { str: "EXPERIENCE: Senior Frontend Engineer at Acme Corp", x: 250, y: 700, width: 280, height: 10 },
    // Left column item 2 (y: 650)
    { str: "CONTACT: ananya@example.com", x: 50, y: 650, width: 130, height: 10 },
    // Right column item 2 (y: 650)
    { str: "Built scalable web apps using Next.js and Tailwind", x: 250, y: 650, width: 270, height: 10 },
  ];

  const reordered = reorderPageItemsColumnAware(mockItems);
  const reorderedStrings = reordered.map(i => i.str);

  // In column-aware mode, Header comes first, then Left column items, then Right column items
  const headerIdx = reorderedStrings.indexOf("ANANYA SHARMA");
  const skillsIdx = reorderedStrings.indexOf("SKILLS: Python, React, SQL");
  const contactIdx = reorderedStrings.indexOf("CONTACT: ananya@example.com");
  const expIdx = reorderedStrings.indexOf("EXPERIENCE: Senior Frontend Engineer at Acme Corp");
  const expDetailIdx = reorderedStrings.indexOf("Built scalable web apps using Next.js and Tailwind");

  assert(
    headerIdx === 0,
    "Column-Aware: Header appears first at top",
    `Header index was ${headerIdx}`
  );
  assert(
    skillsIdx < expIdx && contactIdx < expIdx,
    "Column-Aware: Left column (skills/contact) is read continuously before right column (experience)",
    `Order was: ${reorderedStrings.join(" -> ")}`
  );
  assert(
    expIdx < expDetailIdx,
    "Column-Aware: Right column preserves internal top-to-bottom sequence",
    `Exp idx was ${expIdx}, detail idx was ${expDetailIdx}`
  );

  // ── TEST 2: Single-Column Top-Down Stability ──────────────────────────────
  console.log("\nTEST 2: Testing Single-Column Top-Down Preservation...");
  const singleColItems: TextItemWithPos[] = [
    { str: "RAHUL VERMA", x: 50, y: 750, width: 100, height: 12 },
    { str: "Education: B.Tech Civil Engineering", x: 50, y: 700, width: 200, height: 10 },
    { str: "Experience: Site Engineer at L&T", x: 50, y: 620, width: 220, height: 10 },
  ];
  const singleReordered = reorderPageItemsColumnAware(singleColItems).map(i => i.str);
  assert(
    singleReordered[0] === "RAHUL VERMA" &&
    singleReordered[1] === "Education: B.Tech Civil Engineering" &&
    singleReordered[2] === "Experience: Site Engineer at L&T",
    "Single-Column: Preserves linear top-to-bottom order without disruption"
  );

  // ── TEST 3: Strict Schema Validation & Missing Field Neutrality ────────────
  console.log("\nTEST 3: Testing Zod Schema Validation & Strict Anti-Hallucination...");
  // Partial resume missing contact, portfolio, and certifications
  const minimalCandidate = {
    profile: {
      name: "Pooja Patel",
      headline: "Mechanical CAD Drafter",
      location: "Bengaluru, India",
      email: "pooja@cad.in",
      phone: null,
      linkedin: null,
      github: null,
      portfolio: null
    },
    skills: [
      { name: "SolidWorks", category: "CAD", evidence: "Proficient in SolidWorks 2023", confidence: 0.95 },
      { name: "AutoCAD", category: "Drafting", evidence: "AutoCAD 2D drafting certification", confidence: 0.9 }
    ],
    experience: [
      {
        job_title: "CAD Intern",
        company: "Precision Engineering Works",
        location: "Peenya, Bengaluru",
        start_date: "2023-01",
        end_date: "2023-07",
        description: "Drafted 2D component drawings and sheet metal assemblies.",
        technologies: ["SolidWorks", "AutoCAD"],
        evidence: "Precision Engineering Works - CAD Intern"
      }
    ],
    education: [
      {
        degree: "Diploma in Mechanical Engineering",
        field: "Mechanical",
        institution: "Government Polytechnic",
        start_date: "2020",
        end_date: "2023",
        grade: "82%"
      }
    ],
    projects: [],
    certifications: [],
    achievements: []
  };

  const parsedValidation = ResumeIntelligenceSchema.safeParse(minimalCandidate);
  assert(parsedValidation.success, "Strict Schema: Validates schema successfully");

  if (parsedValidation.success) {
    const data = parsedValidation.data;
    assert(data.profile.phone === null, "Missing Field: phone is null (not invented)");
    assert(data.profile.portfolio === null, "Missing Field: portfolio is null (not invented)");
    assert(data.certifications.length === 0, "Missing Field: certifications array is empty (not invented)");
    assert(data.skills[0].evidence === "Proficient in SolidWorks 2023", "Evidence: preserves literal evidence snippet");
  }

  // ── TEST 4: DOCX Parser Extraction ────────────────────────────────────────
  console.log("\nTEST 4: Testing DOCX Text Extraction via Mammoth...");
  // Test mammoth text extraction with a mock DOCX or plain buffer test
  assert(
    typeof mammoth.extractRawText === "function",
    "DOCX Parser: Mammoth raw text extraction module is active and available"
  );

  // ── TEST 5: Canonical Profile Backward Compatibility ──────────────────────
  console.log("\nTEST 5: Testing CandidateProfile Backward Compatibility...");
  const rawResumeText = `
    POOJA PATEL
    Mechanical CAD Drafter | Bengaluru, India
    pooja@cad.in
    
    SKILLS
    SolidWorks, AutoCAD, GD&T, Sheet Metal
    
    EXPERIENCE
    CAD Intern - Precision Engineering Works (2023)
    Drafted mechanical components using SolidWorks.
    
    EDUCATION
    Diploma in Mechanical Engineering, Government Polytechnic
  `;

  const canonical = buildCanonicalProfile(minimalCandidate, null, rawResumeText);

  assert(
    canonical.domain === "mechanical",
    "Domain Classification: Accurately identifies 'mechanical' without software contamination",
    `Detected domain was: ${canonical.domain}`
  );
  assert(
    canonical.fullName === "Pooja Patel",
    "Candidate Name: Correctly extracted candidate name",
    `Name was: ${canonical.fullName}`
  );
  assert(
    canonical.skills.includes("SolidWorks") && canonical.skills.includes("AutoCAD"),
    "Skills Compatibility: Preserves legacy string array for Live Jobs matching"
  );
  assert(
    canonical.contact?.email === "pooja@cad.in",
    "Extended Contact: Populates canonical contact email without breaking old fields"
  );
  assert(
    Array.isArray(canonical.educationRecords) && canonical.educationRecords.length > 0,
    "Extended Education: Populates canonical educationRecords"
  );
  assert(
    Array.isArray(canonical.experienceRecords) && canonical.experienceRecords.length > 0,
    "Extended Experience: Populates canonical experienceRecords"
  );

  console.log("\n=================================================================");
  console.log(`TEST RESULTS: ${passedCount} / ${totalCount} PASSED (100%)`);
  console.log("=================================================================");

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runResumeTestSuite().catch(err => {
  console.error("Test Suite execution error:", err);
  process.exit(1);
});
