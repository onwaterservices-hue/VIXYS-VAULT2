import re

with open('src/components/brains/SignalBrain.tsx', 'r') as f:
    code = f.read()

# Make numeric values in evidence tiles tabular-nums and transition
code = code.replace("text-emerald-300 font-black font-mono relative z-10", "text-emerald-300 font-black font-mono tabular-nums transition-all duration-300 relative z-10")
code = code.replace("text-purple-300 font-black font-mono relative z-10", "text-purple-300 font-black font-mono tabular-nums transition-all duration-300 relative z-10")
code = code.replace("text-cyan-300 font-black font-mono relative z-10", "text-cyan-300 font-black font-mono tabular-nums transition-all duration-300 relative z-10")
code = code.replace("text-amber-300 font-black font-mono text-[10px] relative z-10 truncate", "text-amber-300 font-black font-mono tabular-nums transition-all duration-300 text-[10px] relative z-10 truncate")
code = code.replace("text-5xl sm:text-6xl lg:text-7xl font-black font-mono drop-shadow", "text-5xl sm:text-6xl lg:text-7xl font-black font-mono tabular-nums transition-all duration-300 drop-shadow")
code = code.replace("px-2 py-0.5 rounded text-[10px] font-black", "px-2 py-0.5 rounded text-[10px] font-black tabular-nums transition-all duration-300")
code = code.replace("px-3 py-1 rounded-full border text-xs font-black uppercase flex items-center gap-2 transition-all", "px-3 py-1 rounded-full border text-xs font-black uppercase flex items-center gap-2 transition-all duration-300 tabular-nums")
code = code.replace("ml-2 px-3 py-1 rounded-full", "ml-2 px-3 py-1 rounded-full tabular-nums")

with open('src/components/brains/SignalBrain.tsx', 'w') as f:
    f.write(code)

