import re

with open('server.ts', 'r') as f:
    content = f.read()

pattern = r'  // Safe diagnostic log required by specification\n  console\.log\(`\[AUTH SYNC\]\nauthenticated: true\nfirebaseUser: \$\{Boolean\(cleanUid \|\| \(user && user\.uid\)\)\}\ndirectoryUser: true\ncreated: \$\{created\}`\);\n'
replacement = r'''  // Only log if created or updated to prevent spam
  if (created || updated) {
    console.log(`[AUTH SYNC] Processed user: ${user.email} (Created: ${created}, Updated: ${updated})`);
  }
'''
content = re.sub(pattern, replacement, content)

with open('server.ts', 'w') as f:
    f.write(content)
