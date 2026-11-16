import React from 'react';
import { Bot, Clock } from 'lucide-react';

interface AITranscriptCardProps {
  spokenText: string;
  duration?: string;
  isSpeaking?: boolean;
}

export const AITranscriptCard: React.FC<AITranscriptCardProps> = ({
  spokenText,
  duration = "00:00 - 00:08",
  isSpeaking = false
}) => {
  return (
    <div className="w-full bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between text-left h-full">
      <div>
        {/* Header: Blue Bot icon + AI Transcript */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-blue-700 tracking-tight">
            Mr. Vinodh — Hiring Manager
          </h3>
        </div>

        {/* AI Spoken Content */}
        <div className="text-gray-800 text-sm leading-relaxed min-h-[72px]">
          {spokenText ? (
            <p className="font-normal font-sans">
              "{spokenText}"
            </p>
          ) : (
            <p className="text-gray-400 italic text-xs">
              Awaiting interviewer verbal prompt...
            </p>
          )}
        </div>
      </div>

      {/* Footer: Duration timestamp */}
      <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-mono">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-gray-400" />
          {duration}
        </span>
        {isSpeaking && (
          <span className="text-blue-600 font-bold uppercase tracking-wider text-[10px] animate-pulse">
            Speaking
          </span>
        )}
      </div>
    </div>
  );
};
