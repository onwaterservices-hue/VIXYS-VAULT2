import re

with open("backend.ts", "r") as f:
    code = f.read()

start = code.find("app.get('/api/admin/reconcile-day-passes'")
if start != -1:
    end = code.find("app.post('/api/auth/register'", start)
    if end != -1:
        code = code[:start] + code[end:]

with open("backend.ts", "w") as f:
    f.write(code)
