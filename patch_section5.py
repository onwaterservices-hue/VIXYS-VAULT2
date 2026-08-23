import re

with open('src/components/VixyLockView.tsx', 'r') as f:
    content = f.read()

# Row C cards wrapper
content = content.replace(
    '<div className="lg:col-span-4 vixy-card-elevated p-5 flex flex-col justify-between">',
    '<div className="lg:col-span-4 vixy-card-elevated hud-corners p-5 flex flex-col justify-between">'
)

# 1. Technical Signal Stack
content = content.replace(
    '<div className="bg-[#0a0518] p-2 rounded-xl border border-purple-900/30">',
    '<div className="hud-stat-card hud-corners p-2 border border-purple-900/30">'
)
content = content.replace(
    '<div className="bg-[#0a0518] p-2 rounded-xl border border-purple-900/30 flex justify-between items-center">',
    '<div className="hud-stat-card hud-corners p-2 border border-purple-900/30 flex justify-between items-center">'
)
content = content.replace(
    '<div className="bg-[#0c0620] p-1 rounded-lg border border-[#00FF88]/30">',
    '<div className="hud-stat-card hud-corners p-1 border border-[#00FF88]/30">'
)

# 2. Multi-Timeframe Matrix
content = content.replace(
    '<div className="space-y-1 bg-[#0a0518] p-2.5 rounded-2xl border border-purple-900/30 text-[9.5px]">',
    '<div className="hud-stat-card hud-corners space-y-1 p-2.5 border border-purple-900/30 text-[9.5px]">'
)
content = content.replace(
    '<div className="bg-gradient-to-r from-[#0C0819] to-[#14122B] p-3 rounded-2xl border border-purple-500/40 flex items-center justify-between mt-2.5">',
    '<div className="hud-stat-card hud-corners p-3 border border-purple-500/40 flex items-center justify-between mt-2.5">'
)
content = content.replace(
    '<div className="text-xs font-black text-[#00FF88]">{regimeVal}</div>',
    '<div className="text-xs font-black text-[#00FF88] hud-gradient-text" style={{ "--grad-a": "#34d399", "--grad-b": "#fdf8ff", "--grad-c": "#10b981", "--grad-glow": "rgba(52,211,153,0.4)" } as React.CSSProperties}>{regimeVal}</div>'
)

# 3. Whale Flow
content = content.replace(
    '<div className="bg-[#0a0518] p-2.5 rounded-2xl border border-purple-900/30 space-y-1.5 mb-2">',
    '<div className="hud-stat-card hud-corners p-2.5 border border-purple-900/30 space-y-1.5 mb-2">'
)
content = content.replace(
    '<div className="space-y-1 bg-[#0a0518] p-2 rounded-2xl border border-purple-900/30 text-[9px]">',
    '<div className="hud-stat-card hud-corners space-y-1 p-2 border border-purple-900/30 text-[9px]">'
)


with open('src/components/VixyLockView.tsx', 'w') as f:
    f.write(content)

print("Patched section 5")
