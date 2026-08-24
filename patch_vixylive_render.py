import re

with open("src/components/VixyLiveView.tsx", "r") as f:
    content = f.read()

# Replace the switch block for authoritative state
old_render = """                {authoritativeState === 'LOCKED — UP' && <span className="text-emerald-400 flex items-center gap-2"><CheckCircle2 className="w-8 h-8" /> LOCKED — UP</span>}
                {authoritativeState === 'LOCKED — DOWN' && <span className="text-rose-400 flex items-center gap-2"><CheckCircle2 className="w-8 h-8" /> LOCKED — DOWN</span>}
                {authoritativeState === 'SKIP — NO TRADE' && <span className="text-amber-400 flex items-center gap-2"><Activity className="w-8 h-8 animate-pulse" /> CALIBRATING...</span>}
                {authoritativeState === 'PROTECTED' && <span className="text-cyan-400 flex items-center gap-2"><ShieldCheck className="w-8 h-8" /> PROTECTED (WATCH)</span>}
                {authoritativeState === 'ANALYZING' && <span className="text-cyan-300 flex items-center gap-2"><Activity className="w-8 h-8 animate-pulse" /> OBSERVING...</span>}"""

new_render = """                {authoritativeState === 'LOCKED UP' && <span className="text-emerald-400 flex items-center gap-2"><CheckCircle2 className="w-8 h-8" /> VIXY LOCKED — UP</span>}
                {authoritativeState === 'LOCKED DOWN' && <span className="text-rose-400 flex items-center gap-2"><CheckCircle2 className="w-8 h-8" /> VIXY LOCKED — DOWN</span>}
                {authoritativeState === 'CALIBRATING' && <span className="text-amber-400 flex items-center gap-2"><Activity className="w-8 h-8 animate-pulse" /> VIXY CALIBRATING</span>}
                {authoritativeState === 'BUILDING UP' && <span className="text-emerald-400 flex items-center gap-2"><TrendingUp className="w-8 h-8 animate-pulse" /> VIXY BUILDING UP</span>}
                {authoritativeState === 'BUILDING DOWN' && <span className="text-rose-400 flex items-center gap-2"><TrendingDown className="w-8 h-8 animate-pulse" /> VIXY BUILDING DOWN</span>}
                {authoritativeState === 'REASSESSING' && <span className="text-cyan-400 flex items-center gap-2"><ShieldCheck className="w-8 h-8 animate-pulse" /> VIXY REASSESSING</span>}
                {authoritativeState === 'RESOLVED' && <span className="text-gray-400 flex items-center gap-2"><CheckCircle2 className="w-8 h-8" /> SETTLED</span>}"""
content = content.replace(old_render, new_render)

old_skip_check = """{authoritativeState === 'SKIP — NO TRADE' ? ("""
new_skip_check = """{authoritativeState === 'CALIBRATING' || authoritativeState === 'REASSESSING' ? ("""
content = content.replace(old_skip_check, new_skip_check)

old_locked_down_check = """{authoritativeState === 'LOCKED — DOWN' ? '▼ DOWN' : '▲ UP'}"""
new_locked_down_check = """{authoritativeState === 'LOCKED DOWN' || authoritativeState === 'BUILDING DOWN' ? '▼ DOWN' : '▲ UP'}"""
content = content.replace(old_locked_down_check, new_locked_down_check)


with open("src/components/VixyLiveView.tsx", "w") as f:
    f.write(content)

print("Patched VixyLiveView.tsx renders!")
