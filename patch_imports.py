with open('src/components/brains/SignalBrain.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "import { Clock, Radio, Key, Activity, ShieldCheck, AlertTriangle, WifiOff } from 'lucide-react';",
    "import { Clock, Radio, Key, Activity, ShieldCheck, AlertTriangle, WifiOff, Lock, Unlock } from 'lucide-react';"
)

with open('src/components/brains/SignalBrain.tsx', 'w') as f:
    f.write(content)
