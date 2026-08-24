import re

with open('src/components/brains/AiThinkingBrain.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    '<div className="bg-[#060210] p-4 rounded-2xl border border-purple-900/50 space-y-3">',
    '<div className="vixy-card hud-corners p-4 border border-purple-900/50 space-y-3">'
)

content = content.replace(
    '<div className="bg-[#0a031a] p-2.5 rounded-xl border border-purple-800/40">',
    '<div className="hud-stat-card hud-corners border border-purple-800/40">'
)

content = content.replace(
    '<div className="bg-[#0a031a] p-2.5 rounded-xl border border-amber-500/40 animate-pulse">',
    '<div className="hud-stat-card hud-corners border border-amber-500/40 animate-pulse">'
)

with open('src/components/brains/AiThinkingBrain.tsx', 'w') as f:
    f.write(content)
