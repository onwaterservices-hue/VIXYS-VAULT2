import re

with open('src/components/LiveDashboard.tsx', 'r') as f:
    content = f.read()

pattern = r'        if \(data\.direction\) \{.*?bestEdgeValue:\s*data\.edgePct !== undefined \? Math\.abs\(data\.edgePct\) : prev\.bestEdgeValue,\n          \}\)\);\n        \}'

replacement = r'''        if (data.direction) {
          const isBull = data.direction === 'UP';
          const validKalshiProb = Number.isFinite(data.kalshiImpliedProbability) ? data.kalshiImpliedProbability : 0.54;
          const kalshiProbPct = Math.round(validKalshiProb * 1000) / 10;
          
          if (Number.isFinite(data.features?.crossVenue?.timeRemainingSec)) {
            setSecondsRemaining15M(data.features.crossVenue.timeRemainingSec);
          }
          
          setSignal((prev) => {
            const newConfidence = Number.isFinite(data.confidence) ? data.confidence : prev.confidence;
            const newModelProb = Number.isFinite(data.modelProbability) ? Math.round(data.modelProbability * 1000) / 10 : prev.modelProb;
            const newEdgePct = Number.isFinite(data.edgePct) ? data.edgePct : prev.edgePct;
            const newTargetPrice = Number.isFinite(data.features?.crossVenue?.kalshiStrike) ? data.features.crossVenue.kalshiStrike : prev.targetPrice;
            
            return {
              ...prev,
              timestamp: Date.now(),
              direction: isBull ? 'YES' : 'NO',
              confidence: newConfidence,
              modelProb: newModelProb,
              marketProb: kalshiProbPct,
              edgePct: newEdgePct,
              targetPrice: newTargetPrice,
            };
          });
          
          setVenueOdds((prev) => {
            const newBestEdge = Number.isFinite(data.edgePct) ? Math.abs(data.edgePct) : prev.bestEdgeValue;
            return {
              ...prev,
              kalshiYesPrice: Math.round(validKalshiProb * 100) / 100,
              kalshiNoPrice: Math.round((1 - validKalshiProb) * 100) / 100,
              polymarketYesPct: Math.round((validKalshiProb - 0.02) * 1000) / 10,
              polymarketNoPct: Math.round((1 - (validKalshiProb - 0.02)) * 1000) / 10,
              bestEdgeValue: newBestEdge,
            };
          });
        }'''

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('src/components/LiveDashboard.tsx', 'w') as f:
    f.write(content)
