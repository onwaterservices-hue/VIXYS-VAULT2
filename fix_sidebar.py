import re

with open('src/components/Sidebar.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    '((item.id === "vixylive" || item.id === "terminal") && !hasActiveAccess) ||',
    '(item.id === "vixylive" && !hasActiveAccess) ||'
)

with open('src/components/Sidebar.tsx', 'w') as f:
    f.write(content)
