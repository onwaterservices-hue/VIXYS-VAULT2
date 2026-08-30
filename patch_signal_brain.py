with open("src/components/brains/SignalBrain.tsx", "r") as f:
    content = f.read()

target = """  const isActualOffline = feedStatus === 'OFFLINE' || feedStatus === 'DISCONNECTED' || rawApiData?.dataFreshness === 'OFFLINE' || liveAgeSeconds > 60;
  const isOfflineOrStale = isActualOffline && !hasValidRawData;"""

replacement = """  const isActualOffline = feedStatus === 'OFFLINE' || feedStatus === 'STALE' || feedStatus === 'DISCONNECTED' || rawApiData?.dataFreshness === 'OFFLINE' || rawApiData?.dataFreshness === 'STALE' || rawApiData?.status === 'STALE' || liveAgeSeconds > 60;
  const isOfflineOrStale = isActualOffline || rawApiData?.status === 'STALE';"""

if target in content:
    content = content.replace(target, replacement)
    with open("src/components/brains/SignalBrain.tsx", "w") as f:
        f.write(content)
    print("Patched SignalBrain.tsx")
else:
    print("Target not found in SignalBrain.tsx")
