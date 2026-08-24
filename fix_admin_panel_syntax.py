import re

with open('src/components/AdminPanel.tsx', 'r') as f:
    code = f.read()

bad_fetch = """      const res = await fetch('/api/admin/users/wipe', {
        method: 'POST',
        headers: getAdminHeaders(),
        },
        body: JSON.stringify({ targetUserIds })
      });"""

good_fetch = """      const res = await fetch('/api/admin/users/wipe', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ targetUserIds })
      });"""

if bad_fetch in code:
    code = code.replace(bad_fetch, good_fetch)
    with open('src/components/AdminPanel.tsx', 'w') as f:
        f.write(code)
    print("Fixed fetch syntax in AdminPanel")
else:
    print("Could not find bad fetch syntax")

