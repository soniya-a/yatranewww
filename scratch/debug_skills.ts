async function debugParse() {
  const resumeText = 'SARAH THOMPSON\nSenior Project Manager\nSkills: Project Management, Agile, Scrum, JIRA';
  const res = await fetch('http://localhost:3000/api/resume/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer mock-token' },
    body: JSON.stringify({ resumeText })
  });
  const data = await res.json();
  console.log('rawSkills:', data.rawSkills);
  console.log('normalizedSkills:', data.normalizedSkills);
  console.log('skills:', data.skills);
  console.log('unmatchedSkills:', data.unmatchedSkills);
}

debugParse().catch(console.error);
