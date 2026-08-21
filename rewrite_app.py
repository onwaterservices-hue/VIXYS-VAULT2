import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

# Add LockedFeature import
code = code.replace("import { TrialExpiredOverlay } from './components/TrialExpiredOverlay';",
"""import { TrialExpiredOverlay } from './components/TrialExpiredOverlay';
import { LockedFeature } from './components/LockedFeature';""")

# In the render method, find where VixyLockView is rendered and wrap it.
vixylive_pattern = r"""\s*\{\(activeTab === 'vixylive' \|\| activeTab === 'vixylocks'\) && \(\s*<VixyLockView[\s\S]*?/>\s*\)\}"""
def vixy_repl(m):
    return """
          {(activeTab === 'vixylive' || activeTab === 'vixylocks') && (
            <LockedFeature isAuthorized={entitlements.livePredictions || activeTab === 'vixylive'} featureName={activeTab === 'vixylive' ? 'VIXY LIVE' : 'VIXY LOCKS'} requiredPlanText="Day Pass or higher required">
              <VixyLockView
                ticker={ticker}
                userEmail={authState.user?.email || undefined}
                onOpenTerminal={() => setActiveTab('terminal')}
                onOpenReplay={() => setActiveTab('replay')}
                onOpenPricing={() => setActiveTab('pricing')}
                isAuthenticated={isAuthenticated}
                hasActiveAccess={hasActiveAccess}
                onOpenAuth={handleOpenAuth}
                dayPassCountdown={passCountdownFormatted}
              />
            </LockedFeature>
          )}"""
code = re.sub(vixylive_pattern, vixy_repl, code)

# Wrap other protected views
replacements = [
    (r"\{activeTab === 'terminal' && \(\s*<LiveDashboard[\s\S]*?/>\s*\)\}", "terminal", "entitlements.webTerminal", "Starter or higher required"),
    (r"\{activeTab === 'patterns' && \(\s*<AIPatternEngine[\s\S]*?/>\s*\)\}", "patterns", "entitlements.historicalPatternMatcher", "Pro or higher required"),
    (r"\{activeTab === 'whales' && \(\s*<WhaleTrackerView[\s\S]*?/>\s*\)\}", "whales", "entitlements.orderbookImbalance", "Elite Quant required"),
    (r"\{activeTab === 'journal' && \(\s*<TradeJournalView[\s\S]*?/>\s*\)\}", "journal", "entitlements.executionLogJournal", "Pro or higher required"),
    (r"\{activeTab === 'alerts' && \(\s*<AlertSettingsView[\s\S]*?/>\s*\)\}", "alerts", "entitlements.webhookAlerts", "Pro or higher required"),
]

for pattern, tab, ent, req_text in replacements:
    match = re.search(pattern, code)
    if match:
        original = match.group(0)
        wrapped = f"""{{activeTab === '{tab}' && (
            <LockedFeature isAuthorized={{{ent}}} featureName="{tab.upper()}" requiredPlanText="{req_text}">
              {original[original.find('<'):original.rfind('>')+1]}
            </LockedFeature>
          )}}"""
        code = code.replace(original, wrapped)

# We also need to disable the TrialExpiredOverlay for these features, or just let them render.
# If TrialExpiredOverlay is rendered, it covers the whole screen.
# The user wants specific features to be blurred. Let's comment out the TrialExpiredOverlay condition or just change it to only show if they are NOT logged in.
# Wait, if they are not logged in, they see the auth prompt anyway: `{!authState.isAuthenticated ? (`
# The trial expired overlay was used as a generic lockout for all unpaid logged-in users.
# Let's remove the TrialExpiredOverlay block completely.
overlay_pattern = r"\{/\* Full-Screen Trial Expired Blurred Lockout Overlay \*/\}[\s\S]*?onOpenAuth=\{\(mode, prefillEmail\) => \{[\s\S]*?\}\s*/>\s*\)"
code = re.sub(overlay_pattern, "{/* Trial Expired Overlay removed in favor of granular feature gating */}", code)

with open('src/App.tsx', 'w') as f:
    f.write(code)
