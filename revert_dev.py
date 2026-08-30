import sys

with open("server.ts", "r") as f:
    content = f.read()

target = """app.get("/api/dev/tokens", async (req, res) => {
  const q = query(collection(db, "password_reset_tokens"));
  const snap = await getDocs(q);
  const docs = [];
  snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
  res.json(docs);
});
"""

if target in content:
    content = content.replace(target, "")
    with open("server.ts", "w") as f:
        f.write(content)
    print("Dev endpoint removed")
else:
    print("Target not found")
