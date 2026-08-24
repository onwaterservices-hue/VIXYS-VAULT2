with open("backend.ts", "r") as f:
    content = f.read()

bad_str = "startsWith('vixy"
if bad_str in content:
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if bad_str in line and "')" not in line:
            lines[i] = line + "$')) {"

    content = '\n'.join(lines)

    # Let's also make sure we fix the other one:
    # "return 'vixy" -> "return 'vixy$' + salt + ':' + derivedKey;"
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if "return 'vixy$" in line:
            pass # ok
        elif "return 'vixy" in line:
            lines[i] = "  return 'vixy$' + salt + ':' + derivedKey;"
    
    content = '\n'.join(lines)
    
    with open("backend.ts", "w") as f:
        f.write(content)
