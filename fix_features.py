import re

with open('src/services/api.ts', 'r') as f:
    code = f.read()

pattern = r"  features: \{\n    asset: string;\n    desk: string;\n    orderBookImbalance: number;\n    momentum5m: number;\n    momentum15m: number;\n    volatility15m: number;\n    crossVenue: \{\n      spot: number;\n      kalshiStrike: number;\n      kalshiImpliedProb: number;\n      polymarketImpliedProb: number;\n      spreadPct: number;\n    \};\n    computedAt\?: string;\n  \};\n"

code = re.sub(pattern, "  features?: any;\n", code)

with open('src/services/api.ts', 'w') as f:
    f.write(code)

