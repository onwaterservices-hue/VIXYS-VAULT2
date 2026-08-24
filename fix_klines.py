import re

with open('src/services/api.ts', 'r') as f:
    content = f.read()

pattern = r'  for \(let i = 29; i >= 0; i--\) \{.*?currentClose = close;\n  \}'
replacement = r''
content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('src/services/api.ts', 'w') as f:
    f.write(content)
