import re

with open('src/components/VixyLockView.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    '<div className="bg-[#0a0518]/90 p-3.5 rounded-2xl border border-purple-900/40 my-4 shadow-inner space-y-1.5">',
    '<div className="hud-stat-card hud-corners p-3.5 border border-purple-900/40 my-4 space-y-1.5">'
)

with open('src/components/VixyLockView.tsx', 'w') as f:
    f.write(content)

print("Patched Rationale")
