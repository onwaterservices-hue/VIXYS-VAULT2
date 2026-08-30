import sys

with open("server.ts", "r") as f:
    content = f.read()

target = """app.post("/api/auth/forgot-password", async (req, res) => {"""
replacement = """app.get("/api/_test/token/:email", async (req, res) => {
  const email = req.params.email;
  const q = query(collection(db, "password_reset_tokens"), where("email", "==", email));
  const snap = await getDocs(q);
  let latestToken = null;
  let maxTime = 0;
  snap.forEach(d => {
    if (d.data().createdAt) {
       const time = new Date(d.data().createdAt).getTime();
       if (time > maxTime) { maxTime = time; latestToken = d.id; }
    }
  });
  res.json({ token: latestToken });
});
app.post("/api/auth/forgot-password", async (req, res) => {"""

if target in content and "/api/_test/token" not in content:
    content = content.replace(target, replacement)
    with open("server.ts", "w") as f:
        f.write(content)
    print("Endpoint patched")
