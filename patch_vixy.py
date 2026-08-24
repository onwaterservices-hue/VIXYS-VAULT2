import re

with open('src/components/brains/VixyNeuralEngine.tsx', 'r') as f:
    content = f.read()

# 1. Section A: Inner Ring Visual Replace
section_a_pattern = re.compile(r'<div className="relative w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center">.*?</span>\s*</>\s*\)}\s*</div>\s*</div>', re.DOTALL)
section_a_replacement = """<div
            className="relative w-40 h-40 sm:w-48 sm:h-48"
            style={{
              '--radar-color': themeNeon,
              '--radar-color-2': themeNeon,
              '--radar-glow': themeGlow,
              '--radar-pct': isOfflineOrStale ? 0 : exactConfidencePct,
            } as React.CSSProperties}
          >
            <div className="radar-outer-glow" />
            <div className="radar-ring-track" />
            <div className="radar-progress" />
            <div className="radar-sweep-ring" />
            <div className="radar-orbit"><span className="radar-glint" /></div>
            <div className="radar-orbit rev"><span className="radar-glint b" /></div>
            <div className="radar-core" style={{ animation: isServerLocked ? 'vixyGlow 3.2s ease-in-out infinite' : undefined }}>
              {isOfflineOrStale ? (
                <WifiOff className="w-7 h-7 text-rose-400 animate-pulse" />
              ) : isCriticallyInvalidated ? (
                <>
                  <AlertTriangle className="w-7 h-7 text-rose-400 animate-bounce" />
                  <span className="text-[7.5px] font-black text-rose-400 tracking-widest uppercase mt-1">INVALIDATED</span>
                </>
              ) : isNoTrade ? (
                <>
                  <ShieldCheck className="w-7 h-7 text-purple-300 animate-pulse" />
                  <span className="text-[7.5px] font-black text-purple-300 tracking-widest uppercase mt-1">VIXY CALIBRATING</span>
                </>
              ) : isServerLocked ? (
                <>
                  <span className="radar-value">{isUp ? '▲' : isDown ? '▼' : '●'}</span>
                  <span className="radar-label flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> LOCKED</span>
                </>
              ) : (
                <>
                  <span className="radar-value">{exactConfidencePct}%</span>
                  <span className="radar-label">{isObserving ? 'OBSERVING' : isCalibrating ? 'CALIBRATING' : isQualifying ? 'QUALIFYING' : isValidating ? 'VALIDATING' : isReadyToLock ? 'READY' : 'ANALYZING'}</span>
                </>
              )}
            </div>
          </div>"""

# 2. Section B: Headline Gradient
section_b_pattern = re.compile(r'<div\s*className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-none select-none flex items-center gap-2"\s*style={{\s*color: isOfflineOrStale \? \'#F43F5E\' : reversalDetected \? \'#EF4444\' : isYellowPulseActive \? \'#FACC15\' : themeNeon,\s*textShadow: reversalDetected\s*\?\s*\'0 0 25px rgba\(239, 68, 68, 0\.8\)\'\s*:\s*isYellowPulseActive\s*\?\s*\'0 0 25px rgba\(234, 179, 8, 0\.8\)\'\s*:\s*`0 0 35px \$\{isOfflineOrStale \? \'rgba\(244,63,94,0\.6\)\' : themeGlow\}`,?\s*}}\s*>', re.DOTALL)
section_b_replacement = """<div
                    className={`text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-none select-none flex items-center gap-2 ${!reversalDetected && !isYellowPulseActive ? 'hud-gradient-text' : ''}`}
                    style={
                      reversalDetected || isYellowPulseActive
                        ? {
                            color: isOfflineOrStale ? '#F43F5E' : reversalDetected ? '#EF4444' : '#FACC15',
                            textShadow: reversalDetected 
                              ? '0 0 25px rgba(239, 68, 68, 0.8)' 
                              : isYellowPulseActive
                              ? '0 0 25px rgba(234, 179, 8, 0.8)'
                              : `0 0 35px ${isOfflineOrStale ? 'rgba(244,63,94,0.6)' : themeGlow}`,
                          }
                        : ({ '--grad-a': themeNeon, '--grad-b': '#f5f0ff', '--grad-c': themeNeon, '--grad-glow': themeGlow } as React.CSSProperties)
                    }
                  >"""

# 3. Telemetry Rows (Institutional Edge Strip)
section_edge_1 = re.compile(r'<div className="bg-\[#03010a\]/90 rounded-lg p-2 border border-purple-900/60">\s*<div className="text-purple-400/70 font-bold uppercase text-\[8px\] tracking-widest">INSTITUTIONAL EDGE</div>\s*<div className=\{`text-xs font-black tracking-tight \$\{rawEdge > 0 \? \'text-\[#00FF9D\]\' : rawEdge < 0 \? \'text-\[#FF3366\]\' : \'text-purple-300\'\}`\}>')
section_edge_1_rep = """<div className="hud-corners hud-stat-card bg-[#03010a]/90 rounded-lg p-2 border border-purple-900/60">
                  <div className="hud-stat-label text-purple-400/70 font-bold uppercase text-[8px] tracking-widest">INSTITUTIONAL EDGE</div>
                  <div className={`hud-stat-value text-xs font-black tracking-tight ${rawEdge > 0 ? 'text-[#00FF9D]' : rawEdge < 0 ? 'text-[#FF3366]' : 'text-purple-300'}`}>"""

section_edge_2 = re.compile(r'<div className="bg-gradient-to-b from-\[#1c0c01\]/90 to-\[#03010a\]/95 rounded-lg p-2 border-2 border-orange-500/80 shadow-\[0_0_15px_rgba\(249,115,22,0\.4\)\] animate-pulse">\s*<div className="text-orange-400 font-black uppercase text-\[8px\] tracking-widest">LOCK QUALITY</div>\s*<div className="flex items-center justify-between mt-0\.5">\s*<span className="text-xs font-black tracking-tight text-orange-400 drop-shadow-\[0_0_8px_rgba\(249,115,22,0\.6\)\]">')
section_edge_2_rep = """<div className="hud-corners hud-stat-card bg-gradient-to-b from-[#1c0c01]/90 to-[#03010a]/95 rounded-lg p-2 border-2 border-orange-500/80 shadow-[0_0_15px_rgba(249,115,22,0.4)] animate-pulse">
                  <div className="hud-stat-label text-orange-400 font-black uppercase text-[8px] tracking-widest">LOCK QUALITY</div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="hud-stat-value text-xs font-black tracking-tight text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]">"""

section_edge_3 = re.compile(r'<div className="bg-\[#03010a\]/90 rounded-lg p-2 border border-purple-900/60">\s*<div className="text-purple-400/70 font-bold uppercase text-\[8px\] tracking-widest">EVIDENCE CONSENSUS</div>\s*<div className="text-xs font-black text-cyan-300 tracking-tight">')
section_edge_3_rep = """<div className="hud-corners hud-stat-card bg-[#03010a]/90 rounded-lg p-2 border border-purple-900/60">
                  <div className="hud-stat-label text-purple-400/70 font-bold uppercase text-[8px] tracking-widest">EVIDENCE CONSENSUS</div>
                  <div className="hud-stat-value text-xs font-black text-cyan-300 tracking-tight">"""


# 4. Telemetry Rows (Diagnostic Nodes)
diagnostic_pattern = re.compile(r'className={`px-2\.5 py-1\.5 rounded-lg border flex items-center justify-between transition-all duration-300 \$\{([^}]+)\}`}')
diagnostic_replacement = r'className={`hud-corners px-2.5 py-1.5 rounded-lg border flex items-center justify-between transition-all duration-300 ${\1}`}'

new_content = section_a_pattern.sub(section_a_replacement, content)
new_content = section_b_pattern.sub(section_b_replacement, new_content)
new_content = section_edge_1.sub(section_edge_1_rep, new_content)
new_content = section_edge_2.sub(section_edge_2_rep, new_content)
new_content = section_edge_3.sub(section_edge_3_rep, new_content)
new_content = diagnostic_pattern.sub(diagnostic_replacement, new_content)

with open('src/components/brains/VixyNeuralEngine.tsx', 'w') as f:
    f.write(new_content)

print(f"Substitutions applied. Changes made: {content != new_content}")
