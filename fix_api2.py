import re

with open('src/services/api.ts', 'r') as f:
    code = f.read()

pattern = r"export interface ApiSignalResponse \{.*?\n  modelValidation\?: \{"
replacement = """export interface ApiSignalResponse {
  asset: string;
  desk: string;
  sampleSize: number;
  minSamplesNeeded: number;
  generatedAt: string;
  disclaimer: string;
  action: 'BUY_YES' | 'BUY_NO' | 'HOLD' | null;
  direction?: 'UP' | 'DOWN' | 'NEUTRAL' | null;
  modelProbability: number | null;
  confidence?: number | null;
  kalshiImpliedProbability: number | null;
  edge: number | null;
  edgePct?: number | null;
  latencyMs?: number;
  engineState?: 'MONITORING' | 'EVALUATING' | 'LOCKED' | 'SETTLED' | 'STALE';
  feedStatus?: 'LIVE' | 'DEGRADED' | 'STALE' | 'INVALID' | 'OFFLINE';
  lockEvaluation?: any;
  features?: any;
  modelValidation?: {"""

code = re.sub(pattern, replacement, code, flags=re.DOTALL)

with open('src/services/api.ts', 'w') as f:
    f.write(code)

