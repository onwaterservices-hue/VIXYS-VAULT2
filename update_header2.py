import re

with open('src/components/Header.tsx', 'r') as f:
    code = f.read()

code = code.replace("text-white font-black text-xs font-mono px-1.5 py-0.5 rounded bg-purple-950 border border-purple-700/40", "text-white font-black text-xs font-mono tabular-nums transition-all duration-300 px-1.5 py-0.5 rounded bg-purple-950 border border-purple-700/40")

with open('src/components/Header.tsx', 'w') as f:
    f.write(code)
