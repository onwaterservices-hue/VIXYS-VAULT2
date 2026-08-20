import re

with open("src/components/VixyLiveView.tsx", "r") as f:
    content = f.read()

# Replace AuthoritativeState type
old_type = "export type AuthoritativeState = 'ANALYZING' | 'LOCKED — UP' | 'LOCKED — DOWN' | 'PROTECTED' | 'SKIP — NO TRADE' | 'RESOLVED';"
new_type = "export type AuthoritativeState = 'CALIBRATING' | 'BUILDING UP' | 'BUILDING DOWN' | 'LOCKED UP' | 'LOCKED DOWN' | 'REASSESSING' | 'RESOLVED';"
content = content.replace(old_type, new_type)

# Replace AuthoritativeState logic
old_logic = """  let authoritativeState: AuthoritativeState = 'ANALYZING';
  if (canonical15m.currentState === 'LOCKED_UP') {
    authoritativeState = 'LOCKED — UP';
  } else if (canonical15m.currentState === 'LOCKED_DOWN') {
    authoritativeState = 'LOCKED — DOWN';
  } else if (canonical15m.currentState === 'SKIP') {
    authoritativeState = 'SKIP — NO TRADE';
  } else if (canonical15m.currentState === 'PROTECTED') {
    authoritativeState = 'PROTECTED';
  } else if (canonical15m.currentState === 'SETTLED') {
    authoritativeState = 'RESOLVED';
  } else {
    authoritativeState = 'ANALYZING';
  }"""

new_logic = """  let authoritativeState: AuthoritativeState = 'CALIBRATING';
  
  // Real-time VIXY LIVE state machine (completely independent of normal dashboard SKIP)
  const elapsedSec = 900 - canonical15m.timeRemainingSec;
  const isStale = (Date.now() - (canonical15m.updatedAt ? new Date(canonical15m.updatedAt).getTime() : Date.now())) > 25000;
  
  if (canonical15m.currentState === 'SETTLED') {
    authoritativeState = 'RESOLVED';
  } else if (isStale) {
    authoritativeState = 'REASSESSING';
  } else if (canonical15m.currentState === 'LOCKED_UP') {
    authoritativeState = 'LOCKED UP';
  } else if (canonical15m.currentState === 'LOCKED_DOWN') {
    authoritativeState = 'LOCKED DOWN';
  } else if (canonical15m.protection.protectionStatus === 'VETOED' || canonical15m.reversalRisk > 45) {
    authoritativeState = 'REASSESSING';
  } else if (elapsedSec < 15) {
    authoritativeState = 'CALIBRATING';
  } else {
    // Determine building direction from underlying probabilities
    const pUp = canonical15m.gemini?.upProbability || 0;
    const pDown = canonical15m.gemini?.downProbability || 0;
    
    if (canonical15m.direction === 'UP' || pUp > pDown + 0.05) {
      authoritativeState = 'BUILDING UP';
    } else if (canonical15m.direction === 'DOWN' || pDown > pUp + 0.05) {
      authoritativeState = 'BUILDING DOWN';
    } else {
      authoritativeState = 'CALIBRATING';
    }
  }"""
content = content.replace(old_logic, new_logic)

with open("src/components/VixyLiveView.tsx", "w") as f:
    f.write(content)

print("Patched VixyLiveView.tsx states!")
