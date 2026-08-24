import re

with open('src/components/Sidebar.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'const isStarterUser = userProduct === "STARTER";',
    'const isStarterUser = userProduct === "STARTER" || userProduct === "NONE" || userRole === "UNPAID" || !hasActiveAccess;'
)

with open('src/components/Sidebar.tsx', 'w') as f:
    f.write(content)
