import re

with open('src/components/brains/SignalBrain.tsx', 'r') as f:
    content = f.read()

# Update the main text color
pattern = r'className=\{\`text-5xl sm:text-6xl lg:text-7xl font-black font-mono tracking-tight uppercase flex items-center gap-3 drop-shadow-\[0_0_35px_rgba\(0,0,0,0\.9\)\] \$\{\n                  isBullish\n                    \? \'text-emerald-400 drop-shadow-\[0_0_30px_rgba\(16,185,129,0\.8\)\]\'\n                    : \'text-rose-400 drop-shadow-\[0_0_30px_rgba\(244,63,94,0\.8\)\]\'\n                \}\`\}'

replacement = r'''className={`text-5xl sm:text-6xl lg:text-7xl font-black font-mono tracking-tight uppercase flex items-center gap-3 drop-shadow-[0_0_35px_rgba(0,0,0,0.9)] ${
                  feedStatus === 'STALE'
                    ? 'text-slate-400 drop-shadow-[0_0_30px_rgba(100,116,139,0.8)]'
                    : isBullish
                    ? 'text-emerald-400 drop-shadow-[0_0_30px_rgba(16,185,129,0.8)]'
                    : 'text-rose-400 drop-shadow-[0_0_30px_rgba(244,63,94,0.8)]'
                }`}'''

content = re.sub(pattern, replacement, content)

with open('src/components/brains/SignalBrain.tsx', 'w') as f:
    f.write(content)
