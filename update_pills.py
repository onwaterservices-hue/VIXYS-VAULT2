import re

with open('src/components/brains/SignalBrain.tsx', 'r') as f:
    code = f.read()

# Replace VIXY SIGNAL ENGINE ONLINE
pattern1 = r"<div className=\"flex items-center gap-2\">\s*VIXY SIGNAL ENGINE <span className=\"text-cyan-300 font-mono ml-1\">ONLINE</span>\s*</div>"
replacement1 = """<div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)] text-[11px] font-mono font-bold transition-all">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_5px_#34d399]" />
            VIXY SIGNAL ENGINE ONLINE
          </div>"""
code = re.sub(pattern1, replacement1, code)

# Replace CALIBRATED CONFIDENCE pill
pattern2 = r"<div className=\{\`px-3 py-1 rounded-lg border text-xs font-black uppercase flex items-center gap-2 \$\{\n\s*isBullish\n\s*\? 'bg-cyan-950/90 text-cyan-300 border-cyan-500/60'\n\s*: 'bg-rose-950/90 text-rose-300 border-rose-500/60'\n\s*\}\`\}>\n\s*<span className=\{\`w-2 h-2 rounded-full \$\{\w+ \? 'bg-cyan-400' : 'bg-rose-400'\}\`\} />\n\s*\{\w+ \? 'BUY UP' : 'BUY DOWN'\} \{displayConfidence\}%\n\s*<span className=\"text-\[9px\] opacity-80 font-normal\">CALIBRATED CONFIDENCE</span>\n\s*</div>"

replacement2 = """<div className={`px-3 py-1 rounded-full border text-xs font-black uppercase flex items-center gap-2 transition-all ${
            isBullish
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
              : 'bg-rose-950/60 text-rose-300 border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.25)]'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isBullish ? 'bg-emerald-400 shadow-[0_0_5px_#34d399]' : 'bg-rose-400 shadow-[0_0_5px_#fb7185]'}`} />
            {isBullish ? 'BUY UP' : 'BUY DOWN'} <span className="font-mono">{displayConfidence}%</span>
            <span className="text-[9px] opacity-80 font-normal">CALIBRATED CONFIDENCE</span>
          </div>"""
code = re.sub(pattern2, replacement2, code)

# Replace LOCK IN pill
pattern3 = r"<span className=\"ml-2 text-purple-400/80 font-bold\">🔒 LOCK IN \{timeString\}</span>"
replacement3 = """<span className="ml-2 px-3 py-1 rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.15)] text-[11px] font-mono font-bold transition-all">🔒 LOCK IN {timeString}</span>"""
code = re.sub(pattern3, replacement3, code)

with open('src/components/brains/SignalBrain.tsx', 'w') as f:
    f.write(code)

