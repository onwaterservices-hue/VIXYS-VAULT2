import re

with open('src/components/PredictionHealthWatch.tsx', 'r') as f:
    content = f.read()

pattern = r'          setHealthScore\(\(old\) => Math\.min\(98, Math\.max\(89, old \+ \(Math\.random\(\) > 0\.5 \? 1 : -1\)\)\)\);\n'
replacement = r''
content = re.sub(pattern, replacement, content)

with open('src/components/PredictionHealthWatch.tsx', 'w') as f:
    f.write(content)
