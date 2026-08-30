with open("src/hooks/useCanonical15mDecision.ts", "r") as f:
    content = f.read()

target = """  // REST API Polling (Authoritative Live Source every 3 seconds)
  const fetchFromServer = async () => {
    try {
      const data = await safeFetchJson<Canonical15mDecision>(`/api/vixy/15m/current?_t=${Date.now()}`);
      if (data && data.decisionId) {"""

replacement = """  // REST API Polling (Authoritative Live Source every 3 seconds)
  const fetchFromServer = async () => {
    try {
      const data = await safeFetchJson<Canonical15mDecision>(`/api/vixy/15m/current?_t=${Date.now()}`);
      
      if (data && (data as any).status === 'STALE') {
        setDataHealthStatus('STALE');
        setFeedError((data as any).message || 'Stale market data');
        return;
      }

      if (data && data.decisionId) {"""

if target in content:
    content = content.replace(target, replacement)
    with open("src/hooks/useCanonical15mDecision.ts", "w") as f:
        f.write(content)
    print("Patched useCanonical15mDecision.ts")
else:
    print("Target not found in useCanonical15mDecision.ts")
