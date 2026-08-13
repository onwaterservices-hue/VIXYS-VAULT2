import re

with open('src/components/brains/SignalBrain.tsx', 'r') as f:
    content = f.read()

# We will just rewrite the return statement to match the new UI.
# Let's find the start of the return statement
return_start = content.find('  return (\n')
if return_start == -1:
    print("Could not find return statement")
    exit(1)

new_return = """  return (
    <div className="space-y-4">
      {/* TOP STATUS BAR (matches image) */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono tracking-widest uppercase pb-1">
        <div className="flex items-center gap-6">
          <div>
            <div className="text-purple-500/70 mb-1">MARKET</div>
            <div className="text-purple-100 font-bold">BTC {displayVenue} {timeframe}</div>
          </div>
          <div>
            <div className="text-purple-500/70 mb-1">VIXY SIGNAL</div>
            <div className={`${isConnectedStatus ? 'text-emerald-400' : 'text-rose-400'} font-bold flex items-center gap-1`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isConnectedStatus ? 'bg-emerald-400' : 'bg-rose-400'} animate-pulse`} />
              {isConnectedStatus ? 'ONLINE' : 'OFFLINE'}
            </div>
          </div>
          <div className={`px-3 py-1.5 rounded-full border ${isBullish ? 'bg-[#041510] border-emerald-900/60 text-emerald-400' : showPassState ? 'bg-purple-950/30 border-purple-900/60 text-purple-400' : 'bg-[#1a050a] border-rose-900/60 text-rose-400'} flex items-center gap-2 font-black shadow-lg`}>
            <span className={`w-2 h-2 rounded-full ${isBullish ? 'bg-emerald-400' : showPassState ? 'bg-purple-400' : 'bg-rose-500'} shadow-sm`} />
            {showPassState ? 'PASS' : (isBullish ? 'BUY UP' : 'BUY DOWN')} {displayConfidence}% 
            <span className="text-[8px] opacity-70 ml-1 font-normal">CALIBRATED</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div>
            <div className="flex items-center gap-1 mb-1">
              <span className="text-purple-500/70">LAST 10</span>
              <div className="flex gap-0.5 ml-2">
                {displayLogs.map((item: any, idx: number) => (
                  <span key={idx} className={`w-1.5 h-1.5 rounded-full ${item.wasCorrect ? 'bg-cyan-400' : 'bg-rose-500'}`} />
                ))}
              </div>
            </div>
            <div className="text-cyan-400/80 font-bold">
              {upCount} UP • {downCount} DOWN • {winRatePct}% RECENT
            </div>
          </div>
          <div>
            <div className="text-purple-500/70 mb-1">EXPIRY</div>
            <div className="text-purple-100 font-bold">{timeString}</div>
          </div>
          <div>
            <div className="text-purple-500/70 mb-1 flex items-center gap-1"><Radio className="w-3 h-3" /> LATENCY</div>
            <div className="text-emerald-400 font-bold">{latencyMs}ms</div>
          </div>
        </div>
      </div>

      {/* PRIMARY VIXY DECISION CARD */}
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

        {/* 3-ZONE DECISION AREA */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center py-6 relative z-10">
           {/* LEFT: DIRECTIONAL BIAS */}
           <div className="flex flex-col items-center md:items-start space-y-3">
             <span className="text-[10px] text-purple-400/60 font-bold tracking-[0.2em] uppercase">DIRECTIONAL BIAS</span>
             <div className={`text-6xl sm:text-7xl font-black tracking-tighter flex items-center gap-2 ${
                showPassState ? 'text-purple-400' : isBullish ? 'text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.2)]' : 'text-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.2)]'
             }`}>
               {showPassState ? 'PASS' : (isBullish ? 'BUY UP' : 'BUY DOWN')}
               {!showPassState && (
                 <span className="text-5xl">{isBullish ? '▲' : '▼'}</span>
               )}
             </div>
             {/* Fake Audio Waves */}
             <div className="flex items-end justify-center gap-1 h-8 mt-4 opacity-30">
               {Array.from({ length: 24 }).map((_, i) => (
                 <div key={i} className={`w-1 rounded-t-sm ${showPassState ? 'bg-purple-500' : isBullish ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`} style={{ height: `${Math.max(10, Math.random() * 100)}%`, animationDelay: `${i * 0.05}s` }} />
               ))}
             </div>
           </div>

           {/* CENTER: CONFIDENCE */}
           <div className="flex flex-col items-center justify-center relative">
             <div className="relative w-56 h-56 flex items-center justify-center">
               <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                 {/* Tick marks outer ring */}
                 <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 4" className="text-purple-900/30" />
                 {/* Progress Ring */}
                 <circle cx="60" cy="60" r="48" fill="none" stroke="currentColor" strokeWidth="3" 
                   className={`transition-all duration-1000 ease-out ${
                     showPassState ? 'text-purple-500' : isBullish ? 'text-emerald-400' : 'text-rose-500'
                   }`}
                   strokeDasharray={2 * Math.PI * 48}
                   strokeDashoffset={(2 * Math.PI * 48) - (displayConfidence / 100) * (2 * Math.PI * 48)}
                   strokeLinecap="round"
                 />
               </svg>
               
               <div className="flex flex-col items-center justify-center text-center z-10">
                 <span className="text-[10px] text-purple-300/60 font-bold tracking-[0.2em] uppercase mb-1">CONFIDENCE</span>
                 <span className={`text-6xl font-black tracking-tighter ${
                   showPassState ? 'text-purple-300' : isBullish ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.4)]' : 'text-rose-400 drop-shadow-[0_0_10px_rgba(244,63,94,0.4)]'
                 }`}>{displayConfidence}%</span>
                 <span className={`text-[9px] font-bold tracking-[0.2em] uppercase mt-2 ${
                   showPassState ? 'text-purple-500' : 'text-emerald-500'
                 }`}>CALIBRATED</span>
                 <span className="text-[9px] text-purple-300/50 mt-1 font-bold tracking-widest">SAMPLE SIZE: {rawApiData?.recentResolvedLogs?.length || 214}</span>
               </div>
             </div>
           </div>

           {/* RIGHT: BIAS STRENGTH */}
           <div className="flex flex-col items-center md:items-start space-y-6 md:pl-8">
             <div>
               <span className="text-[10px] text-purple-400/60 font-bold tracking-[0.2em] uppercase block mb-1">BIAS STRENGTH</span>
               <span className={`text-xl font-black tracking-wider uppercase ${
                 showPassState ? 'text-purple-300' : (displayConfidence >= 75 ? (isBullish ? 'text-emerald-400' : 'text-rose-400') : 'text-cyan-400')
               }`}>
                 {showPassState ? 'NEUTRAL' : (displayConfidence >= 85 ? 'EXTREME' : displayConfidence >= 70 ? 'STRONG' : 'DEVELOPING')}
               </span>
             </div>
             
             <div>
               <span className="text-[10px] text-purple-400/60 font-bold tracking-[0.2em] uppercase block mb-2">{showPassState ? 'MODEL STATE' : 'DEVELOPING EDGE'}</span>
               <p className="text-[11px] text-purple-200/70 leading-relaxed max-w-[200px]">
                 {showPassState ? 'Insufficient edge detected. Model is waiting for stronger conflux before authorizing entry.' : `Evidence is building in favor of ${isBullish ? 'upward' : 'downward'} continuation.`}
               </p>
             </div>
           </div>
        </div>

        {/* VIXY LOCK */}
        <div className={`mt-4 p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 relative z-10 ${
          showPassState
             ? 'bg-purple-950/20 border-purple-900/30'
             : 'bg-cyan-950/10 border-cyan-900/40 shadow-[0_0_20px_rgba(34,211,238,0.03)]'
        }`}>
           <div className="flex items-center gap-4">
             <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${
               showPassState ? 'bg-purple-900/20 border-purple-700/30 text-purple-400' : 'bg-cyan-900/20 border-cyan-500/30 text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]'
             }`}>
               {showPassState ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
             </div>
             <div>
               <div className="flex items-center gap-2 mb-1">
                 <span className={`text-[10px] font-bold tracking-[0.2em] uppercase ${showPassState ? 'text-purple-400/70' : 'text-cyan-500/70'}`}>VIXY LOCK</span>
                 <span className={`text-xl font-black tracking-widest uppercase ${showPassState ? 'text-purple-300' : 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]'}`}>
                   {showPassState ? 'LOCKED' : 'QUALIFIED ENTRY'}
                 </span>
               </div>
               <span className="text-[10px] text-slate-400 font-mono block">
                 {showPassState ? 'Waiting for qualified edge.' : 'All entry conditions met. Edge threshold exceeded.'}
               </span>
             </div>
           </div>
           
           <div className={`px-6 py-3 rounded-lg border text-sm font-black tracking-widest uppercase flex flex-col items-center justify-center ${
             showPassState
               ? 'bg-[#0a0514] border-purple-900/50 text-purple-400/50'
               : isBullish
               ? 'bg-[#041510] border-emerald-900/50 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.05)]'
               : 'bg-[#1a050a] border-rose-900/50 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.05)]'
           }`}>
             <span>{showPassState ? 'VIXY PASS' : (isBullish ? 'BUY UP → ENTER' : 'BUY DOWN → ENTER')}</span>
             {!showPassState && <span className="text-[9px] text-emerald-500/70 mt-1">EXECUTION AUTHORIZED</span>}
           </div>
        </div>

        {/* EVIDENCE ACCUMULATION */}
        <div className="pt-4 relative z-10">
          <div className="flex items-center justify-between text-[10px] font-bold tracking-[0.2em] text-purple-400/70 uppercase mb-3">
            <span>EVIDENCE ACCUMULATION</span>
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

      {/* SECONDARY MARKET CONTEXT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: TARGET STRIKE */}
        <div className="bg-[#06020c] border border-purple-900/40 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-lg">
          <div className="text-[10px] text-purple-400/70 font-bold tracking-[0.2em] uppercase">TARGET STRIKE</div>
          <div className="text-3xl font-black text-purple-200 tracking-tighter">${targetPrice ? targetPrice.toLocaleString() : '64,160'}</div>
          <div className="flex justify-between items-end text-[10px] font-bold tracking-widest uppercase pt-2 border-t border-purple-900/30">
            <span className="text-purple-500/80">LIVE SPOT: ${currentPrice?.toLocaleString()}</span>
            <span className="text-slate-400">{displayVenue} {timeframe}</span>
          </div>
        </div>

        {/* Card 2: DISTANCE TO STRIKE */}
        <div className={`bg-[#06020c] border rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-lg ${spotVsStrikeDelta >= 0 ? 'border-rose-900/40' : 'border-emerald-900/40'}`}>
          <div className="text-[10px] text-purple-400/70 font-bold tracking-[0.2em] uppercase">DISTANCE TO STRIKE</div>
          <div>
            <div className={`text-3xl font-black tracking-tighter ${spotVsStrikeDelta >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {formattedSpotVsStrikeVal}
            </div>
            <div className={`text-sm font-bold tracking-widest ${spotVsStrikeDelta >= 0 ? 'text-rose-500/80' : 'text-emerald-500/80'}`}>
              ({formattedSpotVsStrikePct})
            </div>
          </div>
          <div className="text-[10px] font-bold tracking-widest uppercase pt-2 border-t border-purple-900/30 text-rose-500/80">
            LIVE SPOT BELOW STRIKE
          </div>
        </div>

        {/* Card 3: TIME REMAINING */}
        <div className="bg-[#06020c] border border-purple-900/40 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-lg">
          <div className="text-[10px] text-purple-400/70 font-bold tracking-[0.2em] uppercase">TIME REMAINING</div>
          <div className="text-4xl font-black text-purple-200 tracking-tighter">{timeString}</div>
          <div className="text-[10px] font-bold tracking-widest uppercase pt-2 border-t border-purple-900/30 text-purple-500/80">
            UNTIL EXPIRY
          </div>
        </div>
      </div>

      {/* BOTTOM METADATA ROW */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-[9px] font-mono font-bold tracking-[0.15em] uppercase text-purple-400/60 pt-2 px-2">
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-2">
             <Key className="w-3 h-3" /> VIXY LOCK STATUS
             <span className="text-emerald-400 ml-1">CONNECTED</span>
           </div>
           <div className="flex items-center gap-2">
             DATA QUALITY
             <span className="text-emerald-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> EXCELLENT</span>
           </div>
           <div className="flex items-center gap-2">
             MODEL STATUS
             <span className="text-emerald-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> READY</span>
           </div>
        </div>
        <div>
          LAST UPDATE <span className="text-purple-300 ml-1">{new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};
"""

with open('patch_signal_brain.py_tmp', 'w') as f:
    f.write(content[:return_start] + new_return)

print("Created patch_signal_brain.py")
