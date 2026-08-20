import re

with open('src/components/brains/SignalBrain.tsx', 'r') as f:
    code = f.read()

# I will just write a python script to revert this or add the keyframes inside index.css instead!
# First, let's fix the broken JSX.
code = code.replace("""return (
    <>
      <style>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
      `}</style>""", "return (")

code = code.replace("""    </div>
    </>
  );
};""", """    </div>
  );
};""")

with open('src/components/brains/SignalBrain.tsx', 'w') as f:
    f.write(code)

print("Reverted JSX injection")
