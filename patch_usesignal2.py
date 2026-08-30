with open("src/hooks/useLiveSignal.ts", "r") as f:
    content = f.read()

target = """const updateSignalFromAuthoritative = (snapshot: any) => {
  if (!snapshot) return;
  const key = 'BTC:15m';
  let state = states.get(key) || { signal: null, status: null, isRateLimited: false };

  if (snapshot.cycleId && state.signal?.cycleId) {"""

content = content.replace("  let state = states.get(key) || { signal: null, status: null, isRateLimited: false };\n\n  if (snapshot.cycleId", "  let state = states.get(key) || { signal: null, status: null, isRateLimited: false };\n\n  if (snapshot.status === 'STALE') {\n    state.signal = {\n      ...(state.signal || {}),\n      status: 'STALE',\n      feedStatus: 'STALE',\n      dataFreshness: 'STALE',\n      stage: 'STALE'\n    } as any;\n    states.set(key, state);\n    notifySubscribers(key);\n    notifySubscribers('BTC:1h');\n    notifySubscribers('ETH:15m');\n    notifySubscribers('SOL:15m');\n    return;\n  }\n\n  if (snapshot.cycleId")

with open("src/hooks/useLiveSignal.ts", "w") as f:
    f.write(content)
print("Patched useLiveSignal.ts")
