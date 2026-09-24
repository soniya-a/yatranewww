import { motion, AnimatePresence } from "motion/react";
import { X, Glasses, Calendar, Check, Monitor, Cpu } from "lucide-react";
import { cn } from "../lib/utils";

interface VRSchedulingModalProps {
  isOpen: boolean;
  onClose: () => void;
  isVRBooked: boolean;
  setIsVRBooked: (booked: boolean) => void;
  vrBookingDate: string;
  setVrBookingDate: (date: string) => void;
}

export default function VRSchedulingModal({
  isOpen,
  onClose,
  isVRBooked,
  setIsVRBooked,
  vrBookingDate,
  setVrBookingDate
}: VRSchedulingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 select-none">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: "spring", damping: 25 }}
        className="relative w-full max-w-md bg-slate-900 border border-white/5 rounded-3xl p-6 md:p-8 shadow-2xl z-10 space-y-6"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/20">
          <Glasses className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-cyan-400">
            VR Experience Engine
          </span>
        </div>

        {!isVRBooked ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <h3 className="text-xl font-bold text-white tracking-tight">
                Reserve Wearable VR Slot
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Connect your Oculus, Apple Vision, or WebVR browser to our direct real-time simulation nodes.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <label className="text-[9px] uppercase font-bold tracking-widest text-slate-300 font-mono block mb-1.5">
                  Pick Time (Indian Standard Time)
                </label>
                <div className="relative">
                  <select
                    value={vrBookingDate}
                    onChange={(e) => setVrBookingDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-250 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/40 outline-none transition-all cursor-pointer appearance-none font-medium"
                  >
                    <option value="Tomorrow, 11:00 AM">Tomorrow, 11:00 AM (IST)</option>
                    <option value="Tomorrow, 3:30 PM">Tomorrow, 3:30 PM (IST)</option>
                    <option value="Wednesday, 10:00 AM">Wednesday, 10:00 AM (IST)</option>
                    <option value="Wednesday, 5:00 PM">Wednesday, 5:00 PM (IST)</option>
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[9px] uppercase font-bold tracking-widest text-slate-300 font-mono block mb-2">
                  Target Live Wearable Platform
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { name: "Oculus Quest", icon: Glasses },
                    { name: "Vision Pro", icon: Cpu },
                    { name: "WebVR Client", icon: Monitor }
                  ].map((p, idx) => (
                    <div
                      key={p.name}
                      style={{ contentVisibility: "auto" }}
                      className="bg-slate-950 border border-slate-800 p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 select-none"
                    >
                      <p.icon className="w-4.5 h-4.5 text-cyan-400" />
                      <span className="font-semibold text-[9px] text-slate-300 text-center tracking-tight truncate w-full">
                        {p.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setIsVRBooked(true)}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 rounded-xl font-bold uppercase text-[10px] tracking-wider hover:scale-[1.01] hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer shadow-lg shadow-cyan-500/10"
              >
                Register Free VR Simulation Session
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 text-center py-4">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mx-auto">
              <Check className="w-7 h-7 stroke-[3]" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-bold text-white tracking-tight">
                Sim Slot Reserved
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
                An authentication voucher has been emitted. Use this code when entering the VR gateway space.
              </p>
            </div>

            <div className="p-4 border border-cyan-500/20 bg-slate-950 rounded-2xl space-y-2 font-mono text-left text-[10px] text-slate-400">
              <div className="flex justify-between">
                <span className="text-slate-400">VOCH_CODE:</span>
                <span className="text-cyan-400 font-bold">SIM_CONNECT_2193X</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">LOGGED_IST:</span>
                <span className="text-emerald-400 font-bold">{vrBookingDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">TUNNEL:</span>
                <span className="text-slate-200">WEBVR_GATE_99</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="px-6 py-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-[10px] font-bold uppercase text-slate-200 hover:text-white transition-colors"
            >
              Back to Campus Gateway
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
