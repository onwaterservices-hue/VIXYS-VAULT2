const fs = require('fs');
let content = fs.readFileSync('src/hooks/useCanonical15mDecision.ts', 'utf8');

content = content.replace(
  `  const [nowMs, setNowMs] = useState<number>(Date.now());`,
  ``
);

content = content.replace(
  `  // 1-Second tick to compute authoritative remaining time smoothly\n  useEffect(() => {\n    const timer = setInterval(() => setNowMs(Date.now()), 1000);\n    return () => clearInterval(timer);\n  }, []);`,
  ``
);

content = content.replace(
  `  const dynamicDecision = { ...decision };\n  if (dynamicDecision.cycleEnd) {\n    const endMs = typeof dynamicDecision.cycleEnd === 'string' ? new Date(dynamicDecision.cycleEnd).getTime() : dynamicDecision.cycleEnd;\n    const calculatedSec = Math.max(0, Math.floor((endMs - nowMs) / 1000));\n    dynamicDecision.timeRemainingSec = calculatedSec;\n    dynamicDecision.minutesRemaining = calculatedSec / 60;\n    dynamicDecision.secondsRemaining = calculatedSec;\n  }\n\n  return {\n    decision: dynamicDecision,\n    isLoading,`,
  `  return {\n    decision,\n    isLoading,`
);

fs.writeFileSync('src/hooks/useCanonical15mDecision.ts', content, 'utf8');
console.log("Reverted src/hooks/useCanonical15mDecision.ts successfully");
