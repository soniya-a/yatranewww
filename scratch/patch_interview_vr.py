import re

with open('src/pages/Interview.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Enhance speakText with executive male speech synthesis fallback
old_speak = '''  // Vocalize exact stored canonical question text verbatim using Gemini Live ONLY
  const speakText = (text: string) => {
    if (!text) return;
    pendingAiSpeech.current = text;
    setIsSpeaking(true);
    setAvatarState('speaking');

    if (geminiLiveClient && geminiLiveClient.isConnected()) {
      if (!geminiLiveClient.speakQuestion(text)) {
        setErrorMessage('Interviewer audio is unavailable. The active question is shown on screen.');
        setIsSpeaking(false);
        setAvatarState('idle');
      }
    } else {
      console.warn("Gemini Live not connected. Cannot speak question.");
      setIsSpeaking(false);
      setAvatarState('idle');
      setAiSpeech(text);
      pendingAiSpeech.current = null;
    }
  };'''

new_speak = '''  // Vocalize exact stored canonical question text verbatim using Gemini Live (Charon male voice) with Web Speech API male fallback
  const speakText = (text: string) => {
    if (!text) return;
    pendingAiSpeech.current = text;
    setIsSpeaking(true);
    setAvatarState('speaking');

    if (geminiLiveClient && geminiLiveClient.isConnected()) {
      if (geminiLiveClient.speakQuestion(text)) {
        return;
      }
    }

    // High-fidelity fallback: Web Speech API with executive male voice
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        const maleVoice = voices.find(v => 
          v.lang.startsWith('en') && 
          (v.name.toLowerCase().includes('david') || 
           v.name.toLowerCase().includes('male') || 
           v.name.toLowerCase().includes('george') || 
           v.name.toLowerCase().includes('james') ||
           v.name.toLowerCase().includes('guy') ||
           v.name.toLowerCase().includes('mark'))
        ) || voices.find(v => v.lang.startsWith('en'));
        if (maleVoice) utterance.voice = maleVoice;
        utterance.pitch = 0.92; // Authoritative executive male tone
        utterance.rate = 1.0;
        utterance.onstart = () => {
          setIsSpeaking(true);
          setAvatarState('speaking');
          setAiSpeech(text);
          pendingAiSpeech.current = null;
        };
        utterance.onend = () => {
          setIsSpeaking(false);
          setAvatarState('idle');
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          setAvatarState('idle');
        };
        window.speechSynthesis.speak(utterance);
        return;
      } catch (synthErr) {
        console.warn("[Interview] Speech synthesis fallback failed:", synthErr);
      }
    }

    // Text-only fallback if neither audio engine is available
    setIsSpeaking(false);
    setAvatarState('idle');
    setAiSpeech(text);
    pendingAiSpeech.current = null;
  };'''

# 2. Add VR mode interactive response console for desktop 3D fallback
old_vr_bottom = '''      {/* VR Minimal Bottom Live Speech Pill (Unobtrusive) */}
      {isVRActive && chatHistory.length > 0 && (
        <div className="absolute bottom-3 inset-x-0 flex justify-center items-center z-10 pointer-events-none px-4">
          <div className="bg-zinc-950/80 border border-zinc-800/80 backdrop-blur-md rounded-full py-1.5 px-4 shadow-lg text-center max-w-lg">
            <p className="text-[11px] text-zinc-300 truncate">
              <span className={chatHistory[chatHistory.length - 1].role === 'user' ? "text-cyan-400 font-bold" : "text-amber-400 font-bold"}>
                {chatHistory[chatHistory.length - 1].role === 'user' ? 'You: ' : 'Mr. Vinodh: '}
              </span>
              {chatHistory[chatHistory.length - 1].text}
            </p>
          </div>
        </div>
      )}'''

new_vr_bottom = '''      {/* VR Response Console: Live Speech Pill + Direct Keyboard Input Bar (Fallback for Desktop 3D / Mic Disabled) */}
      {isVRActive && (
        <div className="absolute bottom-4 inset-x-0 flex flex-col items-center gap-2 z-20 px-4 pointer-events-none">
          {chatHistory.length > 0 && (
            <div className="bg-zinc-950/85 border border-zinc-800/80 backdrop-blur-md rounded-full py-1 px-4 shadow-lg text-center max-w-xl pointer-events-auto">
              <p className="text-[11px] text-zinc-300 truncate">
                <span className={chatHistory[chatHistory.length - 1].role === 'user' ? "text-cyan-400 font-bold" : "text-amber-400 font-bold"}>
                  {chatHistory[chatHistory.length - 1].role === 'user' ? 'You: ' : 'Mr. Vinodh: '}
                </span>
                {chatHistory[chatHistory.length - 1].text}
              </p>
            </div>
          )}

          {/* Desktop 3D Answer Input Bar (Usable even when WebXR or microphone is unavailable) */}
          <div className="w-full max-w-xl bg-zinc-950/90 border border-zinc-800/90 backdrop-blur-md rounded-2xl p-2 shadow-2xl flex items-center gap-2 pointer-events-auto">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && inputText.trim() && !loadingQuestions && !isEvaluatingAnswer) {
                  handleUserMessage(inputText.trim());
                }
              }}
              placeholder="Type your answer or speak using the microphone..."
              className="flex-1 bg-zinc-900/90 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-cyan-500 transition-colors"
            />
            <button
              onClick={() => {
                if (inputText.trim()) {
                  handleUserMessage(inputText.trim());
                }
              }}
              disabled={!inputText.trim() || loadingQuestions || isEvaluatingAnswer}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap shadow-xs"
            >
              Submit & Next
            </button>
          </div>
        </div>
      )}'''

# Replace normalizations for CRLF and LF
content_normalized = content.replace('\r\n', '\n')
old_speak_normalized = old_speak.replace('\r\n', '\n')
old_vr_bottom_normalized = old_vr_bottom.replace('\r\n', '\n')

if old_speak_normalized in content_normalized:
    content_normalized = content_normalized.replace(old_speak_normalized, new_speak.replace('\r\n', '\n'))
    print("SUCCESS: speakText replaced")
else:
    print("WARN: speakText not matched")

if old_vr_bottom_normalized in content_normalized:
    content_normalized = content_normalized.replace(old_vr_bottom_normalized, new_vr_bottom.replace('\r\n', '\n'))
    print("SUCCESS: VR bottom console replaced")
else:
    print("WARN: VR bottom console not matched")

with open('src/pages/Interview.tsx', 'w', encoding='utf-8') as f:
    f.write(content_normalized)

print("Interview.tsx updated successfully!")
