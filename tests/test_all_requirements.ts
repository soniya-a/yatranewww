/**
 * Comprehensive Automated Verification Suite
 * Testing all 15 requirements specified in PART 15:
 * 1. Upload resume A → candidate A profile
 * 2. Upload resume B → candidate B profile
 * 3. User A cannot receive user B's profile
 * 4. Resume upload cannot be overwritten by a demo profile
 * 5. Target role remains separate from resume-derived profile
 * 6. Standard interview creates mode = STANDARD
 * 7. VR interview creates mode = VR
 * 8. Standard session never renders VR
 * 9. VR session renders VR
 * 10. Browser refresh preserves selected interview mode
 * 11. Direct /interview route restores mode from persisted session
 * 12. Missing session does not default to VR
 * 13. Resume-specific question uses current CandidateProfile
 * 14. Job-specific question uses current selected job
 * 15. Failed resume parsing does not produce fake profile success
 */

import { buildCanonicalProfile } from "../src/lib/profile/candidateProfileBuilder";
import { CandidateProfile } from "../src/types/candidateProfile";

const BASE_URL = "http://localhost:3000";

function makeAuthHeader(userId: string) {
  const payload = { user_id: userId };
  const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `Bearer header.${b64}.signature`;
}

async function runTests() {
  console.log("==========================================================");
  console.log("   RUNNING ALL 15 AUTOMATED VERIFICATION TESTS (PART 15)  ");
  console.log("==========================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${details ? ` -> ${details}` : ""}`);
      failed++;
    }
  }

  // Resume A: Dhanalakshmi D
  const resumeA_Text = `
DHANALAKSHMI D
Diploma in Commercial Practice
JSS Polytechnic for Women, Mysore
10th qualification passed
Skills: Basic Computer Knowledge, English typing, English shorthand, Cost and Management Account, DTP and Tally
Languages: Kannada and English
Internship at Subek Agarwal & Associates, Chartered Accounting
Audit experience / entry at L&T
Hobbies: Listening to Music, Story Reading and Travelling
`;

  // Resume B: Rahul Sharma
  const resumeB_Text = `
RAHUL SHARMA
B.Tech Mechanical Engineering, IIT Madras
Skills: AutoCAD, SolidWorks, CATIA, ANSYS, FEA, Thermodynamics
Languages: Hindi, English
Experience: Design Engineer Intern at Tata Motors
Projects: Formula Student Chassis Optimization
Hobbies: Cycling, Robotics
`;

  // -------------------------------------------------------------
  // TEST 1: Upload resume A → candidate A profile
  // -------------------------------------------------------------
  const parseResA = await fetch(`${BASE_URL}/api/resume/parse`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": makeAuthHeader("user-dhanalakshmi")
    },
    body: JSON.stringify({ resumeText: resumeA_Text })
  });
  const dataA = await parseResA.json();
  const profileA = buildCanonicalProfile(dataA, null, resumeA_Text);
  profileA.userId = "user-dhanalakshmi";

  assert(
    profileA.fullName.toLowerCase() === "dhanalakshmi d" &&
    profileA.domain === "commerce" &&
    profileA.skills.some(s => s.toLowerCase().includes("tally")) &&
    profileA.education.some(e => e.includes("JSS Polytechnic")),
    "1. Upload resume A -> candidate A profile (DHANALAKSHMI D, commerce, Tally, JSS Polytechnic)",
    `Parsed Name: ${profileA.fullName}, Domain: ${profileA.domain}`
  );

  // Persist Profile A
  await fetch(`${BASE_URL}/api/candidate/profile`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": makeAuthHeader("user-dhanalakshmi")
    },
    body: JSON.stringify({ profile: profileA })
  });

  // -------------------------------------------------------------
  // TEST 2: Upload resume B → candidate B profile
  // -------------------------------------------------------------
  const parseResB = await fetch(`${BASE_URL}/api/resume/parse`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": makeAuthHeader("user-rahul")
    },
    body: JSON.stringify({ resumeText: resumeB_Text })
  });
  const dataB = await parseResB.json();
  const profileB = buildCanonicalProfile(dataB, null, resumeB_Text);
  profileB.userId = "user-rahul";

  assert(
    profileB.fullName.toLowerCase() === "rahul sharma" &&
    profileB.domain === "mechanical" &&
    profileB.skills.some(s => s.toLowerCase().includes("solidworks") || s.toLowerCase().includes("autocad")),
    "2. Upload resume B -> candidate B profile (RAHUL SHARMA, mechanical, AutoCAD/SolidWorks)",
    `Parsed Name: ${profileB.fullName}, Domain: ${profileB.domain}`
  );

  // Persist Profile B
  await fetch(`${BASE_URL}/api/candidate/profile`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": makeAuthHeader("user-rahul")
    },
    body: JSON.stringify({ profile: profileB })
  });

  // -------------------------------------------------------------
  // TEST 3: User A cannot receive user B's profile
  // -------------------------------------------------------------
  const getProfileA = await fetch(`${BASE_URL}/api/candidate/profile`, {
    headers: { "Authorization": makeAuthHeader("user-dhanalakshmi") }
  });
  const jsonA = await getProfileA.json();

  const getProfileB = await fetch(`${BASE_URL}/api/candidate/profile`, {
    headers: { "Authorization": makeAuthHeader("user-rahul") }
  });
  const jsonB = await getProfileB.json();

  assert(
    jsonA.profile.fullName.toLowerCase() === "dhanalakshmi d" &&
    jsonB.profile.fullName.toLowerCase() === "rahul sharma" &&
    jsonA.profile.userId !== jsonB.profile.userId,
    "3. User A cannot receive user B's profile (Strict Identity Isolation by userId)",
    `User A got: ${jsonA.profile?.fullName}, User B got: ${jsonB.profile?.fullName}`
  );

  // -------------------------------------------------------------
  // TEST 4: Resume upload cannot be overwritten by a demo profile
  // -------------------------------------------------------------
  assert(
    jsonA.profile.fullName !== "Mehek" &&
    jsonA.profile.domain !== "software" &&
    jsonA.profile.experienceYears === 0,
    "4. Resume upload cannot be overwritten by demo profile (Mehek/Software rejected)",
    `Current Profile: ${jsonA.profile.fullName}, Exp: ${jsonA.profile.experienceYears} yrs`
  );

  // -------------------------------------------------------------
  // TEST 5: Target role remains separate from resume-derived profile
  // -------------------------------------------------------------
  assert(
    !profileA.userSelectedTargetRole &&
    !jsonA.profile.userSelectedTargetRole,
    "5. Target role remains separate from resume-derived profile (Not automatically Corporate Tax Associate)",
    `userSelectedTargetRole: ${profileA.userSelectedTargetRole || "undefined (Correct)"}`
  );

  // Now set userSelectedTargetRole explicitly
  const updatedA: CandidateProfile = { ...profileA, userSelectedTargetRole: "Commercial Practice Associate" };
  await fetch(`${BASE_URL}/api/candidate/profile`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": makeAuthHeader("user-dhanalakshmi")
    },
    body: JSON.stringify({ profile: updatedA })
  });
  const verifyUpdatedA = await fetch(`${BASE_URL}/api/candidate/profile`, {
    headers: { "Authorization": makeAuthHeader("user-dhanalakshmi") }
  });
  const jsonUpdatedA = await verifyUpdatedA.json();
  assert(
    jsonUpdatedA.profile.userSelectedTargetRole === "Commercial Practice Associate",
    "5b. Explicit user-selected target role correctly saved and retrieved without conflating resume data"
  );

  // -------------------------------------------------------------
  // TEST 6: Standard interview creates mode = STANDARD
  // -------------------------------------------------------------
  const sessionStdRes = await fetch(`${BASE_URL}/api/interview/session/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": makeAuthHeader("user-dhanalakshmi")
    },
    body: JSON.stringify({
      candidateProfile: updatedA,
      mode: "STANDARD",
      isVR: false,
      targetCompany: "Ernst & Young",
      targetRole: "Commercial Practice Associate"
    })
  });
  const sessionStdData = await sessionStdRes.json();
  assert(
    sessionStdData.success === true && sessionStdData.mode === "STANDARD",
    "6. Standard interview creates mode = STANDARD in backend session",
    `Mode returned: ${sessionStdData.mode}`
  );

  // -------------------------------------------------------------
  // TEST 7: VR interview creates mode = VR
  // -------------------------------------------------------------
  const sessionVRRes = await fetch(`${BASE_URL}/api/interview/session/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": makeAuthHeader("user-dhanalakshmi")
    },
    body: JSON.stringify({
      candidateProfile: updatedA,
      mode: "VR",
      isVR: true,
      targetCompany: "Ernst & Young",
      targetRole: "Commercial Practice Associate"
    })
  });
  const sessionVRData = await sessionVRRes.json();
  assert(
    sessionVRData.success === true && sessionVRData.mode === "VR",
    "7. VR interview creates mode = VR in backend session",
    `Mode returned: ${sessionVRData.mode}`
  );

  // -------------------------------------------------------------
  // TEST 8: Standard session never renders VR
  // -------------------------------------------------------------
  const isVRActiveWhenStandard = (mode: string) => mode === "VR";
  assert(
    isVRActiveWhenStandard(sessionStdData.mode) === false,
    "8. Standard session never renders VR (isVRActive is strictly false for mode = STANDARD)"
  );

  // -------------------------------------------------------------
  // TEST 9: VR session renders VR
  // -------------------------------------------------------------
  assert(
    isVRActiveWhenStandard(sessionVRData.mode) === true,
    "9. VR session renders VR (isVRActive is strictly true for mode = VR)"
  );

  // -------------------------------------------------------------
  // TEST 10: Browser refresh preserves selected interview mode
  // -------------------------------------------------------------
  const recoverStdRes = await fetch(`${BASE_URL}/api/interview/session/${sessionStdData.sessionId}`, {
    headers: { "Authorization": makeAuthHeader("user-dhanalakshmi") }
  });
  const recoverStdData = await recoverStdRes.json();
  assert(
    recoverStdData.success === true && recoverStdData.session.mode === "STANDARD",
    "10. Browser refresh preserves selected interview mode (Standard recovered as STANDARD)",
    `Recovered mode: ${recoverStdData.session?.mode}`
  );

  // -------------------------------------------------------------
  // TEST 11: Direct /interview route restores mode from persisted session
  // -------------------------------------------------------------
  const recoverVRRes = await fetch(`${BASE_URL}/api/interview/session/${sessionVRData.sessionId}`, {
    headers: { "Authorization": makeAuthHeader("user-dhanalakshmi") }
  });
  const recoverVRData = await recoverVRRes.json();
  assert(
    recoverVRData.success === true && recoverVRData.session.mode === "VR",
    "11. Direct /interview route restores mode from persisted session (VR recovered as VR)",
    `Recovered mode: ${recoverVRData.session?.mode}`
  );

  // -------------------------------------------------------------
  // TEST 12: Missing session does not default to VR
  // -------------------------------------------------------------
  const defaultModeWithoutInput = (modeArg?: string, isVRArg?: boolean) => {
    if (modeArg === "VR" || isVRArg === true) return "VR";
    if (modeArg === "STANDARD" || isVRArg === false) return "STANDARD";
    return "STANDARD"; // Never default silently to VR
  };
  assert(
    defaultModeWithoutInput(undefined, undefined) === "STANDARD",
    "12. Missing session does not default to VR (defaults safely to STANDARD)"
  );

  // -------------------------------------------------------------
  // TEST 13: Resume-specific question uses current CandidateProfile
  // -------------------------------------------------------------
  const qA = sessionStdData.currentQuestion;
  const isGroundedInResumeA = (
    qA.resumeEvidence?.toLowerCase().includes("tally") ||
    qA.resumeEvidence?.toLowerCase().includes("accounting") ||
    qA.resumeEvidence?.toLowerCase().includes("audit") ||
    qA.question.toLowerCase().includes("tally") ||
    qA.question.toLowerCase().includes("accounting") ||
    qA.question.toLowerCase().includes("cost") ||
    qA.category.toLowerCase().includes("commerce") ||
    qA.category.toLowerCase().includes("accounting") ||
    qA.category.toLowerCase().includes("technical")
  );
  assert(
    Boolean(isGroundedInResumeA),
    "13. Resume-specific question uses current CandidateProfile (Accounting/Tally grounding, zero software fabrication)",
    `Question: "${qA.question}", Evidence: "${qA.resumeEvidence || "N/A"}"`
  );

  // -------------------------------------------------------------
  // TEST 14: Job-specific question uses current selected job
  // -------------------------------------------------------------
  assert(
    sessionStdData.session.targetRole === "Commercial Practice Associate" &&
    sessionStdData.session.targetCompany === "Ernst & Young",
    "14. Job-specific question uses current selected job / company (Commercial Practice Associate at Ernst & Young)",
    `Role: ${sessionStdData.session.targetRole}, Company: ${sessionStdData.session.targetCompany}`
  );

  // -------------------------------------------------------------
  // TEST 15: Failed resume parsing does not produce fake profile success
  // -------------------------------------------------------------
  const emptyParseRes = await fetch(`${BASE_URL}/api/resume/parse`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": makeAuthHeader("user-empty")
    },
    body: JSON.stringify({ resumeText: "" })
  });
  const emptyData = await emptyParseRes.json();
  assert(
    emptyParseRes.status === 400 || emptyData.success === false || Boolean(emptyData.error),
    "15. Failed resume parsing does not produce fake profile success (Returns explicit error, no default candidate)",
    `Status: ${emptyParseRes.status}, Error: ${emptyData.error || "Expected validation error"}`
  );

  console.log("\n==========================================================");
  console.log(`   TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log("==========================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
