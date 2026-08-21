const fs = require('fs');
let content = fs.readFileSync('backend.ts', 'utf8');

let startIndex = content.indexOf('function getEntitlementsFromSubscription');
let openBrackets = 0;
let endIndex = startIndex;
let started = false;

for (let i = startIndex; i < content.length; i++) {
  if (content[i] === '{') {
    openBrackets++;
    started = true;
  }
  if (content[i] === '}') {
    openBrackets--;
  }
  if (started && openBrackets === 0) {
    endIndex = i + 1;
    break;
  }
}

const replacement = `function getEntitlementsFromSubscription(planStr, statusStr, isOwnerOrAdmin = false) {
  const cleanPlan = (planStr || "").toUpperCase().trim();
  const cleanStatus = (statusStr || "").toUpperCase().trim();
  const isActive = cleanStatus === "ACTIVE" || cleanStatus === "PAST_DUE" || cleanStatus === "TRIALING";
  
  const baseEntitlements = {
    starter: false, proQuant: false, eliteQuant: false, scalping15s: false, canAccessProDesks: false, canAccessAdminPanel: false,
    livePredictions: false, modelProbability: false, confidenceFilter80: false, vixyLocks: false, webTerminal: false,
    l2NetTakerVolume: false, historicalPatternMatcher: false, webhookAlerts: false, highConfidenceFilter: false,
    executionLogJournal: false, apiKeysAccess: false, orderbookImbalance: false, unlimitedWebhooks: false, prioritySupport: false, sha256Exporting: false,
    discordSignals: false, telegramSignals: false
  };

  if (isOwnerOrAdmin) {
    return {
      entitlements: { ...baseEntitlements, starter: true, proQuant: true, eliteQuant: true, scalping15s: true, canAccessProDesks: true, canAccessAdminPanel: true, livePredictions: true, modelProbability: true, confidenceFilter80: true, vixyLocks: true, webTerminal: true, l2NetTakerVolume: true, historicalPatternMatcher: true, webhookAlerts: true, highConfidenceFilter: true, executionLogJournal: true, apiKeysAccess: true, orderbookImbalance: true, unlimitedWebhooks: true, prioritySupport: true, sha256Exporting: true, discordSignals: true, telegramSignals: true },
      normalizedPlan: "ELITE",
      normalizedStatus: "active",
      isStripeVerified: true
    };
  }

  if (isActive) {
    if (cleanPlan.includes("ELITE")) {
      return {
        entitlements: { ...baseEntitlements, starter: true, proQuant: true, eliteQuant: true, scalping15s: true, canAccessProDesks: true, canAccessAdminPanel: false, livePredictions: true, modelProbability: true, confidenceFilter80: true, vixyLocks: true, webTerminal: true, l2NetTakerVolume: true, historicalPatternMatcher: true, webhookAlerts: true, highConfidenceFilter: true, executionLogJournal: true, apiKeysAccess: true, orderbookImbalance: true, unlimitedWebhooks: true, prioritySupport: true, sha256Exporting: true, discordSignals: true, telegramSignals: true },
        normalizedPlan: "ELITE",
        normalizedStatus: cleanStatus === "PAST_DUE" ? "past_due" : "active",
        isStripeVerified: true
      };
    } else if (cleanPlan.includes("PRO")) {
      return {
        entitlements: { ...baseEntitlements, starter: true, proQuant: true, eliteQuant: false, scalping15s: true, canAccessProDesks: true, canAccessAdminPanel: false, livePredictions: true, modelProbability: true, confidenceFilter80: true, vixyLocks: true, webTerminal: true, l2NetTakerVolume: true, historicalPatternMatcher: true, webhookAlerts: true, highConfidenceFilter: true, executionLogJournal: true, apiKeysAccess: false, orderbookImbalance: true, unlimitedWebhooks: false, prioritySupport: false, sha256Exporting: false, discordSignals: true, telegramSignals: true },
        normalizedPlan: "PRO",
        normalizedStatus: cleanStatus === "PAST_DUE" ? "past_due" : "active",
        isStripeVerified: true
      };
    } else if (cleanPlan.includes("STARTER")) {
      return {
        entitlements: { ...baseEntitlements, starter: true, proQuant: false, eliteQuant: false, scalping15s: false, canAccessProDesks: false, canAccessAdminPanel: false, livePredictions: true, modelProbability: true, confidenceFilter80: true, vixyLocks: false, webTerminal: true, l2NetTakerVolume: false, historicalPatternMatcher: false, webhookAlerts: false, highConfidenceFilter: false, executionLogJournal: false, apiKeysAccess: false, orderbookImbalance: false, unlimitedWebhooks: false, prioritySupport: false, sha256Exporting: false, discordSignals: false, telegramSignals: false },
        normalizedPlan: "STARTER",
        normalizedStatus: cleanStatus === "PAST_DUE" ? "past_due" : "active",
        isStripeVerified: true
      };
    } else if (cleanPlan.includes("DAY_PASS")) {
      return {
        entitlements: { ...baseEntitlements, starter: false, proQuant: false, eliteQuant: false, scalping15s: false, canAccessProDesks: false, canAccessAdminPanel: false, livePredictions: true, modelProbability: true, confidenceFilter80: true, vixyLocks: true, webTerminal: true, l2NetTakerVolume: true, historicalPatternMatcher: true, webhookAlerts: false, highConfidenceFilter: true, executionLogJournal: false, apiKeysAccess: false, orderbookImbalance: true, unlimitedWebhooks: false, prioritySupport: false, sha256Exporting: false, discordSignals: true, telegramSignals: false },
        normalizedPlan: "DAY_PASS",
        normalizedStatus: cleanStatus === "PAST_DUE" ? "past_due" : "active",
        isStripeVerified: true
      };
    }
  }

  return {
    entitlements: baseEntitlements,
    normalizedPlan: "NONE",
    normalizedStatus: cleanStatus === "CANCELED" ? "canceled" : "inactive",
    isStripeVerified: false
  };
}`;

content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
fs.writeFileSync('backend.ts', content);
