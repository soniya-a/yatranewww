import React from 'react';
import { Mic, Clock } from 'lucide-react';

interface CandidateTranscriptCardProps {
  liveTranscript: string;
  interimTranscript?: string;
  isMicOn: boolean;
  duration?: string;
}

export const CandidateTranscriptCard: React.FC<CandidateTranscriptCardProps> = ({
  liveTranscript,
  interimTranscript = '',
  isMicOn,
  duration = "00:00 - 00:14"
}) => {
  const hasSpoken = Boolean(liveTranscript.trim() || interimTranscript.trim());

  return (
    <div className="w-full bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between text-left h-full">
      <div>
        {/* Header: Green Mic icon + Your Live Transcript */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <Mic className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-emerald-700 tracking-tight">
            Your Live Transcript
          </h3>
        </div>

        {/* Live Candidate Spoken Text */}
        <div className="text-gray-800 text-sm leading-relaxed min-h-[72px]">
          {hasSpoken ? (
            <p className="font-normal font-sans">
              {liveTranscript}
              {liveTranscript && interimTranscript ? ' ' : ''}
              <span className="text-emerald-700 font-medium italic underline decoration-emerald-300">
                {interimTranscript}
              </span>
            </p>
          ) : (
            <p className="text-gray-400 italic text-xs leading-relaxed">
              {isMicOn
                ? "Microphone is recording. Speak clearly into your mic to see your words transcribe here in real time."
                : "Microphone is muted. Click the red microphone button below to begin speaking your answer."}
            </p>
          )}
        </div>
      </div>

      {/* Footer: Live Recording indicator + Duration */}
      <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-mono">
        <div className="flex items-center gap-2">
          {isMicOn ? (
            <span className="flex items-center gap-1.5 text-red-600 font-semibold">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              Recording...
            </span>
          ) : (
            <span className="text-gray-400">Mic muted</span>
          )}
        </div>

        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-gray-400" />
          {duration}
        </span>
      </div>
    </div>
  );
};
