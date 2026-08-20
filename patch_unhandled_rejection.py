import re

with open('server.ts', 'r') as f:
    code = f.read()

unhandled_rejection_code = """
process.on('unhandledRejection', (reason: any) => {
  const errStr = String(reason?.message || reason);
  if (errStr.includes('WebSocket closed without opened') || errStr.includes('[vite]')) {
    // Ignore Vite HMR websocket rejections in backend terminal
    return;
  }
  console.error('Unhandled Rejection:', reason);
});
"""

# Insert right after the imports
imports_end_pattern = r"import .*?;\n"
imports = re.findall(imports_end_pattern, code)
if imports:
    last_import = imports[-1]
    code = code.replace(last_import, last_import + unhandled_rejection_code)
else:
    code = unhandled_rejection_code + code

with open('server.ts', 'w') as f:
    f.write(code)

print("Injected unhandled rejection handler")
