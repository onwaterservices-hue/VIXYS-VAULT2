import re

with open('src/components/AdminPanel.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'role: "OWNER" | "ADMIN" | "SUPPORT" | "PRO" | "FREE" | "USER" | "ELITE";',
    'role: "OWNER" | "ADMIN" | "SUPPORT" | "PRO" | "FREE" | "USER" | "ELITE" | "UNPAID";'
)

content = content.replace(
    'subscription: "FREE_TRIAL" | "PRO_PASS" | "ELITE_PASS" | "FREE";',
    'subscription: "FREE_TRIAL" | "PRO_PASS" | "ELITE_PASS" | "FREE" | "DAY_PASS" | "STARTER" | "NONE";'
)

content = content.replace(
    '''  const [newUserTier, setNewUserTier] = useState<
    "FREE_TRIAL" | "PRO_PASS" | "ELITE_PASS"
  >("PRO_PASS");''',
    '''  const [newUserTier, setNewUserTier] = useState<
    "FREE_TRIAL" | "PRO_PASS" | "ELITE_PASS" | "DAY_PASS" | "STARTER" | "NONE"
  >("PRO_PASS");'''
)

content = content.replace(
    '''  const [newUserRole, setNewUserRole] = useState<"USER" | "ADMIN" | "SUPPORT" | "MOD">(
    "USER",
  );''',
    '''  const [newUserRole, setNewUserRole] = useState<"USER" | "ADMIN" | "SUPPORT" | "MOD" | "UNPAID">(
    "USER",
  );'''
)

with open('src/components/AdminPanel.tsx', 'w') as f:
    f.write(content)
