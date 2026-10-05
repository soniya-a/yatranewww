import React from 'react';
import { Calendar, Code } from 'lucide-react';
import { CanonicalInterviewQuestion } from '../../types/interview';
import { QuestionSourceCard } from './QuestionSourceCard';
import Editor from '@monaco-editor/react';

interface CanonicalQuestionCardProps {
  question: CanonicalInterviewQuestion | any;
  index: number;
  totalQuestions: number;
  role?: string;
  company?: string;
  onCodeChange?: (code: string) => void;
  codeValue?: string;
}

export const CanonicalQuestionCard: React.FC<CanonicalQuestionCardProps> = ({
  question,
  index,
  totalQuestions,
  role = 'Candidate',
  company = 'Company',
  onCodeChange,
  codeValue = '// Write your code here...'
}) => {
  if (!question) {
    return (
      <div className="w-full bg-white border border-gray-200/90 rounded-2xl p-6 shadow-xs text-center text-gray-400">
        Loading canonical interview question...
      </div>
    );
  }

  const qId = question.question_id || `Q${String(index + 1).padStart(3, '0')}`;
  const roundName = question.round_name || question.round || question.category || 'Technical Round';
  const category = question.category || 'AI_PREDICTED';
  const questionText = question.question_text || question.question || '';

  const isCodingQuestion = 
    roundName.toLowerCase().includes('coding') || 
    roundName.toLowerCase().includes('dsa') || 
    roundName.toLowerCase().includes('technical') || 
    roundName.toLowerCase().includes('system design');

  // Get date asked
  const askedDate = question.source?.interview_date 
    ? question.source.interview_date 
    : question.source?.published_date 
    ? question.source.published_date 
    : 'Recent';

  const getCategoryBadge = () => {
    switch (category) {
      case 'REPORTED':
        return (
          <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/90 font-bold text-xs uppercase tracking-wider">
            REPORTED
          </span>
        );
      case 'OFFICIAL_DERIVED':
        return (
          <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200/90 font-bold text-xs uppercase tracking-wider">
            OFFICIAL DERIVED
          </span>
        );
      case 'RESUME_BASED':
        return (
          <span className="px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200/90 font-bold text-xs uppercase tracking-wider">
            RESUME BASED
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200/90 font-bold text-xs uppercase tracking-wider">
            AI PREDICTED
          </span>
        );
    }
  };

  return (
    <div className="w-full bg-white border border-gray-200/90 rounded-2xl p-6 shadow-xs text-left">
      {/* Top Metadata Badges */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Question ID pill */}
          <span className="px-3 py-1 rounded-md bg-blue-600 text-white font-mono text-xs font-black shadow-xs">
            {qId}
          </span>

          {/* Round badge */}
          <span className="px-3 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200/80 font-semibold text-xs">
            {roundName}
          </span>

          {/* Evidence Category badge */}
          {getCategoryBadge()}
        </div>

        {/* Asked Date indicator */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
          <span>Asked: {askedDate}</span>
        </div>
      </div>

      {/* Actual Canonical Question Text */}
      <div className="my-2">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 leading-snug tracking-tight font-sans">
          "{questionText}"
        </h2>
      </div>

      {/* Follow-up hints / expectations (if available) */}
      {question.what_we_look_for && (
        <div className="mt-3 p-3 rounded-lg bg-blue-50/50 border border-blue-100 text-xs text-blue-900/90">
          <span className="font-bold text-blue-800 mr-1.5">Interviewer Focus:</span>
          {question.what_we_look_for}
        </div>
      )}

      {/* Conditionally Rendered Coding Ground */}
      {isCodingQuestion && (
        <div className="mt-4 mb-4 border border-gray-200/90 rounded-xl overflow-hidden bg-[#1e1e1e]">
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border-b border-zinc-800 text-zinc-400 text-xs font-semibold">
            <Code className="w-4 h-4" />
            Coding Ground
          </div>
          <div className="h-[250px] md:h-[300px]">
            <Editor
              height="100%"
              defaultLanguage="javascript"
              theme="vs-dark"
              value={codeValue}
              onChange={(value) => onCodeChange && onCodeChange(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineHeight: 24,
                padding: { top: 16 },
                scrollBeyondLastLine: false,
              }}
            />
          </div>
        </div>
      )}

      {/* Full Source Provenance Section */}
      <QuestionSourceCard
        question={question}
        targetRole={role}
        targetCompany={company}
      />
    </div>
  );
};
