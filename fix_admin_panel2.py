import re

with open('src/components/AdminPanel.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    '''<option value="ELITE_PASS">ELITE_PASS Tier</option>''',
    '''<option value="ELITE_PASS">ELITE_PASS Tier</option>
                  <option value="STARTER">STARTER Tier</option>
                  <option value="NONE">NONE</option>'''
)

with open('src/components/AdminPanel.tsx', 'w') as f:
    f.write(content)
