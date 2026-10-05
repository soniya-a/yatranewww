import { generateCanonicalQuestionSet } from './src/engine/questionEngine';

async function runTests() {
  const tests = [
    { company: 'L&T', role: 'Structural Engineer', jobDescription: 'Design structures and calculate loads.' },
    { company: 'Exponent Energy', role: 'Electrical Engineer', jobDescription: 'Design power electronics and battery systems.' },
    { company: 'Google', role: 'Software Engineer', jobDescription: 'Develop scalable backend systems in Go.' }
  ];

  for (const t of tests) {
    console.log(`\n================================`);
    console.log(`Testing: ${t.company} - ${t.role}`);
    console.log(`================================`);
    try {
      const result = await generateCanonicalQuestionSet({
        company: t.company,
        role: t.role,
        jobDescription: t.jobDescription,
        parsedResume: {
          skills: [],
          projects: [],
          experience: []
        }
      });

      result.questions.forEach(q => {
        console.log(`\n[${q.category}] (${q.round}) ${q.question_id}`);
        console.log(`Q: ${q.question_text}`);
        if (q.source) {
          console.log(`Source: ${q.source.platform} - ${q.source.url}`);
        }
        if (q.prediction_metadata) {
          console.log(`Prediction Reason: ${q.prediction_metadata.reason_generated}`);
        }
      });
      console.log(`\nWarnings:`, result.warnings);
    } catch (e) {
      console.error(e);
    }
  }
}

runTests();
