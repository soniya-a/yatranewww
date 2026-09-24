import { motion, AnimatePresence } from "motion/react";
import { X, CheckCircle, Sparkles, Star, History, MessageSquare, Award } from "lucide-react";
import { cn } from "../lib/utils";

interface SavedInterviewReport {
  id: string;
  userId: string;
  role: string;
  company: string;
  createdAt: number;
  score: number;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
  transcript?: { role: string; text: string }[];
}

interface ReportSlideOverProps {
  report: SavedInterviewReport | null;
  onClose: () => void;
}

export default function ReportSlideOver({ report, onClose }: ReportSlideOverProps) {
  if (!report) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop fading in */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
      />

      {/* Drawer sliding in from right */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        className="relative w-full max-w-lg h-screen bg-slate-900 border-l border-white/5 p-6 md:p-8 shadow-2xl z-10 overflow-y-auto flex flex-col justify-between"
      >
        <div className="space-y-6 pb-8">
          {/* Header Info */}
          <div className="flex items-start justify-between border-b border-white/5 pb-6">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold px-3 py-1 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono uppercase tracking-wider">
                {report.company}
              </span>
              <h3 className="text-xl font-extrabold text-white tracking-tight leading-none mt-2">
                {report.role} Evaluation
              </h3>
              <span className="text-[10px] text-slate-400 font-mono block">
                Logged {new Date(report.createdAt).toLocaleString()}
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Performance Scorecard */}
          <div className="p-4 bg-slate-950/40 border border-white/5 rounded-2.5xl flex items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-300 font-mono">
                Placement Fit Score
              </span>
              <h4 className="text-xs font-bold text-slate-200">
                AI Agent Benchmark Matrix
              </h4>
            </div>

            <div className="p-3 bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border border-cyan-500/20 rounded-2xl text-center min-w-[80px]">
              <span className="text-3xl font-black text-cyan-400 leading-none block tracking-tight">
                {report.score}
              </span>
              <span className="text-[8px] font-mono text-slate-300 font-bold block uppercase tracking-wider mt-1.5 leading-none">
                PERCENT
              </span>
            </div>
          </div>

          {/* Qualitative AI Assessment */}
          <div className="space-y-2.5">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-300 font-mono block">
              Direct Evaluation:
            </span>
            <div className="p-4.5 bg-slate-950/20 border border-white/5 rounded-2.5xl text-xs text-slate-200 leading-relaxed italic relative overflow-hidden">
              <div className="absolute top-2 right-2 opacity-5">
                <Sparkles className="w-12 h-12 text-cyan-400" />
              </div>
              "{report.feedback}"
            </div>
          </div>

          {/* Strengths & Gaps Checklist */}
          <div className="space-y-5">
            {/* Strengths list */}
            {report.strengths && report.strengths.length > 0 && (
              <div className="space-y-2.5">
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-300 font-mono block">
                  Demonstrated Strengths
                </span>
                <div className="space-y-2">
                  {report.strengths.map((str, i) => (
                    <div
                      key={i}
                      className="p-3.5 bg-slate-950/30 border border-white/5 rounded-xl flex items-start gap-3.5"
                    >
                      <span className="w-5 h-5 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/10">
                        <CheckCircle className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-xs text-slate-200 leading-relaxed">{str}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Improvement checklist */}
            {report.weaknesses && report.weaknesses.length > 0 && (
              <div className="space-y-2.5">
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-300 font-mono block">
                  Prescribed Actions to Improve
                </span>
                <div className="space-y-2">
                  {report.weaknesses.map((weak, i) => (
                    <div
                      key={i}
                      className="p-3.5 bg-slate-950/30 border border-white/5 rounded-xl flex items-start gap-3.5"
                    >
                      <span className="w-5 h-5 rounded-lg bg-yellow-500/10 text-yellow-400 flex items-center justify-center shrink-0 mt-0.5 border border-yellow-500/10">
                        <Star className="w-3.5 h-3.5 fill-yellow-500/10" />
                      </span>
                      <span className="text-xs text-slate-200 leading-relaxed">{weak}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Dialogue Transcript log expansion */}
          {report.transcript && report.transcript.length > 0 && (
            <div className="space-y-3.5 border-t border-white/5 pt-6">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-cyan-400" />
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-300 font-mono">
                  Session Dialogue Transcripts ({report.transcript.length} turns)
                </span>
              </div>
              <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-2.5xl max-h-[220px] overflow-y-auto space-y-4 shadow-inner">
                {report.transcript.map((msg, idx) => (
                  <div key={idx} className="text-xs space-y-1.5">
                    <span
                      className={cn(
                        "font-mono text-[9px] uppercase tracking-wider block font-bold",
                        msg.role === "user" ? "text-cyan-400" : "text-amber-400"
                      )}
                    >
                      {msg.role === "user" ? "• Candidate Response" : "• Interviewer Prompt"}
                    </span>
                    <p className="leading-relaxed pl-3 border-l border-white/5 italic text-slate-200">
                      "{msg.text}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 py-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-2xl font-bold uppercase text-[10px] tracking-wider text-slate-200 hover:text-white transition-colors cursor-pointer"
        >
          Close Session Report
        </button>
      </motion.div>
    </div>
  );
}
