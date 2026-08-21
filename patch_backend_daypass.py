import re

with open('backend.ts', 'r') as f:
    code = f.read()

# Replace hardcoded elite/pro entitlement for day pass
code = re.sub(
    r'entitlements:\{starter:true,proQuant:true,eliteQuant:true,scalping15s:true,canAccessProDesks:true,canAccessAdminPanel:false\}',
    r'entitlements: {starter:true,proQuant:true,eliteQuant:true,scalping15s:true,canAccessProDesks:true,canAccessAdminPanel:false, livePredictions:true, modelProbability:true, confidenceFilter80:true, vixyLocks:true, webTerminal:true, l2NetTakerVolume:false, historicalPatternMatcher:false, webhookAlerts:false, highConfidenceFilter:false, executionLogJournal:false, apiKeysAccess:false, orderbookImbalance:false, unlimitedWebhooks:false, prioritySupport:false, sha256Exporting:false}',
    code
)

with open('backend.ts', 'w') as f:
    f.write(code)
