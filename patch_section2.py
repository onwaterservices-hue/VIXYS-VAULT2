import re

with open('src/components/VixyLockView.tsx', 'r') as f:
    content = f.read()

# Guardian card main div
content = content.replace(
    '<div className="vixy-card-elevated p-5 shadow-[0_0_25px_rgba(157,78,221,0.15)] flex flex-col justify-between">',
    '<div className="vixy-card-elevated hud-corners p-5 shadow-[0_0_25px_rgba(157,78,221,0.15)] flex flex-col justify-between">'
)

# Remove emoji
content = content.replace(
    '<span className="text-[11px] text-white font-black uppercase tracking-wider">🛡️ VIXY PROTECTION</span>',
    '<span className="text-[11px] text-white font-black uppercase tracking-wider">VIXY PROTECTION</span>'
)

# Lock Score card
old_lock_score = r'<div className="bg-gradient-to-br from-amber-500/25 via-purple-900/40 to-cyan-500/20 p-2\.5 rounded-2xl border-2 border-amber-400/80 shadow-\[0_0_20px_rgba\(251,191,36,0\.35\)\] relative overflow-hidden">'
new_lock_score = r'<div className="hud-stat-card hud-corners p-2.5 border-2 border-amber-400/80 shadow-[0_0_20px_rgba(251,191,36,0.35)] relative overflow-hidden">'
content = re.sub(old_lock_score, new_lock_score, content)

old_lock_text = r'<div className="text-xl sm:text-2xl font-black text-amber-300 font-mono drop-shadow-\[0_0_10px_rgba\(251,191,36,0\.8\)\]">'
new_lock_text = r'<div className="text-xl sm:text-2xl font-black text-amber-300 font-mono hud-gradient-text" style={{ "--grad-a": "#fbbf24", "--grad-b": "#fdf8ff", "--grad-c": "#f59e0b", "--grad-glow": "rgba(251,191,36,0.9)" } as React.CSSProperties}>'
content = re.sub(old_lock_text, new_lock_text, content)

# Reversal Risk card
old_risk_card = r'<div className="bg-\[#0a0518\] p-2\.5 rounded-2xl border border-purple-900/30 flex flex-col justify-between">'
new_risk_card = r'<div className="hud-stat-card hud-corners p-2.5 border border-purple-900/30 flex flex-col justify-between">'
content = re.sub(old_risk_card, new_risk_card, content)

content = content.replace(
    '<span className="text-gray-400 block text-[8.5px]">REVERSAL RISK</span>',
    '<span className="hud-stat-label block text-[8.5px]">REVERSAL RISK</span>'
)

with open('src/components/VixyLockView.tsx', 'w') as f:
    f.write(content)

print("Patched section 2")
