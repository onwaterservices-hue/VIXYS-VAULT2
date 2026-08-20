import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

overlay_block = """      {/* Discord Connection Required Lockout Overlay */}
      {userRole === 'DEMO' && authState.isAuthenticated && !authState.user?.discordLinked && (
        <DiscordRequiredOverlay
          email={authState.user?.email || ''}
          onConnect={() => {
            window.location.href = `/api/auth/discord/url?email=${encodeURIComponent(authState.user?.email || "")}&returnTo=${encodeURIComponent(window.location.href)}`;
          }}
        />
      )}"""

if overlay_block in code:
    code = code.replace(overlay_block, "")
    with open('src/App.tsx', 'w') as f:
        f.write(code)
    print("Removed DiscordRequiredOverlay from App.tsx")
else:
    print("Could not find DiscordRequiredOverlay block")

