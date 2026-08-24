import re

with open('src/components/brains/WhaleBrain.tsx', 'r') as f:
    content = f.read()

pattern1 = r'  const \[whaleEvents, setWhaleEvents\] = useState<WhaleMove\[\]>\(\[\]\);\n  const \[isFlashing, setIsFlashing\] = useState<boolean>\(false\);'
replacement1 = r'''  const [whaleEvents, setWhaleEvents] = useState<WhaleMove[]>([]);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const [status, setStatus] = useState<'ACTIVE' | 'DEGRADED'>('ACTIVE');'''
content = re.sub(pattern1, replacement1, content)

pattern2 = r'        if \(res\.ok && isMounted\) \{\n          const data = await res\.json\(\);'
replacement2 = r'''        if (isMounted) {
          if (!res.ok) {
            setStatus('DEGRADED');
            return;
          }
          setStatus('ACTIVE');
          const data = await res.json();'''
content = re.sub(pattern2, replacement2, content)

pattern3 = r'        \{/\* Status Badges \*/\}\n        <div className="flex items-center gap-2 text-\[10px\] font-bold flex-wrap">\n          <div className="flex items-center gap-1\.5 px-2\.5 py-1 rounded-md border bg-emerald-950/90 text-emerald-300 border-emerald-500/60 shadow-\[0_0_10px_rgba\(52,211,153,0\.25\)\]">\n            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />\n            <span>SURVEILLANCE ACTIVE</span>\n          </div>'
replacement3 = r'''        {/* Status Badges */}
        <div className="flex items-center gap-2 text-[10px] font-bold flex-wrap">
          {status === 'ACTIVE' ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border bg-emerald-950/90 text-emerald-300 border-emerald-500/60 shadow-[0_0_10px_rgba(52,211,153,0.25)]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>SURVEILLANCE ACTIVE</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border bg-amber-950/90 text-amber-300 border-amber-500/60">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>SURVEILLANCE DEGRADED</span>
            </div>
          )}'''
content = re.sub(pattern3, replacement3, content)

pattern4 = r'      \{/\* Whale Move Log Stream \*/\}\n      <div className="space-y-2">\n        <div className="text-\[10px\] text-purple-300/80 font-bold uppercase tracking-wider flex items-center justify-between">\n          <span>Recent Dark Pool Injections:</span>\n          <span className="text-purple-400 text-\[9px\] font-mono">LIVE FEED ACTIVE</span>\n        </div>\n        <div className="space-y-2">\n          \{whaleEvents\.map'
replacement4 = r'''      {/* Whale Move Log Stream */}
      <div className="space-y-2">
        <div className="text-[10px] text-purple-300/80 font-bold uppercase tracking-wider flex items-center justify-between">
          <span>Recent Dark Pool Injections:</span>
          <span className={status === 'ACTIVE' ? "text-purple-400 text-[9px] font-mono" : "text-amber-400 text-[9px] font-mono"}>
            {status === 'ACTIVE' ? 'LIVE FEED ACTIVE' : 'WAITING FOR INSTITUTIONAL FLOW'}
          </span>
        </div>
        <div className="space-y-2">
          {whaleEvents.map'''
content = re.sub(pattern4, replacement4, content)

with open('src/components/brains/WhaleBrain.tsx', 'w') as f:
    f.write(content)
