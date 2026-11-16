// Gemini Multimodal Live API Client for Realtime Voice-to-Voice
// Uses ephemeral tokens for secure browser authentication (zero permanent API key exposure).

export type GeminiLiveMessage = {
  type: 'text' | 'audio';
  content?: string;
  isModel: boolean;
};

export interface GeminiLiveConfig {
  token: string;
  endpoint?: string;
  model?: string;
  voiceName?: string;
}

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private micProcessor: ScriptProcessorNode | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;

  // Modern precise Web Audio buffer playback scheduling
  private nextPlayTime: number = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private isCurrentlySpeaking: boolean = false;
  private speakingEndTimer: any = null;

  public onMessage: (msg: GeminiLiveMessage) => void = () => {};
  public onTurnComplete: (fullText: string) => void = () => {};
  public onConnectionStateChange: (state: 'connecting' | 'connected' | 'disconnected') => void = () => {};
  public onSpeakingChange: (isSpeaking: boolean) => void = () => {};
  public onDebug: (msg: string) => void = () => {};
  
  private currentTurnText: string = "";

  private token: string;
  private endpoint: string;
  private model: string;
  private voiceName: string;

  constructor(config: string | GeminiLiveConfig) {
    if (typeof config === 'string') {
      this.token = config;
      this.endpoint = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${this.token}`;
      this.model = "models/gemini-3.8-live";
      this.voiceName = "Charon";
    } else {
      this.token = config.token;
      this.model = config.model || "models/gemini-3.8-live";
      this.endpoint = config.endpoint || `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${this.token}`;
      this.voiceName = config.voiceName || "Charon";
    }
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  public async connect(): Promise<boolean> {
    return new Promise((resolve) => {
      this.onConnectionStateChange('connecting');
      try {
        this.ws = new WebSocket(this.endpoint);
      } catch (err) {
        console.error("[GeminiLive] Failed to open WebSocket:", err);
        this.onConnectionStateChange('disconnected');
        return resolve(false);
      }

      const connectionTimeout = setTimeout(() => {
        if (!this.isConnected()) {
          console.warn("[GeminiLive] Connection timeout after 10s");
          resolve(false);
        }
      }, 10000);

      this.ws.onopen = async () => {
        clearTimeout(connectionTimeout);
        this.onConnectionStateChange('connected');
        this.onDebug("Gemini Live WebSocket opened with ephemeral token");

        // Initialize AudioContext on 24000Hz (native sample rate of Gemini Live audio)
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            this.audioContext = new AudioContextClass({ sampleRate: 24000 });
            if (this.audioContext.state === 'suspended') {
              await this.audioContext.resume();
            }
          }
        } catch (e) {
          console.warn("[GeminiLive] AudioContext initialization deferred:", e);
        }

        // Send Setup Frame with Gemini 2.5 Flash Native Audio
        const setupPayload = {
          setup: {
            model: this.model,
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: this.voiceName
                  }
                }
              }
            },
            systemInstruction: {
              parts: [{
                text: "You are the voice of an interviewer. Only vocalize the exact interview question supplied by the application. Do not listen for, transcribe, answer, evaluate, acknowledge, or conversationally respond to candidate speech. Do not add greetings, feedback, or meta-commentary."
              }]
            }
          }
        };

        this.ws?.send(JSON.stringify(setupPayload));
        resolve(true);
      };

      this.ws.onmessage = async (e) => {
        let data: any;
        try {
          if (typeof e.data === 'string') {
            data = JSON.parse(e.data);
          } else if (e.data instanceof Blob) {
            const text = await e.data.text();
            data = JSON.parse(text);
          } else if (e.data instanceof ArrayBuffer) {
            const text = new TextDecoder().decode(e.data);
            data = JSON.parse(text);
          }
        } catch (err) {
          console.warn("[GeminiLive] Parse error on incoming frame", err);
          return;
        }

        if (!data) return;

        // Model responses
        if (data.serverContent?.modelTurn?.parts) {
          for (const p of data.serverContent.modelTurn.parts) {
            if (p.text) {
              this.currentTurnText += p.text;
              this.onMessage({ type: 'text', content: p.text, isModel: true });
            }
            if (p.inlineData?.data) {
              this.handleIncomingPcmAudio(p.inlineData.data);
            }
          }
        }

        if (data.serverContent?.turnComplete) {
          this.onDebug("Gemini Live model turn complete");
          if (this.currentTurnText) {
            this.onTurnComplete(this.currentTurnText);
            this.currentTurnText = "";
          }
        }
      };

      this.ws.onerror = (e) => {
        console.warn("[GeminiLive] WebSocket error:", e);
      };

      this.ws.onclose = (e) => {
        this.onConnectionStateChange('disconnected');
        this.onDebug(`Gemini Live closed: code=${e.code} reason=${e.reason}`);
        this.cleanupAudio();
      };
    });
  }

  // Playback PCM 24kHz audio chunks with precise web audio scheduling
  private handleIncomingPcmAudio(base64Data: string) {
    if (!this.audioContext) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioContextClass({ sampleRate: 24000 });
      } catch (e) {
        return;
      }
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const binary = atob(base64Data);
    const pcm16 = new Int16Array(binary.length / 2);
    for (let i = 0; i < pcm16.length; i++) {
      pcm16[i] = binary.charCodeAt(i * 2) | (binary.charCodeAt(i * 2 + 1) << 8);
    }

    // Convert 16-bit signed PCM to Float32 [-1.0, 1.0]
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 32768.0;
    }

    const audioBuffer = this.audioContext.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    const now = this.audioContext.currentTime;
    const startTime = Math.max(now, this.nextPlayTime);
    source.start(startTime);
    this.nextPlayTime = startTime + audioBuffer.duration;
    this.activeSources.push(source);

    if (!this.isCurrentlySpeaking) {
      this.isCurrentlySpeaking = true;
      this.onSpeakingChange(true);
    }

    // Reset scheduled silence detection timer
    if (this.speakingEndTimer) clearTimeout(this.speakingEndTimer);
    const remainingMs = Math.max(100, Math.ceil((this.nextPlayTime - now) * 1000) + 150);
    this.speakingEndTimer = setTimeout(() => {
      this.isCurrentlySpeaking = false;
      this.onSpeakingChange(false);
      this.activeSources = [];
    }, remainingMs);
  }

  // Instruct AI to speak the exact question verbatim
  public speakQuestion(questionText: string) {
    if (!this.isConnected()) {
      return false;
    }

    this.stopAudio();
    this.isCurrentlySpeaking = true;
    this.onSpeakingChange(true);
    this.ws?.send(JSON.stringify({
      clientContent: {
        turns: [{
          role: 'user',
          parts: [{
            text: `Please vocalize this interview question out loud verbatim. Do not add any greeting or meta-commentary: "${questionText}"`
          }]
        }],
        turnComplete: true
      }
    }));
    return true;
  }

  // Send raw microphone PCM audio to Gemini Live
  public sendMediaChunk(base64Pcm16: string) {
    if (this.isConnected()) {
      this.ws?.send(JSON.stringify({
        realtimeInput: {
          mediaChunks: [{
            mimeType: "audio/pcm;rate=16000",
            data: base64Pcm16
          }]
        }
      }));
    }
  }

  // Start microphone capture and streaming
  public async startMicrophone() {
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } });
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass({ sampleRate: 16000 });
      this.micSource = ctx.createMediaStreamSource(this.micStream);
      this.micProcessor = ctx.createScriptProcessor(4096, 1, 1);

      this.micProcessor.onaudioprocess = (e) => {
        // Prevent echo loop: Never stream microphone audio while interviewer is vocalizing
        if (this.isCurrentlySpeaking || this.activeSources.length > 0) {
          return;
        }

        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          let s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        // Convert to base64
        const buffer = new ArrayBuffer(pcm16.length * 2);
        const view = new DataView(buffer);
        for (let i = 0; i < pcm16.length; i++) {
          view.setInt16(i * 2, pcm16[i], true); // true for little-endian
        }
        
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        this.sendMediaChunk(base64);
      };

      this.micSource.connect(this.micProcessor);
      this.micProcessor.connect(ctx.destination);
      return true;
    } catch (e) {
      console.error("[GeminiLive] Failed to start microphone", e);
      return false;
    }
  }

  public stopMicrophone() {
    if (this.micProcessor) {
      this.micProcessor.disconnect();
      this.micProcessor = null;
    }
    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
  }

  // Interrupt / stop current audio playback immediately
  public stopAudio() {
    for (const src of this.activeSources) {
      try {
        src.stop();
        src.disconnect();
      } catch (e) {
        // already stopped
      }
    }
    this.activeSources = [];
    if (this.audioContext) {
      this.nextPlayTime = this.audioContext.currentTime;
    }
    if (this.speakingEndTimer) {
      clearTimeout(this.speakingEndTimer);
      this.speakingEndTimer = null;
    }
    if (this.isCurrentlySpeaking) {
      this.isCurrentlySpeaking = false;
      this.onSpeakingChange(false);
    }
  }

  private cleanupAudio() {
    this.stopAudio();
    this.micStream?.getTracks().forEach(t => t.stop());
    if (this.micProcessor) {
      try {
        this.micProcessor.disconnect();
        this.micSource?.disconnect();
      } catch (e) {}
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (e) {}
    }
  }

  public cleanup() {
    this.cleanupAudio();
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }
  }
}
