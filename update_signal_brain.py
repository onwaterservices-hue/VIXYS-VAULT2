import re

with open('src/components/brains/SignalBrain.tsx', 'r') as f:
    code = f.read()

# 1. Main Card Border Glow
pattern = r"isStaleOrInvalid\n.*?:\s*isBullish\n.*?bg-gradient-to-br from-\[\#041d13\]/90 via-\[\#03110c\]/90 to-\[\#030806\]/95 border-cyan-500/80 shadow-\[0_0_35px_rgba\(16,185,129,0\.3\)\]'\n.*?: 'bg-gradient-to-br from-\[\#260510\]/90 via-\[\#18030b\]/90 to-\[\#080104\]/95 border-rose-500/80 shadow-\[0_0_35px_rgba\(244,63,94,0\.3\)\]'"
new_main_card = """isStaleOrInvalid
            ? 'bg-gradient-to-br from-[#1a1a1a]/90 via-[#0d0d0d]/90 to-[#000000]/95 border-slate-500/80 shadow-[0_0_35px_rgba(100,116,139,0.3)]'
            : isBullish
            ? 'bg-gradient-to-br from-[#041d13]/90 via-[#03110c]/90 to-[#030806]/95 border-emerald-400 shadow-[0_0_35px_rgba(52,211,153,0.45)]'
            : 'bg-gradient-to-br from-[#260510]/90 via-[#18030b]/90 to-[#080104]/95 border-rose-400 shadow-[0_0_35px_rgba(244,63,94,0.45)]'"""
code = re.sub(pattern, new_main_card, code, flags=re.DOTALL)

# 2. Buy UP / Buy DOWN text color
code = code.replace("isStaleOrInvalid ? 'text-slate-400' : isBullish ? 'text-cyan-400' : 'text-rose-400'", "isStaleOrInvalid ? 'text-slate-400' : isBullish ? 'text-emerald-400' : 'text-rose-400'")
code = code.replace("isBullish ? 'text-cyan-300' : 'text-rose-300'", "isBullish ? 'text-emerald-300' : 'text-rose-300'")
code = code.replace("isBullish ? 'text-cyan-400 bg-cyan-950/60' : 'text-rose-400 bg-rose-950/60'", "isBullish ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 shadow-[0_0_10px_rgba(52,211,153,0.2)]' : 'text-rose-400 bg-rose-950/60 border border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.2)]'")

# 3. Confidence Field Bar
pattern2 = r"isFilled\n.*?isBullish\n.*?bg-cyan-400 shadow-\[0_0_8px_\#22d3ee\]'\n.*?bg-rose-500 shadow-\[0_0_8px_\#f43f5e\]'\n.*?: 'bg-purple-950/60 border border-purple-900/40'"
new_confidence_field = """isFilled
                        ? isBullish
                          ? 'bg-emerald-400 shadow-[0_0_12px_#34d399]'
                          : 'bg-rose-500 shadow-[0_0_12px_#fb7185]'
                        : isBullish ? 'bg-emerald-950/30 border border-emerald-900/30' : 'bg-rose-950/30 border border-rose-900/30'"""
code = re.sub(pattern2, new_confidence_field, code, flags=re.DOTALL)

with open('src/components/brains/SignalBrain.tsx', 'w') as f:
    f.write(code)

