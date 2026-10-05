import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

async function testLiveAudioSpeak() {
  const ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: { apiVersion: 'v1alpha' }
  });
  console.log("Generating ephemeral token...");
  const tokenObj = await ai.authTokens.create({
    config: {
      uses: 10,
    }
  });
  const tokenVal = tokenObj.name.replace('auth_tokens/', '');
  const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${tokenVal}`;

  return new Promise((resolve) => {
    const ws = new WebSocket(url);
    let setupComplete = false;
    let audioBytesReceived = 0;

    const timer = setTimeout(() => {
      console.log("[AudioTest] Timeout after 12s. Audio bytes:", audioBytesReceived);
      ws.close();
      resolve(audioBytesReceived > 0);
    }, 12000);

    ws.onopen = () => {
      console.log("[AudioTest] WS OPEN! Sending setup for gemini-2.5-flash-native-audio-latest...");
      ws.send(JSON.stringify({
        setup: {
          model: "models/gemini-2.5-flash-native-audio-latest",
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: "Aoede"
                }
              }
            }
          },
          systemInstruction: {
            parts: [{
              text: "You are the AI interviewer. When given an interview question text to read, speak the exact question out loud. Do not add conversational chatter."
            }]
          }
        }
      }));
    };

    ws.onmessage = async (event) => {
      let data: any;
      if (typeof event.data === 'string') {
        data = JSON.parse(event.data);
      } else if (event.data instanceof Blob) {
        const text = await event.data.text();
        data = JSON.parse(text);
      } else {
        // Buffer or ArrayBuffer
        const text = Buffer.from(event.data as any).toString('utf-8');
        try {
          data = JSON.parse(text);
        } catch {
          data = {};
        }
      }

      // Check if setup complete acknowledgment
      if (data.setupComplete || !setupComplete) {
        setupComplete = true;
        console.log("[AudioTest] Setup acknowledged. Sending question to vocalize...");
        ws.send(JSON.stringify({
          clientContent: {
            turns: [{
              role: 'user',
              parts: [{
                text: "Please read the following question out loud exactly as written: 'Tell me about a challenging distributed systems problem you solved.'"
              }]
            }],
            turnComplete: true
          }
        }));
        return;
      }

      if (data.serverContent?.modelTurn?.parts) {
        for (const p of data.serverContent.modelTurn.parts) {
          if (p.inlineData?.data) {
            const chunkLen = p.inlineData.data.length;
            audioBytesReceived += chunkLen;
            console.log(`[AudioTest] Received audio chunk (${chunkLen} base64 chars, mime: ${p.inlineData.mimeType})`);
          }
          if (p.text) {
            console.log(`[AudioTest] Received text part: "${p.text}"`);
          }
        }
      }

      if (data.serverContent?.turnComplete) {
        console.log(`[AudioTest] Model turn complete! Total audio base64 length: ${audioBytesReceived}`);
        clearTimeout(timer);
        ws.close();
        resolve(audioBytesReceived > 0);
      }
    };

    ws.onerror = (err) => {
      console.error("[AudioTest] WS Error:", (err as any).message || err);
    };

    ws.onclose = (ev) => {
      console.log(`[AudioTest] WS closed: ${ev.code} ${ev.reason}`);
      clearTimeout(timer);
      resolve(audioBytesReceived > 0);
    };
  });
}

testLiveAudioSpeak().then((success) => {
  console.log("Audio test result:", success ? "SUCCESSFUL AUDIO VOCALIZATION" : "FAILED");
});
