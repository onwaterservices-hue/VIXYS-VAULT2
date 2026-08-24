import re

with open('src/components/brains/SignalBrain.tsx', 'r') as f:
    content = f.read()

# 1. Add calibration & data extraction
top_vars = """  const isProtectState = reversalRisk >= 50;
  const isCautionState = reversalRisk >= 30 && reversalRisk < 50;
  
  // lockDisplayMode maps to the 3 visual states described in the prompt
  const lockDisplayMode = isProtectState ? 'EXIT' : (isCautionState || showLockPassState) ? 'CAUTION' : 'LOCKED';

  const currentPrice = rawApiData?.features?.crossVenue?.spot || ticker?.price || 0;
  const targetPrice = Math.round(rawApiData?.features?.crossVenue?.kalshiStrike || signal?.targetPrice || 0);
  const displayConfidence = Math.round(currentConfidence);

  const calibrationStatus = rawApiData?.calibration?.calibrationStatus === 'ACTIVE' 
      ? 'CALIBRATED' 
      : (rawApiData?.calibration?.calibrationStatus || 'INSUFFICIENT SAMPLE');

  const displayOrderFlow = rawApiData?.features?.orderBookImbalance ?? 0;
  const orderFlowStr = displayOrderFlow > 0 ? `+${displayOrderFlow.toFixed(3)}` : displayOrderFlow.toFixed(3);
  
  const displayMomentum = rawApiData?.features?.momentum5m ?? 0;
  const momentumStr = displayMomentum > 0 ? `+${(displayMomentum * 100).toFixed(1)}` : (displayMomentum * 100).toFixed(1);
  
  const displayVolatility = rawApiData?.features?.volatility15m ?? 0;
  const volatilityStr = (displayVolatility * 100).toFixed(2);
  
  const displayDistance = rawApiData?.features?.crossVenue?.distance ?? 0;
  const distanceStr = displayDistance > 0 ? `+${Math.round(displayDistance)}` : `${Math.round(displayDistance)}`;
  
  const displayRegime = rawApiData?.features?.regime?.split('_')[0] || 'UNKNOWN';

  const takerBuyersPct = Math.max(0, Math.min(100, Math.round((displayOrderFlow + 1) * 50)));
  const takerSellersPct = 100 - takerBuyersPct;
"""

# Replace the block around lockDisplayMode
start_idx = content.find("const isProtectState = reversalRisk >= 50;")
end_idx = content.find("// Compute LAST 10 dots dynamically")

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + top_vars + "\n  " + content[end_idx:]

# 2. Replace hardcoded CALIBRATED in header
content = content.replace(
    '<span className="text-[8px] opacity-70 ml-1 font-normal">CALIBRATED</span>',
    '<span className="text-[8px] opacity-70 ml-1 font-normal">{calibrationStatus}</span>'
)
content = content.replace(
    '}`}>CALIBRATED</span>',
    '}`}>{calibrationStatus}</span>'
)

# 3. Replace hardcoded order flow strings
content = re.sub(
    r'\{rawApiData\?\.features\?\.orderBookImbalance >= 0 \? \'\+\' : \'\'\}\{rawApiData\?\.features\?\.orderBookImbalance\?\.toFixed\(3\) \|\| \'\+0\.400\'\}',
    '{orderFlowStr}',
    content
)

content = re.sub(
    r'\{rawApiData\?\.features\?\.orderBookImbalance >= 0 \? \'BULLISH\' : \'BEARISH\'\}',
    '{displayOrderFlow >= 0 ? \'BULLISH\' : \'BEARISH\'}',
    content
)

# 4. Replace hardcoded momentum strings
content = re.sub(
    r'\{rawApiData\?\.features\?\.momentum5m >= 0 \? \'\+\' : \'\'\}\{\(rawApiData\?\.features\?\.momentum5m \* 100\)\?\.toFixed\(1\) \|\| \'-68\.7\'\}%',
    '{momentumStr}%',
    content
)
content = re.sub(
    r'\{rawApiData\?\.features\?\.momentum5m >= 0 \? \'BULLISH\' : \'BEARISH\'\}',
    '{displayMomentum >= 0 ? \'BULLISH\' : \'BEARISH\'}',
    content
)
# Note: sometimes momentum just says 'STRONG' in earlier code, I'll update that if I find it.
content = content.replace(
    'STRONG\n               </div>',
    '{Math.abs(displayMomentum) > 0.4 ? \'STRONG\' : \'NEUTRAL\'}\n               </div>'
)

# 5. Replace volatility
content = re.sub(
    r'\{\(rawApiData\?\.features\?\.volatility15m \* 100\)\?\.toFixed\(2\) \|\| \'68\.90\'\}%',
    '{volatilityStr}%',
    content
)

# 6. Replace distance
content = re.sub(
    r'\{rawApiData\?\.features\?\.crossVenue\?\.distance > 0 \? \'\+\' : \'\'\}\{Math\.round\(rawApiData\?\.features\?\.crossVenue\?\.distance \|\| 24\)\}',
    '{distanceStr}',
    content
)

# 7. Replace regime
content = re.sub(
    r'\{rawApiData\?\.features\?\.regime\?\.split\(\'_\'\)\[0\] \|\| \'TRENDING\'\}',
    '{displayRegime}',
    content
)


# 8. Replace taker buyers/sellers in Order Flow module
# Wait, the Math.max(...) string is quite complex, let's use exact replace.
old_buyer_str = '{Math.max(0, Math.min(100, Math.round((Number(rawApiData?.features?.orderBookImbalance || signal?.confidence / 100 || 0.6) + 1) * 50)))}%'
content = content.replace(old_buyer_str, '{takerBuyersPct}%')

old_seller_str = '{100 - Math.max(0, Math.min(100, Math.round((Number(rawApiData?.features?.orderBookImbalance || signal?.confidence / 100 || 0.6) + 1) * 50)))}%'
content = content.replace(old_seller_str, '{takerSellersPct}%')

old_buyer_style = 'width: `${Math.max(0, Math.min(100, Math.round((Number(rawApiData?.features?.orderBookImbalance || signal?.confidence / 100 || 0.6) + 1) * 50)))}%`'
content = content.replace(old_buyer_style, 'width: `${takerBuyersPct}%`')

old_seller_style = 'width: `${100 - Math.max(0, Math.min(100, Math.round((Number(rawApiData?.features?.orderBookImbalance || signal?.confidence / 100 || 0.6) + 1) * 50)))}%`'
content = content.replace(old_seller_style, 'width: `${takerSellersPct}%`')

# For the delta text block
old_delta = '{Number(rawApiData?.features?.orderBookImbalance || 0.400).toFixed(3)}'
content = content.replace(old_delta, '{Math.abs(displayOrderFlow).toFixed(3)}')

old_delta_usd = '{Number(rawApiData?.features?.orderBookImbalance) >= 0 ? \'+\' : \'-\'}${Math.abs((Number(rawApiData?.features?.orderBookImbalance || 0.4) * 6.2)).toFixed(2)}M'
content = content.replace(old_delta_usd, '{displayOrderFlow >= 0 ? \'+\' : \'-\'}${Math.abs(displayOrderFlow * 6.2).toFixed(2)}M')

old_is_positive = 'Number(rawApiData?.features?.orderBookImbalance) >= 0'
content = content.replace(old_is_positive, 'displayOrderFlow >= 0')


# Make sure the current price formats correctly
content = content.replace(
    '${currentPrice.toLocaleString()}',
    '${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}'
)

with open('src/components/brains/SignalBrain.tsx', 'w') as f:
    f.write(content)
print("Patched!")
