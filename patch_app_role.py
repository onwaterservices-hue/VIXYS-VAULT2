with open('src/App.tsx', 'r') as f:
    code = f.read()

code = code.replace("    } catch (e) {\n      console.error(e);\n    }\n    return 'ADMIN';\n  });", "    } catch (e) {\n      console.error(e);\n    }\n    return 'DEMO';\n  });")

with open('src/App.tsx', 'w') as f:
    f.write(code)

print("Patched default role to DEMO")
