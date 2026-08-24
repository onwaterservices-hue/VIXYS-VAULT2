import re

with open('src/services/api.ts', 'r') as f:
    code = f.read()

pattern = r"export interface ApiSignalResponse \{\n  asset: string;\n  desk: string;\n  sampleSize: number;\n  minSamplesNeeded: number;\n  generatedAt: string;\n  disclaimer: string;\n  action: 'BUY_YES' \| 'BUY_NO' \| 'HOLD';\n  modelProbability: number \| null;\n  confidence\?: number;\n  kalshiImpliedProbability: number \| null;\n  edge: number \| null;\n  modelValidation\?: \{"

new_type = """export interface ApiSignalResponse {
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
  engineState?: 'MONITORING' | 'EVALUATING' | 'LOCKED' | 'SETTLED' | 'STALE';
  feedStatus?: 'LIVE' | 'DEGRADED' | 'STALE' | 'INVALID' | 'OFFLINE';
  lockEvaluation?: any;
  features?: any;
  modelValidation?: {"""

code = code.replace(pattern, new_type)

with open('src/services/api.ts', 'w') as f:
    f.write(code)

