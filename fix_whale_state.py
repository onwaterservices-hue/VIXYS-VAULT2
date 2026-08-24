import re

with open('src/components/brains/WhaleBrain.tsx', 'r') as f:
    content = f.read()

content = content.replace("  const [isFlashing, setIsFlashing] = useState<boolean>(false);", "  const [isFlashing, setIsFlashing] = useState<boolean>(false);\n  const [status, setStatus] = useState<'ACTIVE' | 'DEGRADED'>('ACTIVE');")
content = content.replace("        if (isMounted) {\n          if (!res.ok) {\n            \n            return;\n          }\n          \n          const data = await res.json();", "        if (isMounted) {\n          if (!res.ok) {\n            setStatus('DEGRADED');\n            return;\n          }\n          setStatus('ACTIVE');\n          const data = await res.json();")

with open('src/components/brains/WhaleBrain.tsx', 'w') as f:
    f.write(content)
