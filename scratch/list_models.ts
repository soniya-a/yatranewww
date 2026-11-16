import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

async function main() {
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "",
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });
  try {
    const response = await ai.models.list();
    for await (const m of response) {
      console.log(m.name);
    }
  } catch (err: any) {
    console.error("List models error:", err.message);
  }
}

main();
