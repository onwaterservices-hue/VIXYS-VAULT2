import re

with open('src/components/VixyLockView.tsx', 'r') as f:
    content = f.read()

# Section 8
content = content.replace(
    '<div className="lg:col-span-8 vixy-card-elevated p-5 flex flex-col justify-between shadow-[0_0_25px_rgba(0,0,0,0.5)]">',
    '<div className="lg:col-span-8 vixy-card-elevated hud-corners p-5 flex flex-col justify-between shadow-[0_0_25px_rgba(0,0,0,0.5)]">'
)

# Section 9
content = content.replace(
    '<div className="space-y-1.5 text-[9.5px] bg-[#0a0518] p-2.5 rounded-2xl border border-purple-900/30">',
    '<div className="hud-stat-card hud-corners space-y-1.5 text-[9.5px] p-2.5 border border-purple-900/30">'
)

content = content.replace(
    '<span className="text-[#00FF88] text-[9.5px] font-bold">VERIFIED</span>',
    '<span className="text-[#00FF88] text-[10px] font-black hud-gradient-text" style={{ "--grad-a": "#34d399", "--grad-b": "#fdf8ff", "--grad-c": "#10b981", "--grad-glow": "rgba(52,211,153,0.4)" } as React.CSSProperties}>VERIFIED</span>'
)


with open('src/components/VixyLockView.tsx', 'w') as f:
    f.write(content)

print("Patched section 8 and 9")
