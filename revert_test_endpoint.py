import sys

with open("server.ts", "r") as f:
    content = f.read()

start_marker = """app.get("/api/_test/token/:email", async (req, res) => {"""
end_marker = """});
app.post("/api/auth/forgot-password", async (req, res) => {"""

if start_marker in content and end_marker in content:
    start_idx = content.find(start_marker)
    end_idx = content.find(end_marker) + len(end_marker)
    content = content[:start_idx] + """app.post("/api/auth/forgot-password", async (req, res) => {""" + content[end_idx:]
    with open("server.ts", "w") as f:
        f.write(content)
    print("Endpoint reverted")
else:
    print("Markers not found")
