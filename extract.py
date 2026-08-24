import re
with open("backend.ts", "r") as f:
    text = f.read()

matches = [m.start() for m in re.finditer(r"checkAndSettle15mCycle", text)]
for m in matches:
    start = max(0, m - 50)
    end = min(len(text), m + 150)
    print(f"Match at {m}: {text[start:end]}")
