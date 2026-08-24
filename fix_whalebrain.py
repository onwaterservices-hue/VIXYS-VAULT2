import re

with open('src/components/brains/WhaleBrain.tsx', 'r') as f:
    content = f.read()

pattern = r'  useEffect\(\(\) => \{\n    const interval = setInterval\(\(\) => \{\n      const isBuy = Math\.random\(\).*?clearInterval\(interval\);\n  \}, \[selectedAsset\]\);'

replacement = r'''  useEffect(() => {
    let isMounted = true;
    async function fetchWhales() {
      try {
        const res = await fetch(`/api/whales?asset=${selectedAsset || 'BTC'}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data && data.orders) {
            const mappedMoves: WhaleMove[] = data.orders.map((o: any) => {
              const isBuy = o.action === 'BUY_SWEEP';
              return {
                id: o.id,
                sizeUSD: `${isBuy ? '+' : '-'}$${(o.sizeUSD / 1000000).toFixed(2)}M`,
                asset: o.asset,
                action: isBuy ? 'BOUGHT' : 'SOLD',
                venue: o.venue,
                confidence: o.impact === 'CRITICAL' ? 'INSTITUTIONAL' : o.impact === 'EXTREME' ? 'VERY HIGH' : 'HIGH',
                effect: isBuy ? 'Bullish' : 'Bearish',
                estimatedImpactMins: o.impact === 'CRITICAL' ? 15 : o.impact === 'EXTREME' ? 10 : 5,
                timeAgo: new Date(o.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                timestamp: o.timestamp,
              };
            });
            
            setWhaleEvents((prev) => {
              const prevIds = new Set(prev.map(p => p.id));
              const newItems = mappedMoves.filter(m => !prevIds.has(m.id));
              if (newItems.length > 0) {
                setIsFlashing(true);
                setTimeout(() => { if (isMounted) setIsFlashing(false) }, 800);
              }
              return [...newItems, ...prev].slice(0, 5);
            });
          }
        }
      } catch (err) {
        // Keep existing if failed
      }
    }
    
    fetchWhales();
    const interval = setInterval(fetchWhales, 8000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedAsset]);'''

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

content = re.sub(r'useState<WhaleMove\[\]>\(\[.*?\]\);', 'useState<WhaleMove[]>([]);', content, flags=re.DOTALL)

with open('src/components/brains/WhaleBrain.tsx', 'w') as f:
    f.write(content)
