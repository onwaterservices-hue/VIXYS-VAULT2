const fs = require('fs');
let content = fs.readFileSync('src/hooks/useCanonical15mDecision.ts', 'utf8');

content = content.replace(
  `  const [localUpdatedAt, setLocalUpdatedAt] = useState<number>(Date.now());\n  const [dataHealthStatus, setDataHealthStatus] = useState<FeedHealthStatus>('LIVE');`,
  `  const [localUpdatedAt, setLocalUpdatedAt] = useState<number>(Date.now());\n  const [nowMs, setNowMs] = useState<number>(Date.now());\n  const [dataHealthStatus, setDataHealthStatus] = useState<FeedHealthStatus>('LIVE');`
);

content = content.replace(
  `  // Heartbeat checker to detect stale feeds (> 12 seconds with no update)`,
  `  // 1-Second tick to compute authoritative remaining time smoothly\n  useEffect(() => {\n    const timer = setInterval(() => setNowMs(Date.now()), 1000);\n    return () => clearInterval(timer);\n  }, []);\n\n  // Heartbeat checker to detect stale feeds (> 12 seconds with no update)`
);

content = content.replace(
  `  return {\n    decision,\n    isLoading,`,
  `  const dynamicDecision = { ...decision };\n  if (dynamicDecision.cycleEnd) {\n    const endMs = typeof dynamicDecision.cycleEnd === 'string' ? new Date(dynamicDecision.cycleEnd).getTime() : dynamicDecision.cycleEnd;\n    const calculatedSec = Math.max(0, Math.floor((endMs - nowMs) / 1000));\n    dynamicDecision.timeRemainingSec = calculatedSec;\n    dynamicDecision.minutesRemaining = calculatedSec / 60;\n    dynamicDecision.secondsRemaining = calculatedSec;\n  }\n\n  return {\n    decision: dynamicDecision,\n    isLoading,`
);

fs.writeFileSync('src/hooks/useCanonical15mDecision.ts', content, 'utf8');
console.log("Patched src/hooks/useCanonical15mDecision.ts successfully (re-applied)");
