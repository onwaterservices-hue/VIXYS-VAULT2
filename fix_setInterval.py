import re

with open('server.ts', 'r') as f:
    content = f.read()

content = re.sub(r'setInterval\(\(\) => \{\n  serverLearningEngine\.lifetimeObservations \+= 1;.*?\}, 6000\);', '', content, flags=re.DOTALL)
content = re.sub(r'  setInterval\(\(\) => \{\n    reconcileDiscordGuildMembers\(\);\n  \}, 5 \* 60 \* 1000\); // 5 minutes', '', content, flags=re.DOTALL)

with open('server.ts', 'w') as f:
    f.write(content)
