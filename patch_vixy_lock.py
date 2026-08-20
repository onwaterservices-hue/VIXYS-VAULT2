import re

with open('src/components/brains/SignalBrain.tsx', 'r') as f:
    content = f.read()

start_marker = "{/* ULTRA-PROMINENT VIXY LOCK */}"
end_marker = "{/* EVIDENCE ACCUMULATION */}"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

new_vixy_lock = """{/* ULTRA-PROMINENT VIXY LOCK */}
        <div className={`mt-2 mb-6 p-[1px] rounded-xl relative z-10 overflow-hidden ${
          lockDisplayMode === 'EXIT'
            ? 'bg-gradient-to-b from-rose-600/60 to-rose-950/20 shadow-[0_0_50px_rgba(244,63,94,0.3)]'
            : lockDisplayMode === 'CAUTION'
            ? 'bg-gradient-to-b from-amber-500/40 to-amber-900/10 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
            : 'bg-gradient-to-b from-cyan-400/80 to-cyan-900/20 shadow-[0_0_40px_rgba(34,211,238,0.3)]'
        }`}>
          <div className={`w-full h-full rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-1000 relative ${
            lockDisplayMode === 'EXIT' ? 'bg-[#0a0002]' : lockDisplayMode === 'CAUTION' ? 'bg-[#0f0902]' : 'bg-[#010a0c]'
          }`}>
             {/* Cybernetic background accents */}
             {lockDisplayMode === 'LOCKED' && (
               <>
                 <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.04)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
                 <div className="absolute inset-0 bg-cyan-500/10 animate-[pulse_4s_ease-in-out_infinite]" />
                 <div className="absolute -left-1 -top-1 w-4 h-4 border-t-2 border-l-2 border-cyan-400"></div>
                 <div className="absolute -right-1 -top-1 w-4 h-4 border-t-2 border-r-2 border-cyan-400"></div>
                 <div className="absolute -left-1 -bottom-1 w-4 h-4 border-b-2 border-l-2 border-cyan-400"></div>
                 <div className="absolute -right-1 -bottom-1 w-4 h-4 border-b-2 border-r-2 border-cyan-400"></div>
               </>
             )}
             {lockDisplayMode === 'EXIT' && (
               <>
                 <div className="absolute inset-0 bg-[linear-gradient(rgba(244,63,94,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(244,63,94,0.03)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
                 <div className="absolute inset-0 bg-rose-500/5 animate-[pulse_3s_ease-in-out_infinite]" />
                 <div className="absolute top-0 left-0 w-full h-[1px] bg-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
               </>
             )}

             <div className="flex items-center gap-6 relative z-10">
               <div className={`w-[72px] h-[72px] rounded-full flex items-center justify-center border-2 shadow-2xl ${
                 lockDisplayMode === 'EXIT'
                    ? 'bg-[#1a0005] border-rose-500/80 text-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.4)]'
                    : lockDisplayMode === 'CAUTION'
                    ? 'bg-[#1a0f00] border-amber-500/50 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                    : 'bg-[#021f24] border-cyan-400 text-cyan-300 drop-shadow-[0_0_25px_rgba(34,211,238,0.9)]'
               }`}>
                 {lockDisplayMode === 'EXIT' ? <ShieldAlert className="w-8 h-8" /> : lockDisplayMode === 'CAUTION' ? <AlertTriangle className="w-8 h-8" /> : <Lock className="w-8 h-8" />}
               </div>
               <div>
                 <div className="flex items-center gap-3 mb-1">
                   <span className={`text-[13px] font-black tracking-[0.25em] uppercase ${
                     lockDisplayMode === 'EXIT' ? 'text-rose-500/90' : lockDisplayMode === 'CAUTION' ? 'text-amber-500/80' : 'text-cyan-400/90'
                   }`}>{lockDisplayMode === 'EXIT' ? '🚨 VIXY LOCK' : 'VIXY LOCK'}</span>
                   <span className={`text-[32px] font-black tracking-widest uppercase leading-none ${
                     lockDisplayMode === 'EXIT' ? 'text-rose-500' : lockDisplayMode === 'CAUTION' ? 'text-amber-500' : 'text-cyan-300'
                   }`} style={{ textShadow: lockDisplayMode === 'EXIT' ? '0 0 20px rgba(244,63,94,0.6)' : lockDisplayMode === 'CAUTION' ? '0 0 15px rgba(245,158,11,0.5)' : '0 0 20px rgba(34,211,238,0.9)' }}>
                     {lockDisplayMode === 'EXIT' ? 'EXIT / PROTECT' : lockDisplayMode === 'CAUTION' ? 'CAUTION' : 'LOCKED'}
                   </span>
                 </div>
                 <div className="hidden sm:block mt-2">
                   <span className={`text-[11px] font-black tracking-[0.2em] uppercase mb-1 block ${
                     lockDisplayMode === 'EXIT' ? 'text-rose-400' : lockDisplayMode === 'CAUTION' ? 'text-amber-500/80' : 'text-cyan-400'
                   }`}>
                     {lockDisplayMode === 'EXIT' ? 'THESIS INVALIDATED' : lockDisplayMode === 'CAUTION' ? 'EDGE DETERIORATING' : 'QUALIFIED ENTRY'}
                   </span>
                   <span className={`text-[11px] font-mono block ${
                     lockDisplayMode === 'EXIT' ? 'text-rose-300/80' : lockDisplayMode === 'CAUTION' ? 'text-amber-500/60' : 'text-slate-300'
                   }`}>
                     {lockDisplayMode === 'EXIT' ? 'Original entry conditions are no longer satisfied. Protect capital.' : lockDisplayMode === 'CAUTION' ? 'Market conditions are weakening. Monitor position closely.' : 'All entry conditions met. Edge threshold exceeded.'}
                   </span>
                 </div>
               </div>
             </div>
             
             <div className="relative z-10 flex flex-col items-end justify-center">
               <div className={`px-8 py-4 rounded-lg border-2 text-lg font-black tracking-[0.15em] uppercase flex items-center justify-center ${
                 lockDisplayMode === 'EXIT'
                   ? 'bg-[#1a0005] border-rose-600/80 text-rose-500 shadow-[0_0_40px_rgba(244,63,94,0.4)]'
                   : lockDisplayMode === 'CAUTION'
                   ? 'bg-[#140b00] border-amber-900/60 text-amber-500/80'
                   : isBullish
                   ? 'bg-[#041510] border-[#00FF9D]/60 text-[#00FF9D] shadow-[0_0_30px_rgba(0,255,157,0.3)]'
                   : 'bg-[#1a050a] border-[#FF3366]/60 text-[#FF3366] shadow-[0_0_30px_rgba(255,51,102,0.3)]'
               }`} style={{ textShadow: lockDisplayMode === 'EXIT' ? '0 0 15px rgba(244,63,94,0.6)' : lockDisplayMode === 'LOCKED' && isBullish ? '0 0 10px rgba(0,255,157,0.5)' : lockDisplayMode === 'LOCKED' && !isBullish ? '0 0 10px rgba(255,51,102,0.5)' : 'none' }}>
                 {lockDisplayMode === 'EXIT' ? 'PROTECT CAPITAL → EXIT' : lockDisplayMode === 'CAUTION' ? 'ENTRY NOT RECOMMENDED' : (isBullish ? 'BUY UP → ENTER' : 'BUY DOWN → ENTER')}
               </div>
               <div className={`flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase mt-3 ${
                 lockDisplayMode === 'EXIT' ? 'text-rose-400' : lockDisplayMode === 'CAUTION' ? 'text-amber-500/60' : 'text-cyan-400'
               }`}>
                 {lockDisplayMode === 'EXIT' ? 'RISK STATE: CRITICAL' : lockDisplayMode === 'CAUTION' ? 'GATE CLOSED' : 'EXECUTION AUTHORIZED'}
                 {lockDisplayMode === 'LOCKED' && <span className="flex items-center gap-1.5 ml-2 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-900/50"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" /> GATE ACTIVE</span>}
               </div>
             </div>
          </div>
          
          {(lockDisplayMode === 'EXIT' || lockDisplayMode === 'CAUTION') && (
            <div className={`relative z-10 border-t ${lockDisplayMode === 'EXIT' ? 'border-rose-900/40 bg-[#0a0002]/90' : 'border-amber-900/30 bg-[#0f0902]/90'} px-5 py-3`}>
              <div className={`text-[9px] font-bold tracking-[0.2em] uppercase mb-2 ${lockDisplayMode === 'EXIT' ? 'text-rose-500/70' : 'text-amber-500/70'}`}>
                RISK TELEMETRY
              </div>
              <div className="flex flex-wrap items-center gap-4 sm:gap-8">
                <div>
                  <div className={`text-[9px] uppercase tracking-wider ${lockDisplayMode === 'EXIT' ? 'text-rose-400/50' : 'text-amber-400/50'}`}>REVERSAL THREAT</div>
                  <div className={`text-xs font-black ${lockDisplayMode === 'EXIT' ? 'text-rose-400' : 'text-amber-400'}`}>{reversalRisk}% {reversalRisk >= 50 ? 'CRITICAL' : 'HIGH'}</div>
                </div>
                <div>
                  <div className={`text-[9px] uppercase tracking-wider ${lockDisplayMode === 'EXIT' ? 'text-rose-400/50' : 'text-amber-400/50'}`}>ORDER FLOW</div>
                  <div className={`text-xs font-black ${Number(rawApiData?.features?.orderBookImbalance) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {Number(rawApiData?.features?.orderBookImbalance) >= 0 ? 'BULLISH' : 'BEARISH'}
                  </div>
                </div>
                <div>
                  <div className={`text-[9px] uppercase tracking-wider ${lockDisplayMode === 'EXIT' ? 'text-rose-400/50' : 'text-amber-400/50'}`}>POSITION STATE</div>
                  <div className={`text-xs font-black ${lockDisplayMode === 'EXIT' ? 'text-rose-400' : 'text-amber-400'}`}>
                    {lockDisplayMode === 'EXIT' ? 'PROTECT' : 'WATCH'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        """

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + new_vixy_lock + content[end_idx:]
    with open('src/components/brains/SignalBrain.tsx', 'w') as f:
        f.write(content)
        print("Patched SignalBrain.tsx successfully.")
else:
    print("Could not find markers")
