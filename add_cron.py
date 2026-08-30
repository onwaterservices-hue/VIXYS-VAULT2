import sys

with open("server.ts", "r") as f:
    content = f.read()

target = 'app.get("/api/health", (req, res) => {'
replacement = """
app.get("/api/cron/engine-tick", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ success: false, message: "Unauthorized cron invocation" });
  }

  try {
    await executeEngineTick();
    res.json({ success: true, cycleId: currentEngineCycleId, timestamp: Date.now() });
  } catch (err) {
    console.error("[CRON] Engine tick failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/health", (req, res) => {
"""

if target in content:
    content = content.replace(target, replacement.strip() + '\n')
    with open("server.ts", "w") as f:
        f.write(content)
    print("Cron endpoint added successfully.")
else:
    print("Target not found.")

