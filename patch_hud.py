import re

with open('src/pages/Interview.tsx', 'r') as f:
    content = f.read()

# Replace Right HUD actions
start_str = '{/* Right HUD actions */}'
end_str = '{/* 2D Interactive Sidebar - Live Rounds Tracker (Hidden per request) */}'

start_idx = content.find(start_str)
end_idx = content.find(end_str)

if start_idx != -1 and end_idx != -1:
    replacement = """{/* Right HUD actions */}
        <div className="flex gap-3 flex-wrap items-center">
          <div className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 shadow-sm backdrop-blur-md flex items-center gap-2.5 text-zinc-200 pointer-events-auto">
            <Clock className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="font-mono text-xs font-bold leading-none">{formatTime(timeLeft)}</span>
          </div>
          
          <button 
            onClick={() => setIsMicOn(!isMicOn)}
            className={`pointer-events-auto px-4 py-2.5 rounded-xl border backdrop-blur-md flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer shadow-sm ${
              isMicOn 
                ? 'bg-cyan-950 border-cyan-500 text-cyan-400 font-extrabold' 
                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-855'
            }`}
          >
            {isMicOn ? <Mic className="w-4.5 h-4.5 text-cyan-400" /> : <MicOff className="w-4.5 h-4.5 text-zinc-400" />}
            {isMicOn ? 'ACTIVE' : 'MIC OFF'}
          </button>
          
          <button
            onClick={handleGenerateEvaluationReport}
            className="pointer-events-auto px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-zinc-950 font-black uppercase text-[10px] tracking-wider hover:scale-[1.01] hover:shadow-cyan-500/20 active:scale-[0.99] transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <ClipboardCheck className="w-4.5 h-4.5" />
            Assess & View Report
          </button>
          
          <div className="relative pointer-events-auto">
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-all flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider text-zinc-300 shadow-sm cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              Settings
            </button>
            {isSettingsOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-zinc-900/95 border border-zinc-800 rounded-xl shadow-2xl backdrop-blur-xl p-4 flex flex-col gap-4 text-left z-50">
                <div>
                  <span className="text-[9px] uppercase tracking-widest font-black text-cyan-400 font-mono">Environment Controls</span>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[8px] uppercase font-bold text-zinc-400 font-mono">Camera Zoom</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button onClick={handleZoomIn} className="py-1.5 text-center bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[9px] font-bold rounded-lg transition-colors flex justify-center items-center cursor-pointer"><ZoomIn className="w-3.5 h-3.5 mr-1"/> In</button>
                    <button onClick={handleZoomOut} className="py-1.5 text-center bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[9px] font-bold rounded-lg transition-colors flex justify-center items-center cursor-pointer"><ZoomOut className="w-3.5 h-3.5 mr-1"/> Out</button>
                    <button onClick={handleResetZoom} className="py-1.5 text-center bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[9px] font-bold rounded-lg transition-colors cursor-pointer">Reset</button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[8px] uppercase font-bold text-zinc-400 font-mono">Lighting Mode</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button onClick={() => setDaylightMode('morning')} className={`py-1.5 text-center font-mono text-[9px] font-bold rounded-lg transition-colors cursor-pointer ${daylightMode === 'morning' ? 'bg-amber-400 text-zinc-900' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'}`}>Morning</button>
                    <button onClick={() => setDaylightMode('sunset')} className={`py-1.5 text-center font-mono text-[9px] font-bold rounded-lg transition-colors cursor-pointer ${daylightMode === 'sunset' ? 'bg-orange-500 text-zinc-900' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'}`}>Evening</button>
                    <button onClick={() => setDaylightMode('night')} className={`py-1.5 text-center font-mono text-[9px] font-bold rounded-lg transition-colors cursor-pointer ${daylightMode === 'night' ? 'bg-indigo-500 text-zinc-900' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'}`}>Night</button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[8px] uppercase font-bold text-zinc-400 font-mono">VR / AR Experience</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button onClick={enterVRMode} className="py-1.5 text-center bg-zinc-800 hover:bg-zinc-700 text-cyan-400 font-mono text-[9px] font-bold rounded-lg transition-colors cursor-pointer">Enter VR</button>
                    <button onClick={enterARMode} className="py-1.5 text-center bg-zinc-800 hover:bg-zinc-700 text-emerald-400 font-mono text-[9px] font-bold rounded-lg transition-colors cursor-pointer">Enter AR</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      """
    
    new_content = content[:start_idx] + replacement + content[end_idx:]
    with open('src/pages/Interview.tsx', 'w') as f:
        f.write(new_content)
    print("Replaced Right HUD actions")
else:
    print("Could not find delimiters")
