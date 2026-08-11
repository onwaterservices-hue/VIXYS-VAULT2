import re

with open('src/components/AIPatternEngine.tsx', 'r') as f:
    content = f.read()

pattern = r'  // Auto Refresh Simulation\n  useEffect\(\(\) => \{\n    const timer = setInterval\(\(\) => \{\n      setScanCount\(\(prev\) => prev \+ Math\.floor\(Math\.random\(\) \* 2\) \+ 1\);\n      setLastScanTime\(new Date\(\)\.toLocaleTimeString\(\[\], \{ hour: \'2-digit\', minute: \'2-digit\', second: \'2-digit\' \}\)\);\n    \}, 10000\);\n    return \(\) => clearInterval\(timer\);\n  \}, \[\]\);\n'
replacement = r''
content = re.sub(pattern, replacement, content)

with open('src/components/AIPatternEngine.tsx', 'w') as f:
    f.write(content)
