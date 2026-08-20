import re

with open('src/components/brains/SignalBrain.tsx', 'r') as f:
    content = f.read()

pattern = r'className=\{\`lg:col-span-7 p-6 rounded-2xl border flex flex-col justify-between space-y-5 transition-all duration-500 shadow-2xl relative overflow-hidden \$\{\n            isBullish\n              \? \'bg-gradient-to-br from-\[\#041d13\]/90 via-\[\#03110c\]/90 to-\[\#030806\]/95 border-emerald-500/80 shadow-\[0_0_35px_rgba\(16,185,129,0\.3\)\]\'\n              : \'bg-gradient-to-br from-\[\#260510\]/90 via-\[\#18030b\]/90 to-\[\#080104\]/95 border-rose-500/80 shadow-\[0_0_35px_rgba\(244,63,94,0\.3\)\]\'\n          \}\`\}'

replacement = r'''className={`lg:col-span-7 p-6 rounded-2xl border flex flex-col justify-between space-y-5 transition-all duration-500 shadow-2xl relative overflow-hidden ${
            feedStatus === 'STALE'
              ? 'bg-gradient-to-br from-[#1a1a1a]/90 via-[#0d0d0d]/90 to-[#000000]/95 border-slate-500/80 shadow-[0_0_35px_rgba(100,116,139,0.3)] opacity-80 grayscale-[0.6]'
              : isBullish
              ? 'bg-gradient-to-br from-[#041d13]/90 via-[#03110c]/90 to-[#030806]/95 border-emerald-500/80 shadow-[0_0_35px_rgba(16,185,129,0.3)]'
              : 'bg-gradient-to-br from-[#260510]/90 via-[#18030b]/90 to-[#080104]/95 border-rose-500/80 shadow-[0_0_35px_rgba(244,63,94,0.3)]'
          }`}'''

content = re.sub(pattern, replacement, content)

pattern2 = r'<span className="text-\[10px\] text-purple-300/80 font-mono font-bold tracking-widest uppercase">\n              HIGH-CONVICTION SETUP\n            </span>'
replacement2 = r'''<span className={`text-[10px] font-mono font-bold tracking-widest uppercase ${feedStatus === 'STALE' ? 'text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded' : 'text-purple-300/80'}`}>
              {feedStatus === 'STALE' ? 'STALE DATA' : 'HIGH-CONVICTION SETUP'}
            </span>'''
content = re.sub(pattern2, replacement2, content)

with open('src/components/brains/SignalBrain.tsx', 'w') as f:
    f.write(content)
