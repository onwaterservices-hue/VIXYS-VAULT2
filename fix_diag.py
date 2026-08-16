import re

with open("backend.ts", "r") as f:
    code = f.read()

bad = """app.get('/api/admin/entitlement-diagnostics', (req: express.Request, res: express.Response) => {"""

# Just testing if the route is there
