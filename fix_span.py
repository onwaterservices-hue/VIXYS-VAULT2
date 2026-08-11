import re

with open('src/components/brains/SignalBrain.tsx', 'r') as f:
    content = f.read()

pattern = r'<span className=\{\}>'
replacement = r'<span className={`text-[10px] font-mono font-bold tracking-widest uppercase ${feedStatus === \'STALE\' ? \'text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded\' : \'text-purple-300/80\'}`}>'
content = re.sub(pattern, replacement, content)

with open('src/components/brains/SignalBrain.tsx', 'w') as f:
    f.write(content)
