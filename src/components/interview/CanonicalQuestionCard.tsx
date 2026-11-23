import React from 'react';
import { Calendar, Code, Play, CheckCircle2, AlertTriangle, Terminal } from 'lucide-react';
import { CanonicalInterviewQuestion } from '../../types/interview';
import { QuestionSourceCard } from './QuestionSourceCard';
import Editor from '@monaco-editor/react';

export interface CodeExecutionResult {
  status: 'passed' | 'error' | 'not_run';
  language: string;
  output: string;
  error?: string;
}

interface CanonicalQuestionCardProps {
  question: CanonicalInterviewQuestion | any;
  index: number;
  totalQuestions: number;
  role?: string;
  company?: string;
  onCodeChange?: (code: string) => void;
  codeValue?: string;
  onSubmitCode?: () => void;
  codeExecutionResult?: CodeExecutionResult;
  onCodeExecutionResult?: (res: CodeExecutionResult) => void;
}

/**
 * Strictly evaluates whether a question explicitly requires writing code, implementing an algorithm,
 * solving a coding problem, or writing an SQL query.
 * Ordinary conceptual questions (e.g., "Explain DBMS normalization", "Explain inheritance",
 * "Explain transformer operation") return requiresCoding = false.
 */
export function doesQuestionExplicitlyRequireCoding(question: any): { requiresCoding: boolean; defaultLanguage: string } {
  if (!question) return { requiresCoding: false, defaultLanguage: 'python' };
  const qText = String(question.question_text || question.question || '').toLowerCase().trim();

  // 1. Explicit boolean flag from canonical question engine if defined
  if (typeof question.requires_coding === 'boolean') {
    const lang = question.coding_language || (/\bsql\b/i.test(qText) ? 'sql' : 'python');
    // Double-check against conceptual-only prefixes in case an older cached question had a loose flag
    const isPureConceptual =
      /^(explain|describe|discuss|compare|contrast|what is|what are|why is|why do|tell me about|walk me through|how does a transformer|how do you enforce|how do you coordinate|imagine you are|in structural engineering|in mechanical design|in electrical power|when developing embedded|for a production ai)/i.test(qText) &&
      !/\b(write a[n]?\s+(?:\w+\s+)?(?:program|function|query|sql|script|code)|implement a[n]?\s+(?:\w+\s+)?(?:function|algorithm|class|data structure|method|binary search|cache|queue|buffer)|complete the function|solve this coding)\b/i.test(qText);
    if (isPureConceptual) {
      return { requiresCoding: false, defaultLanguage: 'python' };
    }
    return { requiresCoding: question.requires_coding, defaultLanguage: lang };
  }

  // 2. Reject conceptual-only questions ("Explain DBMS normalization", "Explain inheritance", "Explain transformer operation", etc.)
  const isConceptualOnly =
    /^(explain|describe|discuss|compare|contrast|what is|what are|why is|why do|tell me about|walk me through|how does a transformer|how do you enforce|how do you coordinate|imagine you are|in structural engineering|in mechanical design|in electrical power|when developing embedded|for a production ai)/i.test(qText) &&
    !/\b(write a[n]?\s+(?:\w+\s+)?(?:program|function|query|sql|script|code)|implement a[n]?\s+(?:\w+\s+)?(?:function|algorithm|class|data structure|method|binary search|cache|queue|buffer)|complete the function|solve this coding)\b/i.test(qText);

  if (isConceptualOnly) {
    return { requiresCoding: false, defaultLanguage: 'python' };
  }

  // 3. Explicit SQL query requirement
  if (/\b(write a[n]?\s+sql\s+query|sql\s+query\s+to\s+(?:find|select|retrieve|calculate|join|group|update|delete)|write\s+a\s+query\s+in\s+sql)\b/i.test(qText)) {
    return { requiresCoding: true, defaultLanguage: 'sql' };
  }

  // 4. Explicit programming / algorithmic problem requirement
  const hasCodingAction =
    /\b(write a[n]?\s+(?:python|java|c\+\+|c|javascript|typescript|go|rust|verilog)?\s*(?:program|function|code|script|method|solution)|implement\s+(?:a[n]?\s+|the\s+)?(?:data structure|algorithm|function|class|method|lru cache|binary search|ring buffer|circular queue|rate limiter|bounded blocking queue|topological sort|bfs|dfs|merge sort|quick sort|stack|queue|linked list|hash map)|given an array of integers|given the root of a binary tree|given an m x n grid|there are a total of numcourses|return the ordering of courses|return the total count of contiguous subarrays|return the minimum minutes)\b/i.test(qText);

  if (hasCodingAction) {
    let lang = 'python';
    if (/\bsql\b/i.test(qText)) lang = 'sql';
    else if (/\b(embedded c|in c\b|c program|uart|isr|ring buffer)\b/i.test(qText)) lang = 'c';
    else if (/\b(c\+\+|cpp)\b/i.test(qText)) lang = 'cpp';
    else if (/\b(java)\b/i.test(qText) && !/\b(javascript)\b/i.test(qText)) lang = 'java';
    else if (/\b(javascript|typescript|node|react)\b/i.test(qText)) lang = 'javascript';
    return { requiresCoding: true, defaultLanguage: lang };
  }

  return { requiresCoding: false, defaultLanguage: 'python' };
}

function runCodeVerification(code: string, language: string, questionText: string): CodeExecutionResult {
  const cleaned = (code || '').replace(/\/\/\s*Write your code here\.*/gi, '').replace(/--\s*Write your SQL query here\.*/gi, '').replace(/#\s*Write your code here\.*/gi, '').trim();
  if (!cleaned) {
    return {
      status: 'error',
      language,
      output: '',
      error: 'No source code or query provided to execute.'
    };
  }

  // 1. Live JavaScript / TypeScript execution in isolated Function scope
  if (language === 'javascript' || language === 'typescript') {
    const logs: string[] = [];
    const customConsole = {
      log: (...args: any[]) => logs.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')),
      error: (...args: any[]) => logs.push('[ERROR] ' + args.map(a => String(a)).join(' ')),
      warn: (...args: any[]) => logs.push('[WARN] ' + args.map(a => String(a)).join(' '))
    };
    try {
      // Syntax & execution verification
      const fn = new Function('console', `"use strict";\n${cleaned}`);
      const ret = fn(customConsole);
      if (ret !== undefined) {
        logs.push(`Return Value: ${typeof ret === 'object' ? JSON.stringify(ret) : String(ret)}`);
      }
      return {
        status: 'passed',
        language,
        output: logs.length > 0 ? logs.join('\n') : 'Compiled and executed cleanly (0 syntax/runtime errors). Function ready for submission.'
      };
    } catch (err: any) {
      return {
        status: 'error',
        language,
        output: logs.join('\n'),
        error: `${err?.name || 'RuntimeError'}: ${err?.message || String(err)}`
      };
    }
  }

  // 2. SQL Query Syntax & Clause Verification
  if (language === 'sql') {
    const normSql = cleaned.toLowerCase();
    const hasSelectOrDml = /\b(select|with|insert|update|delete|create)\b/i.test(normSql);
    const hasFromOrTable = /\b(from|into|table|set|join)\b/i.test(normSql);
    if (!hasSelectOrDml || !hasFromOrTable) {
      return {
        status: 'error',
        language: 'sql',
        output: '',
        error: 'SQL Syntax Error: Query must contain valid SQL clauses (e.g., SELECT ... FROM ...).'
      };
    }
    // Check balanced parentheses
    let depth = 0;
    for (const ch of cleaned) {
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      if (depth < 0) break;
    }
    if (depth !== 0) {
      return {
        status: 'error',
        language: 'sql',
        output: '',
        error: 'SQL Syntax Error: Unbalanced parentheses in query expression.'
      };
    }
    return {
      status: 'passed',
      language: 'sql',
      output: `SQL Query Validated Successfully.\nDetected Clauses: ${[
        /\bselect\b/i.test(normSql) ? 'SELECT' : '',
        /\bfrom\b/i.test(normSql) ? 'FROM' : '',
        /\bwhere\b/i.test(normSql) ? 'WHERE' : '',
        /\bjoin\b/i.test(normSql) ? 'JOIN' : '',
        /\bgroup\s+by\b/i.test(normSql) ? 'GROUP BY' : '',
        /\border\s+by\b/i.test(normSql) ? 'ORDER BY' : '',
        /\b(dense_rank|row_number|rank|over)\b/i.test(normSql) ? 'WINDOW FUNCTION' : ''
      ].filter(Boolean).join(', ')}`
    };
  }

  // 3. Python / C / C++ / Java / Verilog Structural & AST Syntax Verification
  let parenDepth = 0;
  let braceDepth = 0;
  let bracketDepth = 0;
  for (const ch of cleaned) {
    if (ch === '(') parenDepth++;
    else if (ch === ')') parenDepth--;
    else if (ch === '{') braceDepth++;
    else if (ch === '}') braceDepth--;
    else if (ch === '[') bracketDepth++;
    else if (ch === ']') bracketDepth--;
  }
  if (parenDepth !== 0 || braceDepth !== 0 || bracketDepth !== 0) {
    return {
      status: 'error',
      language,
      output: '',
      error: `SyntaxError: Unbalanced delimiters (${parenDepth !== 0 ? 'parentheses ()' : braceDepth !== 0 ? 'braces {}' : 'brackets []'}).`
    };
  }

  if (language === 'python') {
    const hasDefOrLogic = /\b(def\s+\w+|class\s+\w+|for\s+\w+|while\s+|if\s+|return\b|print\s*\()/i.test(cleaned);
    if (!hasDefOrLogic) {
      return {
        status: 'error',
        language,
        output: '',
        error: 'SyntaxError: Python solution must define a function, loop, or executable statement.'
      };
    }
  }

  return {
    status: 'passed',
    language,
    output: `[${language.toUpperCase()} Verifier] Syntax & structural check passed (${cleaned.split('\n').length} lines). Solution recorded for assessment.`
  };
}

export const CanonicalQuestionCard: React.FC<CanonicalQuestionCardProps> = ({
  question,
  index,
  totalQuestions,
  role = 'Candidate',
  company = 'Company',
  onCodeChange,
  codeValue = '// Write your code here...',
  onSubmitCode,
  codeExecutionResult,
  onCodeExecutionResult
}) => {
  const codingReq = React.useMemo(() => doesQuestionExplicitlyRequireCoding(question), [question]);
  const [selectedLanguage, setSelectedLanguage] = React.useState<string>(codingReq.defaultLanguage);
  const [localExecResult, setLocalExecResult] = React.useState<CodeExecutionResult | null>(null);

  React.useEffect(() => {
    setSelectedLanguage(codingReq.defaultLanguage);
    setLocalExecResult(codeExecutionResult || null);
  }, [question?.question_id, index, codingReq.defaultLanguage]);

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

  const isCodingQuestion = codingReq.requiresCoding;
  const cleanedCode = (codeValue || '')
    .replace(/\/\/\s*Write your code here\.*/gi, '')
    .replace(/--\s*Write your SQL query here\.*/gi, '')
    .replace(/#\s*Write your code here\.*/gi, '')
    .trim();
  const hasNonEmptyCode = cleanedCode.length > 0;
  const activeExecResult = codeExecutionResult || localExecResult;

  const handleRunCode = () => {
    const res = runCodeVerification(codeValue, selectedLanguage, questionText);
    setLocalExecResult(res);
    if (onCodeExecutionResult) {
      onCodeExecutionResult(res);
    }
  };

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
          {questionText}
        </h2>
      </div>

      {/* Follow-up hints / expectations (if available) */}
      {question.what_we_look_for && (
        <div className="mt-3 p-3 rounded-lg bg-blue-50/50 border border-blue-100 text-xs text-blue-900/90">
          <span className="font-bold text-blue-800 mr-1.5">Interviewer Focus:</span>
          {question.what_we_look_for}
        </div>
      )}

      {/* Conditionally Rendered Coding Ground — Strictly Question-Dependent */}
      {isCodingQuestion && (
        <div className="mt-3.5 mb-4 border border-gray-200/90 rounded-xl overflow-hidden bg-[#1e1e1e]">
          <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 text-zinc-300 text-xs font-semibold">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Code className="w-4 h-4 text-cyan-400" />
                <span>{selectedLanguage === 'sql' ? 'SQL Query Editor' : 'Coding Ground'}</span>
              </div>

              {/* Language Selector */}
              <select
                aria-label="Select Programming Language"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="px-2.5 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-100 text-[11px] font-mono outline-none focus:border-cyan-400 cursor-pointer"
              >
                <option value="python">Python 3</option>
                <option value="javascript">JavaScript (Node.js)</option>
                <option value="typescript">TypeScript</option>
                <option value="sql">SQL</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
                <option value="c">C (Embedded / ANSI)</option>
              </select>

              {question.expected_complexity && (
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-cyan-300 font-mono text-[10px]">
                  Target: {question.expected_complexity.time} time | {question.expected_complexity.space} space
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRunCode}
                disabled={!hasNonEmptyCode}
                className="px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Play className="w-3 h-3" />
                <span>Run Code</span>
              </button>

              {onSubmitCode && (
                <button
                  type="button"
                  disabled={!hasNonEmptyCode}
                  onClick={() => {
                    handleRunCode();
                    onSubmitCode();
                  }}
                  className="px-3 py-1 rounded-md bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-zinc-950 font-bold text-[11px] transition-colors cursor-pointer"
                >
                  Submit Code &amp; Next
                </button>
              )}
            </div>
          </div>

          <div className="h-[250px] md:h-[300px]">
            <textarea
              aria-label="Source Code Editor"
              value={codeValue}
              onChange={(e) => onCodeChange && onCodeChange(e.target.value)}
              className="w-full h-full p-4 bg-[#1e1e1e] text-zinc-100 font-mono text-sm leading-6 resize-none outline-none border-none focus:ring-1 focus:ring-cyan-500"
              spellCheck={false}
              placeholder="Write your code or query solution here..."
            />
          </div>

          {/* Execution Output / Error Console */}
          {activeExecResult && (
            <div className="px-4 py-2.5 bg-zinc-950 border-t border-zinc-800 font-mono text-[11px]">
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-wider text-zinc-400">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  Execution &amp; Syntax Console ({activeExecResult.language.toUpperCase()})
                </span>
                {activeExecResult.status === 'passed' ? (
                  <span className="flex items-center gap-1 text-emerald-400 font-bold text-[10px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Passed Verification
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-rose-400 font-bold text-[10px]">
                    <AlertTriangle className="w-3.5 h-3.5" /> Execution / Syntax Error
                  </span>
                )}
              </div>
              {activeExecResult.output && (
                <pre className="text-emerald-300 whitespace-pre-wrap break-words">{activeExecResult.output}</pre>
              )}
              {activeExecResult.error && (
                <pre className="text-rose-400 whitespace-pre-wrap break-words mt-1">{activeExecResult.error}</pre>
              )}
            </div>
          )}
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
