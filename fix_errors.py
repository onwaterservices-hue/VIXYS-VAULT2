import re

with open('src/components/brains/WhaleBrain.tsx', 'r') as f:
    content = f.read()

content = content.replace("setStatus('DEGRADED');", "")
content = content.replace("setStatus('ACTIVE');", "")

with open('src/components/brains/WhaleBrain.tsx', 'w') as f:
    f.write(content)


with open('server.ts', 'r') as f:
    content = f.read()

pattern = r'  // Only log if created or updated to prevent spam\n  if \(created \|\| updated\) \{\n    console\.log\(`\[AUTH SYNC\] Processed user: \$\{user\.email\} \(Created: \$\{created\}, Updated: \$\{updated\}\)`\);\n  \}'
replacement = r'''  // Only log if created
  if (created) {
    console.log(`[AUTH SYNC] Processed user: ${user.email} (Created: ${created})`);
  }'''
content = re.sub(pattern, replacement, content)

with open('server.ts', 'w') as f:
    f.write(content)
