import re

with open('server.ts', 'r') as f:
    code = f.read()

code = code.replace("let currentConfidence = 88.5;", "let currentConfidence = 88.5;\nlet currentBullVolumePct = 50;\nlet currentMomentum = 0;")
code = code.replace("const bullVolumePct = Math.min(90, Math.max(20, Math.round(55 + change24h * 1.5)));", "const bullVolumePct = Math.min(90, Math.max(20, Math.round(55 + change24h * 1.5)));\n    currentBullVolumePct = bullVolumePct;\n    currentMomentum = change24h;")

with open('server.ts', 'w') as f:
    f.write(code)

