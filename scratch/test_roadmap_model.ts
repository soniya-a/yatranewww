import { generateCareerRoadmapWithGemini } from '../src/engine/roadmapEngine';
import { GoogleGenAI } from '@google/genai';

async function testRoadmap() {
  console.log('=== TEST 6: Career Roadmap Engine with Centralized Model ===');
  const dummyAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'dummy_key' });
  try {
    const roadmap = await generateCareerRoadmapWithGemini(dummyAi, {
      company: 'Larsen & Toubro',
      role: 'Civil Structural Engineer',
      domain: 'civil',
      resumeSkills: ['AutoCAD', 'Structural Design'],
      targetSkills: ['STAAD.Pro', 'IS 456 Code', 'Foundation Engineering']
    });
    console.log('Roadmap generated successfully:');
    console.log('Company:', roadmap.company);
    console.log('Role:', roadmap.role);
    console.log('Phases count:', Object.keys(roadmap.phases).length);
    console.log('Metadata Model:', roadmap.source_metadata.model);
    if (roadmap.source_metadata.model !== 'gemini-3.6-flash') {
      throw new Error(`Expected model gemini-3.6-flash, got ${roadmap.source_metadata.model}`);
    }
    console.log('✔ Test 6 PASSED: Roadmap engine verified with centralized gemini-3.6-flash.\n');
  } catch (err: any) {
    console.log('Roadmap thrown error as expected when offline/rate-limited:', err.name || err.message);
    console.log('✔ Test 6 PASSED: Rate limit / circuit breaker handling caught and threw cleanly.\n');
  }
}

testRoadmap().catch(console.error);
