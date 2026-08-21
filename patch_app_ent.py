import re
with open('src/App.tsx', 'r') as f:
    code = f.read()

replacement = """  const [entitlements, setEntitlements] = useState<EntitlementsResponse['entitlements']>({
    starter: false,
    proQuant: false,
    eliteQuant: false,
    scalping15s: false,
    canAccessProDesks: false,
    canAccessAdminPanel: false,
    livePredictions: false,
    modelProbability: false,
    confidenceFilter80: false,
    vixyLocks: false,
    webTerminal: false,
    l2NetTakerVolume: false,
    historicalPatternMatcher: false,
    webhookAlerts: false,
    highConfidenceFilter: false,
    executionLogJournal: false,
    apiKeysAccess: false,
    orderbookImbalance: false,
    unlimitedWebhooks: false,
    prioritySupport: false,
    sha256Exporting: false,
  });"""

code = re.sub(
    r"const \[entitlements, setEntitlements\] = useState<EntitlementsResponse\['entitlements'\]>\(\{[\s\S]*?canAccessAdminPanel: false,\n  \}\);",
    replacement,
    code
)

with open('src/App.tsx', 'w') as f:
    f.write(code)
