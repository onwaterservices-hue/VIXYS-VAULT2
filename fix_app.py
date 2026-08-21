import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

pattern = r"role: \['OWNER', 'ADMIN', 'SUPPORT'\].includes\(res.user.role\) \? 'ADMIN' : \(res.user.role === 'PRO' \|\| res.user.role === 'ELITE' \? 'PRO' : 'DEMO'\),"
replacement = "role: (['OWNER', 'ADMIN', 'SUPPORT'].includes(res.user.role) ? 'ADMIN' : (res.user.role === 'PRO' || res.user.role === 'ELITE' ? 'PRO' : 'DEMO')) as 'PRO' | 'OWNER' | 'ADMIN' | 'DEMO',"

code = code.replace(pattern, replacement)

with open('src/App.tsx', 'w') as f:
    f.write(code)

