with open('src/components/brains/SignalBrain.tsx', 'r') as f:
    content = f.read()

content = content.replace(
"""          <div className="text-3xl font-black text-purple-200 tracking-tighter">${targetPrice ? targetPrice.toLocaleString() : '64,160'}</div>""",
"""          <div className="flex items-center gap-3">
            <div className="text-3xl font-black text-purple-200 tracking-tighter">${targetPrice ? targetPrice.toLocaleString() : '64,160'}</div>
            <div className={`px-2 py-1 rounded text-[8px] font-bold tracking-widest uppercase ${isBullish ? 'bg-purple-900/30 text-purple-300 border border-purple-800/50' : 'bg-purple-900/30 text-purple-300 border border-purple-800/50'}`}>
              MUST EXPIRE {isBullish ? 'ABOVE' : 'BELOW'} ${targetPrice ? targetPrice.toLocaleString() : '64,160'}
            </div>
          </div>"""
)

with open('src/components/brains/SignalBrain.tsx', 'w') as f:
    f.write(content)
