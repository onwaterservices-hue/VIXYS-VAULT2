import re

with open('src/components/brains/SignalBrain.tsx', 'r') as f:
    code = f.read()

# 1. Replace the VIXY LOCK card
old_lock = """          {/* Card 4: VIXY LOCK (Distinct Cyan/Electric-Blue Accent Glow) */}
          <div className="bg-gradient-to-b from-[#081a2e] via-[#051120] to-[#040314] p-4 rounded-2xl border-2 border-cyan-500/80 shadow-[0_0_25px_rgba(6,182,212,0.35)] space-y-2 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 blur-xl pointer-events-none rounded-full" />
            <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase relative z-10">
              <span className="flex items-center gap-1.5 text-cyan-300 font-black tracking-wider">
                🔑 VIXY LOCK
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
                <span className="text-[9px] text-cyan-400 font-extrabold">ACTIVE</span>
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 relative z-10">
              <div className="text-3xl font-black font-mono text-cyan-300 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">
                67%
              </div>
              <span className="px-2 py-0.5 rounded-md bg-cyan-950/90 border border-cyan-500/60 text-cyan-200 text-[10px] font-black tracking-wider shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                SCANNING
              </span>
            </div>
            <div className="space-y-1 relative z-10">
              <div className="text-[10px] font-mono text-cyan-200/90 font-bold flex justify-between">
                <span>CRITERIA VERIFIED:</span>
                <span className="text-cyan-300 font-extrabold">4/6</span>
              </div>
              <div className="w-full bg-cyan-950/80 h-2 rounded-full overflow-hidden border border-cyan-800/80 shadow-inner">
                <div className="bg-gradient-to-r from-cyan-500 via-teal-400 to-cyan-300 h-full w-[67%] shadow-[0_0_8px_#22d3ee]" />
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-cyan-300/80 pt-1 border-t border-cyan-900/50 relative z-10">
              <span>VIXY Engine 17</span>
              <span className="text-emerald-400 font-black drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]">LOCKED GATE ACTIVE</span>
            </div>
          </div>"""

new_lock = """          {/* Card 4: VIXY LOCK (Authentic Vibe) */}
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

if old_lock in code:
    code = code.replace(old_lock, new_lock)
else:
    print("Could not find old lock card to replace")

# 2. Add Order Flow Bar at the bottom of the grid
end_grid = """        </div>
      </div>
    </div>
  );
};"""

new_end = """        </div>
      </div>

      {/* VIXY ORDER FLOW PRESSURE */}
      <div className="mt-4 bg-[#0a0514] border border-purple-800/50 rounded-xl p-3">
        <div className="flex items-center justify-between text-[10px] font-mono font-bold tracking-wider mb-2">
          <div className="flex items-center gap-2 text-white">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            VIXY ORDER FLOW PRESSURE
          </div>
          <div className="text-emerald-400 font-black">
            TAKER BULLS 92% VS BEAR 8%
          </div>
        </div>
        <div className="w-full h-3 rounded-full bg-rose-500 overflow-hidden flex border border-rose-900 shadow-inner">
          <div className="bg-emerald-400 h-full shadow-[0_0_8px_#34d399] z-10 relative" style={{ width: '92%' }}>
            <div className="absolute top-0 right-0 bottom-0 w-2 bg-emerald-300 opacity-50"></div>
          </div>
        </div>
      </div>

    </div>
  );
};"""

if end_grid in code:
    code = code.replace(end_grid, new_end)
else:
    print("Could not find end of grid to replace")

with open('src/components/brains/SignalBrain.tsx', 'w') as f:
    f.write(code)

print("Patched SignalBrain.tsx successfully")
