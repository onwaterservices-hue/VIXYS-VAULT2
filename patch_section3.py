import re

with open('src/components/VixyLockView.tsx', 'r') as f:
    content = f.read()

# Main card
content = content.replace(
    '<div className="vixy-card-elevated p-5 shadow-[0_0_25px_rgba(6,182,212,0.1)] flex flex-col justify-between">',
    '<div className="vixy-card-elevated hud-corners p-5 shadow-[0_0_25px_rgba(6,182,212,0.1)] flex flex-col justify-between">'
)

# 6 Dimensions
content = content.replace(
    '<div className="bg-[#0a0518] p-1.5 rounded-xl border border-purple-900/30 flex justify-between">',
    '<div className="hud-stat-card hud-corners p-1.5 border border-purple-900/30 flex justify-between">'
)

# Footer Confidence
old_conf = r'<span>CONFIDENCE: \{continuousInference\.gemini\.confidence\}%</span>'
new_conf = r'<span className="font-black hud-gradient-text text-[10px]" style={{ "--grad-a": "#06b6d4", "--grad-b": "#fdf8ff", "--grad-c": "#0ea5e9", "--grad-glow": "rgba(6,182,212,0.5)" } as React.CSSProperties}>CONFIDENCE: {continuousInference.gemini.confidence}%</span>'
content = re.sub(old_conf, new_conf, content)

with open('src/components/VixyLockView.tsx', 'w') as f:
    f.write(content)

print("Patched section 3")
