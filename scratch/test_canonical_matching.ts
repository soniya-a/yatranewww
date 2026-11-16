import fs from 'fs';
import path from 'path';
import { extractTextFromPDF } from '../src/lib/pdfParser';
import { buildCanonicalProfile } from '../src/lib/profile/candidateProfileBuilder';
import { determinePrimaryTargetRole, enrichJobsWithMatching } from '../src/lib/jobs/liveJobMatcher';
import { calculatePrioritySkillGaps } from '../src/engine/roadmapEngine';

async function main() {
  const buf = fs.readFileSync('public/assets/soniyaj resumee.pdf');
  const extractRes = await extractTextFromPDF(buf);
  const text = extractRes.text;

  // Simulate server parse result
  const parseRes = await fetch('http://localhost:3000/api/resume/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer mock-token' },
    body: JSON.stringify({ resumeText: text })
  });
  const parseData = await parseRes.json();

  console.log('--- 1. Canonical Profile Construction ---');
  const canonical = buildCanonicalProfile(parseData, null, text);
  console.log('Domain:', canonical.domain);
  console.log('Primary Role:', canonical.primaryRole);
  console.log('Target Roles:', canonical.targetRoles);
  console.log('Classification Status:', canonical.classificationStatus);
  console.log('Confidence:', canonical.classificationConfidence);
  console.log('Skills count:', canonical.skills.length);
  console.log('Skills list:', canonical.skills);

  console.log('\n--- 2. Primary Target Role Determination ---');
  const primaryTarget = determinePrimaryTargetRole(canonical);
  console.log('Determined Target Role:', primaryTarget);

  console.log('\n--- 3. Downstream Job-Description Matching against Real JD ---');
  // Define a real job description for an AI/ML Software Engineer
  const realJob = {
    id: "job-real-001",
    title: "AI/ML Software Engineer",
    company: "Tech Mahindra",
    location: "Bangalore, India",
    description: "Looking for an AI/ML Engineer skilled in Python, PyTorch, LLMs, NLP, PostgreSQL, REST APIs, and Docker.",
    created: new Date().toISOString()
  };

  const enriched = enrichJobsWithMatching([realJob], canonical);
  console.log('Match Score:', enriched[0].matchScore);
  console.log('Match Tier:', enriched[0].matchTier);
  console.log('Matched Skills:', enriched[0].matchedSkills);
  console.log('Missing Skills:', enriched[0].missingSkills);
  console.log('Match Summary:', enriched[0].matchSummary);

  console.log('\n--- 4. Skill Gap Calculation for Career Roadmap ---');
  const targetRole = "AI/ML Software Engineer";
  const gaps = calculatePrioritySkillGaps({
    company: "Tech Mahindra",
    role: targetRole,
    resumeSkills: canonical.skills,
    matchedSkills: enriched[0].matchedSkills,
    missingSkills: enriched[0].missingSkills
  });
  console.log('Identified Skill Gaps for', targetRole + ':', JSON.stringify(gaps, null, 2));
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
