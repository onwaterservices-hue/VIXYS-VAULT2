import re

with open('src/components/AdminPanel.tsx', 'r') as f:
    content = f.read()

# For Subscription Tier
content = content.replace(
    '''<option value="DAY_PASS">
                      DAY_PASS ($9.99 - 24-Hour Access Pass)
                    </option>''',
    '''<option value="DAY_PASS">
                      DAY_PASS ($9.99 - 24-Hour Access Pass)
                    </option>
                    <option value="STARTER">
                      STARTER ($29/mo - Beginner Access)
                    </option>
                    <option value="NONE">
                      NONE (Unpaid / Beginner)
                    </option>'''
)

# For System Role
content = content.replace(
    '''<option value="USER">USER (Regular Trader)</option>''',
    '''<option value="USER">USER (Regular Trader)</option>
                    <option value="UNPAID">UNPAID (Beginner)</option>'''
)

with open('src/components/AdminPanel.tsx', 'w') as f:
    f.write(content)
