import React, { useState, useMemo } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, CircleDot } from 'lucide-react';
import { CanonicalInterviewQuestion } from '../../types/interview';

interface QuestionQueueProps {
  questions: CanonicalInterviewQuestion[] | any[];
  currentQuestionIndex: number;
  answers: Record<string, string>;
  onSelectQuestion?: (index: number) => void;
}

const ROUND_COLORS = [
  { bg: 'bg-blue-600', text: 'text-white' },
  { bg: 'bg-amber-500', text: 'text-white' },
  { bg: 'bg-purple-600', text: 'text-white' },
  { bg: 'bg-emerald-600', text: 'text-white' },
  { bg: 'bg-rose-500', text: 'text-white' },
  { bg: 'bg-cyan-600', text: 'text-white' },
  { bg: 'bg-indigo-600', text: 'text-white' }
];

export const QuestionQueue: React.FC<QuestionQueueProps> = ({
  questions,
  currentQuestionIndex,
  answers,
  onSelectQuestion
}) => {
  // Dynamically group questions by round from the canonical set
  const groupedRounds = useMemo(() => {
    const groups: {
      roundName: string;
      questions: { question: any; originalIndex: number }[];
    }[] = [];

    questions.forEach((q, idx) => {
      const rName = q.round_name || q.round || q.category || 'Interview Round';
      let existing = groups.find(g => g.roundName.toLowerCase() === rName.toLowerCase());
      if (!existing) {
        existing = { roundName: rName, questions: [] };
        groups.push(existing);
      }
      existing.questions.push({ question: q, originalIndex: idx });
    });

    return groups;
  }, [questions]);

  // Track accordion open/close state per round (default all open)
  const [openRounds, setOpenRounds] = useState<Record<string, boolean>>({});

  const toggleRound = (roundName: string) => {
    setOpenRounds(prev => ({
      ...prev,
      [roundName]: prev[roundName] === undefined ? false : !prev[roundName]
    }));
  };

  const isRoundOpen = (roundName: string) => {
    return openRounds[roundName] !== false; // open by default
  };

  // Helper to extract a concise short title for the question row
  const getShortQuestionTitle = (q: any) => {
    if (q.title) return q.title;
    const text = q.question_text || q.question || '';
    // Strip quotes or leading numbering if present
    const clean = text.replace(/^["'\d\.\-\s]+/, '').trim();
    if (clean.length <= 48) return clean;
    return clean.substring(0, 45) + '...';
  };

  return (
    <div className="w-full bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs flex flex-col h-full text-left">
      {/* Header: Title + Dynamic Counts */}
      <div className="flex items-center justify-between gap-2 pb-3.5 mb-4 border-b border-gray-200/80">
        <h2 className="text-sm font-black text-gray-900 tracking-tight">
          Interview Question Queue
        </h2>
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 font-sans shrink-0">
          {questions.length} Questions • {groupedRounds.length} Rounds
        </span>
      </div>

      {/* Scrollable list of Dynamic Round Groups */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-gray-200">
        {groupedRounds.map((group, rIdx) => {
          const color = ROUND_COLORS[rIdx % ROUND_COLORS.length];
          const isOpen = isRoundOpen(group.roundName);

          // Calculate completed count for this round
          const completedInRound = group.questions.filter(({ question }) => {
            const qId = question.question_id || question.id;
            return Boolean(answers[qId]);
          }).length;

          const totalInRound = group.questions.length;

          return (
            <div
              key={group.roundName + rIdx}
              className="rounded-xl border border-gray-200/80 bg-gray-50/50 overflow-hidden"
            >
              {/* Round Group Header (Clickable Accordion) */}
              <button
                type="button"
                onClick={() => toggleRound(group.roundName)}
                className="w-full px-3.5 py-3 flex items-center justify-between gap-2 bg-white hover:bg-gray-50/80 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Round Number Circle */}
                  <div className={`w-6 h-6 rounded-full ${color.bg} ${color.text} flex items-center justify-center font-bold text-xs shrink-0 shadow-xs`}>
                    {rIdx + 1}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <span className="text-xs font-bold text-gray-900">
                      {group.roundName}
                    </span>
                    <span className="text-[11px] text-gray-500 font-medium ml-1 whitespace-nowrap">
                      ({totalInRound} {totalInRound === 1 ? 'Q' : 'Q'})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-bold text-gray-600 font-mono">
                    {completedInRound}/{totalInRound} completed
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Questions in Round (Accordion Content) */}
              {isOpen && (
                <div className="p-2 space-y-1.5 border-t border-gray-100 bg-white">
                  {group.questions.map(({ question: q, originalIndex: idx }) => {
                    const qId = q.question_id || `Q${String(idx + 1).padStart(3, '0')}`;
                    const isCurrent = idx === currentQuestionIndex;
                    const isAnswered = Boolean(answers[qId]);
                    const shortTitle = getShortQuestionTitle(q);

                    return (
                      <div
                        key={qId || idx}
                        onClick={() => onSelectQuestion && onSelectQuestion(idx)}
                        className={`w-full px-3 py-2 rounded-lg flex items-center justify-between gap-2.5 transition-all text-xs cursor-pointer ${
                          isCurrent
                            ? 'bg-blue-50/90 border border-blue-300/80 shadow-xs'
                            : isAnswered
                            ? 'bg-gray-50/60 hover:bg-gray-100/70 border border-transparent'
                            : 'hover:bg-gray-50 border border-transparent'
                        }`}
                      >
                        {/* Left: Question ID + Short Title + Answer preview */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`font-mono font-bold text-[11px] px-1.5 py-0.5 rounded shrink-0 ${
                              isCurrent
                                ? 'bg-blue-600 text-white'
                                : isAnswered
                                ? 'bg-gray-200 text-gray-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}>
                              {qId}
                            </span>
                            <span className={`truncate text-xs ${
                              isCurrent
                                ? 'font-bold text-blue-950'
                                : isAnswered
                                ? 'font-medium text-gray-800'
                                : 'text-gray-600 font-normal'
                            }`}>
                              {shortTitle}
                            </span>
                          </div>
                          {isAnswered && answers[qId] && (
                            <p className="text-[11px] text-gray-500 truncate mt-0.5 pl-0.5 font-normal">
                              {answers[qId]}
                            </p>
                          )}
                        </div>

                        {/* Right: State indicator badge */}
                        <div className="shrink-0 flex items-center">
                          {isAnswered ? (
                            <div className="flex items-center gap-1 text-emerald-600 text-[11px] font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-100" />
                              <span>Answer Saved</span>
                            </div>
                          ) : isCurrent ? (
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100/80 border border-blue-300 text-blue-700 text-[11px] font-bold">
                              <CircleDot className="w-3 h-3 text-blue-600" />
                              <span>Current</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-gray-400 font-medium">
                              Not answered
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
