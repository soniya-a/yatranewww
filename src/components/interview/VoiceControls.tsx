import React, { useState } from 'react';
import { Mic, MicOff, Video, VideoOff, ChevronDown, ChevronRight, FastForward, Edit3 } from 'lucide-react';

interface VoiceControlsProps {
  isMicOn: boolean;
  onToggleMic: () => void;
  isCameraOn?: boolean;
  onToggleCamera?: () => void;
  onSubmitAnswer: () => void;
  onSkipQuestion: () => void;
  canSubmit: boolean;
  inputText: string;
  onInputTextChange: (text: string) => void;
  disabled?: boolean;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
  isMicOn,
  onToggleMic,
  isCameraOn = false,
  onToggleCamera,
  onSubmitAnswer,
  onSkipQuestion,
  canSubmit,
  inputText,
  onInputTextChange,
  disabled = false
}) => {
  const [showTextInput, setShowTextInput] = useState(false);

  return (
    <div className="w-full bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs flex flex-col items-center justify-center gap-4 relative overflow-hidden">
      {/* Background subtle soundwave curve decoration */}
      <div className="absolute inset-x-0 bottom-0 h-16 opacity-30 pointer-events-none flex items-end justify-center">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-12 text-blue-100 fill-current">
          <path d="M0,0 C150,90 350,-40 500,40 C650,120 900,20 1200,40 L1200,120 L0,120 Z"></path>
        </svg>
      </div>

      {/* Top Row: Mic Selector + Central Mic Button + Camera Selector */}
      <div className="w-full flex items-center justify-between px-2 sm:px-6 relative z-10">
        {/* Left: Mic Mode Toggle */}
        <button
          onClick={onToggleMic}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all shadow-xs cursor-pointer ${
            isMicOn
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
          }`}
        >
          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            {isMicOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5 text-gray-500" />}
          </div>
          <span>Mic: {isMicOn ? 'ON' : 'OFF'}</span>
          <ChevronDown className="w-3 h-3 text-gray-400" />
        </button>

        {/* Center: Big Animated Recording Button */}
        <div className="flex flex-col items-center justify-center -my-1">
          <div className="relative flex items-center justify-center">
            {/* Animated ripple pulses when recording */}
            {isMicOn && (
              <>
                <span className="absolute w-20 h-20 rounded-full bg-red-400/20 animate-ping pointer-events-none" />
                <span className="absolute w-16 h-16 rounded-full bg-red-500/30 animate-pulse pointer-events-none" />
              </>
            )}

            <button
              onClick={onToggleMic}
              disabled={disabled}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg cursor-pointer transform active:scale-95 ${
                isMicOn
                  ? 'bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-red-500/30 scale-105'
                  : 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-blue-500/25 hover:scale-102'
              }`}
              title={isMicOn ? "Click to stop speaking" : "Click to speak"}
            >
              {isMicOn ? (
                <Mic className="w-6 h-6 text-white animate-pulse" />
              ) : (
                <MicOff className="w-6 h-6 text-white" />
              )}
            </button>
          </div>

          <span className="text-[11px] font-semibold text-gray-600 mt-2 tracking-tight">
            {isMicOn ? 'Click to stop speaking' : 'Click to speak'}
          </span>
        </div>

        {/* Right: Camera Mode Toggle */}
        <button
          onClick={onToggleCamera}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all shadow-xs cursor-pointer ${
            isCameraOn
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
          }`}
        >
          <div className="w-6 h-6 rounded-full bg-gray-200/80 text-gray-600 flex items-center justify-center shrink-0">
            {isCameraOn ? <Video className="w-3.5 h-3.5 text-emerald-600" /> : <VideoOff className="w-3.5 h-3.5 text-gray-500" />}
          </div>
          <span>Camera: {isCameraOn ? 'ON' : 'OFF'}</span>
          <ChevronDown className="w-3 h-3 text-gray-400" />
        </button>
      </div>

      {/* Fallback keyboard text input & live transcript edit bar */}
      <div className="w-full relative z-10 flex flex-col items-center">
        <div className="w-full mt-1 flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => onInputTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canSubmit && !disabled) {
                onSubmitAnswer();
              }
            }}
            placeholder="Type your answer or speak using the microphone..."
            className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-xs text-gray-800 outline-none focus:border-blue-500 focus:bg-white transition-colors shadow-xs"
          />
        </div>
      </div>

      {/* Bottom Action Buttons: Submit Answer & Next + Skip Question */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-10 pt-1">
        {/* Submit & Next Button (occupies 2 columns on wide screens) */}
        <button
          onClick={onSubmitAnswer}
          disabled={!canSubmit || disabled}
          className="sm:col-span-2 py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 active:scale-[0.99] text-white text-xs font-bold uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Submit Answer & Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Skip Question Button */}
        <button
          onClick={onSkipQuestion}
          disabled={disabled}
          className="py-3.5 px-4 rounded-xl border border-gray-300 hover:bg-gray-50 active:scale-[0.99] text-gray-700 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
        >
          <FastForward className="w-3.5 h-3.5 text-gray-500" />
          <span>Skip Question</span>
        </button>
      </div>
    </div>
  );
};
