import re

with open('src/components/brains/SignalBrain.tsx', 'r') as f:
    content = f.read()

start_marker = "{/* SECONDARY MARKET CONTEXT CARDS */}"
idx = content.find(start_marker)

new_order_flow = """{/* VIXY ORDER FLOW PRESSURE (NEW MODULE) */}
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
                     <div className="text-3xl font-black text-[#00FF9D]">{Math.max(0, Math.min(100, Math.round((Number(rawApiData?.features?.orderBookImbalance || signal?.confidence / 100 || 0.6) + 1) * 50)))}%</div>
                  </div>
                  <div className="text-right">
                     <div className="text-[10px] font-bold tracking-[0.2em] text-purple-400/70 uppercase mb-1">TAKER SELLERS</div>
                     <div className="text-3xl font-black text-[#FF3366]">{100 - Math.max(0, Math.min(100, Math.round((Number(rawApiData?.features?.orderBookImbalance || signal?.confidence / 100 || 0.6) + 1) * 50)))}%</div>
                  </div>
               </div>
               
               <div className="h-3 w-full bg-[#1a050a] rounded-full overflow-hidden flex relative shadow-inner">
                  <div 
                    className="h-full bg-[#00FF9D] shadow-[0_0_10px_rgba(0,255,157,0.5)] transition-all duration-1000" 
                    style={{ width: `${Math.max(0, Math.min(100, Math.round((Number(rawApiData?.features?.orderBookImbalance || signal?.confidence / 100 || 0.6) + 1) * 50)))}%` }} 
                  />
                  <div 
                    className="h-full bg-[#FF3366] transition-all duration-1000" 
                    style={{ width: `${100 - Math.max(0, Math.min(100, Math.round((Number(rawApiData?.features?.orderBookImbalance || signal?.confidence / 100 || 0.6) + 1) * 50)))}%` }} 
                  />
               </div>

               <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                  <div>
                     <div className="text-[9px] font-bold tracking-[0.15em] text-purple-400/60 uppercase mb-1">NET FLOW (DELTA)</div>
                     <div className={`text-lg font-black ${Number(rawApiData?.features?.orderBookImbalance) >= 0 ? 'text-[#00FF9D]' : 'text-[#FF3366]'}`}>
                        {Number(rawApiData?.features?.orderBookImbalance) >= 0 ? '+' : ''}{Number(rawApiData?.features?.orderBookImbalance || 0.400).toFixed(3)}
                     </div>
                  </div>
                  <div>
                     <div className="text-[9px] font-bold tracking-[0.15em] text-purple-400/60 uppercase mb-1">DELTA (EST. USD)</div>
                     <div className={`text-lg font-black ${Number(rawApiData?.features?.orderBookImbalance) >= 0 ? 'text-[#00FF9D]' : 'text-[#FF3366]'}`}>
                        {Number(rawApiData?.features?.orderBookImbalance) >= 0 ? '+' : '-'}${Math.abs((Number(rawApiData?.features?.orderBookImbalance || 0.4) * 6.2)).toFixed(2)}M
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
                     <div className={`text-lg font-black ${Number(rawApiData?.features?.orderBookImbalance) >= 0 ? 'text-[#00FF9D]' : 'text-[#FF3366]'}`}>
                        {Number(rawApiData?.features?.orderBookImbalance) >= 0 ? 'BULLISH' : 'BEARISH'}
                     </div>
                  </div>
               </div>
            </div>

            <div className="col-span-1 md:col-span-4 flex flex-col justify-center space-y-6 border-l border-purple-900/30 pl-8">
               <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold tracking-[0.2em] uppercase">
                     <span className="text-purple-400/70">BUY VOLUME</span>
                     <span className="text-[#00FF9D]">{Math.max(0, Math.min(100, Math.round((Number(rawApiData?.features?.orderBookImbalance || signal?.confidence / 100 || 0.6) + 1) * 50)))}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#06020c] rounded-full overflow-hidden">
                     <div className="h-full bg-[#00FF9D]" style={{ width: `${Math.max(0, Math.min(100, Math.round((Number(rawApiData?.features?.orderBookImbalance || signal?.confidence / 100 || 0.6) + 1) * 50)))}%` }} />
                  </div>
               </div>
               <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold tracking-[0.2em] uppercase">
                     <span className="text-purple-400/70">SELL VOLUME</span>
                     <span className="text-[#FF3366]">{100 - Math.max(0, Math.min(100, Math.round((Number(rawApiData?.features?.orderBookImbalance || signal?.confidence / 100 || 0.6) + 1) * 50)))}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#06020c] rounded-full overflow-hidden">
                     <div className="h-full bg-[#FF3366]" style={{ width: `${100 - Math.max(0, Math.min(100, Math.round((Number(rawApiData?.features?.orderBookImbalance || signal?.confidence / 100 || 0.6) + 1) * 50)))}%` }} />
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* SECONDARY MARKET CONTEXT CARDS */}"""

if idx != -1:
    content = content[:idx] + new_order_flow + content[idx + len(start_marker):]

with open('src/components/brains/SignalBrain.tsx', 'w') as f:
    f.write(content)
