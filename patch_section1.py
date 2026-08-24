import re

with open('src/components/VixyLockView.tsx', 'r') as f:
    content = f.read()

# Replace the hero section main card
old_hero = r'<div className=\{`lg:col-span-7 rounded-2xl p-5 sm:p-6 relative overflow-hidden flex flex-col justify-between border-2 transition-all duration-500 \$\{decisionAuraStyle\}`\}>'
new_hero = r'<div className={`lg:col-span-7 vixy-card-elevated hud-corners p-5 sm:p-6 relative overflow-hidden flex flex-col justify-between transition-all duration-500 ${decisionAuraStyle}`}>'

content = re.sub(old_hero, new_hero, content)

# Check for smaller metric cards in section 1
# E.g. <div className="bg-[#05020a] rounded-xl border border-purple-900/60 p-3...
# Wait, let me inspect the code for section 1 to see small metric cards.

with open('src/components/VixyLockView.tsx', 'w') as f:
    f.write(content)
