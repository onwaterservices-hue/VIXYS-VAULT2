import re

with open('server.ts', 'r') as f:
    code = f.read()

# Make them global variables or add them to the telemetry observation
pattern_globals = r"let currentDirection: 'UP' \| 'DOWN' \| 'NEUTRAL' = 'UP';\nlet currentConfidence = 88.5;"
replacement_globals = """let currentDirection: 'UP' | 'DOWN' | 'NEUTRAL' = 'UP';
let currentConfidence = 88.5;
let currentBullVolumePct = 50;
let currentMomentum = 0;
"""
code = code.replace(pattern_globals, replacement_globals)

pattern_calc = r"const bullVolumePct = Math\.min\(90, Math\.max\(20, Math\.round\(55 \+ change24h \* 1\.5\)\)\);"
replacement_calc = """const bullVolumePct = Math.min(90, Math.max(20, Math.round(55 + change24h * 1.5)));
    currentBullVolumePct = bullVolumePct;
    currentMomentum = change24h;"""
code = code.replace(pattern_calc, replacement_calc)

pattern_features = r"features: isLive \? \{\n      asset,\n      desk,\n      orderBookImbalance: 0\.184,\n      momentum5m: 0\.0032,\n      momentum15m: 0\.0085,\n      volatility15m: 0\.0041,\n      crossVenue: {"
replacement_features = """features: isLive ? {
      asset,
      desk,
      orderBookImbalance: Math.round((currentBullVolumePct - 50) * 0.1 * 1000) / 1000,
      momentum5m: Math.round(currentMomentum * 1000) / 1000,
      momentum15m: Math.round(currentMomentum * 1.2 * 1000) / 1000,
      volatility15m: Math.round((Math.abs(currentMomentum) + 0.002) * 1000) / 1000,
      regime: serverLearningEngine.currentRegime,
      crossVenue: {"""
code = re.sub(pattern_features, replacement_features, code, flags=re.DOTALL)

with open('server.ts', 'w') as f:
    f.write(code)

