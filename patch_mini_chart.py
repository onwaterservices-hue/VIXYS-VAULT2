import re

with open('src/components/brains/SignalBrain.tsx', 'r') as f:
    content = f.read()

start_marker = "{/* VIXY ORDER FLOW PRESSURE (NEW MODULE) */}"
idx = content.find(start_marker)
if idx != -1:
    print("Found Order Flow module")
else:
    print("Not found")

