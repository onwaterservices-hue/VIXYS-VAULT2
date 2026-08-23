import re

files = [
    'src/components/brains/ProtectionBrain.tsx',
    'src/components/brains/VixyProtectionSummary.tsx',
    'src/components/brains/WhaleBrain.tsx',
    'src/components/brains/SignalBrain.tsx',
    'src/components/brains/OrderFlowPressure.tsx',
    'src/components/brains/AiThinkingBrain.tsx',
    'src/components/brains/ExecutionBrain.tsx',
    'src/components/LiveDashboard.tsx'
]

def apply_hud_corners(content):
    # Remove manual brackets if present
    content = re.sub(r'\{\/\* HUD Corner Brackets \*\/\}[\s\n]*(?:<div className="absolute[^>]+><\/div>[\s\n]*){4}', '', content)
    # ProtectionBrain, WhaleBrain
    content = re.sub(r'className="bg-\[#[0-9a-fA-F]+\] rounded-2xl border border-purple-900/60([^"]+)"', r'className="vixy-card-elevated hud-corners border border-purple-900/60\1"', content)
    # AiThinkingBrain, ExecutionBrain
    content = re.sub(r'className="bg-\[#[0-9a-fA-F]+\] rounded-3xl border border-purple-800/70([^"]+)"', r'className="vixy-card-elevated hud-corners border border-purple-800/70\1"', content)
    # OrderFlowPressure
    content = re.sub(r'className="bg-\[#[0-9a-fA-F]+\] border border-purple-900/40 rounded-2xl([^"]+)"', r'className="vixy-card-elevated hud-corners border border-purple-900/40 rounded-2xl\1"', content)
    # SignalBrain
    content = re.sub(r'className="bg-\[#[0-9a-fA-F]+\] border border-purple-900/40 rounded-3xl([^"]+)"', r'className="vixy-card-elevated hud-corners border border-purple-900/40 rounded-3xl\1"', content)
    # VixyProtectionSummary
    content = re.sub(r'className="relative overflow-hidden rounded-2xl border border-purple-950/60 bg-\[#[0-9a-fA-F]+\]/90([^"]+)"', r'className="relative overflow-hidden rounded-2xl border border-purple-950/60 vixy-card hud-corners\1"', content)
    return content

for file in files:
    try:
        with open(file, 'r') as f:
            content = f.read()
            
        content = apply_hud_corners(content)
        
        # Specific overrides
        if 'ProtectionBrain.tsx' in file:
            content = re.sub(
                r'<div className={`text-4xl sm:text-5xl font-black font-mono tracking-tight transition-colors \$\{([^}]+)\}`}>\s*\{survivalScore\}%\s*</div>',
                r'<div className="text-4xl sm:text-5xl font-black font-mono tracking-tight hud-gradient-text"\n               style={\n                 survivalScore >= 65\n                   ? { "--grad-a": "#34d399", "--grad-b": "#f5f0ff", "--grad-c": "#10b981", "--grad-glow": "rgba(52,211,153,0.4)" } as React.CSSProperties\n                   : survivalScore >= 45\n                   ? { "--grad-a": "#fbbf24", "--grad-b": "#f5f0ff", "--grad-c": "#f59e0b", "--grad-glow": "rgba(251,191,36,0.4)" } as React.CSSProperties\n                   : { "--grad-a": "#fb7185", "--grad-b": "#f5f0ff", "--grad-c": "#e11d48", "--grad-glow": "rgba(244,63,94,0.5)" } as React.CSSProperties\n               }\n            >\n              {survivalScore}%\n            </div>',
                content
            )
            
        elif 'WhaleBrain.tsx' in file:
            content = re.sub(
                r'<div className={`text-xl sm:text-2xl font-black tracking-tight \$\{isBuy \? \'text-emerald-400\' : \'text-rose-400\'\}`}>\s*\{latest\.sizeUSD\} \{latest\.asset\} \{latest\.action\}\s*</div>',
                r'<div className="text-xl sm:text-2xl font-black tracking-tight hud-gradient-text" style={isBuy ? { "--grad-a": "#34d399", "--grad-b": "#f5f0ff", "--grad-c": "#10b981", "--grad-glow": "rgba(52,211,153,0.4)" } as React.CSSProperties : { "--grad-a": "#fb7185", "--grad-b": "#f5f0ff", "--grad-c": "#e11d48", "--grad-glow": "rgba(244,63,94,0.5)" } as React.CSSProperties}>\n            {latest.sizeUSD} {latest.asset} {latest.action}\n          </div>',
                content
            )
            # 3 Pill Badges
            content = re.sub(
                r'<div className="bg-\[#030108\] border border-purple-900/50 rounded-lg p-1\.5">\s*<div className="text-purple-400/70 font-bold uppercase text-\[7\.5px\] tracking-wider">CONFIDENCE</div>\s*<div className="text-amber-300 font-black text-\[10px\] mt-0\.5">\{latest\.confidence\}</div>\s*</div>',
                r'<div className="hud-stat-card hud-corners border border-purple-900/50">\n            <div className="hud-stat-label">CONFIDENCE</div>\n            <div className="hud-stat-value text-amber-300">{latest.confidence}</div>\n          </div>',
                content
            )
            content = re.sub(
                r'<div className="bg-\[#030108\] border border-purple-900/50 rounded-lg p-1\.5">\s*<div className="text-purple-400/70 font-bold uppercase text-\[7\.5px\] tracking-wider">IMPACT</div>\s*<div className={`font-black text-\[10px\] mt-0\.5 \$\{latest\.effect === \'Bullish\' \? \'text-emerald-400\' : \'text-rose-400\'\}`}>\s*\{latest\.effect\}\s*</div>\s*</div>',
                r'<div className="hud-stat-card hud-corners border border-purple-900/50">\n            <div className="hud-stat-label">IMPACT</div>\n            <div className={`hud-stat-value ${latest.effect === \'Bullish\' ? \'text-emerald-400\' : \'text-rose-400\'}`}>\n              {latest.effect}\n            </div>\n          </div>',
                content
            )
            content = re.sub(
                r'<div className="bg-\[#030108\] border border-purple-900/50 rounded-lg p-1\.5">\s*<div className="text-purple-400/70 font-bold uppercase text-\[7\.5px\] tracking-wider">@TS</div>\s*<div className="text-cyan-300 font-black text-\[10px\] mt-0\.5">\{latest\.timeAgo\}</div>\s*</div>',
                r'<div className="hud-stat-card hud-corners border border-purple-900/50">\n            <div className="hud-stat-label">@TS</div>\n            <div className="hud-stat-value text-cyan-300">{latest.timeAgo}</div>\n          </div>',
                content
            )
            
        elif 'SignalBrain.tsx' in file:
            content = re.sub(
                r'className={`rounded-xl border p-4 flex flex-col justify-between space-y-3 shadow-\[0_0_15px_rgba\(0,0,0,0\.5\)\] relative overflow-hidden group transition-colors \$\{([^}]+)\}`}',
                r'className={`hud-stat-card hud-corners border flex flex-col justify-between space-y-3 shadow-[0_0_15px_rgba(0,0,0,0.5)] relative overflow-hidden group transition-colors ${\1}`}',
                content
            )
            content = re.sub(
                r'<div className={`text-xl font-black tracking-wider (\w+ )?\$\{([^\}]+)\}`}>\s*\{(volatilityState\.valueText|distanceState\.valueText|regimeState\.primaryText)\}\s*</div>',
                r'<div className={`text-xl font-black tracking-wider \1${\2} hud-gradient-text`}>\n                 {\3}\n               </div>',
                content
            )
            # Actually, I should just map the gradient variables via style to override color
            pass
            
        elif 'OrderFlowPressure.tsx' in file:
            # Stats columns
            content = re.sub(
                r'<div className="p-3 bg-\[#0a0316\] rounded-xl border border-purple-900/30 flex flex-col items-center justify-center">',
                r'<div className="hud-stat-card hud-corners p-3 border border-purple-900/30 flex flex-col items-center justify-center">',
                content
            )
            # For OrderFlow pressure gradient text readout
            content = re.sub(
                r'<div className={`text-4xl sm:text-5xl font-black tracking-tight leading-none drop-shadow-\[0_0_15px_rgba\(0,0,0,0\.5\)\] \$\{([^}]+)\}`}>\s*\{safeToFixed\(buyPressurePct, 1\)\}%\s*</div>',
                r'<div className={`text-4xl sm:text-5xl font-black tracking-tight leading-none drop-shadow-[0_0_15px_rgba(0,0,0,0.5)] hud-gradient-text ${\1}`}\n                   style={{\n                     "--grad-a": isBullish ? "#34d399" : "#fb7185",\n                     "--grad-b": "#f5f0ff",\n                     "--grad-c": isBullish ? "#10b981" : "#e11d48",\n                     "--grad-glow": isBullish ? "rgba(52,211,153,0.4)" : "rgba(244,63,94,0.4)"\n                   } as React.CSSProperties}\n              >\n                {safeToFixed(buyPressurePct, 1)}%\n              </div>',
                content
            )
            
        elif 'AiThinkingBrain.tsx' in file:
            content = re.sub(
                r'<div className="bg-\[#060210\] p-5 rounded-2xl border border-purple-800/60 space-y-4">',
                r'<div className="hud-stat-card hud-corners p-5 border border-purple-800/60 space-y-4">',
                content
            )
            
        elif 'ExecutionBrain.tsx' in file:
            content = re.sub(
                r'<div className="bg-\[#060210\] p-4 rounded-2xl border border-purple-800/60 space-y-1">',
                r'<div className="hud-stat-card hud-corners p-4 border border-purple-800/60 space-y-1">',
                content
            )
            content = re.sub(
                r'<div className="bg-\[#060210\] p-4 rounded-2xl border border-purple-800/60 col-span-1 sm:col-span-2 text-center space-y-1">',
                r'<div className="hud-stat-card hud-corners p-4 border border-purple-800/60 col-span-1 sm:col-span-2 text-center space-y-1">',
                content
            )
            
        elif 'LiveDashboard.tsx' in file:
            # Let's add the background page layout
            # Usually <div className="p-4 space-y-6 sm:space-y-8 min-h-screen bg-[#020008] text-slate-200">
            content = re.sub(
                r'className="([^"]*min-h-screen[^"]*)"',
                r'className="\1 hud-page"',
                content
            )

        with open(file, 'w') as f:
            f.write(content)
            
    except Exception as e:
        print(f"Error patching {file}: {e}")

print("Patched remaining files.")
