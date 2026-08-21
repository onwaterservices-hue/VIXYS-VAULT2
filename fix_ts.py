import re

with open('backend.ts', 'r') as f:
    code = f.read()

# Fix toUpperCase/toLowerCase on query params
code = re.sub(r'(req\.query\.\w+)\.toUpperCase', r'(\1 as string).toUpperCase', code)
code = re.sub(r'(req\.query\.\w+)\.toLowerCase', r'(\1 as string).toLowerCase', code)
code = re.sub(r'(req\.query\.\w+)\.trim', r'(\1 as string).trim', code)
code = re.sub(r'(req\.headers\[.*?\])\.toLowerCase', r'(\1 as string).toLowerCase', code)
code = re.sub(r'(req\.headers\.\w+)\.toLowerCase', r'(\1 as string).toLowerCase', code)

with open('backend.ts', 'w') as f:
    f.write(code)
