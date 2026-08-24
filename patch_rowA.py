import re

with open('src/components/VixyLockView.tsx', 'r') as f:
    content = f.read()

# Chart SVG container
content = content.replace(
    '<div className="relative h-56 sm:h-64 w-full bg-[#0a0518] rounded-2xl border border-purple-900/30 p-3 overflow-hidden">',
    '<div className="relative h-56 sm:h-64 w-full hud-stat-card hud-corners border border-purple-900/30 p-3 overflow-hidden">'
)

# Order book container (assuming it is the col-span-4 next to the col-span-8)
content = content.replace(
    '<div className="lg:col-span-4 vixy-card-elevated p-5 flex flex-col justify-between">',
    '<div className="lg:col-span-4 vixy-card-elevated hud-corners p-5 flex flex-col justify-between">'
)

# Order book small boxes
content = content.replace(
    '<div className="bg-[#0a0518] p-2.5 rounded-2xl border border-purple-900/30 mb-2.5">',
    '<div className="hud-stat-card hud-corners p-2.5 border border-purple-900/30 mb-2.5">'
)

content = content.replace(
    '<div className="space-y-1 bg-[#0a0518] p-2.5 rounded-2xl border border-purple-900/30 text-[9px]">',
    '<div className="hud-stat-card hud-corners space-y-1 p-2.5 border border-purple-900/30 text-[9px]">'
)

with open('src/components/VixyLockView.tsx', 'w') as f:
    f.write(content)

print("Patched Row A")
