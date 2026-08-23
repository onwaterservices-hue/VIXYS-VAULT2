import re

with open('src/components/VixyLockView.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    '<div className="grid grid-cols-3 gap-1 text-[8px] bg-[#0a0518] p-2 rounded-xl border border-purple-900/30">',
    '<div className="grid grid-cols-3 gap-1 text-[8px] hud-stat-card hud-corners p-2 border border-purple-900/30">'
)

with open('src/components/VixyLockView.tsx', 'w') as f:
    f.write(content)
