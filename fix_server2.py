import re

with open('server.ts', 'r') as f:
    code = f.read()

pattern = r"interface ServerUser \{.*?\n  joined: string;"
replacement = """interface ServerUser {
  id: string;
  uid?: string;
  email?: string;
  name?: string;
  role?: 'OWNER' | 'ADMIN' | 'SUPPORT' | 'PRO' | 'ELITE' | 'FREE' | 'USER' | 'NONE';
  subscription?: 'FREE_TRIAL' | 'PRO_PASS' | 'ELITE_PASS' | 'NONE';
  passwordHash?: string;
  verificationStatus?: 'VERIFIED' | 'SUSPECTED_DUPLICATE' | 'UNVERIFIED' | 'DISCORD_PENDING';
  hardwareFingerprint?: string;
  ipHash?: string;
  joined: string;
  discordId?: string;
  discordTag?: string;
  discordGlobalName?: string;
  discordAvatar?: string | null;
  discordLinked?: boolean;
  guildVerified?: boolean;
  discord_connected_at?: string;
  trial_started_at?: string;
  trial_expires_at?: string;"""

code = re.sub(pattern, replacement, code, flags=re.DOTALL)

with open('server.ts', 'w') as f:
    f.write(code)

