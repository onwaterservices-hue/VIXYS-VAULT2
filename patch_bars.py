import re

with open('src/components/brains/SignalBrain.tsx', 'r') as f:
    content = f.read()

target = """             <div className="absolute bottom-2 right-2 opacity-30 group-hover:opacity-60 transition-opacity">
               <svg width="40" height="15" viewBox="0 0 40 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                 <path d="M1 10C5 10 7 12 10 12C14 12 16 7 20 7C24 7 26 13 30 13C34 13 37 4 39 4" stroke={rawApiData?.features?.orderBookImbalance >= 0 ? "#00FF9D" : "#FF3366"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
               </svg>
             </div>"""

new_bars = """             <div className="absolute bottom-2 right-2 opacity-40 group-hover:opacity-70 transition-opacity flex items-end gap-[2px] h-4">
               {[20, 35, 50, 75, 90, 80, 60, 40].map((h, i) => {
                   const isBull = (rawApiData?.features?.orderBookImbalance ?? 0) >= 0;
                   const actualH = isBull ? h : [90, 75, 60, 40, 35, 30, 20, 15][i];
                   return (
                     <div key={i} className={`w-1 rounded-t-sm ${isBull ? 'bg-[#00FF9D]' : 'bg-[#FF3366]'}`} style={{ height: `${actualH}%` }} />
                   )
               })}
             </div>"""

if target in content:
    content = content.replace(target, new_bars)
    with open('src/components/brains/SignalBrain.tsx', 'w') as f:
        f.write(content)
        print("Replaced SVG with mini bars.")
else:
    print("Target not found.")

