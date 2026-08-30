import re

with open("src/components/vixyV2/SystemStatusBar.tsx", "r") as f:
    content = f.read()

# Replace System
content = re.sub(r'bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400', '`${dataHealthStatus === "LIVE" ? "bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" : "bg-red-500"}`', content)
content = re.sub(r'<span className="text-emerald-400 font-bold">ONLINE</span>', '<span className={`${dataHealthStatus === "LIVE" ? "text-emerald-400" : "text-red-500"} font-bold`}>{dataHealthStatus === "LIVE" ? "ONLINE" : "DEGRADED"}</span>', content)

# Replace Data Feed
content = re.sub(r'<span className="w-2 h-2 rounded-full bg-emerald-400" />\n\s*<span className="text-slate-400">DATA FEED:</span>\n\s*<span className="text-emerald-400 font-bold">LIVE</span>', '<span className={`w-2 h-2 rounded-full ${dataHealthStatus === "LIVE" ? "bg-emerald-400" : "bg-yellow-500"}`} />\\n            <span className="text-slate-400">DATA FEED:</span>\\n            <span className={`${dataHealthStatus === "LIVE" ? "text-emerald-400" : "text-yellow-500"} font-bold`}>{dataHealthStatus}</span>', content)

# Replace VIXY ENGINE
content = re.sub(r'<span className="w-2 h-2 rounded-full bg-emerald-400" />\n\s*<span className="text-slate-400">VIXY ENGINE:</span>\n\s*<span className="text-emerald-400 font-bold">ACTIVE</span>', '<span className={`w-2 h-2 rounded-full ${dataHealthStatus === "LIVE" ? "bg-emerald-400" : "bg-red-500"}`} />\\n            <span className="text-slate-400">VIXY ENGINE:</span>\\n            <span className={`${dataHealthStatus === "LIVE" ? "text-emerald-400" : "text-red-500"} font-bold`}>{dataHealthStatus === "LIVE" ? "ACTIVE" : "STALE"}</span>', content)

# Replace FIRESTORE
content = re.sub(r'<span className="w-2 h-2 rounded-full bg-emerald-400" />\n\s*<span className="text-slate-400">FIRESTORE:</span>\n\s*<span className="text-emerald-400 font-bold">CONNECTED</span>', '<span className={`w-2 h-2 rounded-full ${dataHealthStatus === "LIVE" ? "bg-emerald-400" : "bg-red-500"}`} />\\n            <span className="text-slate-400">FIRESTORE:</span>\\n            <span className={`${dataHealthStatus === "LIVE" ? "text-emerald-400" : "text-red-500"} font-bold`}>{dataHealthStatus === "LIVE" ? "CONNECTED" : "UNKNOWN"}</span>', content)

with open("src/components/vixyV2/SystemStatusBar.tsx", "w") as f:
    f.write(content)

