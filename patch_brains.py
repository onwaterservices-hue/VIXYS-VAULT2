import re

# 1. InstitutionalIntelRadar.tsx
with open('src/components/brains/InstitutionalIntelRadar.tsx', 'r') as f:
    code = f.read()

# Replace outer container and remove hardcoded corner brackets
code = re.sub(
    r'<div className="bg-\[#03010a\] rounded-2xl border border-purple-900/60[^"]+">.*?<!-- HUD Corner Brackets -->.*?</div>\s*</div>\s*</div>\s*</div>',
    r'<div className="vixy-card-elevated hud-corners p-4 sm:p-5 font-mono shadow-[0_0_30px_rgba(0,0,0,0.8)] relative overflow-hidden flex flex-col justify-between h-full group">',
    code, flags=re.DOTALL
)
code = code.replace(
    '<div className="bg-[#03010a] rounded-2xl border border-purple-900/60 p-4 sm:p-5 font-mono shadow-[0_0_30px_rgba(0,0,0,0.8)] relative overflow-hidden flex flex-col justify-between h-full group">',
    '<div className="vixy-card hud-corners p-4 sm:p-5 font-mono shadow-[0_0_30px_rgba(0,0,0,0.8)] relative overflow-hidden flex flex-col justify-between h-full group">'
)
code = re.sub(r'\{\/\* HUD Corner Brackets \*\/\}[\s\n]*(?:<div className="absolute[^>]+><\/div>[\s\n]*){4}', '', code)

# Replace the radar graphic
radar_old = r'<div className="relative w-36 h-36 sm:w-40 sm:h-40 rounded-full border border-cyan-500/30 bg-\[#020008\] flex items-center justify-center shadow-\[0_0_20px_rgba\(6,182,212,0\.15\)\] overflow-hidden">.*?<div \s*className="absolute w-1\.5 h-1\.5 rounded-full bg-cyan-400 shadow-\[0_0_6px_#22d3ee\]"\s*style={{ top: \'65%\', right: \'25%\' }}\s*/>\s*</div>'
radar_new = r"""<div className="w-36 h-36 sm:w-40 sm:h-40 relative">
            <div className="radar-wrap" style={{ '--radar-color': '#06b6d4', '--radar-color-2': '#06b6d4', '--radar-glow': 'rgba(6,182,212,0.3)' } as React.CSSProperties}>
              <div className="radar-outer-glow" />
              <div className="radar-ring-track" />
              <div className="radar-sweep-ring" />
              
              {/* Concentric Grid Rings */}
              <div className="absolute inset-2 rounded-full border border-purple-900/40" />
              <div className="absolute inset-6 rounded-full border border-cyan-500/20" />
              <div className="absolute inset-10 rounded-full border border-purple-900/40" />
              <div className="absolute inset-14 rounded-full border border-cyan-400/30" />
              
              {/* Crosshair Axes */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-[1px] bg-cyan-500/20" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-full w-[1px] bg-cyan-500/20" />
              </div>
              
              {/* Center Core Dot */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] z-20" />
              
              {/* Pulsing Target Nodes / Blips */}
              <div 
                className="absolute w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] animate-ping"
                style={{ top: '28%', left: '68%' }}
              />
              <div 
                className="absolute w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]"
                style={{ top: '28%', left: '68%' }}
              />
              <div 
                className="absolute w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e] animate-ping"
                style={{ bottom: '24%', left: '32%', animationDelay: '1s' }}
              />
              <div 
                className="absolute w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e]"
                style={{ bottom: '24%', left: '32%' }}
              />
              <div 
                className="absolute w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]"
                style={{ top: '65%', right: '25%' }}
              />
            </div>
          </div>"""
code = re.sub(radar_old, radar_new, code, flags=re.DOTALL)

# Replace telemetry stats
code = re.sub(r'<div className="bg-\[#06020f\] border border-purple-900/50 rounded-lg p-2">\s*<div className="text-purple-400/70 font-bold uppercase text-\[8px\] tracking-wider">(.*?)</div>\s*<div className="(.*?)">\s*(.*?)\s*</div>\s*</div>',
              r'<div className="hud-stat-card hud-corners border border-purple-900/50">\n            <div className="hud-stat-label">\1</div>\n            <div className={`hud-stat-value \2`}>\n              \3\n            </div>\n          </div>', code, flags=re.DOTALL)
# One without expression
code = re.sub(r'<div className="bg-\[#06020f\] border border-purple-900/50 rounded-lg p-2">\s*<div className="text-purple-400/70 font-bold uppercase text-\[8px\] tracking-wider">POSITION DEFENSE</div>\s*<div className="text-emerald-400 font-black text-\[10px\]">HEALTH: (.*?)</div>\s*</div>',
              r'<div className="hud-stat-card hud-corners border border-purple-900/50">\n            <div className="hud-stat-label">POSITION DEFENSE</div>\n            <div className="hud-stat-value text-emerald-400">HEALTH: \1</div>\n          </div>', code, flags=re.DOTALL)

with open('src/components/brains/InstitutionalIntelRadar.tsx', 'w') as f:
    f.write(code)

print("Patched InstitutionalIntelRadar.tsx")
