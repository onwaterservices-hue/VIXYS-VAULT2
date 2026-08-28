const fs = require('fs');
const file = './server.ts';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes("/api/internal/dump-creds")) {
  code = code.replace(
    'app.post("/api/kalshi/test-handshake", async (req, res) => {',
    'app.get("/api/internal/dump-creds", async (req, res) => {\n  try {\n    const docs = await getDocs(collection(db, "kalshi_credentials"));\n    res.json({ size: docs.size, data: docs.docs.map(d => ({id: d.id, conf: d.data().credentials?.configured})) });\n  } catch(e) { res.status(500).json({e: e.message}); }\n});\n\napp.post("/api/kalshi/test-handshake", async (req, res) => {'
  );
  fs.writeFileSync(file, code);
}
console.log("Patched server!");
