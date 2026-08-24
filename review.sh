for file in InstitutionalIntelRadar.tsx ProtectionBrain.tsx VixyProtectionSummary.tsx WhaleBrain.tsx SignalBrain.tsx OrderFlowPressure.tsx AiThinkingBrain.tsx ExecutionBrain.tsx; do
  echo "--- $file ---"
  grep -A 2 -B 2 "bg-\[" src/components/brains/$file | head -n 10
done
