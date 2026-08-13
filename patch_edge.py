import re

with open('src/components/brains/SignalBrain.tsx', 'r') as f:
    content = f.read()

content = re.sub(
    r'const correlationPenalty = sigAny\?\.correlationPenalty \?\? rawApiData\?\.correlationPenalty \?\? \'ACTIVE \(-3\.2%\)\';',
    r'const edgePct = sigAny?.edgePct ?? rawApiData?.edgePct ?? 0;\n  const edgeDisplay = edgePct > 0 ? `+${edgePct.toFixed(1)}% OVER MARKET` : `${edgePct.toFixed(1)}% OVER MARKET`;',
    content
)

content = re.sub(
    r'\{correlationPenalty \|\| \'\+1\.5% OVER MARKET\'\}',
    r'{edgeDisplay}',
    content
)

with open('src/components/brains/SignalBrain.tsx', 'w') as f:
    f.write(content)
print("Edge patched!")
