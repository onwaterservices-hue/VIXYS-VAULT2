with open('src/App.tsx', 'r') as f:
    code = f.read()

code = code.replace("{/* Trial Expired Overlay removed in favor of granular feature gating */}}", "{/* Trial Expired Overlay removed in favor of granular feature gating */}")

with open('src/App.tsx', 'w') as f:
    f.write(code)
