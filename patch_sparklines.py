import re

with open('src/components/brains/SignalBrain.tsx', 'r') as f:
    content = f.read()

def replace_metric(metric_name, color_class):
    # This is a bit tricky, I will use regex or string replace for each.
    pass

# Instead of python string parsing, let's just use string replace on the generic structure
old_order_flow = """           {/* Order Flow */}
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
           </div>"""

new_order_flow = """           {/* Order Flow */}
           <div className="bg-[#06020c] rounded-xl border border-purple-900/30 p-4 flex flex-col justify-between space-y-3 shadow-[0_0_15px_rgba(0,0,0,0.5)] relative overflow-hidden group hover:border-purple-700/50 transition-colors">
             <span className="text-[10px] font-bold tracking-[0.15em] text-purple-400/60 uppercase relative z-10">ORDER FLOW</span>
             <div className="relative z-10">
               <div className={`text-xl font-black tracking-wider ${rawApiData?.features?.orderBookImbalance >= 0 ? 'text-[#00FF9D]' : 'text-[#FF3366]'}`}>
                 {rawApiData?.features?.orderBookImbalance >= 0 ? '+' : ''}{rawApiData?.features?.orderBookImbalance?.toFixed(3) || '+0.400'}
               </div>
               <div className={`text-[10px] font-bold tracking-widest uppercase mt-1 ${rawApiData?.features?.orderBookImbalance >= 0 ? 'text-[#00FF9D]/80' : 'text-[#FF3366]/80'}`}>
                 {rawApiData?.features?.orderBookImbalance >= 0 ? 'BULLISH' : 'BEARISH'}
               </div>
             </div>
             <div className="absolute bottom-2 right-2 opacity-30 group-hover:opacity-60 transition-opacity">
               <svg width="40" height="15" viewBox="0 0 40 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                 <path d="M1 10C5 10 7 12 10 12C14 12 16 7 20 7C24 7 26 13 30 13C34 13 37 4 39 4" stroke={rawApiData?.features?.orderBookImbalance >= 0 ? "#00FF9D" : "#FF3366"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
               </svg>
             </div>
           </div>"""

content = content.replace(old_order_flow, new_order_flow)


old_momentum = """           {/* Momentum */}
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
           </div>"""

new_momentum = """           {/* Momentum */}
           <div className="bg-[#06020c] rounded-xl border border-purple-900/30 p-4 flex flex-col justify-between space-y-3 shadow-[0_0_15px_rgba(0,0,0,0.5)] relative overflow-hidden group hover:border-purple-700/50 transition-colors">
             <span className="text-[10px] font-bold tracking-[0.15em] text-purple-400/60 uppercase relative z-10">MOMENTUM</span>
             <div className="relative z-10">
               <div className={`text-xl font-black tracking-wider ${rawApiData?.features?.momentum5m >= 0 ? 'text-[#00FF9D]' : 'text-[#FF3366]'}`}>
                 {rawApiData?.features?.momentum5m >= 0 ? '+' : ''}{(rawApiData?.features?.momentum5m * 100)?.toFixed(1) || '-68.7'}%
               </div>
               <div className={`text-[10px] font-bold tracking-widest uppercase mt-1 ${rawApiData?.features?.momentum5m >= 0 ? 'text-[#00FF9D]/80' : 'text-[#FF3366]/80'}`}>
                 STRONG
               </div>
             </div>
             <div className="absolute bottom-2 right-2 opacity-30 group-hover:opacity-60 transition-opacity">
               <svg width="40" height="15" viewBox="0 0 40 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                 <path d="M1 12C3 12 5 11 8 11C11 11 13 14 17 14C20 14 23 8 26 8C29 8 31 5 34 5C37 5 38 2 39 2" stroke={rawApiData?.features?.momentum5m >= 0 ? "#00FF9D" : "#FF3366"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
               </svg>
             </div>
           </div>"""

content = content.replace(old_momentum, new_momentum)

old_vol = """           {/* Volatility */}
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
           </div>"""

new_vol = """           {/* Volatility */}
           <div className="bg-[#06020c] rounded-xl border border-purple-900/30 p-4 flex flex-col justify-between space-y-3 shadow-[0_0_15px_rgba(0,0,0,0.5)] relative overflow-hidden group hover:border-purple-700/50 transition-colors">
             <span className="text-[10px] font-bold tracking-[0.15em] text-purple-400/60 uppercase relative z-10">VOLATILITY</span>
             <div className="relative z-10">
               <div className="text-xl font-black tracking-wider text-slate-200">
                 {(rawApiData?.features?.volatility15m * 100)?.toFixed(2) || '68.90'}%
               </div>
               <div className="text-[10px] font-bold tracking-widest uppercase mt-1 text-[#00FF9D]/80">
                 ELEVATED
               </div>
             </div>
             <div className="absolute bottom-2 right-2 opacity-30 group-hover:opacity-60 transition-opacity">
               <svg width="40" height="15" viewBox="0 0 40 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                 <path d="M1 13C3 13 4 10 6 10C8 10 9 14 11 14C14 14 16 5 19 5C21 5 23 11 25 11C28 11 30 7 33 7C36 7 38 2 39 2" stroke="#00FF9D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
               </svg>
             </div>
           </div>"""

content = content.replace(old_vol, new_vol)

old_dist = """           {/* Distance */}
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
           </div>"""

new_dist = """           {/* Distance */}
           <div className="bg-[#06020c] rounded-xl border border-purple-900/30 p-4 flex flex-col justify-between space-y-3 shadow-[0_0_15px_rgba(0,0,0,0.5)] relative overflow-hidden group hover:border-purple-700/50 transition-colors">
             <span className="text-[10px] font-bold tracking-[0.15em] text-purple-400/60 uppercase relative z-10">DISTANCE</span>
             <div className="relative z-10">
               <div className={`text-xl font-black tracking-wider ${rawApiData?.features?.crossVenue?.distance >= 0 ? 'text-[#00FF9D]' : 'text-[#00FF9D]'}`}>
                 {rawApiData?.features?.crossVenue?.distance > 0 ? '+' : ''}{Math.round(rawApiData?.features?.crossVenue?.distance || 24)}
               </div>
               <div className={`text-[10px] font-bold tracking-widest uppercase mt-1 text-[#00FF9D]/80`}>
                 FAVORABLE
               </div>
             </div>
             <div className="absolute bottom-2 right-2 opacity-30 group-hover:opacity-60 transition-opacity">
               <svg width="40" height="15" viewBox="0 0 40 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                 <path d="M1 12C5 12 7 14 10 14C14 14 17 8 20 8C23 8 25 11 29 11C33 11 36 6 39 6" stroke="#00FF9D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
               </svg>
             </div>
           </div>"""
content = content.replace(old_dist, new_dist)


old_regime = """           {/* Regime */}
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
           </div>"""

new_regime = """           {/* Regime */}
           <div className="bg-[#06020c] rounded-xl border border-purple-900/30 p-4 flex flex-col justify-between space-y-3 shadow-[0_0_15px_rgba(0,0,0,0.5)] relative overflow-hidden group hover:border-purple-700/50 transition-colors">
             <span className="text-[10px] font-bold tracking-[0.15em] text-purple-400/60 uppercase relative z-10">REGIME</span>
             <div className="relative z-10">
               <div className="text-xl font-black tracking-wider text-slate-200 truncate">
                 {rawApiData?.features?.regime?.split('_')[0] || 'TRENDING'}
               </div>
               <div className={`text-[10px] font-bold tracking-widest uppercase mt-1 ${rawApiData?.features?.regime?.includes('BEAR') ? 'text-[#FF3366]/80' : 'text-[#00FF9D]/80'}`}>
                 {rawApiData?.features?.regime?.includes('BEAR') ? 'BEARISH' : 'BULLISH'}
               </div>
             </div>
             <div className="absolute bottom-2 right-2 opacity-30 group-hover:opacity-60 transition-opacity">
               <svg width="40" height="15" viewBox="0 0 40 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                 <path d="M1 11C4 11 6 13 9 13C12 13 14 7 17 7C20 7 23 10 26 10C29 10 32 3 35 3C37 3 38 1 39 1" stroke={rawApiData?.features?.regime?.includes('BEAR') ? "#FF3366" : "#00FF9D"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
               </svg>
             </div>
           </div>"""

content = content.replace(old_regime, new_regime)

# Add Layers to lucide-react imports if it's missing
if "Layers" not in content and "lucide-react" in content:
    content = content.replace("import { ", "import { Layers, ")

with open('src/components/brains/SignalBrain.tsx', 'w') as f:
    f.write(content)

