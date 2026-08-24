import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "{(activeTab === 'starter' || (activeTab === 'terminal' && userProduct === 'STARTER')) ? (",
    "{(activeTab === 'starter' || (activeTab === 'terminal' && (userProduct === 'STARTER' || userProduct === 'NONE' || userRole === 'UNPAID' || !hasActiveAccess))) ? ("
)

with open('src/App.tsx', 'w') as f:
    f.write(content)
