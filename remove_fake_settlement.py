import re

with open('server.ts', 'r') as f:
    content = f.read()

pattern = r'setInterval\(\(\) => \{\n  serverLearningEngine\.lifetimeObservations \+= 1;\n  serverLearningEngine\.todaySettledCount \+= 1;\n  serverLearningEngine\.lastWeightUpdateTs = Date\.now\(\);\n  const newSettlement = \{\n    id: `SETTLE-\$\{Date\.now\(\)\.toString\(\)\.slice\(-6\)\}`,\n    asset: \'BTC\',\n    desk: \'15m\',\n    timestamp: new Date\(\)\.toISOString\(\),\n    prediction: \'BUY_YES\',\n    confidence: 88,\n    actualOutcome: \'WIN\',\n    brierScore: 0\.145,\n  \};\n\n  serverLearningEngine\.settledHistory\.unshift\(newSettlement\);\n  if \(serverLearningEngine\.settledHistory\.length > 50\) \{\n    serverLearningEngine\.settledHistory\.pop\(\);\n  \}\n\}, 6000\);\n'
replacement = r''
content = re.sub(pattern, replacement, content)

with open('server.ts', 'w') as f:
    f.write(content)
