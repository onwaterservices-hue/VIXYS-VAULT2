const fs = require('fs');
let content = fs.readFileSync('src/components/HistoricalAccuracy.tsx', 'utf8');

const oldFilter = `      const assetLogs = resolvedLog.filter(s => {
        const ticker = s.ticker || (s.market ? (s.market.includes(asset) ? asset : 'BTC') : 'BTC');
        return ticker.toUpperCase() === asset;
      });`;

const newFilter = `      const assetLogs = resolvedLog.filter(s => {
        const tickerStr = s.ticker || s.market || 'BTC';
        const baseAsset = tickerStr.split('/')[0].toUpperCase();
        return baseAsset === asset;
      });`;

if (content.includes(oldFilter)) {
    content = content.replace(oldFilter, newFilter);
    fs.writeFileSync('src/components/HistoricalAccuracy.tsx', content);
    console.log("Fixed assetMatrix filter logic.");
} else {
    console.log("Could not find old filter logic.");
}
