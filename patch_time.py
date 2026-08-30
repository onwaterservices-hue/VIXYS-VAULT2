with open("server.ts", "r") as f:
    content = f.read()

content = content.replace("const now = Date.now();", "const now = Date.now() + (global.timeOffsetMs || 0);")
content = content.replace("Date.now()", "(Date.now() + (global.timeOffsetMs || 0))")
content = content.replace('app.get("/api/cron/engine-tick", async (req, res) => {', 'app.get("/api/cron/engine-tick", async (req, res) => { if(req.query.offset) { global.timeOffsetMs = parseInt(req.query.offset); }')

with open("server.ts", "w") as f:
    f.write(content)
