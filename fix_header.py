import re

with open('src/components/Header.tsx', 'r') as f:
    code = f.read()

# Fix double declaration
code = code.replace("  const { tzName: userTzName, abbr: userTzAbbr } = getLocalTimezone();\n\n  const { tzName: userTzName, abbr: userTzAbbr } = getLocalTimezone();", "  const { tzName: userTzName, abbr: userTzAbbr } = getLocalTimezone();")

with open('src/components/Header.tsx', 'w') as f:
    f.write(code)

