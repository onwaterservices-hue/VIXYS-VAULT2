with open("server.ts", "r") as f:
    content = f.read()

content = content.replace("const now = Date.now() + (global.timeOffsetMs || 0);", "const now = Date.now();")
content = content.replace("(Date.now() + (global.timeOffsetMs || 0))", "Date.now()")
content = content.replace('app.get("/api/cron/engine-tick", async (req, res) => { if(req.query.offset) { global.timeOffsetMs = parseInt(req.query.offset); }', 'app.get("/api/cron/engine-tick", async (req, res) => {')

with open("server.ts", "w") as f:
    f.write(content)
