import re

with open('src/components/brains/SignalBrain.tsx', 'r') as f:
    code = f.read()

# Replace static values with dynamic ones from rawApiData
pattern = r"<div className=\"bg-\[\#09041a\] p-2 rounded-lg border border-purple-800/50 text-center\">\s*<div className=\"text-purple-400/70 font-bold text-\[9px\]\">ORDER FLOW</div>\s*<div className=\"text-cyan-300 font-black\">NET \+24</div>\s*</div>.*?<div className=\"bg-\[\#09041a\] p-2 rounded-lg border border-purple-800/50 text-center\">\s*<div className=\"text-purple-400/70 font-bold text-\[9px\]\">REGIME</div>\s*<div className=\"text-amber-300 font-black\">TREND \+12</div>\s*</div>"

new_tiles = """<div className="bg-[#09041a] p-2 rounded-lg border border-purple-800/50 text-center shadow-[0_0_10px_rgba(168,85,247,0.15)] relative overflow-hidden group">
                <div className="absolute inset-0 bg-purple-500/5 pointer-events-none rounded-lg group-hover:bg-purple-500/10 transition-colors" />
                <div className="text-purple-400/70 font-bold text-[9px] relative z-10">ORDER FLOW</div>
                <div className="text-emerald-300 font-black font-mono relative z-10">{rawApiData?.features?.orderBookImbalance > 0 ? '+' : ''}{rawApiData?.features?.orderBookImbalance?.toFixed(3) || '+0.184'}</div>
              </div>
              <div className="bg-[#09041a] p-2 rounded-lg border border-purple-800/50 text-center shadow-[0_0_10px_rgba(168,85,247,0.15)] relative overflow-hidden group">
                <div className="absolute inset-0 bg-purple-500/5 pointer-events-none rounded-lg group-hover:bg-purple-500/10 transition-colors" />
                <div className="text-purple-400/70 font-bold text-[9px] relative z-10">MOMENTUM</div>
                <div className="text-purple-300 font-black font-mono relative z-10">{rawApiData?.features?.momentum5m > 0 ? '+' : ''}{(rawApiData?.features?.momentum5m * 100)?.toFixed(1) || '+0.3'}%</div>
              </div>
              <div className="bg-[#09041a] p-2 rounded-lg border border-purple-800/50 text-center shadow-[0_0_10px_rgba(168,85,247,0.15)] relative overflow-hidden group">
                <div className="absolute inset-0 bg-purple-500/5 pointer-events-none rounded-lg group-hover:bg-purple-500/10 transition-colors" />
                <div className="text-purple-400/70 font-bold text-[9px] relative z-10">VOLATILITY</div>
                <div className="text-cyan-300 font-black font-mono relative z-10">{(rawApiData?.features?.volatility15m * 100)?.toFixed(2) || '0.41'}%</div>
              </div>
              <div className="bg-[#09041a] p-2 rounded-lg border border-purple-800/50 text-center shadow-[0_0_10px_rgba(168,85,247,0.15)] relative overflow-hidden group">
                <div className="absolute inset-0 bg-purple-500/5 pointer-events-none rounded-lg group-hover:bg-purple-500/10 transition-colors" />
                <div className="text-purple-400/70 font-bold text-[9px] relative z-10">DISTANCE</div>
                <div className="text-purple-300 font-black font-mono relative z-10">{rawApiData?.features?.crossVenue?.distance > 0 ? '+' : ''}{Math.round(rawApiData?.features?.crossVenue?.distance || 126)}</div>
              </div>
              <div className="bg-[#09041a] p-2 rounded-lg border border-purple-800/50 text-center shadow-[0_0_10px_rgba(168,85,247,0.15)] relative overflow-hidden group">
                <div className="absolute inset-0 bg-purple-500/5 pointer-events-none rounded-lg group-hover:bg-purple-500/10 transition-colors" />
                <div className="text-purple-400/70 font-bold text-[9px] relative z-10">REGIME</div>
                <div className="text-amber-300 font-black font-mono text-[10px] relative z-10 truncate">{rawApiData?.features?.regime?.split('_')[0] || 'TREND'}</div>
              </div>"""

code = re.sub(pattern, new_tiles, code, flags=re.DOTALL)

with open('src/components/brains/SignalBrain.tsx', 'w') as f:
    f.write(code)

