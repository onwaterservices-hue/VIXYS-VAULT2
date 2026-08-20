import re

with open('src/components/LiveDashboard.tsx', 'r') as f:
    code = f.read()

code = code.replace("import { fetchPrediction, fetchLiveSignalData } from '../services/api';", "import { fetchPrediction } from '../services/api';\nimport { useLiveSignal } from '../hooks/useLiveSignal';")

pattern = r"  // Poll backend prediction engine signal & lock evaluation every 2 seconds\n  useEffect\(\(\) => \{\n.*?\}, \[selectedAsset, timeframe\]\);"

new_code = """  // Synchronize with global live signal hook
  const { signal: liveApiData } = useLiveSignal(selectedAsset || 'BTC', timeframe === '1H' ? '1h' : '15m');
  
  useEffect(() => {
    if (!liveApiData) return;
    const data = liveApiData;
    
    if (data.latencyMs !== undefined) setLatencyMs(data.latencyMs);
    setRawApiData(data);
    if (data.engineState) setEngineState(data.engineState);
    if (data.feedStatus) setFeedStatus(data.feedStatus);
    if (data.lockEvaluation) setLockEvaluation(data.lockEvaluation);

    if (data.direction) {
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
          bestEdgeValue: newBestEdge
        };
      });
    }
  }, [liveApiData]);"""

code = re.sub(pattern, new_code, code, flags=re.DOTALL)

with open('src/components/LiveDashboard.tsx', 'w') as f:
    f.write(code)

