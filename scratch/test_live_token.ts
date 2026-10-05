import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

async function testLiveToken() {
  const ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: { apiVersion: 'v1alpha' }
  });
  console.log("Generating ephemeral token with v1alpha...");
  const tokenObj = await ai.authTokens.create({
    config: {
      uses: 5,
    }
  });
  console.log("Token generated:", tokenObj.name);

  const tokenVal = tokenObj.name.startsWith('auth_tokens/') 
    ? tokenObj.name.replace('auth_tokens/', '') 
    : tokenObj.name;

  const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${tokenVal}`;

  const candidateModels = [
    "models/gemini-2.5-flash-native-audio-latest",
    "models/gemini-3.1-flash-live-preview",
    "models/gemini-2.5-flash"
  ];

  for (const model of candidateModels) {
    console.log(`\n--- Testing model: ${model} ---`);
    const success = await new Promise((resolve) => {
      const ws = new WebSocket(url);
      const timer = setTimeout(() => {
        console.log(`[${model}] Timeout`);
        ws.close();
        resolve(false);
      }, 7000);

      ws.onopen = () => {
        console.log(`[${model}] WS OPEN! Sending setup...`);
        ws.send(JSON.stringify({
          setup: {
            model: model,
            generationConfig: {
              responseModalities: ["AUDIO"]
            }
          }
        }));
      };

      ws.onmessage = (event) => {
        console.log(`[${model}] SUCCESS! Received:`, typeof event.data === 'string' ? event.data.slice(0, 150) : 'binary');
        clearTimeout(timer);
        ws.close();
        resolve(true);
      };

      ws.onerror = (err) => {
        console.log(`[${model}] WS Error:`, (err as any).message || err);
      };

      ws.onclose = (ev) => {
        console.log(`[${model}] Closed: code=${ev.code} reason=${ev.reason}`);
        clearTimeout(timer);
        resolve(false);
      };
    });

    if (success) {
      console.log(`\n🎉 WINNER MODEL: ${model}`);
      return;
    }
  }
}

testLiveToken();
