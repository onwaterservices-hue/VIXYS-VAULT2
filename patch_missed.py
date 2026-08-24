import re

with open('src/components/VixyLockView.tsx', 'r') as f:
    content = f.read()

# Countdown Card
content = content.replace(
    '<div className="vixy-card-elevated p-5 shadow-[0_0_25px_rgba(0,0,0,0.5)] flex items-center justify-between relative overflow-hidden">',
    '<div className="vixy-card-elevated hud-corners p-5 shadow-[0_0_25px_rgba(0,0,0,0.5)] flex items-center justify-between relative overflow-hidden">'
)

# Order Flow & Book Depth Card
content = content.replace(
    '<div className="lg:col-span-4 vixy-card-elevated p-5 flex flex-col justify-between shadow-[0_0_25px_rgba(0,0,0,0.5)]">',
    '<div className="lg:col-span-4 vixy-card-elevated hud-corners p-5 flex flex-col justify-between shadow-[0_0_25px_rgba(0,0,0,0.5)]">'
)

# And the inner metrics of Order Flow
content = content.replace(
    '<div className="bg-[#0a0518] p-2 rounded-xl border border-purple-900/30 text-center">',
    '<div className="hud-stat-card hud-corners p-2 border border-purple-900/30 text-center">'
)

with open('src/components/VixyLockView.tsx', 'w') as f:
    f.write(content)

print("Patched missed")
