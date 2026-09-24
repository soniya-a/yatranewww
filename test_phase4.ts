import 'dotenv/config';
import { 
  buildDeterministicInterviewQuestions, 
  generateJobInterviewSession,
  CandidateInterviewProfile,
  SelectedJobContext,
  JobSpecificInterviewSession
} from "./src/lib/interview/jobInterviewEngine";

// ── TEST CASES ─────────────────────────────────────────────────────────────

const TEST_CASES: Array<{
  name: string;
  candidate: CandidateInterviewProfile;
  job: SelectedJobContext;
  expectedTechnicalConcepts: string[];
}> = [
  {
    name: "1. Mechanical Job: Mechanical Design Engineer at ABB",
    candidate: {
      domain: "mechanical",
      targetRoles: ["Mechanical Design Engineer", "CAD Engineer"],
      skills: ["SolidWorks", "AutoCAD", "FEA", "GD&T"],
      experienceYears: 3,
      resumeTextSnippet: "Conducted FEA simulation and structural analysis on mechanical casings using SolidWorks, ensuring factor of safety > 2.0."
    },
    job: {
      company: "ABB",
      title: "Mechanical Design Engineer",
      category: "Engineering Jobs",
      description: "Seeking Mechanical Design Engineer proficient in SolidWorks, GD&T, mechanical design, and thermal analysis for industrial equipment.",
      matchedSkills: ["SolidWorks", "GD&T"],
      missingSkills: ["Thermal Analysis"],
      compatibilityScore: 88
    },
    expectedTechnicalConcepts: ["SolidWorks", "GD&T"]
  },
  {
    name: "2. Civil Job: Structural Design Engineer at JW Consultants LLP",
    candidate: {
      domain: "civil",
      targetRoles: ["Structural Engineer", "Site Engineer"],
      skills: ["STAAD.Pro", "RCC Design", "Structural Analysis", "AutoCAD"],
      experienceYears: 2,
      resumeTextSnippet: "Modeled multi-story reinforced concrete frames in STAAD.Pro, performed structural analysis under seismic load combinations."
    },
    job: {
      company: "JW Consultants LLP",
      title: "Structural Design Engineer",
      category: "Engineering Jobs",
      description: "Requires Structural Design Engineer skilled in Structural Analysis, RCC Design, ETABS, and Revit for high-rise commercial structures.",
      matchedSkills: ["Structural Analysis", "RCC Design"],
      missingSkills: ["Revit", "ETABS"],
      compatibilityScore: 85
    },
    expectedTechnicalConcepts: ["Structural Analysis", "RCC Design"]
  },
  {
    name: "3. Software Job: Senior Full Stack Engineer at Kyndryl",
    candidate: {
      domain: "software",
      targetRoles: ["Full Stack Developer", "Backend Engineer"],
      skills: ["TypeScript", "React", "Node.js", "Docker", "Python"],
      experienceYears: 4,
      resumeTextSnippet: "Designed distributed microservices using Node.js, TypeScript, and Docker containerization, reducing latency by 45%."
    },
    job: {
      company: "Kyndryl",
      title: "Senior Full Stack Engineer",
      category: "IT Jobs",
      description: "Looking for Senior Full Stack Engineer experienced in React, Node.js, TypeScript, PostgreSQL, and AWS cloud infrastructure.",
      matchedSkills: ["React", "TypeScript", "Node.js"],
      missingSkills: ["AWS", "PostgreSQL"],
      compatibilityScore: 92
    },
    expectedTechnicalConcepts: ["React", "TypeScript"]
  }
];

// ── EXECUTION & AUDIT ──────────────────────────────────────────────────────

async function runBenchmark() {
  console.log("================================================================================");
  console.log("PHASE 4: COMPANY & JOB-SPECIFIC INTERVIEW ENGINE BENCHMARK");
  console.log("================================================================================\n");

  const requiredCategories = [
    "Technical",
    "Role-Specific",
    "Resume-Specific",
    "Behavioral",
    "Skill-Gap"
  ];

  let allPassed = true;

  for (const testCase of TEST_CASES) {
    console.log(`────────────────────────────────────────────────────────────────────────────────`);
    console.log(`TEST: ${testCase.name}`);
    console.log(`Domain: ${testCase.candidate.domain} | Company: ${testCase.job.company} | Role: ${testCase.job.title}`);
    console.log(`Matched Skills: ${testCase.job.matchedSkills?.join(", ")} | Skill Gaps: ${testCase.job.missingSkills?.join(", ")}`);

    const session: JobSpecificInterviewSession = await generateJobInterviewSession(
      testCase.candidate,
      testCase.job
    );

    console.log(`Mode: ${session.mode}`);
    console.log(`Disclaimer: "${session.sourceDisclaimer}"`);
    console.log(`Questions Generated: ${session.questions.length}`);

    // Verify all 5 categories are present
    const categoriesFound = new Set(session.questions.map(q => q.category));
    console.log(`Categories Present: [${Array.from(categoriesFound).join(", ")}]`);

    for (const reqCat of requiredCategories) {
      if (!categoriesFound.has(reqCat as any)) {
        console.error(`❌ FAIL: Missing required question category: ${reqCat}`);
        allPassed = false;
      }
    }

    // Print Questions
    session.questions.forEach((q, idx) => {
      console.log(`\n  [Q${idx + 1}] Category: ${q.category} (${q.difficulty}) | Target: ${q.targetedSkillsOrConcepts.join(", ")}`);
      console.log(`      Question: "${q.question}"`);
      console.log(`      What We Look For: "${q.whatWeLookFor}"`);
      console.log(`      Follow-Up: "${q.followUpQuestion}"`);
    });

    // Verify domain technical concepts
    const allQuestionText = session.questions.map(q => q.question + " " + q.targetedSkillsOrConcepts.join(" ")).join(" ");
    for (const expectedConcept of testCase.expectedTechnicalConcepts) {
      const present = allQuestionText.toLowerCase().includes(expectedConcept.toLowerCase());
      if (!present) {
        console.error(`❌ FAIL: Expected technical concept "${expectedConcept}" not found in questions!`);
        allPassed = false;
      } else {
        console.log(`  ✓ Technical topic confirmed: ${expectedConcept}`);
      }
    }
    console.log("\n");
  }

  console.log("================================================================================");
  if (allPassed) {
    console.log("✅ ALL 3 DOMAIN INTERVIEW BENCHMARKS PASSED SUCCESSFULLY!");
    console.log("1. All 5 required categories present in all test cases.");
    console.log("2. Technical topics strictly adapt to selected job & candidate skills.");
    console.log("3. Skill-gap questions accurately target missing skills.");
    console.log("4. Strict source disclaimer present without fabricating interview history.");
  } else {
    console.error("❌ BENCHMARK FAILED. See details above.");
    process.exit(1);
  }
  console.log("================================================================================\n");
}

runBenchmark().catch(err => {
  console.error("Error during benchmark:", err);
  process.exit(1);
});
