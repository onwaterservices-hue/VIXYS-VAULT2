import re

with open('src/components/HistoricalAccuracy.tsx', 'r') as f:
    content = f.read()

pattern = r'      setLiveFeedSignals\(\(prev\) =>\n        prev\.map\(\(sig, idx\) => \(\{\n          \.\.\.sig,\n          latencyMs: Math\.floor\(40 \+ Math\.random\(\) \* 80\),\n        \}\)\)\n      \);\n'
replacement = r''
content = re.sub(pattern, replacement, content)

with open('src/components/HistoricalAccuracy.tsx', 'w') as f:
    f.write(content)
