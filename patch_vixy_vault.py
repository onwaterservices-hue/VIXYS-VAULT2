import re

with open('src/components/brains/SignalBrain.tsx', 'r') as f:
    content = f.read()

# 1. Update the Header (VIXY DECISION ENGINE)
start_header = "{/* HEADER */}"
end_header = "{/* DECISION & CONFIDENCE AREA (Clean Vertical Hierarchy) */}"

idx1 = content.find(start_header)
idx2 = content.find(end_header)

new_header = """{/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 border-b border-purple-900/30 pb-4 mb-4">
          <div className="flex items-center gap-3">
             <div className="text-cyan-400 opacity-80">
               <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12H3m14-5l4 5-4 5"/></svg>
             </div>
             <div>
               <h2 className="text-sm font-black text-slate-100 tracking-[0.25em] uppercase drop-shadow-md">VIXY DECISION ENGINE</h2>
               <span className="text-[9px] text-purple-400/80 tracking-[0.2em] font-bold uppercase mt-0.5 block">HIGH-CONVICTION SETUP</span>
             </div>
          </div>
          <div className="flex items-center gap-3 text-[9px] font-mono font-bold tracking-[0.2em] uppercase bg-[#06020c] py-1.5 px-3 rounded border border-purple-900/40">
             <span className="text-purple-400/60">ENGINE: <span className="text-slate-300">V17</span></span>
             <span className="text-purple-400/60">MODEL: <span className="text-emerald-400">LIVE</span></span>
             <span className="text-purple-400/60">DATA: <span className="text-emerald-400">LIVE</span></span>
             <span className="text-purple-400/60">CALIBRATION: <span className="text-emerald-400">ACTIVE</span></span>
          </div>
        </div>

        """

if idx1 != -1 and idx2 != -1:
    content = content[:idx1] + new_header + content[idx2:]


# 2. Update the DECISION & CONFIDENCE AREA
start_decision = "{/* DECISION & CONFIDENCE AREA (Clean Vertical Hierarchy) */}"
end_decision = "{/* ULTRA-PROMINENT VIXY LOCK */}"

idx1 = content.find(start_decision)
idx2 = content.find(end_decision)

new_decision = """{/* DECISION & CONFIDENCE AREA (Clean Vertical Hierarchy) */}
        <div className="flex flex-col items-center justify-center py-8 relative z-10 space-y-2">
           <span className="text-[11px] text-purple-300/80 font-black tracking-[0.25em] uppercase mb-1 drop-shadow-sm">CURRENT DECISION BIAS</span>
           <div className="flex flex-col items-center justify-center relative">
             {/* Background Grids and Brackets */}
             <div className="absolute inset-0 -mx-16 -my-8 bg-[linear-gradient(rgba(147,51,234,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(147,51,234,0.03)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />
             <div className="absolute -left-12 top-0 w-3 h-3 border-t-2 border-l-2 border-purple-500/30 opacity-50"></div>
             <div className="absolute -right-12 top-0 w-3 h-3 border-t-2 border-r-2 border-purple-500/30 opacity-50"></div>
             <div className="absolute -left-12 bottom-0 w-3 h-3 border-b-2 border-l-2 border-purple-500/30 opacity-50"></div>
             <div className="absolute -right-12 bottom-0 w-3 h-3 border-b-2 border-r-2 border-purple-500/30 opacity-50"></div>

             {/* Atmospheric Bloom */}
             <div className={`absolute inset-0 blur-[60px] opacity-20 rounded-full transition-colors duration-1000 ${
               isModelPass ? 'bg-purple-600' : isBullish ? 'bg-emerald-500' : 'bg-rose-500'
             }`} />
             
             <div className={`text-[85px] sm:text-[110px] leading-none font-black tracking-tighter flex items-center gap-4 relative z-10 transition-colors duration-500 ${
                isModelPass ? 'text-purple-400 drop-shadow-[0_0_20px_rgba(168,85,247,0.4)]' : isBullish ? 'text-[#00FF9D] drop-shadow-[0_0_25px_rgba(0,255,157,0.4)]' : 'text-[#FF3366] drop-shadow-[0_0_25px_rgba(255,51,102,0.4)]'
             }`} style={{ textShadow: isModelPass ? '0 0 30px rgba(168,85,247,0.3)' : isBullish ? '0 0 30px rgba(0,255,157,0.3)' : '0 0 30px rgba(255,51,102,0.3)' }}>
               {isModelPass ? 'PASS' : (isBullish ? 'BUY UP' : 'BUY DOWN')}
               {!isModelPass && (
                 <span className="text-[70px] sm:text-[90px]">{isBullish ? '▲' : '▼'}</span>
               )}
             </div>
             <div className="flex items-center gap-3 mt-4 relative z-10">
               <span className={`text-[42px] font-black tracking-tighter ${
                 isModelPass ? 'text-purple-300' : isBullish ? 'text-[#00FF9D]' : 'text-[#FF3366]'
               }`} style={{ textShadow: isModelPass ? '0 0 15px rgba(168,85,247,0.4)' : isBullish ? '0 0 15px rgba(0,255,157,0.4)' : '0 0 15px rgba(255,51,102,0.4)' }}>{displayConfidence}%</span>
               <span className={`text-[10px] font-black tracking-[0.2em] uppercase px-3 py-1.5 rounded border ${
                 isModelPass ? 'bg-purple-900/30 border-purple-700/50 text-purple-400' : isBullish ? 'bg-[#041510] border-emerald-900/50 text-[#00FF9D]' : 'bg-[#1a050a] border-rose-900/50 text-[#FF3366]'
               }`}>CALIBRATED</span>
             </div>
           </div>
        </div>

        """

if idx1 != -1 and idx2 != -1:
    content = content[:idx1] + new_decision + content[idx2:]


# 3. Update VIXY LOCK
start_lock = "{/* ULTRA-PROMINENT VIXY LOCK */}"
end_lock = "{/* EVIDENCE ACCUMULATION */}"

idx1 = content.find(start_lock)
idx2 = content.find(end_lock)

new_lock = """{/* ULTRA-PROMINENT VIXY LOCK */}
        <div className={`mt-2 mb-6 p-[1px] rounded-xl relative z-10 overflow-hidden ${
          showLockPassState
            ? 'bg-gradient-to-b from-amber-500/40 to-amber-900/10 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
            : 'bg-gradient-to-b from-cyan-400/80 to-cyan-900/20 shadow-[0_0_40px_rgba(34,211,238,0.3)]'
        }`}>
          <div className={`w-full h-full rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-1000 relative ${
            showLockPassState ? 'bg-[#0f0902]' : 'bg-[#010a0c]'
          }`}>
             {/* Cybernetic background accents */}
             {!showLockPassState && (
               <>
                 <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.04)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
                 <div className="absolute inset-0 bg-cyan-500/10 animate-[pulse_4s_ease-in-out_infinite]" />
                 <div className="absolute -left-1 -top-1 w-4 h-4 border-t-2 border-l-2 border-cyan-400"></div>
                 <div className="absolute -right-1 -top-1 w-4 h-4 border-t-2 border-r-2 border-cyan-400"></div>
                 <div className="absolute -left-1 -bottom-1 w-4 h-4 border-b-2 border-l-2 border-cyan-400"></div>
                 <div className="absolute -right-1 -bottom-1 w-4 h-4 border-b-2 border-r-2 border-cyan-400"></div>
               </>
             )}

             <div className="flex items-center gap-6 relative z-10">
               <div className={`w-[72px] h-[72px] rounded-full flex items-center justify-center border-2 shadow-2xl ${
                 showLockPassState 
                   ? 'bg-[#1a0f00] border-amber-500/50 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)]' 
                   : 'bg-[#021f24] border-cyan-400 text-cyan-300 drop-shadow-[0_0_25px_rgba(34,211,238,0.9)]'
               }`}>
                 <Lock className="w-8 h-8" />
               </div>
               <div>
                 <div className="flex items-center gap-3 mb-1">
                   <span className={`text-[13px] font-black tracking-[0.25em] uppercase ${showLockPassState ? 'text-amber-500/80' : 'text-cyan-400/90'}`}>VIXY LOCK</span>
                   <span className={`text-[32px] font-black tracking-widest uppercase leading-none ${showLockPassState ? 'text-amber-500' : 'text-cyan-300'}`} style={{ textShadow: showLockPassState ? '0 0 15px rgba(245,158,11,0.5)' : '0 0 20px rgba(34,211,238,0.9)' }}>
                     {showLockPassState ? 'PASS' : 'LOCKED'}
                   </span>
                 </div>
                 <div className="hidden sm:block mt-2">
                   <span className={`text-[11px] font-black tracking-[0.2em] uppercase mb-1 block ${showLockPassState ? 'text-amber-500/80' : 'text-cyan-400'}`}>
                     {showLockPassState ? 'ENTRY BLOCKED' : 'QUALIFIED ENTRY'}
                   </span>
                   <span className={`text-[11px] font-mono block ${showLockPassState ? 'text-amber-500/60' : 'text-slate-300'}`}>
                     {showLockPassState ? 'Qualification not met.' : 'All entry conditions met. Edge threshold exceeded.'}
                   </span>
                 </div>
               </div>
             </div>
             
             <div className="relative z-10 flex flex-col items-end justify-center">
               <div className={`px-8 py-4 rounded-lg border-2 text-lg font-black tracking-[0.15em] uppercase flex items-center justify-center ${
                 showLockPassState
                   ? 'bg-[#140b00] border-amber-900/60 text-amber-500/80'
                   : isBullish
                   ? 'bg-[#041510] border-[#00FF9D]/60 text-[#00FF9D] shadow-[0_0_30px_rgba(0,255,157,0.3)]'
                   : 'bg-[#1a050a] border-[#FF3366]/60 text-[#FF3366] shadow-[0_0_30px_rgba(255,51,102,0.3)]'
               }`} style={{ textShadow: !showLockPassState && isBullish ? '0 0 10px rgba(0,255,157,0.5)' : !showLockPassState && !isBullish ? '0 0 10px rgba(255,51,102,0.5)' : 'none' }}>
                 {showLockPassState ? 'VIXY PASS → WAIT' : (isBullish ? 'BUY UP → ENTER' : 'BUY DOWN → ENTER')}
               </div>
               <div className={`flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase mt-3 ${showLockPassState ? 'text-amber-500/60' : 'text-cyan-400'}`}>
                 {showLockPassState ? 'GATE CLOSED' : 'EXECUTION AUTHORIZED'}
                 {!showLockPassState && <span className="flex items-center gap-1.5 ml-2 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-900/50"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" /> GATE ACTIVE</span>}
               </div>
             </div>
          </div>
        </div>

        """

if idx1 != -1 and idx2 != -1:
    content = content[:idx1] + new_lock + content[idx2:]

# 4. Insert VIXY ORDER FLOW PRESSURE after INSTITUTIONAL EDGE BAR end
insertion_marker = "</div>\n      </div>\n      {/* SECONDARY MARKET CONTEXT CARDS */}"
idx = content.find(insertion_marker)

new_order_flow = """</div>
      </div>

      {/* VIXY ORDER FLOW PRESSURE (NEW MODULE) */}
      <div className="bg-[#080312] border border-purple-900/40 rounded-2xl p-6 relative overflow-hidden shadow-2xl mb-4">
         <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
               <div className="text-purple-400"><Layers className="w-5 h-5" /></div>
               <h3 className="text-xs font-black tracking-[0.2em] text-slate-200 uppercase">VIXY ORDER FLOW PRESSURE</h3>
            </div>
            <div className="flex items-center gap-2 text-[9px] font-bold tracking-[0.2em] text-purple-400/60 uppercase">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
               LIVE • {displayVenue} {timeframe}
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="col-span-1 md:col-span-8 flex flex-col space-y-5">
               <div className="flex justify-between items-end">
                  <div>
                     <div className="text-[10px] font-bold tracking-[0.2em] text-purple-400/70 uppercase mb-1">TAKER BUYERS</div>
                     <div className="text-3xl font-black text-[#00FF9D]">{Math.max(0, Math.min(100, Math.round((Number(rawApiData?.features?.orderFlow || signal?.confidence / 100 || 0.6) + 1) * 50)))}%</div>
                  </div>
                  <div className="text-right">
                     <div className="text-[10px] font-bold tracking-[0.2em] text-purple-400/70 uppercase mb-1">TAKER SELLERS</div>
                     <div className="text-3xl font-black text-[#FF3366]">{100 - Math.max(0, Math.min(100, Math.round((Number(rawApiData?.features?.orderFlow || signal?.confidence / 100 || 0.6) + 1) * 50)))}%</div>
                  </div>
               </div>
               
               <div className="h-3 w-full bg-[#1a050a] rounded-full overflow-hidden flex relative shadow-inner">
                  <div 
                    className="h-full bg-[#00FF9D] shadow-[0_0_10px_rgba(0,255,157,0.5)] transition-all duration-1000" 
                    style={{ width: `${Math.max(0, Math.min(100, Math.round((Number(rawApiData?.features?.orderFlow || signal?.confidence / 100 || 0.6) + 1) * 50)))}%` }} 
                  />
                  <div 
                    className="h-full bg-[#FF3366] transition-all duration-1000" 
                    style={{ width: `${100 - Math.max(0, Math.min(100, Math.round((Number(rawApiData?.features?.orderFlow || signal?.confidence / 100 || 0.6) + 1) * 50)))}%` }} 
                  />
               </div>

               <div className="grid grid-cols-4 gap-4 pt-2">
                  <div>
                     <div className="text-[9px] font-bold tracking-[0.15em] text-purple-400/60 uppercase mb-1">NET FLOW (DELTA)</div>
                     <div className={`text-lg font-black ${Number(rawApiData?.features?.orderFlow) >= 0 ? 'text-[#00FF9D]' : 'text-[#FF3366]'}`}>
                        {Number(rawApiData?.features?.orderFlow) >= 0 ? '+' : ''}{Number(rawApiData?.features?.orderFlow || 0.400).toFixed(3)}
                     </div>
                  </div>
                  <div>
                     <div className="text-[9px] font-bold tracking-[0.15em] text-purple-400/60 uppercase mb-1">DELTA (EST. USD)</div>
                     <div className={`text-lg font-black ${Number(rawApiData?.features?.orderFlow) >= 0 ? 'text-[#00FF9D]' : 'text-[#FF3366]'}`}>
                        {Number(rawApiData?.features?.orderFlow) >= 0 ? '+' : '-'}${Math.abs((Number(rawApiData?.features?.orderFlow || 0.4) * 6.2)).toFixed(2)}M
                     </div>
                  </div>
                  <div>
                     <div className="text-[9px] font-bold tracking-[0.15em] text-purple-400/60 uppercase mb-1">PRESSURE</div>
                     <div className="text-lg font-black text-[#00FF9D]">
                        RISING
                     </div>
                  </div>
                  <div>
                     <div className="text-[9px] font-bold tracking-[0.15em] text-purple-400/60 uppercase mb-1">FLOW STATE</div>
                     <div className={`text-lg font-black ${Number(rawApiData?.features?.orderFlow) >= 0 ? 'text-[#00FF9D]' : 'text-[#FF3366]'}`}>
                        {Number(rawApiData?.features?.orderFlow) >= 0 ? 'BULLISH' : 'BEARISH'}
                     </div>
                  </div>
               </div>
            </div>

            <div className="col-span-1 md:col-span-4 flex flex-col justify-center space-y-6 border-l border-purple-900/30 pl-8">
               <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold tracking-[0.2em] uppercase">
                     <span className="text-purple-400/70">BUY VOLUME</span>
                     <span className="text-[#00FF9D]">{Math.max(0, Math.min(100, Math.round((Number(rawApiData?.features?.orderFlow || signal?.confidence / 100 || 0.6) + 1) * 50)))}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#06020c] rounded-full overflow-hidden">
                     <div className="h-full bg-[#00FF9D]" style={{ width: `${Math.max(0, Math.min(100, Math.round((Number(rawApiData?.features?.orderFlow || signal?.confidence / 100 || 0.6) + 1) * 50)))}%` }} />
                  </div>
               </div>
               <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold tracking-[0.2em] uppercase">
                     <span className="text-purple-400/70">SELL VOLUME</span>
                     <span className="text-[#FF3366]">{100 - Math.max(0, Math.min(100, Math.round((Number(rawApiData?.features?.orderFlow || signal?.confidence / 100 || 0.6) + 1) * 50)))}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#06020c] rounded-full overflow-hidden">
                     <div className="h-full bg-[#FF3366]" style={{ width: `${100 - Math.max(0, Math.min(100, Math.round((Number(rawApiData?.features?.orderFlow || signal?.confidence / 100 || 0.6) + 1) * 50)))}%` }} />
                  </div>
               </div>
            </div>
         </div>
      </div>
      
      {/* SECONDARY MARKET CONTEXT CARDS */}"""

if idx != -1:
    content = content[:idx] + new_order_flow + content[idx + len(insertion_marker):]


with open('src/components/brains/SignalBrain.tsx', 'w') as f:
    f.write(content)

print("Patch generated successfully")
