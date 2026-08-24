import re

with open("backend.ts", "r") as f:
    code = f.read()

# remove setup-test-grace, cleanup-test-grace
start = code.find("app.get('/api/admin/setup-test-grace'")
if start != -1:
    end = code.find("app.post('/api/auth/register'", start)
    if end != -1:
        code = code[:start] + code[end:]

with open("backend.ts", "w") as f:
    f.write(code)
