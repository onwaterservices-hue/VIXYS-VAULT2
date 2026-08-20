import re

with open('server.ts', 'r') as f:
    code = f.read()

old_wipe = """// WIPE BETA / OLD NON-ADMIN USERS
app.post('/api/admin/users/wipe', requireRole(['OWNER', 'ADMIN']), (req, res) => {
  const initialCount = serverUsers.length;
  
  // Filter serverUsers to keep only master admins
  const adminUsers = serverUsers.filter((u) => {
    return isMasterAdminEmail(u.email);
  });

  serverUsers.length = 0;
  serverUsers.push(...adminUsers);

  // Clean userSubscriptions
  const subKeysToDelete: string[] = [];
  userSubscriptions.forEach((_, email) => {
    if (!isMasterAdminEmail(email)) {
      subKeysToDelete.push(email);
    }
  });
  subKeysToDelete.forEach((k) => userSubscriptions.delete(k));

  // Clean userDiscordProfiles
  const profileKeysToDelete: string[] = [];
  userDiscordProfiles.forEach((prof, email) => {
    if (email !== 'global_active_user' && !isMasterAdminEmail(email) && !isMasterAdminEmail(prof.email)) {
      profileKeysToDelete.push(email);
    }
  });
  profileKeysToDelete.forEach((k) => userDiscordProfiles.delete(k));

  // Ensure Master Admins are guaranteed present and elevated"""

new_wipe = """// WIPE BETA / OLD NON-ADMIN USERS
app.post('/api/admin/users/wipe', requireRole(['OWNER', 'ADMIN']), (req, res) => {
  const initialCount = serverUsers.length;
  
  // Filter serverUsers to keep master admins AND active Stripe customers
  const usersToKeep = serverUsers.filter((u) => {
    if (isMasterAdminEmail(u.email)) return true;
    
    // Check if they have an active stripe customer ID or subscription
    const sub = u.email ? userSubscriptions.get(u.email.toLowerCase()) : null;
    if (u.stripeCustomerId || u.stripeSubscriptionId || (sub && (sub.stripeCustomerId || sub.stripeSubscriptionId))) {
      return true; // Keep paying customers
    }
    
    // Also check if req body includes specific IDs to wipe, otherwise we are doing a general wipe
    if (req.body.targetUserIds && Array.isArray(req.body.targetUserIds)) {
       return !req.body.targetUserIds.includes(u.id); // If targetUserIds is provided, keep everyone NOT in that list
    }
    
    return false;
  });

  const keptEmails = new Set(usersToKeep.map(u => u.email?.toLowerCase()).filter(Boolean));

  serverUsers.length = 0;
  serverUsers.push(...usersToKeep);

  // Clean userSubscriptions
  const subKeysToDelete: string[] = [];
  userSubscriptions.forEach((_, email) => {
    if (!keptEmails.has(email.toLowerCase())) {
      subKeysToDelete.push(email);
    }
  });
  subKeysToDelete.forEach((k) => userSubscriptions.delete(k));

  // Clean userDiscordProfiles
  const profileKeysToDelete: string[] = [];
  userDiscordProfiles.forEach((prof, email) => {
    if (email !== 'global_active_user' && !keptEmails.has(email.toLowerCase()) && prof.email && !keptEmails.has(prof.email.toLowerCase())) {
      profileKeysToDelete.push(email);
    }
  });
  profileKeysToDelete.forEach((k) => userDiscordProfiles.delete(k));

  // Ensure Master Admins are guaranteed present and elevated"""

if old_wipe in code:
    code = code.replace(old_wipe, new_wipe)
    with open('server.ts', 'w') as f:
        f.write(code)
    print("Patched /api/admin/users/wipe")
else:
    print("Failed to find wipe endpoint")

