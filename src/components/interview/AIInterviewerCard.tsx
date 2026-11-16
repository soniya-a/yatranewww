import React from 'react';
import { Volume2, VolumeX, Pause, Play, Activity } from 'lucide-react';

interface AIInterviewerCardProps {
  isSpeaking: boolean;
  avatarState?: 'idle' | 'speaking' | 'thinking' | 'listening' | 'error';
  company?: string;
  onToggleSpeaking: () => void;
  onReplayVoice: () => void;
}

export const AIInterviewerCard: React.FC<AIInterviewerCardProps> = ({
  isSpeaking,
  avatarState = 'idle',
  onToggleSpeaking,
  onReplayVoice,
}) => {
  const getStatusText = () => {
    if (isSpeaking || avatarState === 'speaking') return 'AI is speaking...';
    if (avatarState === 'listening') return 'AI is listening...';
    if (avatarState === 'thinking') return 'AI is thinking...';
    if (avatarState === 'error') return 'Connection retry...';
    return 'AI awaiting response';
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Avatar Container Card */}
      <div className="w-full bg-white border border-gray-200/90 rounded-2xl overflow-hidden shadow-xs relative aspect-[3/3.8] flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 group">
        <img
          src="/avatars/mr-vinodh.png"
          alt="Mr. Vinodh — Hiring Manager"
          className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-102"
        />

        {/* Ambient subtle vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

        {/* Bottom Left Badge: AI Interviewer with live waveform / mic status */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md text-white text-xs font-semibold shadow-md border border-white/10">
          <span>Mr. Vinodh — Hiring Manager</span>
          {isSpeaking ? (
            <div className="flex items-center gap-0.5 h-3 ml-0.5">
              <span className="w-0.5 bg-emerald-400 h-2.5 animate-pulse rounded-full" />
              <span className="w-0.5 bg-emerald-400 h-3.5 animate-[bounce_0.6s_infinite] rounded-full" />
              <span className="w-0.5 bg-emerald-400 h-2 animate-[bounce_0.8s_infinite] rounded-full" />
            </div>
          ) : (
            <Activity className="w-3 h-3 text-cyan-400 opacity-80" />
          )}
        </div>

        {/* Replay voice button on hover (top right) */}
        <button
          onClick={onReplayVoice}
          className="absolute top-3 right-3 p-2 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-md"
          title="Replay Voice Question"
        >
          <Volume2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Waveform & Speaking Status Pill (directly below avatar) */}
      <div className="w-full bg-white border border-gray-200/80 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-xs">
        {/* Animated Waveform Visualizer */}
        <div className="flex items-center gap-1 h-6 px-1 flex-1">
          {[40, 70, 95, 60, 85, 100, 75, 45, 90, 65, 80, 50, 95, 70, 40].map((h, i) => (
            <span
              key={i}
              className={`flex-1 rounded-full transition-all duration-150 ${
                isSpeaking
                  ? 'bg-blue-600'
                  : 'bg-blue-200'
              }`}
              style={{
                height: isSpeaking ? `${Math.max(20, (h * (0.4 + Math.random() * 0.6)))}%` : '20%',
                transitionDelay: `${i * 15}ms`
              }}
            />
          ))}
        </div>

        {/* Pause / Resume Button */}
        <button
          onClick={onToggleSpeaking}
          className="w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 active:scale-95 text-white flex items-center justify-center shrink-0 shadow-sm transition-all cursor-pointer"
          title={isSpeaking ? "Pause AI Speech" : "Replay AI Speech"}
        >
          {isSpeaking ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
        </button>

        {/* Speaking Status Pill */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors ${
          isSpeaking
            ? 'bg-blue-50 text-blue-700 border border-blue-200'
            : 'bg-gray-100 text-gray-600 border border-gray-200'
        }`}>
          {isSpeaking ? <Volume2 className="w-3.5 h-3.5 text-blue-600" /> : <VolumeX className="w-3.5 h-3.5 text-gray-400" />}
          <span className="truncate max-w-[120px]">{getStatusText()}</span>
        </div>
      </div>
    </div>
  );
};
