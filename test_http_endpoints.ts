async function testEndpoints() {
  console.log("Testing POST /api/interview/generate-canonical-set on http://localhost:3000...");
  
  const generateRes = await fetch("http://localhost:3000/api/interview/generate-canonical-set", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      company: "TCS",
      role: "Software Engineer / AI",
      jobDescription: "Developing enterprise AI systems with Python and cloud services.",
      parsedResume: {
        candidate_name: "Soniya J",
        skills: ["Python", "TensorFlow", "React", "PostgreSQL"],
        projects: [
          {
            name: "Enterprise Chatbot",
            description: "Built semantic search bot achieving 94% user satisfaction.",
            technologies: ["Python", "LangChain", "Vector DB"],
            metrics: ["94% user satisfaction"]
          }
        ]
      }
    })
  });

  if (!generateRes.ok) {
    throw new Error(`generate-canonical-set failed: ${generateRes.status} ${await generateRes.text()}`);
  }

  const set = await generateRes.json();
  console.log(`Generated set_id: ${set.set_id}`);
  console.log(`Questions count: ${set.questions?.length}`);
  console.log(`Rounds count: ${set.rounds?.length}`);

  // Test GET /api/interview/question-set/:setId
  console.log(`\nTesting GET /api/interview/question-set/${set.set_id}...`);
  const getRes = await fetch(`http://localhost:3000/api/interview/question-set/${set.set_id}`);
  if (!getRes.ok) {
    throw new Error(`get question-set failed: ${getRes.status} ${await getRes.text()}`);
  }

  const retrieved = await getRes.json();
  console.log(`Retrieved set_id: ${retrieved.set_id}`);
  console.log(`First question: [${retrieved.questions[0].question_id}] (${retrieved.questions[0].category}) "${retrieved.questions[0].question_text}"`);
  console.log("\nHTTP ENDPOINT TEST PASSED!");
}

testEndpoints().catch(err => {
  console.error("HTTP test failed:", err);
  process.exit(1);
});
