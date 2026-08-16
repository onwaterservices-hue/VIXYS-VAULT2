with open("backend.ts", "r") as f:
    lines = f.readlines()
    
with open("backend.ts", "w") as f:
    skip = False
    for line in lines:
        if "// TROUBLESHOOTING GRACE LOGIC" in line:
            skip = True
        
        if not skip:
            f.write(line)
            
        if skip and "} catch(e) {" in line:
            # We need to skip the next 2 lines too
            pass
