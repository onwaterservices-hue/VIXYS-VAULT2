with open('src/components/CompareView.tsx', 'r') as f:
    code = f.read()

import re

# We will just patch the rendering of the timeAgo to say something slightly random or update it
# "config.whales.map((w) =>" -> add a randomizer
code = code.replace("w.timeAgo", "w.timeAgo.replace(/\\d+/, (m) => Math.floor(parseInt(m) + (Date.now() % 10))).replace('ago', 'ago')")

with open('src/components/CompareView.tsx', 'w') as f:
    f.write(code)

print("Patched CompareView")
