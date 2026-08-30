import urllib.request
import time
import json
import subprocess

PORT = 3012
subprocess.run(f"export PORT={PORT}; export SESSION_SIGNING_SECRET=12345678901234567890123456789012; node dist/server.cjs > vixy_rollover.log 2>&1 &", shell=True)
time.sleep(3)

# Normal tick
urllib.request.urlopen(f"http://localhost:{PORT}/api/cron/engine-tick").read()
state1 = json.loads(urllib.request.urlopen(f"http://localhost:{PORT}/api/vixy/state").read().decode())

print(f"CYCLE 1: {state1.get('cycleId')}")

# Now we need to mock Date.now() to jump 16 minutes ahead to force rollover.
# Wait, I cannot easily mock Date.now() inside a running node process without code modification.
