import re

with open('src/components/brains/SignalBrain.tsx', 'r') as f:
    content = f.read()

# Fix VIXY LOCK title and middle text
content = content.replace(
"""               <div className="flex items-center gap-2 mb-1">
                 <span className={`text-[10px] font-bold tracking-[0.2em] uppercase ${showPassState ? 'text-purple-400/70' : 'text-cyan-500/70'}`}>VIXY LOCK</span>
                 <span className={`text-xl font-black tracking-widest uppercase ${showPassState ? 'text-purple-300' : 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]'}`}>
                   {showPassState ? 'LOCKED' : 'QUALIFIED ENTRY'}
                 </span>
               </div>
               <span className="text-[10px] text-slate-400 font-mono block">
                 {showPassState ? 'Waiting for qualified edge.' : 'All entry conditions met. Edge threshold exceeded.'}
               </span>""",
"""               <div className="flex items-center gap-2 mb-1">
                 <span className={`text-[10px] font-bold tracking-[0.2em] uppercase ${showPassState ? 'text-purple-400/70' : 'text-cyan-500/70'}`}>VIXY LOCK</span>
                 <span className={`text-xl font-black tracking-widest uppercase ${showPassState ? 'text-purple-300' : 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]'}`}>
                   {showPassState ? 'PASS' : 'LOCKED'}
                 </span>
               </div>
             </div>
             
             <div className="hidden sm:block flex-1 px-4">
               <span className="text-[10px] text-cyan-500/70 font-bold tracking-[0.2em] uppercase mb-1 block">QUALIFIED ENTRY</span>
               <span className="text-[10px] text-slate-400 font-mono block">
                 {showPassState ? 'Waiting for qualified edge.' : 'All entry conditions met. Edge threshold exceeded.'}
               </span>"""
)

# Fix TARGET STRIKE box to match image exactly
content = content.replace(
"""          <div className="flex justify-between items-end text-[10px] font-bold tracking-widest uppercase pt-2 border-t border-purple-900/30">
            <span className="text-purple-500/80">LIVE SPOT: ${currentPrice?.toLocaleString()}</span>
            <span className="text-slate-400">{displayVenue} {timeframe}</span>
          </div>""",
"""          <div className="flex justify-between items-end text-[10px] font-bold tracking-widest uppercase pt-2 border-t border-purple-900/30">
            <span className="text-purple-500/80">LIVE SPOT: <span className="text-purple-300">${currentPrice?.toLocaleString()}</span></span>
            <span className="text-slate-400">{displayVenue} {timeframe}</span>
          </div>"""
)

# Fix DISTANCE TO STRIKE box
content = content.replace(
"""          <div className="text-[10px] font-bold tracking-widest uppercase pt-2 border-t border-purple-900/30 text-rose-500/80">
            LIVE SPOT BELOW STRIKE
          </div>""",
"""          <div className={`text-[10px] font-bold tracking-widest uppercase pt-2 border-t border-purple-900/30 ${spotVsStrikeDelta >= 0 ? 'text-emerald-500/80' : 'text-rose-500/80'}`}>
            {spotVsStrikeDelta >= 0 ? 'LIVE SPOT ABOVE STRIKE' : 'LIVE SPOT BELOW STRIKE'}
          </div>"""
)

with open('src/components/brains/SignalBrain.tsx', 'w') as f:
    f.write(content)

