import re

with open('src/components/AdminPanel.tsx', 'r') as f:
    code = f.read()

code = code.replace("user.verificationStatus === 'NEEDS_GUILD'", "(user.verificationStatus as string) === 'NEEDS_GUILD'")

with open('src/components/AdminPanel.tsx', 'w') as f:
    f.write(code)

