import re

with open('src/components/LiveDashboard.tsx', 'r') as f:
    code = f.read()

code = code.replace("const [feedStatus, setFeedStatus] = useState<'CONNECTED' | 'DEGRADED' | 'STALE' | 'DISCONNECTED'>('CONNECTED');", "const [feedStatus, setFeedStatus] = useState<string>('CONNECTED');")
code = code.replace("if (data.feedStatus) setFeedStatus(data.feedStatus);", "if (data.feedStatus) setFeedStatus(data.feedStatus as any);")

with open('src/components/LiveDashboard.tsx', 'w') as f:
    f.write(code)

