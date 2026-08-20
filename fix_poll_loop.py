import re

with open('src/components/LiveDashboard.tsx', 'r') as f:
    content = f.read()

pattern = r'    pollLiveSignal\(\);\n    const interval = setInterval\(pollLiveSignal, 2000\);\n    return \(\) => \{\n      isMounted = false;\n      clearInterval\(interval\);\n    \};'

replacement = r'''    let timeoutId: any;
    async function loop() {
      if (!isMounted) return;
      await pollLiveSignal();
      if (isMounted) timeoutId = setTimeout(loop, 2000);
    }
    loop();
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };'''

content = re.sub(pattern, replacement, content)

with open('src/components/LiveDashboard.tsx', 'w') as f:
    f.write(content)
