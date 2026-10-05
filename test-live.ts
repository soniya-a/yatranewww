import { GoogleGenAI } from '@google/genai';

async function run() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const client = await ai.live.connect({ model: "models/gemini-2.0-flash-exp" });
    console.log("Connected:", Object.keys(client));
    client.close();
  } catch(e) {
    console.log(e);
  }
}
run();
