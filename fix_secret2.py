import sys

with open("server.ts", "r") as f:
    content = f.read()

target = """function getSessionSecret() {
  const secret = process.env.SESSION_SIGNING_SECRET || process.env.JWT_SECRET;
  if (!secret || secret.length < 16) return null;
  return secret;
}"""

replacement = """function getSessionSecret() {
  const secret = process.env.SESSION_SIGNING_SECRET;
  if (!secret || secret.length < 16) {
    console.error("[AUTH] FATAL: SESSION_SIGNING_SECRET is missing or too short.");
    return null;
  }
  return secret;
}"""

if target in content:
    content = content.replace(target, replacement)
    with open("server.ts", "w") as f:
        f.write(content)
    print("Secret fallback removed")
else:
    print("Target not found")
