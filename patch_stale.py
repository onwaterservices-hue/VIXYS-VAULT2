with open("server.ts", "r") as f:
    content = f.read()

target_state = """  globalSequenceNumber++;
  const now = new Date().toISOString();
  const spot = currentBtcPrice;
  const market15mState = getKalshi15mMarketState(spot);
  const isLocked = active15mCycle.isLocked;
  const statePayload = {"""

replacement_state = """  globalSequenceNumber++;
  const _nowMs = Date.now();
  if (_nowMs - (lastMarketUpdateTs || 0) > 60000) {
    return res.json({
      status: "STALE",
      dataFreshness: "STALE",
      message: "Market data is older than 60 seconds."
    });
  }
  const now = new Date(_nowMs).toISOString();
  const spot = currentBtcPrice;
  const market15mState = getKalshi15mMarketState(spot);
  const isLocked = active15mCycle.isLocked;
  const statePayload = {"""

target_current = """  globalSequenceNumber++;
  const now = new Date().toISOString();
  const spot = currentBtcPrice;
  const market15mState = getKalshi15mMarketState(spot);
  const isLocked = active15mCycle.isLocked;
  const cycleId = active15mCycle.cycleId || "BTC-15M-CURRENT";"""

replacement_current = """  globalSequenceNumber++;
  const _nowMs2 = Date.now();
  if (_nowMs2 - (lastMarketUpdateTs || 0) > 60000) {
    return res.json({
      status: "STALE",
      dataFreshness: "STALE",
      message: "Market data is older than 60 seconds."
    });
  }
  const now = new Date(_nowMs2).toISOString();
  const spot = currentBtcPrice;
  const market15mState = getKalshi15mMarketState(spot);
  const isLocked = active15mCycle.isLocked;
  const cycleId = active15mCycle.cycleId || "BTC-15M-CURRENT";"""

if target_state in content:
    content = content.replace(target_state, replacement_state)
    print("Patched /api/vixy/state")
else:
    print("Target state not found")

if target_current in content:
    content = content.replace(target_current, replacement_current)
    print("Patched /api/vixy/15m/current")
else:
    print("Target current not found")

with open("server.ts", "w") as f:
    f.write(content)
