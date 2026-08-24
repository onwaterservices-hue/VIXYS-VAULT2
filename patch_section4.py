import re

with open('src/components/VixyLockView.tsx', 'r') as f:
    content = f.read()

# Main card
content = content.replace(
    '<div className="vixy-card-elevated p-5 shadow-[0_0_25px_rgba(157,78,221,0.1)]">',
    '<div className="vixy-card-elevated hud-corners p-5 shadow-[0_0_25px_rgba(157,78,221,0.1)]">'
)

# Sub-cards
content = content.replace(
    '<div className="bg-[#0a0518] p-3.5 rounded-2xl border border-purple-900/30">',
    '<div className="hud-stat-card hud-corners p-3.5 border border-purple-900/30">'
)

content = content.replace(
    '<div className="bg-[#0a0518] p-3.5 rounded-2xl border border-emerald-500/30 flex flex-col justify-between">',
    '<div className="hud-stat-card hud-corners p-3.5 border border-emerald-500/30 flex flex-col justify-between">'
)

# Gradient text for spread
old_spread = r'<div className="text-lg font-black text-white">\{spreadValueStr\}</div>'
new_spread = r'<div className="text-lg font-black text-white hud-gradient-text" style={{ "--grad-a": "#34d399", "--grad-b": "#fdf8ff", "--grad-c": "#10b981", "--grad-glow": "rgba(52,211,153,0.4)" } as React.CSSProperties}>{spreadValueStr}</div>'
content = re.sub(old_spread, new_spread, content)

with open('src/components/VixyLockView.tsx', 'w') as f:
    f.write(content)

print("Patched section 4")
