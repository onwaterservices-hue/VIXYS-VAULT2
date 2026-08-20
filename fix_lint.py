import re

with open('src/services/api.ts', 'r') as f:
    code = f.read()

# Fix duplicates in api.ts
code = code.replace("  latencyMs?: number;\n", "", 1)
code = code.replace("  features?: any;\n", "", 1)

with open('src/services/api.ts', 'w') as f:
    f.write(code)

with open('server.ts', 'r') as f:
    code = f.read()

# Fix duplicates in server.ts
code = code.replace("  discordId?: string;\n  discordTag?: string;\n  discordGlobalName?: string;\n  discordAvatar?: string | null;\n  discordLinked?: boolean;\n  guildVerified?: boolean;\n", "", 1)

with open('server.ts', 'w') as f:
    f.write(code)

with open('src/App.tsx', 'r') as f:
    code = f.read()

code = code.replace("role: res.user.role as any", "role: res.user.role as 'PRO' | 'OWNER' | 'ADMIN' | 'DEMO'")

with open('src/App.tsx', 'w') as f:
    f.write(code)
