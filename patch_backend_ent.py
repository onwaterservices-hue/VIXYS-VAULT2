import re

with open('backend.ts', 'r') as f:
    code = f.read()

def replacer(match):
    # We will redefine the whole function and its logic
    return """function getEntitlementsFromSubscription(planStr, statusStr, isOwnerOrAdmin = false) {
  if (isOwnerOrAdmin) {
    return {
      entitlements: {
        starter: true, proQuant: true, eliteQuant: true, scalping15s: true, canAccessProDesks: true, canAccessAdminPanel: true,
        livePredictions: true, modelProbability: true, confidenceFilter80: true, vixyLocks: true, webTerminal: true,
        l2NetTakerVolume: true, historicalPatternMatcher: true, webhookAlerts: true, highConfidenceFilter: true, executionLogJournal: true,
        apiKeysAccess: true, orderbookImbalance: true, unlimitedWebhooks: true, prioritySupport: true, sha256Exporting: true
      },
      normalizedPlan: "ELITE_QUANT",
      normalizedStatus: "active",
      isStripeVerified: true
    };
  }

  const cleanPlan = (planStr || "").toUpperCase().trim();
  const cleanStatus = (statusStr || "").toUpperCase().trim();
  const isActive = cleanStatus === "ACTIVE" || cleanStatus === "PAST_DUE" || cleanStatus === "TRIALING";

  if (isActive) {
    if (cleanPlan.includes("ELITE")) {
      return {
        entitlements: {
          starter: true, proQuant: true, eliteQuant: true, scalping15s: true, canAccessProDesks: true, canAccessAdminPanel: false,
          livePredictions: true, modelProbability: true, confidenceFilter80: true, vixyLocks: true, webTerminal: true,
          l2NetTakerVolume: true, historicalPatternMatcher: true, webhookAlerts: true, highConfidenceFilter: true, executionLogJournal: true,
          apiKeysAccess: true, orderbookImbalance: true, unlimitedWebhooks: true, prioritySupport: true, sha256Exporting: true
        },
        normalizedPlan: "ELITE_QUANT",
        normalizedStatus: cleanStatus === "PAST_DUE" ? "past_due" : "active",
        isStripeVerified: true
      };
    } else if (cleanPlan.includes("PRO")) {
      return {
        entitlements: {
          starter: true, proQuant: true, eliteQuant: false, scalping15s: true, canAccessProDesks: true, canAccessAdminPanel: false,
          livePredictions: true, modelProbability: true, confidenceFilter80: true, vixyLocks: true, webTerminal: true,
          l2NetTakerVolume: true, historicalPatternMatcher: true, webhookAlerts: true, highConfidenceFilter: true, executionLogJournal: true,
          apiKeysAccess: false, orderbookImbalance: false, unlimitedWebhooks: false, prioritySupport: false, sha256Exporting: false
        },
        normalizedPlan: "PRO_QUANT",
        normalizedStatus: cleanStatus === "PAST_DUE" ? "past_due" : "active",
        isStripeVerified: true
      };
    } else if (cleanPlan.includes("STARTER")) {
      return {
        entitlements: {
          starter: true, proQuant: false, eliteQuant: false, scalping15s: false, canAccessProDesks: false, canAccessAdminPanel: false,
          livePredictions: true, modelProbability: true, confidenceFilter80: true, vixyLocks: true, webTerminal: true,
          l2NetTakerVolume: false, historicalPatternMatcher: false, webhookAlerts: false, highConfidenceFilter: false, executionLogJournal: false,
          apiKeysAccess: false, orderbookImbalance: false, unlimitedWebhooks: false, prioritySupport: false, sha256Exporting: false
        },
        normalizedPlan: "STARTER",
        normalizedStatus: cleanStatus === "PAST_DUE" ? "past_due" : "active",
        isStripeVerified: true
      };
    }
  }

  return {
    entitlements: {
      starter: false, proQuant: false, eliteQuant: false, scalping15s: false, canAccessProDesks: false, canAccessAdminPanel: false,
      livePredictions: false, modelProbability: false, confidenceFilter80: false, vixyLocks: false, webTerminal: false,
      l2NetTakerVolume: false, historicalPatternMatcher: false, webhookAlerts: false, highConfidenceFilter: false, executionLogJournal: false,
      apiKeysAccess: false, orderbookImbalance: false, unlimitedWebhooks: false, prioritySupport: false, sha256Exporting: false
    },
    normalizedPlan: "NONE",
    normalizedStatus: cleanStatus === "CANCELED" ? "canceled" : "inactive",
    isStripeVerified: false
  };
}"""

# regex matching from 'function getEntitlementsFromSubscription' up to its closing brace
pattern = r'function getEntitlementsFromSubscription\(planStr,statusStr,isOwnerOrAdmin=false\)\{.*?(?=\n__name\(getEntitlementsFromSubscription)'
code = re.sub(pattern, replacer, code, flags=re.DOTALL)

with open('backend.ts', 'w') as f:
    f.write(code)
