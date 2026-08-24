import re

with open('src/components/brains/ExecutionBrain.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    '<div className="text-2xl font-black text-emerald-400">',
    '<div className="text-2xl font-black text-emerald-400 hud-gradient-text" style={{ "--grad-a": "#34d399", "--grad-b": "#f5f0ff", "--grad-c": "#10b981", "--grad-glow": "rgba(52,211,153,0.4)" } as React.CSSProperties}>'
)
content = content.replace(
    '<div className="text-2xl font-black text-white">',
    '<div className="text-2xl font-black text-white hud-gradient-text" style={{ "--grad-a": "#e2e8f0", "--grad-b": "#ffffff", "--grad-c": "#cbd5e1", "--grad-glow": "rgba(255,255,255,0.2)" } as React.CSSProperties}>'
)
content = content.replace(
    '<div className="text-2xl font-black text-amber-300">',
    '<div className="text-2xl font-black text-amber-300 hud-gradient-text" style={{ "--grad-a": "#fbbf24", "--grad-b": "#f5f0ff", "--grad-c": "#f59e0b", "--grad-glow": "rgba(251,191,36,0.4)" } as React.CSSProperties}>'
)
content = content.replace(
    '<div className="text-2xl font-black text-rose-400">',
    '<div className="text-2xl font-black text-rose-400 hud-gradient-text" style={{ "--grad-a": "#fb7185", "--grad-b": "#f5f0ff", "--grad-c": "#e11d48", "--grad-glow": "rgba(244,63,94,0.5)" } as React.CSSProperties}>'
)

with open('src/components/brains/ExecutionBrain.tsx', 'w') as f:
    f.write(content)
