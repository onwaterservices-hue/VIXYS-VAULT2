with open("src/hooks/useLiveSignal.ts", "r") as f:
    content = f.read()

target = """const updateSignalFromAuthoritative = (snapshot: any) => {
  if (!snapshot) return;
  const key = 'BTC:15m';
  let state = states.get(key) || { signal: null, status: null, isRateLimited: false };

  if (snapshot.cycleId && state.signal?.cycleId) {"""

replacement = """const updateSignalFromAuthoritative = (snapshot: any) => {
  if (!snapshot) return;
  const key = 'BTC:15m';
  let state = states.get(key) || { signal: null, status: null, isRateLimited: false };

  if (snapshot.status === 'STALE') {
    state.signal = {
      ...(state.signal || {}),
      status: 'STALE',
      feedStatus: 'STALE',
      dataFreshness: 'STALE',
      stage: 'STALE'
    } as any;
    states.set(key, state);
    notifySubscribers(key);
    notifySubscribers('BTC:1h');
    notifySubscribers('ETH:15m');
    notifySubscribers('SOL:15m');
    return;
  }

  if (snapshot.cycleId && state.signal?.cycleId) {"""

if target in content:
    content = content.replace(target, replacement)
    with open("src/hooks/useLiveSignal.ts", "w") as f:
        f.write(content)
    print("Patched useLiveSignal.ts")
else:
    print("Target not found in useLiveSignal.ts")
