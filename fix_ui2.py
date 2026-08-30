import re

with open("src/components/vixyV2/SystemStatusBar.tsx", "r") as f:
    content = f.read()

content = content.replace('className="w-2 h-2 rounded-full `${dataHealthStatus === "LIVE" ? "bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" : "bg-red-500"}`"', 'className={`w-2 h-2 rounded-full ${dataHealthStatus === "LIVE" ? "bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" : "bg-red-500"}`}')

with open("src/components/vixyV2/SystemStatusBar.tsx", "w") as f:
    f.write(content)

