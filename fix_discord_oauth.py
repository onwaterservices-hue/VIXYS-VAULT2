import re

with open('server.ts', 'r') as f:
    content = f.read()

pattern = r'  if \(discordUser && discordUser\.id\) \{.*?    const roleAssigned = profile\.guildRoles\?\.\[0\] \|\| \(profile\.guildMember \? \'PRO\' : \'None\'\);'

replacement = r'''  if (discordUser && discordUser.id) {
    console.log('[Discord OAuth Callback Audit] Step 8: Finalizing profile registration for user:', discordUser.username);
    const stateEmail = typeof req.query.state === 'string' && req.query.state.includes('@') ? req.query.state.toLowerCase() : null;
    const headerEmail = (req.headers['x-user-email'] as string)?.toLowerCase();
    const userEmail = (stateEmail || headerEmail || 'vixyvault0@gmail.com').toLowerCase();
    const targetGuildId = process.env.DISCORD_GUILD_ID || '1451337712937336985';
    
    // Check Guild Membership using Bot Token to get roles too
    const botToken = process.env.DISCORD_BOT_TOKEN;
    let isGuildMember = false;
    let guildRoles: string[] = [];
    
    if (botToken) {
      console.log('[Discord OAuth Callback Audit] Fetching guild member details for ID:', discordUser.id);
      try {
        const memberRes = await fetch(`https://discord.com/api/v10/guilds/${targetGuildId}/members/${discordUser.id}`, {
          headers: { Authorization: `Bot ${botToken}` }
        });
        if (memberRes.ok) {
          const memberData = await memberRes.json();
          isGuildMember = true;
          guildRoles = memberData.roles || [];
          console.log('[Discord OAuth Callback Audit] User IS a guild member. Roles:', guildRoles);
        } else if (memberRes.status === 404) {
          console.log('[Discord OAuth Callback Audit] User is NOT a guild member (404).');
        } else {
          console.error('[Discord OAuth Callback Audit] Failed to fetch guild member, status:', memberRes.status);
        }
      } catch (err) {
        console.error('[Discord OAuth Callback Audit] Exception checking guild membership:', err);
      }
    } else {
      console.warn('[Discord OAuth Callback Audit] Missing bot token, falling back to OAuth guilds scope');
      isGuildMember = Array.isArray(userGuilds) && userGuilds.some((g: any) => g.id === targetGuildId);
    }

    // 1. Find the VIXY canonical user by email (from auth session)
    let vixyUser = serverUsers.find(u => u.email?.toLowerCase() === userEmail);
    if (!vixyUser) {
        vixyUser = ensureUserExists({ email: userEmail, name: discordUser.username });
    }
    
    const firebaseUid = vixyUser.id; // Or actual firebase UID if we have it
    
    // Store in Firestore if available
    if (db) {
      try {
        const discordProfileRef = doc(db, 'discordProfiles', discordUser.id);
        const discordProfileSnap = await getDoc(discordProfileRef);
        
        if (discordProfileSnap.exists() && discordProfileSnap.data().firebaseUid !== firebaseUid) {
          console.error('[Discord OAuth Callback Audit] ❌ Discord ID already linked to another account');
          oauthError = 'DISCORD ID ALREADY LINKED';
        } else {
          await setDoc(discordProfileRef, {
            firebaseUid,
            discordUserId: discordUser.id,
            username: discordUser.username,
            globalName: discordUser.global_name || discordUser.username,
            avatar: discordUser.avatar,
            guildId: targetGuildId,
            isGuildMember,
            roleIds: guildRoles,
            verifiedAt: new Date().toISOString(),
            lastCheckedAt: new Date().toISOString()
          }, { merge: true });
          
          const userRef = doc(db, 'users', firebaseUid);
          await setDoc(userRef, { discordUserId: discordUser.id }, { merge: true });
          console.log('[Discord OAuth Callback Audit] ✅ Successfully persisted identity link to Firestore');
        }
      } catch (e) {
        console.error('[Discord OAuth Callback Audit] Firestore error linking Discord identity:', e);
      }
    }

    vixyUser.discordId = discordUser.id;
    vixyUser.discordTag = discordUser.username + (discordUser.discriminator && discordUser.discriminator !== '0' ? `#${discordUser.discriminator}` : '');
    vixyUser.discordGlobalName = discordUser.global_name || discordUser.username;
    vixyUser.discordAvatar = discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : null;
    vixyUser.discordLinked = true;
    vixyUser.guildVerified = isGuildMember;
    
    const hasActiveSub = ['PRO_PASS', 'ELITE_PASS', 'OWNER', 'ADMIN', 'PRO', 'ELITE'].includes(vixyUser.subscription || vixyUser.role || '');
    const avatarUrl = vixyUser.discordAvatar || `https://cdn.discordapp.com/embed/avatars/0.png`;

    const profile: DiscordAuthProfile = {
      email: userEmail,
      discordUserId: vixyUser.discordId!,
      discordUsername: vixyUser.discordTag!,
      discordGlobalName: vixyUser.discordGlobalName || vixyUser.discordTag!,
      discordAvatar: avatarUrl,
      discordLinked: true,
      guildMember: !!vixyUser.guildVerified,
      guildJoined: !!vixyUser.guildVerified,
      roleAssigned: vixyUser.guildVerified ? (hasActiveSub ? 'PRO' : 'MEMBER') : 'NONE',
      guildRoles: vixyUser.guildVerified ? [(hasActiveSub ? 'PRO' : 'MEMBER')] : [],
      lastSync: new Date().toLocaleTimeString(),
      subscriptionTier: hasActiveSub ? 'PRO' : 'FREE',
      verificationStatus: vixyUser.guildVerified ? 'VERIFIED' : 'NEEDS_GUILD',
      connectedAt: new Date().toISOString(),
      linkedAt: new Date().toISOString(),
    };

    userDiscordProfiles.set(userEmail, profile);
    userDiscordProfiles.set('global_active_user', profile);
    savePersistentStore();

    // Trigger post-OAuth entitlement role sync
    await syncUserEntitlementToDiscord(userEmail);
    
    const roleAssigned = profile.guildRoles?.[0] || (profile.guildMember ? 'PRO' : 'None');'''

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('server.ts', 'w') as f:
    f.write(content)
