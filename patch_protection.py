import re

with open('src/components/brains/ProtectionBrain.tsx', 'r') as f:
    content = f.read()

# Let's add a small risk meter to the REVERSAL THREAT block.
start_marker = "            {/* Dynamic Driving Factors Explanation */}"
idx = content.find(start_marker)

risk_meter = """
            {/* Reversal Risk Meter */}
            <div className="h-1.5 w-full bg-[#020008] rounded-full overflow-hidden border border-purple-900/50 my-2">
              <div 
                className={`h-full transition-all duration-1000 ${rawReversalRisk >= 50 ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]' : rawReversalRisk >= 30 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                style={{ width: `${rawReversalRisk}%` }}
              />
            </div>
"""

if idx != -1:
    content = content[:idx] + risk_meter + content[idx:]
    with open('src/components/brains/ProtectionBrain.tsx', 'w') as f:
        f.write(content)
        print("Patched ProtectionBrain.tsx")
else:
    print("Failed to find marker")
