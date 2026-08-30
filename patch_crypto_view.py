with open("src/components/CryptoPredictionCenterView.tsx", "r") as f:
    content = f.read()

target1 = """          <div className="flex items-center gap-1.5">
            <span className="text-purple-400/60 font-sans font-bold">MARKET FEED</span>
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" /> LIVE
            </span>
          </div>"""

replacement1 = """          <div className="flex items-center gap-1.5">
            <span className="text-purple-400/60 font-sans font-bold">MARKET FEED</span>
            <span className={`flex items-center gap-1 font-bold ${dataHealthStatus === 'LIVE' ? 'text-emerald-400' : 'text-amber-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${dataHealthStatus === 'LIVE' ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]' : 'bg-amber-400'}`} /> {dataHealthStatus === 'LIVE' ? 'LIVE' : dataHealthStatus}
            </span>
          </div>"""

if target1 in content:
    content = content.replace(target1, replacement1)
    print("Patched target1")
else:
    print("Target1 not found")

target2 = """            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[11px] font-mono font-black shadow-[0_0_12px_rgba(16,185,129,0.2)]">
              <span className={`w-2 h-2 rounded-full ${
                dataHealthStatus === 'LIVE' ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]' : 'bg-amber-400'
              }`} />
              <span>{dataHealthStatus === 'LIVE' ? 'LIVE' : 'DELAYED'}</span>
            </div>"""

replacement2 = """            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono font-black ${dataHealthStatus === 'LIVE' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]' : 'bg-amber-500/15 border-amber-500/40 text-amber-300'}`}>
              <span className={`w-2 h-2 rounded-full ${
                dataHealthStatus === 'LIVE' ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]' : 'bg-amber-400 animate-pulse shadow-[0_0_8px_#fbbf24]'
              }`} />
              <span>{dataHealthStatus === 'LIVE' ? 'LIVE' : dataHealthStatus}</span>
            </div>"""

if target2 in content:
    content = content.replace(target2, replacement2)
    print("Patched target2")
else:
    print("Target2 not found")

with open("src/components/CryptoPredictionCenterView.tsx", "w") as f:
    f.write(content)
