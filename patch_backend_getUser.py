import re

with open('backend.ts', 'r') as f:
    code = f.read()

# Replace hardcoded false entitlement blocks with the output of the empty function
code = re.sub(
    r'\{starter:false,proQuant:false,eliteQuant:false,scalping15s:false,canAccessProDesks:false,canAccessAdminPanel:false\}',
    r'getEntitlementsFromSubscription("NONE", "CANCELED").entitlements',
    code
)

# And if there are any other hardcoded blocks we missed, let's fix them manually.
# For example, the Day Pass handling in getUserEntitlement.
with open('backend.ts', 'w') as f:
    f.write(code)
