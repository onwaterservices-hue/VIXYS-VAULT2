import re

with open('src/components/LiveDashboard.tsx', 'r') as f:
    content = f.read()

# Add latency state
pattern = r'  const \[lastUpdateUtc, setLastUpdateUtc\] = useState<string>\(\(\) => new Date\(\)\.toISOString\(\)\.substring\(11, 19\) \+ \' UTC\'\);'
replacement = r'''  const [lastUpdateUtc, setLastUpdateUtc] = useState<string>(() => new Date().toISOString().substring(11, 19) + ' UTC');
  const [latencyMs, setLatencyMs] = useState<number>(0);'''
content = re.sub(pattern, replacement, content)

# Measure latency in pollLiveSignal
pattern2 = r'      const data = await fetchLiveSignalData\(selectedAsset \|\| \'BTC\', timeframe === \'1H\' \? \'1h\' : \'15m\'\);'
replacement2 = r'''      const startTs = Date.now();
      const data = await fetchLiveSignalData(selectedAsset || 'BTC', timeframe === '1H' ? '1h' : '15m');
      const endTs = Date.now();
      if (isMounted) setLatencyMs(endTs - startTs);'''
content = re.sub(pattern2, replacement2, content)

# Pass it to SignalBrain
pattern3 = r'feedStatus=\{feedStatus\}'
replacement3 = r'''feedStatus={feedStatus}
              latencyMs={latencyMs}'''
content = re.sub(pattern3, replacement3, content)

with open('src/components/LiveDashboard.tsx', 'w') as f:
    f.write(content)

with open('src/components/brains/SignalBrain.tsx', 'r') as f:
    content = f.read()

# Add to Props
pattern4 = r'feedStatus\?: string;'
replacement4 = r'''feedStatus?: string;
  latencyMs?: number;'''
content = re.sub(pattern4, replacement4, content)

# Add to destructuring
pattern5 = r'feedStatus = \'CONNECTED\',\n\}\) => \{'
replacement5 = r'''feedStatus = 'CONNECTED',
  latencyMs = 0,
}) => {'''
content = re.sub(pattern5, replacement5, content)

# Add to render
pattern6 = r'LATENCY UNAVAILABLE'
replacement6 = r'LATENCY {latencyMs}ms'
content = re.sub(pattern6, replacement6, content)

with open('src/components/brains/SignalBrain.tsx', 'w') as f:
    f.write(content)
