import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
console.log('Testing with API key:', apiKey ? apiKey.substring(0, 10) + '...' : 'none');
if (apiKey) {
  const ai = new GoogleGenAI({ apiKey });
  for (const m of ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-3.6-flash']) {
    try {
      const t0 = Date.now();
      const res = await ai.models.generateContent({
        model: m,
        contents: 'Hi'
      });
      console.log(m, 'SUCCESS in', Date.now() - t0, 'ms:', res.text?.substring(0, 50));
    } catch (e) {
      console.log(m, 'FAILED:', e.message);
    }
  }
}
