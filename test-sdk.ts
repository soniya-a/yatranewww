import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: 'test' });
console.log(Object.keys(ai));
if (ai.live) {
  console.log('ai.live keys:', Object.keys(ai.live));
}
if (ai.clients) {
  console.log('ai.clients keys:', Object.keys(ai.clients));
}
