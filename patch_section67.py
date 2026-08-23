import re

with open('src/components/VixyLockView.tsx', 'r') as f:
    content = f.read()

# Section 6
content = content.replace(
    '<div className="vixy-card-elevated p-5 shadow-[0_0_25px_rgba(0,255,136,0.08)] space-y-3.5">',
    '<div className="vixy-card-elevated hud-corners p-5 shadow-[0_0_25px_rgba(0,255,136,0.08)] space-y-3.5">'
)

content = re.sub(
    r'className=\{`bg-\[#0a0518\] p-3\.5 rounded-2xl border transition-all duration-300 flex flex-col justify-between \$\{',
    r'className={`hud-stat-card hud-corners p-3.5 border transition-all duration-300 flex flex-col justify-between ${',
    content
)

content = content.replace(
    '<div className="space-y-1 text-[8.5px] bg-[#0c0620] p-2 rounded-xl border border-purple-900/30 mb-2">',
    '<div className="space-y-1 text-[8.5px] hud-stat-card hud-corners p-2 border border-purple-900/30 mb-2">'
)

# Section 7
content = content.replace(
    '<div className="vixy-card-elevated p-5 shadow-[0_0_25px_rgba(0,0,0,0.5)] space-y-4">',
    '<div className="vixy-card-elevated hud-corners p-5 shadow-[0_0_25px_rgba(0,0,0,0.5)] space-y-4">'
)

old_streak = r'<span className="px-2\.5 py-1 rounded-xl bg-\[#00FF88\]/20 border border-\[#00FF88\]/40 text-\[#00FF88\] font-black">\s*🔥 \{streakStats\.currentStreak\} WINS IN A ROW\s*</span>'
new_streak = r'<span className="px-2.5 py-1 rounded-xl bg-[#00FF88]/20 border border-[#00FF88]/40 text-[#00FF88] font-black hud-gradient-text" style={{ "--grad-a": "#34d399", "--grad-b": "#fdf8ff", "--grad-c": "#10b981", "--grad-glow": "rgba(52,211,153,0.4)" } as React.CSSProperties}>\n                {streakStats.currentStreak} WINS IN A ROW\n              </span>'
content = re.sub(old_streak, new_streak, content)

content = content.replace(
    '<div className="bg-[#0a0518] p-3 rounded-2xl border border-purple-900/30">',
    '<div className="hud-stat-card hud-corners p-3 border border-purple-900/30">'
)

content = re.sub(
    r'className=\{`p-2 rounded-xl border text-center transition-all \$\{',
    r'className={`p-2 hud-corners border text-center transition-all ${',
    content
)

with open('src/components/VixyLockView.tsx', 'w') as f:
    f.write(content)

print("Patched section 6 and 7")
