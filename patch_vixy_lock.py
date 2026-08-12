import re

with open('src/components/brains/SignalBrain.tsx', 'r') as f:
    code = f.read()

old_lock = """          {/* Card 4: VIXY LOCK (Authentic Vibe) */}
          <div className="bg-[#05111c] p-4 rounded-xl border border-cyan-500/60 shadow-[0_0_20px_rgba(6,182,212,0.2)] space-y-3 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-3xl pointer-events-none rounded-full" />
            
            <div className="flex items-center justify-between relative z-10">
              <div className="px-2.5 py-1 rounded-full border border-cyan-500/50 bg-cyan-950/40 text-cyan-400 text-[10px] font-mono font-bold tracking-wider flex items-center gap-1.5 shadow-[0_0_10px_rgba(6,182,212,0.1)]">
                <Key className="w-3.5 h-3.5" />
                <span>VIXY LOCK</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
            </div>

            <div className="flex items-end justify-between relative z-10 mt-1">
              <div className="text-4xl font-black font-mono text-cyan-400 drop-shadow-[0_0_12px_rgba(6,182,212,0.4)] leading-none">
                67%
              </div>
              <span className="px-2 py-0.5 rounded-sm bg-transparent border border-cyan-500/40 text-cyan-400 text-[9px] font-mono font-bold tracking-widest uppercase shadow-none">
                SCANNING
              </span>
            </div>

            <div className="space-y-1.5 relative z-10">
              <div className="text-[9px] font-mono text-cyan-100/60 font-bold flex justify-between tracking-widest uppercase">
                <span>CRITERIA VERIFIED:</span>
                <span className="text-cyan-400">4/6</span>
              </div>
              <div className="flex items-center gap-1">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full ${
                      i < 4
                        ? 'bg-cyan-400 shadow-[0_0_6px_#22d3ee]'
                        : 'bg-cyan-950/50 border border-cyan-900/40'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-[9px] font-mono text-cyan-400/70 pt-2 relative z-10 uppercase font-bold tracking-widest mt-1">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-cyan-400" /> VIXY Engine 17
              </span>
              <span>LOCKED GATE ACTIVE</span>
            </div>
          </div>"""

new_lock = """          {/* Card 4: CRAZY ADDICTING VIXY LOCK BUTTON */}
          <button className="group relative w-full text-left bg-gradient-to-b from-[#06182c] via-[#05111c] to-[#030914] p-4 rounded-xl border-2 border-cyan-400/80 shadow-[0_0_40px_rgba(34,211,238,0.4),inset_0_0_20px_rgba(34,211,238,0.2)] hover:shadow-[0_0_60px_rgba(34,211,238,0.7),inset_0_0_40px_rgba(34,211,238,0.4)] hover:border-cyan-300 hover:scale-[1.02] active:scale-95 transition-all duration-300 space-y-3 flex flex-col justify-between overflow-hidden cursor-pointer">
            {/* Animated Laser Scanning Line */}
            <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent h-[150%] w-full animate-scan pointer-events-none" style={{ animation: 'scan 2.5s ease-in-out infinite alternate' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-cyan-500/20 blur-[50px] pointer-events-none rounded-full group-hover:bg-cyan-400/40 transition-colors duration-500" />
            
            <div className="flex items-center justify-between relative z-10">
              <div className="px-3 py-1.5 rounded-full border border-cyan-400 bg-cyan-950/80 text-cyan-300 text-xs font-black tracking-widest flex items-center gap-2 shadow-[0_0_15px_rgba(34,211,238,0.5)] group-hover:bg-cyan-400 group-hover:text-black transition-colors">
                <Key className="w-4 h-4" />
                <span>VIXY LOCK</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-cyan-300 font-bold uppercase tracking-widest animate-pulse">Scanning</span>
                <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_12px_#22d3ee] animate-ping" />
              </div>
            </div>

            <div className="flex items-end justify-between relative z-10 mt-1">
              <div className="text-5xl font-black font-mono text-cyan-300 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)] leading-none group-hover:text-white transition-colors">
                67%
              </div>
              <span className="px-2.5 py-1 rounded border border-cyan-400/60 bg-cyan-500/10 text-cyan-300 text-[10px] font-black tracking-widest uppercase shadow-[0_0_10px_rgba(34,211,238,0.3)]">
                LOCKED
              </span>
            </div>

            <div className="space-y-2 relative z-10">
              <div className="text-[10px] font-black text-cyan-300 flex justify-between tracking-widest uppercase drop-shadow-md">
                <span>CRITERIA VERIFIED:</span>
                <span className="text-white">4 / 6</span>
              </div>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                      i < 4
                        ? 'bg-cyan-400 shadow-[0_0_10px_#22d3ee] group-hover:bg-white group-hover:shadow-[0_0_15px_#ffffff]'
                        : 'bg-cyan-950/80 border border-cyan-900/60'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-black text-cyan-400/90 pt-2 border-t border-cyan-500/30 relative z-10 uppercase tracking-widest mt-1">
              <span className="flex items-center gap-1.5 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-300" /> VIXY Engine 17
              </span>
              <span className="text-cyan-300 group-hover:text-white transition-colors">GATE ACTIVE</span>
            </div>
          </button>"""

if old_lock in code:
    code = code.replace(old_lock, new_lock)
    with open('src/components/brains/SignalBrain.tsx', 'w') as f:
        f.write(code)
    print("Patched SignalBrain.tsx successfully")
else:
    print("Could not find old lock card to replace")

