import re

with open('server.ts', 'r') as f:
    content = f.read()

pattern = r'  // Start periodic 5-minute Discord guild reconciliation\n  setInterval\(\(\) => \{\n    reconcileDiscordGuildMembers\(\);\n  \}, 300000\);\n'
replacement = r''
content = re.sub(pattern, replacement, content)

with open('server.ts', 'w') as f:
    f.write(content)
