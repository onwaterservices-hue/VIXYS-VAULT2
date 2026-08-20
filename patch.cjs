const fs = require('fs');
let code = fs.readFileSync('src/components/HistoricalAccuracy.tsx', 'utf8');

// Replace the metrics logic
const metricsRegex = /\/\/ 1\. Authoritative filtered dataset[\s\S]*?\/\/ Diagnostic logging strictly adhering to authoritative calculation/m;

const newMetrics = `// 1. Authoritative filtered dataset
    const settled = resolvedLog
      .filter(s => s.status === 'RESOLVED')
      .sort((a, b) => new Date(b.resolvedAt || b.expiresAt || b.lockedAt || 0).getTime() - new Date(a.resolvedAt || a.expiresAt || a.lockedAt || 0).getTime());
    
    // Total dataset metrics (Authoritative source)
    const totalLocks = backendStats ? backendStats.total : settled.length;
    const wins = backendStats ? backendStats.winCount : settled.filter(s => s.wasCorrect).length;
    const losses = backendStats ? backendStats.lossCount : settled.length - wins;
    const noTrades = backendStats ? (backendStats.excludedNoTrade || backendStats.skipped || 0) : resolvedLog.filter(s => s.status === 'CRITICALLY_INVALIDATED' || s.status === 'NO_TRADE' || s.status === 'SKIPPED').length;
    const winRate = backendStats ? backendStats.winRatePct : (totalLocks > 0 ? (wins / totalLocks) * 100 : 0);

    // Calculate Last 10 Wins Rate ONLY (Scoped derived metric)
    // - Exclude NO_TRADE, SKIP
    // - Include only resolved BUY UP / BUY DOWN locks (s.wasCorrect is a boolean so we can just check length)
    // - deduplicate by intervalStart to ensure we count 10 distinct cycles
    const recentUnique = new Map();
    for (const s of settled) {
      if (s.id && s.id.includes('lock') && !s.isReplay && !s.isReplayed && !s.isDuplicate && !s.replayed && s.dataSource !== 'REPLAY') {
         if (!recentUnique.has(s.intervalStart)) {
            recentUnique.set(s.intervalStart, s);
         }
      }
      if (recentUnique.size >= 10) break;
    }
    const recent10Settled = Array.from(recentUnique.values());
    const last10Wins = recent10Settled.filter(s => s.wasCorrect).length;
    const last10Total = recent10Settled.length;
    const last10WinRate = last10Total > 0 ? (last10Wins / last10Total) * 100 : 0;

    // Diagnostic logging strictly adhering to authoritative calculation`;

code = code.replace(metricsRegex, newMetrics);
fs.writeFileSync('src/components/HistoricalAccuracy.tsx', code);
console.log("Patched metrics.");
