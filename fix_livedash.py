import re

with open('src/components/LiveDashboard.tsx', 'r') as f:
    content = f.read()

pattern1 = r'  const \[lockEvaluation, setLockEvaluation\] = useState<{.*?}>(.*?);'
replacement1 = r'''  const [rawApiData, setRawApiData] = useState<any>(null);
  const [lockEvaluation, setLockEvaluation] = useState<{
    qualified: boolean;
    direction: 'UP' | 'DOWN' | 'NEUTRAL';
    checks: {
      confidence: boolean;
      freshness: boolean;
      liquidity: boolean;
      spread: boolean;
      edge: boolean;
      persistence: boolean;
    };
    reason: string;
    persistenceSeconds: number;
    requiredPersistenceSeconds: number;
  }>({
    qualified: true,
    direction: 'UP',
    checks: {
      confidence: true,
      freshness: true,
      liquidity: true,
      spread: true,
      edge: true,
      persistence: true,
    },
    reason: 'Signal qualified across all institutional edge and persistence thresholds',
    persistenceSeconds: 18,
    requiredPersistenceSeconds: 15,
  });'''
content = re.sub(r'  const \[lockEvaluation, setLockEvaluation\] = useState<\{.*?\}>\(\{.*?\n  \}\);', replacement1, content, flags=re.DOTALL)

pattern2 = r'      if \(data && isMounted\) \{\n        if \(data\.engineState\) setEngineState\(data\.engineState\);'
replacement2 = r'''      if (data && isMounted) {
        setRawApiData(data);
        if (data.engineState) setEngineState(data.engineState);'''
content = re.sub(pattern2, replacement2, content)

pattern3 = r'<SignalBrain\n              feedStatus=\{feedStatus\}\n              latencyMs=\{latencyMs\}\n              signal=\{signal\}\n              ticker=\{ticker\}\n              timeString=\{timeString\}\n              timeframe=\{timeframe\}\n              lockEvaluation=\{lockEvaluation\}\n            />'
replacement3 = r'''<SignalBrain
              feedStatus={feedStatus}
              latencyMs={latencyMs}
              signal={signal}
              ticker={ticker}
              timeString={timeString}
              timeframe={timeframe}
              lockEvaluation={lockEvaluation}
              rawApiData={rawApiData}
            />'''
content = re.sub(pattern3, replacement3, content)

with open('src/components/LiveDashboard.tsx', 'w') as f:
    f.write(content)
