import re

with open('src/components/brains/SignalBrain.tsx', 'r') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if line.startswith("import { Layers, ") and not "lucide-react" in line:
        line = line.replace("Layers, ", "")
    new_lines.append(line)

with open('src/components/brains/SignalBrain.tsx', 'w') as f:
    f.writelines(new_lines)
