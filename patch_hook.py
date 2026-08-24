import re

with open("src/hooks/useCanonical15mDecision.ts", "r") as f:
    content = f.read()

# Add localUpdatedAt to the return type
content = content.replace("refreshDecision: () => Promise<void>;", "refreshDecision: () => Promise<void>;\n  localUpdatedAt: number;")

# Add state for localUpdatedAt
content = content.replace("const [isLoading, setIsLoading] = useState<boolean>(false);", "const [isLoading, setIsLoading] = useState<boolean>(false);\n  const [localUpdatedAt, setLocalUpdatedAt] = useState<number>(Date.now());")

# Update localUpdatedAt in applySafeUpdate unconditionally to serve as a heartbeat
heartbeat_logic = """  const applySafeUpdate = (incoming: Canonical15mDecision, source: string = 'FIRESTORE') => {
    if (!incoming || !incoming.decisionId) return;
    
    // Always update heartbeat if we receive a valid payload
    setLocalUpdatedAt(Date.now());
"""
content = content.replace("""  const applySafeUpdate = (incoming: Canonical15mDecision, source: string = 'FIRESTORE') => {
    if (!incoming || !incoming.decisionId) return;""", heartbeat_logic)

# Make sure localUpdatedAt is returned
content = content.replace("refreshDecision: fetchFromServer\n  };", "refreshDecision: fetchFromServer,\n    localUpdatedAt\n  };")

with open("src/hooks/useCanonical15mDecision.ts", "w") as f:
    f.write(content)

print("Hook patched.")
