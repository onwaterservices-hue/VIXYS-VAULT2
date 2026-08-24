import re

with open('src/components/VixyLockView.tsx', 'r') as f:
    content = f.read()

# Lock Score gradient text
content = re.sub(
    r'(<span className="text-sm font-black text-amber-300 drop-shadow-\[0_0_10px_rgba\(251,191,36,0\.9\)\])(">)',
    r'\1 hud-gradient-text" style={{ "--grad-a": "#fbbf24", "--grad-b": "#fdf8ff", "--grad-c": "#f59e0b", "--grad-glow": "rgba(251,191,36,0.9)" } as React.CSSProperties}>',
    content
)

# 3 Metric Value Boxes
content = re.sub(
    r'<div className=\{`bg-\[#0a0518\]/95 py-2 px-2 rounded-xl border transition-all duration-300 \$\{normalizedProbabilities\.upPct >= 50 \? \'border-emerald-500/60 shadow-\[0_0_15px_rgba\(0,255,136,0\.15\)\] ring-1 ring-emerald-500/30\' : \'border-emerald-500/25\'\}`\}>\s*<span className="text-\[8\.5px\] text-gray-400 block font-sans font-bold tracking-wider">P\(UP\)</span>\s*<span className="text-sm sm:text-base font-black text-\[#00FF88\] font-mono tracking-tight">\{normalizedProbabilities\.upPct\}%</span>\s*</div>',
    r'<div className={`hud-stat-card hud-corners py-2 px-2 transition-all duration-300 ${normalizedProbabilities.upPct >= 50 ? \'border-emerald-500/60 shadow-[0_0_15px_rgba(0,255,136,0.15)] ring-1 ring-emerald-500/30\' : \'border-emerald-500/25\'}`}>\n                    <span className="hud-stat-label text-center block">P(UP)</span>\n                    <span className="hud-stat-value text-center text-sm sm:text-base font-black text-[#00FF88]">{normalizedProbabilities.upPct}%</span>\n                  </div>',
    content
)

content = re.sub(
    r'<div className=\{`bg-\[#0a0518\]/95 py-2 px-2 rounded-xl border transition-all duration-300 \$\{normalizedProbabilities\.noTradePct >= 12 \? \'border-amber-500/60 shadow-\[0_0_15px_rgba\(245,158,11,0\.15\)\]\' : \'border-amber-500/25\'\}`\}>\s*<span className="text-\[8\.5px\] text-gray-400 block font-sans font-bold tracking-wider">P\(CHOP\)</span>\s*<span className="text-sm sm:text-base font-black text-amber-400 font-mono tracking-tight">\{normalizedProbabilities\.noTradePct\}%</span>\s*</div>',
    r'<div className={`hud-stat-card hud-corners py-2 px-2 transition-all duration-300 ${normalizedProbabilities.noTradePct >= 12 ? \'border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.15)]\' : \'border-amber-500/25\'}`}>\n                    <span className="hud-stat-label text-center block">P(CHOP)</span>\n                    <span className="hud-stat-value text-center text-sm sm:text-base font-black text-amber-400">{normalizedProbabilities.noTradePct}%</span>\n                  </div>',
    content
)

content = re.sub(
    r'<div className=\{`bg-\[#0a0518\]/95 py-2 px-2 rounded-xl border transition-all duration-300 \$\{normalizedProbabilities\.downPct >= 50 \? \'border-rose-500/60 shadow-\[0_0_15px_rgba\(255,59,48,0\.15\)\] ring-1 ring-rose-500/30\' : \'border-rose-500/25\'\}`\}>\s*<span className="text-\[8\.5px\] text-gray-400 block font-sans font-bold tracking-wider">P\(DOWN\)</span>\s*<span className="text-sm sm:text-base font-black text-\[#FF3B30\] font-mono tracking-tight">\{normalizedProbabilities\.downPct\}%</span>\s*</div>',
    r'<div className={`hud-stat-card hud-corners py-2 px-2 transition-all duration-300 ${normalizedProbabilities.downPct >= 50 ? \'border-rose-500/60 shadow-[0_0_15px_rgba(255,59,48,0.15)] ring-1 ring-rose-500/30\' : \'border-rose-500/25\'}`}>\n                    <span className="hud-stat-label text-center block">P(DOWN)</span>\n                    <span className="hud-stat-value text-center text-sm sm:text-base font-black text-[#FF3B30]">{normalizedProbabilities.downPct}%</span>\n                  </div>',
    content
)

# STRIKE & SPOT DELTA METRICS BAR
content = re.sub(
    r'<div className="bg-\[#0a0518\] p-2\.5 rounded-xl border border-purple-900/30">\s*<span className="text-gray-400 block text-\[9px\]">PRICE TO BEAT \(STRIKE\)</span>\s*<span className="text-white font-black text-xs sm:text-sm">\s*\$\{\(strikePrice \?\? 64150\)\.toLocaleString\(undefined, \{ minimumFractionDigits: 2, maximumFractionDigits: 2 \}\)\}\s*</span>\s*</div>',
    r'<div className="hud-stat-card hud-corners p-2.5 border border-purple-900/30">\n                <span className="hud-stat-label text-left block">PRICE TO BEAT (STRIKE)</span>\n                <span className="hud-stat-value text-left text-white font-black text-xs sm:text-sm">\n                  ${(strikePrice ?? 64150).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n                </span>\n              </div>',
    content
)

content = re.sub(
    r'<div className="bg-\[#0a0518\] p-2\.5 rounded-xl border border-purple-900/30">\s*<span className="text-gray-400 block text-\[9px\]">LIVE SPOT \(COINBASE\)</span>\s*<span className="text-white font-black text-xs sm:text-sm">\{coinbasePriceStr\}</span>\s*</div>',
    r'<div className="hud-stat-card hud-corners p-2.5 border border-purple-900/30">\n                <span className="hud-stat-label text-left block">LIVE SPOT (COINBASE)</span>\n                <span className="hud-stat-value text-left text-white font-black text-xs sm:text-sm">{coinbasePriceStr}</span>\n              </div>',
    content
)

content = re.sub(
    r'<div className="bg-\[#0a0518\] p-2\.5 rounded-xl border border-purple-900/30">\s*<span className="text-gray-400 block text-\[9px\]">EXPECTED DELTA</span>\s*<span className=\{`font-black text-xs sm:text-sm \$\{isTargetAchieved \? \'text-\[#00FF88\]\' : \'text-\[#FF3B30\]\'\}`\}>\s*\{\(deltaToBeat \?\? 0\) >= 0 \? \'\+\' : \'\'\}\$\{\(deltaToBeat \?\? 0\)\.toFixed\(2\)\} \(\{isTargetAchieved \? \'IN THE MONEY\' : \'BELOW TARGET\'\}\)\s*</span>\s*</div>',
    r'<div className="hud-stat-card hud-corners p-2.5 border border-purple-900/30">\n                <span className="hud-stat-label text-left block">EXPECTED DELTA</span>\n                <span className={`hud-stat-value text-left font-black text-xs sm:text-sm ${isTargetAchieved ? \'text-[#00FF88]\' : \'text-[#FF3B30]\'}`}>\n                  {(deltaToBeat ?? 0) >= 0 ? \'+\' : \'\'}${(deltaToBeat ?? 0).toFixed(2)} ({isTargetAchieved ? \'IN THE MONEY\' : \'BELOW TARGET\'})\n                </span>\n              </div>',
    content
)


with open('src/components/VixyLockView.tsx', 'w') as f:
    f.write(content)

print("Patched section 1")
