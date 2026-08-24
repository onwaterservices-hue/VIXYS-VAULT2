import sys

with open('src/components/HistoricalAccuracy.tsx', 'r') as f:
    content = f.read()

start = content.find('                  {/* Metrics Grid */}')
end = content.find('                  <div className="my-3 border-t border-zinc-800/40 relative z-10"></div>')

if start != -1 and end != -1:
    target = content[start:end]
    replacement = """                  {/* Metrics Grid */}
                  {isNoTrade ? (
                    <div className="space-y-4 relative z-10 mb-2 mt-4">
                      <div>
                        <div className="text-[10px] uppercase text-zinc-500 font-black tracking-wider mb-1">Reason</div>
                        <div className="font-mono text-[13px] text-white font-bold">{log.qualificationReason?.replace(/_/g, ' ') || 'CHOPPY MARKET'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-zinc-500 font-black tracking-wider mb-1">Regime</div>
                        <div className="font-mono text-[13px] text-zinc-300 font-bold">RANGING / NEUTRAL</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-[10px] uppercase text-zinc-500 font-black tracking-wider mb-1">Confidence</div>
                          <div className="font-mono text-cyan-400 text-[14px] font-bold mb-1">{log.confidence || 72}%</div>
                          <div className="w-full h-[3px] bg-zinc-900 rounded-full overflow-hidden relative">
                            <div className="absolute top-0 left-0 h-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] rounded-full" style={{ width: `${log.confidence || 72}%` }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase text-zinc-500 font-black tracking-wider mb-1">Reversal Risk</div>
                          <div className="font-mono text-purple-400 text-[14px] font-bold mb-1">39%</div>
                          <div className="w-full h-[3px] bg-zinc-900 rounded-full overflow-hidden relative">
                            <div className="absolute top-0 left-0 h-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)] rounded-full" style={{ width: `39%` }}></div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="my-4 border-t border-zinc-800/40 relative z-10"></div>
                      <div className="flex justify-between items-center relative z-10">
                        <div className="flex items-center gap-1.5 text-zinc-500">
                          <div className="text-[10px] uppercase text-zinc-500 font-black tracking-wider">CYCLE</div>
                          <div className="text-[10px] font-mono tracking-wider text-zinc-300 ml-1">15M</div>
                        </div>
                        <div className="flex items-center gap-1.5 text-zinc-500">
                           <div className="text-[10px] uppercase text-zinc-500 font-black tracking-wider">MDL</div>
                           <div className="text-[10px] font-mono text-purple-400/80 tracking-wider">VIXY-ENS-5.x</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
""" + '\n'.join('  ' + line for line in target.split('\n')[1:]) + """                    </>
                  )}
"""
    with open('src/components/HistoricalAccuracy.tsx', 'w') as f:
        f.write(content[:start] + replacement + content[end:])
    print("Replaced!")
else:
    print("Not found")

