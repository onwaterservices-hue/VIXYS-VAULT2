const fs = require('fs');

// Fix ContextualRightRail.tsx
let uiCode1 = fs.readFileSync('src/components/vixyV2/ContextualRightRail.tsx', 'utf8');
uiCode1 = uiCode1.replace(
  /\{\(decision as any\)\?\.aiExplanation \|\|\s*'Strong momentum and improving order flow are supporting the current bullish structure\. Cross-venue alignment remains favorable while volatility remains controlled\.'\}/,
  '{evidenceSummary.dynamicExplanation}'
);
fs.writeFileSync('src/components/vixyV2/ContextualRightRail.tsx', uiCode1);

// Fix CryptoPredictionCenterView.tsx
let uiCode2 = fs.readFileSync('src/components/CryptoPredictionCenterView.tsx', 'utf8');
uiCode2 = uiCode2.replace(
  /\{\(decision as any\)\?\.aiExplanation \|\|\s*'Strong momentum and improving order flow are supporting the current bullish structure\. Buy-side taker absorption on Binance combined with Kalshi order book imbalance indicates high probability of continuation above \$64,500\.'\}/,
  '{evidenceSummary.dynamicExplanation}'
);
fs.writeFileSync('src/components/CryptoPredictionCenterView.tsx', uiCode2);
