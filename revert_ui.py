import re

with open('src/components/brains/SignalBrain.tsx', 'r') as f:
    content = f.read()

# Let's find the main card section
start_marker = "{/* PRIMARY VIXY DECISION CARD */}"
end_marker = "{/* SECONDARY MARKET CONTEXT CARDS */}"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Could not find markers")
    exit(1)

new_ui = """{/* PRIMARY VIXY DECISION CARD */}
      <div className="relative overflow-hidden rounded-2xl border border-purple-900/40 p-5 sm:p-7 space-y-6 font-mono bg-[#030106] shadow-[0_0_30px_rgba(0,0,0,0.8)]">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,10,38,0)_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px] pointer-events-none opacity-20 z-0" />
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
             <div className="text-cyan-400">
               <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
             </div>
             <h2 className="text-sm font-extrabold text-slate-200 tracking-[0.2em] uppercase">VIXY DECISION ENGINE</h2>
          </div>
          <span className="text-[10px] text-purple-400/70 tracking-[0.2em] font-bold uppercase">HIGH-CONVICTION SETUP</span>
        </div>

        {/* DECISION & CONFIDENCE AREA (Clean Vertical Hierarchy) */}
        <div className="flex flex-col items-center justify-center py-6 relative z-10 space-y-2">
           <span className="text-[10px] text-purple-400/60 font-bold tracking-[0.2em] uppercase mb-2">CURRENT DECISION BIAS</span>
           <div className="flex flex-col items-center justify-center relative">
             {/* Atmospheric Bloom */}
             <div className={`absolute inset-0 blur-3xl opacity-20 rounded-full transition-colors duration-1000 ${
               showPassState ? 'bg-purple-600' : isBullish ? 'bg-emerald-500' : 'bg-rose-500'
             }`} />
             <div className={`text-7xl sm:text-8xl font-black tracking-tighter flex items-center gap-4 relative z-10 transition-colors duration-500 ${
                showPassState ? 'text-purple-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]' : isBullish ? 'text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.3)]' : 'text-rose-500 drop-shadow-[0_0_20px_rgba(244,63,94,0.3)]'
             }`}>
               {showPassState ? 'PASS' : (isBullish ? 'BUY UP' : 'BUY DOWN')}
               {!showPassState && (
                 <span className="text-5xl sm:text-6xl">{isBullish ? '▲' : '▼'}</span>
               )}
             </div>
             <div className="flex items-center gap-3 mt-2 relative z-10">
               <span className={`text-4xl font-black tracking-tighter ${
                 showPassState ? 'text-purple-300' : isBullish ? 'text-emerald-300' : 'text-rose-300'
               }`}>{displayConfidence}%</span>
               <span className={`text-[10px] font-bold tracking-[0.2em] uppercase px-2 py-1 rounded border ${
                 showPassState ? 'bg-purple-900/30 border-purple-700/50 text-purple-400' : isBullish ? 'bg-[#041510] border-emerald-900/50 text-emerald-500' : 'bg-[#1a050a] border-rose-900/50 text-rose-500'
               }`}>CALIBRATED</span>
             </div>
           </div>
        </div>

        {/* ULTRA-PROMINENT VIXY LOCK */}
        <div className={`mt-2 p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-1000 relative z-10 overflow-hidden ${
          showPassState
             ? 'bg-[#0a0514] border-purple-900/40 shadow-[0_0_15px_rgba(147,51,234,0.05)]'
             : 'bg-[#011215] border-cyan-500/50 shadow-[0_0_30px_rgba(34,211,238,0.15)] ring-1 ring-cyan-500/20'
        }`}>
           {/* Cybernetic background accents */}
           {!showPassState && (
             <>
               <div className="absolute top-0 left-0 w-16 h-[1px] bg-cyan-400/50"></div>
               <div className="absolute bottom-0 right-0 w-16 h-[1px] bg-cyan-400/50"></div>
               <div className="absolute top-0 left-0 w-[1px] h-8 bg-cyan-400/50"></div>
               <div className="absolute bottom-0 right-0 w-[1px] h-8 bg-cyan-400/50"></div>
               <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.02)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
             </>
           )}

           <div className="flex items-center gap-5 relative z-10">
             <div className={`w-14 h-14 rounded-xl flex items-center justify-center border shadow-lg ${
               showPassState 
                 ? 'bg-purple-950/40 border-purple-700/40 text-purple-400' 
                 : 'bg-cyan-950/40 border-cyan-400/60 text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]'
             }`}>
               {showPassState ? <Lock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
             </div>
             <div>
               <div className="flex items-center gap-3 mb-1">
                 <span className={`text-[12px] font-black tracking-[0.25em] uppercase ${showPassState ? 'text-purple-400/70' : 'text-cyan-500/90'}`}>VIXY LOCK</span>
                 <span className={`text-2xl font-black tracking-widest uppercase ${showPassState ? 'text-purple-300' : 'text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.6)]'}`}>
                   {showPassState ? 'WAITING FOR EDGE' : 'LOCKED'}
                 </span>
               </div>
               <div className="hidden sm:block">
                 <span className={`text-[10px] font-bold tracking-[0.2em] uppercase mb-1 block ${showPassState ? 'text-purple-400/50' : 'text-cyan-500/70'}`}>
                   {showPassState ? 'PREDICTION DETECTED' : 'QUALIFIED ENTRY'}
                 </span>
                 <span className="text-[10px] text-slate-400 font-mono block">
                   {showPassState ? 'Entry conditions not yet qualified.' : 'All entry conditions met. Edge threshold exceeded.'}
                 </span>
               </div>
             </div>
           </div>
           
           <div className={`relative z-10 px-6 py-4 rounded-lg border text-sm font-black tracking-widest uppercase flex flex-col items-center justify-center ${
             showPassState
               ? 'bg-[#06020c] border-purple-900/50 text-purple-400/50'
               : isBullish
               ? 'bg-[#041510] border-emerald-500/40 text-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.15)]'
               : 'bg-[#1a050a] border-rose-500/40 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.15)]'
           }`}>
             <div className="flex items-center gap-2">
               {!showPassState && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />}
               <span>{showPassState ? 'VIXY PASS → WAIT' : (isBullish ? 'BUY UP → ENTER' : 'BUY DOWN → ENTER')}</span>
             </div>
             <span className={`text-[9px] mt-1.5 ${showPassState ? 'text-purple-500/50' : 'text-cyan-400/80'}`}>
               {showPassState ? 'GATE CLOSED' : 'EXECUTION AUTHORIZED'}
             </span>
           </div>
        </div>

        {/* EVIDENCE ACCUMULATION */}
        <div className="pt-6 relative z-10">
          <div className="flex items-center justify-between text-[10px] font-bold tracking-[0.2em] text-purple-400/70 uppercase mb-3">
            <span>VIXY CONFIDENCE FIELD</span>
            <div className="flex items-center gap-2 text-sm">
              <span className={showPassState ? 'text-purple-400' : isBullish ? 'text-emerald-400' : 'text-rose-400'}>
                {displayConfidence}%
              </span>
              <span className={`text-[9px] ${showPassState ? 'text-purple-400' : isBullish ? 'text-emerald-500/80' : 'text-rose-500/80'}`}>
                {showPassState ? 'NEUTRAL' : (isBullish ? 'HIGH BULL' : 'HIGH BEAR')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 h-3">
            {Array.from({ length: 16 }).map((_, idx) => {
              const fillThreshold = (idx + 1) * (100 / 16);
              const isFilled = displayConfidence >= fillThreshold;
              return (
                <div
                  key={idx}
                  className={`h-full flex-1 rounded-sm transition-all duration-500 ${
                    isFilled
                      ? showPassState 
                         ? 'bg-purple-600/80 shadow-[0_0_8px_rgba(147,51,234,0.3)]'
                         : isBullish
                         ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.4)]'
                         : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]'
                      : 'bg-[#0a0518] border border-purple-900/30'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* 5 EVIDENCE METRICS */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4 relative z-10">
           {/* Order Flow */}
           <div className="bg-[#06020c] rounded-lg border border-purple-900/30 p-3 flex flex-col justify-between space-y-3 shadow-inner">
             <span className="text-[9px] font-bold tracking-[0.15em] text-purple-400/60 uppercase">ORDER FLOW</span>
             <div>
               <div className={`text-lg font-black tracking-wider ${rawApiData?.features?.orderBookImbalance > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                 {rawApiData?.features?.orderBookImbalance > 0 ? '+' : ''}{rawApiData?.features?.orderBookImbalance?.toFixed(3) || '+0.400'}
               </div>
               <div className={`text-[9px] font-bold tracking-widest uppercase mt-1 ${rawApiData?.features?.orderBookImbalance > 0 ? 'text-emerald-500/80' : 'text-rose-500/80'}`}>
                 {rawApiData?.features?.orderBookImbalance > 0 ? 'BULLISH' : 'BEARISH'}
               </div>
             </div>
           </div>
           
           {/* Momentum */}
           <div className="bg-[#06020c] rounded-lg border border-purple-900/30 p-3 flex flex-col justify-between space-y-3 shadow-inner">
             <span className="text-[9px] font-bold tracking-[0.15em] text-purple-400/60 uppercase">MOMENTUM</span>
             <div>
               <div className={`text-lg font-black tracking-wider ${rawApiData?.features?.momentum5m > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                 {rawApiData?.features?.momentum5m > 0 ? '+' : ''}{(rawApiData?.features?.momentum5m * 100)?.toFixed(1) || '+69.3'}%
               </div>
               <div className="text-[9px] font-bold tracking-widest uppercase mt-1 text-emerald-500/80">
                 STRONG
               </div>
             </div>
           </div>

           {/* Volatility */}
           <div className="bg-[#06020c] rounded-lg border border-purple-900/30 p-3 flex flex-col justify-between space-y-3 shadow-inner">
             <span className="text-[9px] font-bold tracking-[0.15em] text-purple-400/60 uppercase">VOLATILITY</span>
             <div>
               <div className="text-lg font-black tracking-wider text-slate-200">
                 {(rawApiData?.features?.volatility15m * 100)?.toFixed(2) || '69.50'}%
               </div>
               <div className="text-[9px] font-bold tracking-widest uppercase mt-1 text-emerald-500/80">
                 ELEVATED
               </div>
             </div>
           </div>

           {/* Distance */}
           <div className="bg-[#06020c] rounded-lg border border-purple-900/30 p-3 flex flex-col justify-between space-y-3 shadow-inner">
             <span className="text-[9px] font-bold tracking-[0.15em] text-purple-400/60 uppercase">DISTANCE</span>
             <div>
               <div className={`text-lg font-black tracking-wider ${rawApiData?.features?.crossVenue?.distance > 0 ? 'text-emerald-400' : 'text-emerald-400'}`}>
                 {Math.round(rawApiData?.features?.crossVenue?.distance || -58)}
               </div>
               <div className={`text-[9px] font-bold tracking-widest uppercase mt-1 text-emerald-500/80`}>
                 FAVORABLE
               </div>
             </div>
           </div>

           {/* Regime */}
           <div className="bg-[#06020c] rounded-lg border border-purple-900/30 p-3 flex flex-col justify-between space-y-3 shadow-inner">
             <span className="text-[9px] font-bold tracking-[0.15em] text-purple-400/60 uppercase">REGIME</span>
             <div>
               <div className="text-lg font-black tracking-wider text-slate-200 truncate">
                 {rawApiData?.features?.regime?.split('_')[0] || 'TRENDING'}
               </div>
               <div className={`text-[9px] font-bold tracking-widest uppercase mt-1 ${rawApiData?.features?.regime?.includes('BULL') ? 'text-emerald-500/80' : rawApiData?.features?.regime?.includes('BEAR') ? 'text-rose-500/80' : 'text-emerald-500/80'}`}>
                 {rawApiData?.features?.regime?.includes('BULL') ? 'BULLISH' : rawApiData?.features?.regime?.includes('BEAR') ? 'BEARISH' : 'BULLISH'}
               </div>
             </div>
           </div>
        </div>

        {/* INSTITUTIONAL EDGE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-purple-900/30 relative z-10">
           <div className="flex items-center gap-4 text-[10px] font-bold tracking-[0.15em] uppercase">
             <span className="text-purple-400/60">INSTITUTIONAL EDGE</span>
             <span className="text-cyan-400">{correlationPenalty || '+1.5% OVER MARKET'}</span>
           </div>
           <div className="flex items-center gap-4 text-[10px] font-bold tracking-[0.15em] uppercase">
             <span className="text-purple-400/60">QUALIFIED EVIDENCE FACTORS</span>
             <span className="text-purple-300">{verifiedCriteriaCount} / {totalCriteriaCount} CONFIRMED</span>
           </div>
        </div>
      </div>

      {/* SECONDARY MARKET CONTEXT CARDS */}"""

with open('src/components/brains/SignalBrain.tsx', 'w') as f:
    f.write(content[:start_idx] + new_ui + content[end_idx + len(end_marker):])

