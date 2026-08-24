import re

with open("backend.ts", "r") as f:
    text = f.read()

m = re.search(r"async function checkAndSettle15mCycle\(livePrice\).*?__name\(checkAndSettle15mCycle,\"checkAndSettle15mCycle\"\);", text, re.DOTALL)
if m:
    print(m.group(0))
