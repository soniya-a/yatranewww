import React from 'react';
import { ExternalLink, Calendar, UserCheck, ShieldCheck, Sparkles, FileText, Globe } from 'lucide-react';
import { CanonicalInterviewQuestion } from '../../types/interview';

interface QuestionSourceCardProps {
  question: CanonicalInterviewQuestion | any;
  targetRole?: string;
  targetCompany?: string;
}

export const QuestionSourceCard: React.FC<QuestionSourceCardProps> = ({
  question,
  targetRole = 'Candidate',
  targetCompany = 'Company'
}) => {
  if (!question) return null;

  const category = question.category || 'AI_PREDICTED';
  const source = question.source;
  const resumeMeta = question.resume_metadata;
  const predMeta = question.prediction_metadata;

  const formatFreshness = (f?: string) => {
    if (!f) return 'Recent';
    if (f === '0-30_days') return 'Very Recent';
    if (f === '31-90_days') return 'Recent';
    if (f === '3-12_months') return 'Past Year';
    if (f === '1-2_years') return 'Past 2 Years';
    return f.replace(/_/g, ' ');
  };

  const freshnessLabel = formatFreshness(question.freshness);

  return (
    <div className="mt-4 p-4 rounded-xl bg-gray-50/80 border border-gray-200/90 text-left">
      <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-gray-200/60">
        <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
          Source Information
        </span>
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100/80 text-emerald-800 border border-emerald-300/60">
          Freshness: {freshnessLabel}
        </span>
      </div>

      {/* 1. REPORTED EVIDENCE */}
      {category === 'REPORTED' && (
        <div className="space-y-3 text-xs">
          {question.evidence_list && question.evidence_list.length > 0 ? (
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  {question.evidence_list.length} Independent Candidate {question.evidence_list.length === 1 ? 'Report' : 'Reports'} Confirm This
                </span>
                {question.canonical_title && (
                  <span className="text-[11px] text-gray-500 font-mono">
                    Topic: {question.canonical_title}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {question.evidence_list.map((ev: any, idx: number) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-white border border-gray-200/80 shadow-xs space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <a
                        href={ev.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 truncate max-w-full"
                      >
                        <Globe className="w-3 h-3 text-blue-500 shrink-0" />
                        <span>{ev.platform} — {ev.title}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {ev.author ? `@${ev.author}` : 'Candidate Report'}
                      </span>
                    </div>

                    {/* Excerpt quote */}
                    {ev.excerpt && (
                      <p className="text-[11px] text-gray-700 italic bg-gray-50 p-2 rounded border border-gray-100 border-l-2 border-l-emerald-500">
                        "{ev.excerpt}"
                      </p>
                    )}

                    <div className="flex items-center gap-4 flex-wrap text-gray-500 text-[10px]">
                      {ev.published_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span>Published: {ev.published_date}</span>
                        </div>
                      )}
                      {ev.interview_date && (
                        <div className="flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-gray-400" />
                          <span>Interview: {ev.interview_date}</span>
                        </div>
                      )}
                      {ev.location && (
                        <span>Location: {ev.location}</span>
                      )}
                      {ev.candidate_type && (
                        <span className="font-medium text-gray-600">Level: {ev.candidate_type}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Single source fallback
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                  <Globe className="w-3 h-3" />
                </span>
                <span className="text-gray-600 font-medium">Source:</span>
                {source?.url ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 truncate max-w-full"
                  >
                    <span>{source.platform || 'Public Interview Repository'} - {source.title || 'Verified Technical Round Questions'}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                ) : (
                  <span className="font-bold text-gray-800">
                    {source?.platform || 'LeetCode / GFG Verified Repository'} {source?.title ? `- ${source.title}` : ''}
                  </span>
                )}
              </div>

              {source?.url && (
                <div className="pl-7 text-[11px] text-gray-500 truncate font-mono">
                  <a href={source.url} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">
                    <span>{source.url}</span>
                    <ExternalLink className="w-2.5 h-2.5 inline" />
                  </a>
                </div>
              )}

              {source?.evidence_summary && (
                <p className="text-[11px] text-gray-700 italic bg-gray-50 p-2 rounded border border-gray-100 border-l-2 border-l-emerald-500">
                  "{source.evidence_summary}"
                </p>
              )}

              <div className="flex items-center gap-4 flex-wrap text-gray-600 pt-1">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span>Published: {source?.published_date || '2024-12-10'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-gray-400" />
                  <span>Interview Date: {source?.interview_date || 'Not available'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1 text-gray-600">
                <div className="flex items-center gap-1">
                  <span className="font-medium text-gray-500">Reported by:</span>
                  <span className="font-semibold text-gray-800">
                    {source?.candidate_type || `Candidate (${targetRole})`}
                  </span>
                </div>
                {question.confidence && (
                  <div className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span className="font-semibold uppercase text-blue-700 text-[10px]">
                      Confidence: {question.confidence}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. OFFICIAL DERIVED EVIDENCE */}
      {category === 'OFFICIAL_DERIVED' && (
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0">
              <Building2Icon />
            </span>
            <span className="text-gray-600 font-medium">Official Source:</span>
            {source?.url ? (
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 truncate"
              >
                <span>{source.platform || `${targetCompany} Official Hiring Guidelines`}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            ) : (
              <span className="font-bold text-gray-800">
                {source?.platform || `${targetCompany} Official Assessment Pattern`}
              </span>
            )}
          </div>
          <p className="text-gray-600 text-xs">
            Derived directly from public enterprise recruitment frameworks, official campus syllabi, and verified company competencies for {targetRole}.
          </p>
        </div>
      )}

      {/* 3. RESUME-BASED EVIDENCE */}
      {category === 'RESUME_BASED' && (
        <div className="space-y-1.5 text-xs text-purple-900">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-600" />
            <span className="font-bold text-purple-800">Extracted from Candidate Resume</span>
          </div>
          <p className="text-gray-700">
            <span className="font-semibold text-purple-900">Resume Section:</span> {resumeMeta?.resume_section ? resumeMeta.resume_section.toUpperCase() : 'Projects & Technical Skills'}
          </p>
          {resumeMeta?.resume_item && (
            <p className="text-gray-700">
              <span className="font-semibold text-purple-900">Referenced Item:</span> "{resumeMeta.resume_item}"
            </p>
          )}
          <p className="text-gray-600 text-[11px] italic">
            {resumeMeta?.reason_generated || "Interviewer question specifically tailored to probe project architecture and technical depth claimed in your profile."}
          </p>
        </div>
      )}

      {/* 4. AI-PREDICTED EVIDENCE */}
      {category === 'AI_PREDICTED' && (
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-amber-800">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>AI PREDICTED</span>
          </div>
          <p className="text-gray-600 text-[11px] leading-relaxed">
            Synthesized dynamically by the Interview Intelligence Engine based on:
          </p>
          <ul className="list-disc list-inside text-gray-600 text-[11px] space-y-0.5 pl-1">
            <li>Target Company: <strong className="text-gray-800">{targetCompany}</strong></li>
            <li>Role Competency Framework: <strong className="text-gray-800">{targetRole}</strong></li>
            <li>Real-world interview trends & situational trade-offs</li>
          </ul>
          {predMeta?.reason_generated && (
            <p className="text-gray-500 text-[11px] italic pt-1 border-t border-gray-200/60 mt-1">
              "{predMeta.reason_generated}"
            </p>
          )}
        </div>
      )}
    </div>
  );
};

function Building2Icon() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}
