const fs = require('fs');
let code = fs.readFileSync('src/components/CryptoPredictionCenterView.tsx', 'utf8');

const targetStr = `{(canonicalDecision as any)?.aiExplanation ||
                'Strong momentum and improving order flow are supporting the current bullish structure. Buy-side taker absorption on Binance combined with Kalshi order book imbalance indicates high probability of continuation above $64,500.'}`;

code = code.replace(targetStr, '{evidenceSummary.dynamicExplanation}');
code = code.replace(/\{\(canonicalDecision as any\)\?\.aiExplanation \|\|\s*'Strong momentum and improving order flow are supporting the current bullish structure\. Buy-side taker absorption on Binance combined with Kalshi order book imbalance indicates high probability of continuation above \$64,500\.'\}/g, '{evidenceSummary.dynamicExplanation}');

fs.writeFileSync('src/components/CryptoPredictionCenterView.tsx', code);
