import re

with open('src/components/AdminPanel.tsx', 'r') as f:
    code = f.read()

old_edit = """  const openEditUserModal = (user: UserItem) => {
    setEditingUser(user);
    setEditName(user.name || '');
    setEditEmail(user.email || '');
    setEditPassword('');
    setEditRole(user.role || 'USER');
    setEditTier(user.subscription || 'FREE_TRIAL');
    setEditStatus(user.status || 'ACTIVE');
    setEditDiscordTag(user.discordTag || '');
    setEditDiscordGlobalName((user as any).discordGlobalName || '');
    setEditDiscordId(user.discordId || '');
    setEditVerificationStatus(user.verificationStatus || 'VERIFIED');
    setEditStripeCustomerId(user.stripeCustomerId || '');
    setEditStripeSubscriptionId(user.stripeSubscriptionId || '');
  };"""

new_edit = """  const openEditUserModal = (user: UserItem) => {
    setEditingUser(user);
    setEditName(user.name || '');
    setEditEmail(user.email || '');
    setEditPassword('');
    setEditRole(user.role || 'USER');
    setEditTier(user.subscription || 'FREE_TRIAL');
    setEditStatus(user.status || 'ACTIVE');
    setEditDiscordTag(user.discordTag || '');
    setEditDiscordGlobalName((user as any).discordGlobalName || '');
    setEditDiscordId(user.discordId || '');
    setEditVerificationStatus(user.verificationStatus || ((user.discordLinked || user.discordId) ? 'VERIFIED' : 'UNVERIFIED'));
    setEditStripeCustomerId(user.stripeCustomerId || '');
    setEditStripeSubscriptionId(user.stripeSubscriptionId || '');
  };"""

if old_edit in code:
    code = code.replace(old_edit, new_edit)
    with open('src/components/AdminPanel.tsx', 'w') as f:
        f.write(code)
    print("Patched openEditUserModal")
else:
    print("Failed to patch openEditUserModal")

