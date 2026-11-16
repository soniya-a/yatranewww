import React from 'react';
import { Clock, PhoneOff, Building2 } from 'lucide-react';

interface InterviewHeaderProps {
  company: string;
  role: string;
  setId?: string;
  currentQuestionIndex: number;
  totalQuestions: number;
  timeLeft: number;
  isLiveConnected?: boolean;
  onEndInterview: () => void;
}

export const InterviewHeader: React.FC<InterviewHeaderProps> = ({
  company,
  role,
  currentQuestionIndex,
  totalQuestions,
  timeLeft,
  isLiveConnected = true,
  onEndInterview
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const displayCompany = company ? company.trim() : "Enterprise";
  const displayRole = role ? role.trim() : "Candidate Assessment";

  // Derive stylish monogram or initials from company name
  const initials = displayCompany
    .split(/[\s&/_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');

  return (
    <header className="w-full bg-white border-b border-gray-200/80 px-6 py-3.5 flex items-center justify-between shadow-xs sticky top-0 z-30">
      {/* Left: Dynamic Company Logo & Role */}
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-700 to-indigo-900 text-white flex items-center justify-center font-black text-sm tracking-wider shadow-sm shrink-0 border border-blue-800">
          {initials || <Building2 className="w-5 h-5" />}
        </div>
        <div className="text-left">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-black text-gray-900 tracking-tight uppercase leading-none">
              {displayCompany}
            </h1>
            <span className="text-gray-300 font-light">|</span>
            <span className="text-xs font-bold text-gray-600">
              Interview Session
            </span>
          </div>
          <p className="text-xs text-gray-500 font-medium mt-0.5 truncate max-w-md">
            {displayRole}
          </p>
        </div>
      </div>

      {/* Right: Dynamic Status Pills + Timer + End Interview */}
      <div className="flex items-center gap-3">
        {/* Status indicator badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{isLiveConnected ? "Gemini Live: Connected" : "Voice Engine: Active"}</span>
        </div>

        {/* Dynamic Timer */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 text-xs font-mono font-bold">
          <Clock className="w-3.5 h-3.5 text-gray-500" />
          <span>{formatTime(timeLeft)}</span>
        </div>

        {/* Dynamic Question counter pill */}
        <div className="px-3.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold tracking-tight font-sans">
          {totalQuestions > 0 && currentQuestionIndex < totalQuestions ? (
            `Question ${currentQuestionIndex + 1} of ${totalQuestions}`
          ) : totalQuestions > 0 ? (
            `All ${totalQuestions} Questions Completed`
          ) : (
            "Loading Questions..."
          )}
        </div>

        {/* End Interview Action */}
        <button
          onClick={onEndInterview}
          className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          title="Conclude Interview Session"
        >
          <PhoneOff className="w-3.5 h-3.5" />
          <span>End Interview</span>
        </button>
      </div>
    </header>
  );
};
