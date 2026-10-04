import React from "react";
import { 
  CheckCircle, AlertCircle, Briefcase, GraduationCap, 
  Code, Award, MapPin, Mail, Phone, ExternalLink, 
  Github, Linkedin, Globe, Sparkles, ShieldCheck, ChevronRight
} from "lucide-react";
import { ResumeIntelligenceData } from "../lib/resume/resumeSchema";

interface ResumeIntelligenceDashboardProps {
  data: ResumeIntelligenceData | null;
  isLoading?: boolean;
  parseError?: string | null;
  onRetry?: () => void;
  onFindJobs?: () => void;
  onPrepareInterview?: () => void;
}

export const ResumeIntelligenceDashboard: React.FC<ResumeIntelligenceDashboardProps> = ({
  data,
  isLoading = false,
  parseError = null,
  onRetry,
  onFindJobs,
  onPrepareInterview
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/3 mx-auto mb-4" />
        <div className="h-4 bg-slate-100 rounded w-1/2 mx-auto mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-32 bg-slate-100 rounded-xl" />
          <div className="h-32 bg-slate-100 rounded-xl" />
        </div>
      </div>
    );
  }

  if (parseError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-left">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-red-900">Resume Intelligence Notice</h4>
            <p className="text-xs text-red-700 mt-1 leading-relaxed">{parseError}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-3 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
              >
                Retry Analysis
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-7 h-7 text-blue-600" />
        </div>
        <h3 className="text-base font-bold text-[#0f172a] mb-1">Resume Intelligence</h3>
        <p className="text-xs text-[#64748b] max-w-sm mx-auto">
          Upload a resume (PDF or Word DOCX) to view verified skills, professional experience, education, and target career recommendations.
        </p>
      </div>
    );
  }

  const { profile, skills, experience, education, projects, certifications, achievements } = data;
  const hasProfile = Boolean(profile.name || profile.headline || skills.length > 0 || experience.length > 0);

  // Group skills by category if provided, otherwise default to "Technical & Domain"
  const skillsByCategory: Record<string, typeof skills> = {};
  skills.forEach(s => {
    const cat = s.category || "Verified Skills";
    if (!skillsByCategory[cat]) skillsByCategory[cat] = [];
    skillsByCategory[cat].push(s);
  });

  return (
    <div className="space-y-6 text-left">
      {/* ── Status Banner ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/70 rounded-2xl p-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Resume Intelligence ● Parsed
          </span>
          {data.extraction_metadata?.used_ocr && (
            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
              OCR Engine
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onFindJobs && (
            <button
              onClick={onFindJobs}
              className="px-3.5 py-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              Match Live Jobs
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── 1. Candidate Header ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl md:text-2xl font-extrabold text-[#0f172a]">
                {profile.name || <span className="text-slate-400 italic font-normal">Name not detected</span>}
              </h2>
              {profile.name && (
                <ShieldCheck className="w-5 h-5 text-emerald-600" title="Verified extraction" />
              )}
            </div>
            <p className="text-sm font-semibold text-[#2563eb]">
              {profile.headline || <span className="text-slate-400 italic font-normal">Headline not detected</span>}
            </p>
          </div>

          {/* Quick contact / links badges */}
          <div className="flex flex-wrap gap-2 text-xs">
            {profile.location ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                {profile.location}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-slate-300" />
                Location: Not detected
              </span>
            )}

            {profile.email && (
              <a
                href={`mailto:${profile.email}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-medium transition-all"
              >
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                {profile.email}
              </a>
            )}

            {profile.phone && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                {profile.phone}
              </span>
            )}

            {profile.linkedin && (
              <a
                href={profile.linkedin.startsWith("http") ? profile.linkedin : `https://${profile.linkedin}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium transition-all"
              >
                <Linkedin className="w-3.5 h-3.5" />
                LinkedIn
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}

            {profile.github && (
              <a
                href={profile.github.startsWith("http") ? profile.github : `https://${profile.github}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium transition-all"
              >
                <Github className="w-3.5 h-3.5" />
                GitHub
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}

            {profile.portfolio && (
              <a
                href={profile.portfolio.startsWith("http") ? profile.portfolio : `https://${profile.portfolio}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium transition-all"
              >
                <Globe className="w-3.5 h-3.5" />
                Portfolio
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. Extracted Skills Section ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-[#0f172a] uppercase tracking-wider">
              Verified Skills ({skills.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400">Strictly extracted from document</span>
        </div>

        {skills.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No skills could be reliably detected in this document.</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(skillsByCategory).map(([category, catSkills]) => (
              <div key={category}>
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  {category}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {catSkills.map((skill, idx) => (
                    <div
                      key={idx}
                      className="group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-[#334155] hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-default"
                      title={skill.evidence ? `Evidence: "${skill.evidence}"` : undefined}
                    >
                      <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span>{skill.name}</span>
                      {skill.confidence !== null && (
                        <span className="text-[10px] text-slate-400 ml-0.5">
                          {Math.round(skill.confidence * 100)}%
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 3. Experience Section ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Briefcase className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-[#0f172a] uppercase tracking-wider">
            Experience ({experience.length})
          </h3>
        </div>

        {experience.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No professional experience entries detected.</p>
        ) : (
          <div className="space-y-4">
            {experience.map((exp, idx) => (
              <div key={idx} className="border-l-2 border-blue-500 pl-4 py-1 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-[#0f172a]">{exp.job_title}</h4>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {[exp.start_date, exp.end_date || "Present"].filter(Boolean).join(" – ") || "Dates not detected"}
                  </span>
                </div>
                <div className="text-xs font-semibold text-[#2563eb]">
                  {exp.company}
                  {exp.location && <span className="text-slate-400 font-normal ml-2">• {exp.location}</span>}
                </div>
                {exp.description && (
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                    {exp.description}
                  </p>
                )}
                {exp.technologies && exp.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {exp.technologies.map((tech, tIdx) => (
                      <span key={tIdx} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 4. Education Section ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <GraduationCap className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-[#0f172a] uppercase tracking-wider">
            Education ({education.length})
          </h3>
        </div>

        {education.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No formal education entries detected.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {education.map((edu, idx) => (
              <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
                <h4 className="text-sm font-bold text-[#0f172a]">{edu.degree}</h4>
                {edu.field && (
                  <p className="text-xs font-medium text-[#2563eb]">{edu.field}</p>
                )}
                <p className="text-xs text-slate-700 font-semibold">{edu.institution}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>{[edu.start_date, edu.end_date].filter(Boolean).join(" – ") || "Dates not detected"}</span>
                  {edu.grade && (
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {edu.grade}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 5. Projects Section (if detected) ── */}
      {projects && projects.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Code className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-[#0f172a] uppercase tracking-wider">
              Projects ({projects.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((proj, idx) => (
              <div key={idx} className="border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-[#0f172a]">{proj.name}</h4>
                  {proj.links && (
                    <a
                      href={proj.links.startsWith("http") ? proj.links : `https://${proj.links}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-xs inline-flex items-center gap-1"
                    >
                      View Link
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                {proj.description && (
                  <p className="text-xs text-slate-600 leading-relaxed">{proj.description}</p>
                )}
                {proj.technologies && proj.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {proj.technologies.map((t, tIdx) => (
                      <span key={tIdx} className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-medium">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 6. Certifications & Achievements (if detected) ── */}
      {((certifications && certifications.length > 0) || (achievements && achievements.length > 0)) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {certifications && certifications.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Award className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-[#0f172a] uppercase tracking-wider">Certifications</h3>
              </div>
              <ul className="space-y-2 text-xs">
                {certifications.map((c, i) => (
                  <li key={i} className="flex justify-between items-start border-b border-slate-100 pb-1.5 last:border-0">
                    <div>
                      <span className="font-semibold text-slate-800">{c.name}</span>
                      {c.issuer && <span className="text-slate-500 block text-[11px]">{c.issuer}</span>}
                    </div>
                    {c.date && <span className="text-slate-400 text-[10px]">{c.date}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {achievements && achievements.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-[#0f172a] uppercase tracking-wider">Achievements</h3>
              </div>
              <ul className="space-y-2 text-xs">
                {achievements.map((a, i) => (
                  <li key={i} className="space-y-0.5 border-b border-slate-100 pb-1.5 last:border-0">
                    <span className="font-semibold text-slate-800">{a.title}</span>
                    {a.description && <p className="text-slate-600 text-[11px] leading-relaxed">{a.description}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
