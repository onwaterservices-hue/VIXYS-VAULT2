import re

with open('src/components/brains/SignalBrain.tsx', 'r') as f:
    content = f.read()

# 1. Update the variables
content = content.replace(
    "const showPassState = !isQualifiedLock || decision === 'PASS' || lockState === 'PASS' || Math.abs(upProbNum - 50) < 6 || isStaleOrInvalid;",
    "const isModelPass = decision === 'PASS' || Math.abs(upProbNum - 50) < 6 || isStaleOrInvalid;\n  const showLockPassState = !isQualifiedLock || lockState === 'PASS' || isStaleOrInvalid;\n  const showPassState = isModelPass; // fallback for other usages"
)

# 2. Update the DECISION & CONFIDENCE AREA
start_marker = "{/* DECISION & CONFIDENCE AREA (Clean Vertical Hierarchy) */}"
end_marker = "{/* ULTRA-PROMINENT VIXY LOCK */}"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Could not find markers")
    exit(1)

new_decision = """{/* DECISION & CONFIDENCE AREA (Clean Vertical Hierarchy) */}
        <div className="flex flex-col items-center justify-center py-6 relative z-10 space-y-2">
           <span className="text-[10px] text-purple-400/60 font-bold tracking-[0.2em] uppercase mb-2">CURRENT DECISION BIAS</span>
           <div className="flex flex-col items-center justify-center relative">
             {/* Atmospheric Bloom */}
             <div className={`absolute inset-0 blur-3xl opacity-20 rounded-full transition-colors duration-1000 ${
               isModelPass ? 'bg-purple-600' : isBullish ? 'bg-emerald-500' : 'bg-rose-500'
             }`} />
             <div className={`text-7xl sm:text-8xl font-black tracking-tighter flex items-center gap-4 relative z-10 transition-colors duration-500 ${
                isModelPass ? 'text-purple-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]' : isBullish ? 'text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.3)]' : 'text-rose-500 drop-shadow-[0_0_20px_rgba(244,63,94,0.3)]'
             }`}>
               {isModelPass ? 'PASS' : (isBullish ? 'BUY UP' : 'BUY DOWN')}
               {!isModelPass && (
                 <span className="text-5xl sm:text-6xl">{isBullish ? '▲' : '▼'}</span>
               )}
             </div>
             <div className="flex items-center gap-3 mt-2 relative z-10">
               <span className={`text-4xl font-black tracking-tighter ${
                 isModelPass ? 'text-purple-300' : isBullish ? 'text-emerald-300' : 'text-rose-300'
               }`}>{displayConfidence}%</span>
               <span className={`text-[10px] font-bold tracking-[0.2em] uppercase px-2 py-1 rounded border ${
                 isModelPass ? 'bg-purple-900/30 border-purple-700/50 text-purple-400' : isBullish ? 'bg-[#041510] border-emerald-900/50 text-emerald-500' : 'bg-[#1a050a] border-rose-900/50 text-rose-500'
               }`}>CALIBRATED</span>
             </div>
           </div>
        </div>

        """

content = content[:start_idx] + new_decision + content[end_idx:]

# 3. Update the ULTRA-PROMINENT VIXY LOCK
start_marker_lock = "{/* ULTRA-PROMINENT VIXY LOCK */}"
end_marker_lock = "{/* EVIDENCE ACCUMULATION */}"

start_idx_lock = content.find(start_marker_lock)
end_idx_lock = content.find(end_marker_lock)

new_lock = """{/* ULTRA-PROMINENT VIXY LOCK */}
        <div className={`mt-4 mb-2 p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-1000 relative z-10 overflow-hidden ${
          showLockPassState
             ? 'bg-[#1a0f00] border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.1)] ring-1 ring-amber-500/20'
             : 'bg-[#011215] border-cyan-500/60 shadow-[0_0_40px_rgba(34,211,238,0.25)] ring-1 ring-cyan-400/40'
        }`}>
           {/* Cybernetic background accents */}
           {!showLockPassState && (
             <>
               <div className="absolute top-0 left-0 w-16 h-[1px] bg-cyan-400/50"></div>
               <div className="absolute bottom-0 right-0 w-16 h-[1px] bg-cyan-400/50"></div>
               <div className="absolute top-0 left-0 w-[1px] h-8 bg-cyan-400/50"></div>
               <div className="absolute bottom-0 right-0 w-[1px] h-8 bg-cyan-400/50"></div>
               <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
               <div className="absolute inset-0 bg-cyan-500/5 animate-pulse" />
             </>
           )}

           <div className="flex items-center gap-5 relative z-10">
             <div className={`w-14 h-14 rounded-xl flex items-center justify-center border shadow-lg ${
               showLockPassState 
                 ? 'bg-amber-950/40 border-amber-700/40 text-amber-500' 
                 : 'bg-cyan-950/60 border-cyan-400/60 text-cyan-300 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]'
             }`}>
               <Lock className="w-6 h-6" />
             </div>
             <div>
               <div className="flex items-center gap-3 mb-1">
                 <span className={`text-[12px] font-black tracking-[0.25em] uppercase ${showLockPassState ? 'text-amber-500/70' : 'text-cyan-400/90'}`}>VIXY LOCK</span>
                 <span className={`text-2xl font-black tracking-widest uppercase ${showLockPassState ? 'text-amber-500' : 'text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]'}`}>
                   {showLockPassState ? 'PASS' : 'LOCKED'}
                 </span>
               </div>
               <div className="hidden sm:block">
                 <span className={`text-[10px] font-bold tracking-[0.2em] uppercase mb-1 block ${showLockPassState ? 'text-amber-500/70' : 'text-cyan-400/90'}`}>
                   {showLockPassState ? 'ENTRY BLOCKED' : 'QUALIFIED ENTRY'}
                 </span>
                 <span className={`text-[10px] font-mono block ${showLockPassState ? 'text-amber-500/50' : 'text-cyan-400/70'}`}>
                   {showLockPassState ? 'QUALIFICATION NOT MET' : 'All entry conditions met.'}
                 </span>
               </div>
             </div>
           </div>
           
           <div className={`relative z-10 px-6 py-4 rounded-lg border text-sm font-black tracking-widest uppercase flex flex-col items-center justify-center ${
             showLockPassState
               ? 'bg-[#140b00] border-amber-900/50 text-amber-500/70'
               : isBullish
               ? 'bg-[#041510] border-emerald-500/60 text-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.2)]'
               : 'bg-[#1a050a] border-rose-500/60 text-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.2)]'
           }`}>
             <div className="flex items-center gap-2">
               {!showLockPassState && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-[pulse_1.5s_ease-in-out_infinite]" />}
               <span>{showLockPassState ? 'VIXY PASS → WAIT' : (isBullish ? 'BUY UP → ENTER' : 'BUY DOWN → ENTER')}</span>
             </div>
             <span className={`text-[9px] mt-1.5 ${showLockPassState ? 'text-amber-500/50' : 'text-cyan-400/80'}`}>
               {showLockPassState ? 'GATE CLOSED' : 'EXECUTION AUTHORIZED'}
             </span>
           </div>
        </div>

        """

content = content[:start_idx_lock] + new_lock + content[end_idx_lock:]

# Update the VIXY CONFIDENCE FIELD so it correctly uses `isModelPass`
content = content.replace(
    "span className={showPassState ? 'text-purple-400' : isBullish ? 'text-emerald-400' : 'text-rose-400'}",
    "span className={isModelPass ? 'text-purple-400' : isBullish ? 'text-emerald-400' : 'text-rose-400'}"
)

content = content.replace(
    "className={`text-[9px] ${showPassState ? 'text-purple-400' : isBullish ? 'text-emerald-500/80' : 'text-rose-500/80'}`}",
    "className={`text-[9px] ${isModelPass ? 'text-purple-400' : isBullish ? 'text-emerald-500/80' : 'text-rose-500/80'}`}"
)

content = content.replace(
    "{showPassState ? 'NEUTRAL' : (isBullish ? 'HIGH BULL' : 'HIGH BEAR')}",
    "{isModelPass ? 'NEUTRAL' : (isBullish ? 'HIGH BULL' : 'HIGH BEAR')}"
)

content = content.replace(
    "? showPassState",
    "? isModelPass"
)

with open('src/components/brains/SignalBrain.tsx', 'w') as f:
    f.write(content)

print("Patched!")
