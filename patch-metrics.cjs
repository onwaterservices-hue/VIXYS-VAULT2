const fs = require('fs');
let code = fs.readFileSync('src/components/HistoricalAccuracy.tsx', 'utf8');

const target = `  const metrics = useMemo(() => {
    // 1. Authoritative filtered dataset
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

    // Diagnostic logging strictly adhering to authoritative calculation
    console.log('[VIXY_WINRATE]', {
      asset: "BTC",
      timeframe: "15M",
      resolved: totalLocks,
      wins,
      losses,
      noTrade: noTrades,
      pending: resolvedLog.filter(s => s.status === 'LOCKED').length,
      winRatePct: winRate,
      source: "AUTHORITATIVE_RESOLVED_LOCKS"
    });
    // Streak & Metrics
    const edgeSum = settled.reduce((acc, s) => acc + (s.edge || 5.5), 0);
    const avgEdge = settled.length > 0 ? edgeSum / settled.length : 0;
    
    const confSum = settled.reduce((acc, s) => acc + (s.confidence || 75), 0);
    const avgConf = settled.length > 0 ? confSum / settled.length : 0;
    
    let currentStreak = 0;
    let currentStreakType = 'NONE';
    let bestStreak = 0;
    let tempStreak = 0;
    
    // Chronological order (oldest to newest) to calc streaks
    const chrono = [...settled].reverse();
    for (const s of chrono) {
      if (s.wasCorrect) {
        tempStreak++;
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }
    
    // Reverse again for current streak (newest down)
    for (const s of settled) {
      if (currentStreakType === 'NONE') {
        currentStreakType = s.wasCorrect ? 'WIN' : 'LOSS';
        currentStreak = 1;
      } else if ((s.wasCorrect && currentStreakType === 'WIN') || (!s.wasCorrect && currentStreakType === 'LOSS')) {
        currentStreak++;
      } else {
        break;
      }
    }`;

const replacement = `  const metrics = useMemo(() => {
    // 1. DATASET A: FULL AUTHORITATIVE BTC 15M HISTORY
    const fullResolvedLocksMap = new Map();
    let noTrades = 0;
    let pending = 0;

    resolvedLog.forEach(s => {
      if (s.status === 'LOCKED') {
        pending++;
      }
      if (s.status === 'NO_TRADE' || s.status === 'SKIPPED' || s.status === 'CRITICALLY_INVALIDATED') {
        noTrades++;
      }

      const isBTC = s.asset === 'BTC' || s.ticker === 'BTC/USD' || (s.market && s.market.includes('BTC'));
      const is15M = (s.market && s.market.includes('15M')) || s.desk === '15m' || (s.intervalEnd && s.intervalStart && (new Date(s.intervalEnd).getTime() - new Date(s.intervalStart).getTime() === 15 * 60000));
      const isResolvedLock = s.status === 'RESOLVED' && s.id && s.id.includes('lock');
      const notSkip = s.status !== 'NO_TRADE' && s.status !== 'SKIPPED' && s.status !== 'CRITICALLY_INVALIDATED' && (!s.id || !s.id.includes('skip'));
      const notReplay = !s.isReplay && !s.isReplayed && !s.isDuplicate && !s.replayed && s.dataSource !== 'REPLAY' && s.dataSource !== 'COINBASE_KRAKEN_CASCADE';
      
      if (isBTC && is15M && isResolvedLock && notSkip && notReplay) {
        if (!fullResolvedLocksMap.has(s.intervalStart)) {
          fullResolvedLocksMap.set(s.intervalStart, s);
        }
      }
    });

    const fullResolvedLocks = Array.from(fullResolvedLocksMap.values())
      .sort((a, b) => new Date(b.resolvedAt || b.expiresAt || b.lockedAt || 0).getTime() - new Date(a.resolvedAt || a.expiresAt || a.lockedAt || 0).getTime());
    
    // Dataset A Metrics
    const totalLocks = fullResolvedLocks.length;
    const wins = fullResolvedLocks.filter(s => s.wasCorrect).length;
    const losses = totalLocks - wins;
    const winRate = totalLocks > 0 ? (wins / totalLocks) * 100 : 0;

    // 2. DATASET B: LAST 10 RESOLVED BTC 15M LOCKS
    const last10ResolvedLocks = fullResolvedLocks.slice(0, 10);
    const last10Wins = last10ResolvedLocks.filter(s => s.wasCorrect).length;
    const last10Total = last10ResolvedLocks.length;
    const last10WinRate = last10Total > 0 ? (last10Wins / last10Total) * 100 : 0;

    console.log('[DATA_SCOPE_VERIFICATION]', {
      FULL_RESOLVED_COUNT: totalLocks,
      LAST10_RESOLVED_COUNT: last10Total
    });

    // Dataset A Streak & Metrics
    const edgeSum = fullResolvedLocks.reduce((acc, s) => acc + (s.edge || 5.5), 0);
    const avgEdge = totalLocks > 0 ? edgeSum / totalLocks : 0;
    
    const confSum = fullResolvedLocks.reduce((acc, s) => acc + (s.confidence || 75), 0);
    const avgConf = totalLocks > 0 ? confSum / totalLocks : 0;
    
    let currentStreak = 0;
    let currentStreakType = 'NONE';
    let bestStreak = 0;
    let tempStreak = 0;
    
    // Chronological order (oldest to newest) to calc streaks from FULL dataset
    const chrono = [...fullResolvedLocks].reverse();
    for (const s of chrono) {
      if (s.wasCorrect) {
        tempStreak++;
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }
    
    // Reverse again for current streak (newest down)
    for (const s of fullResolvedLocks) {
      if (currentStreakType === 'NONE') {
        currentStreakType = s.wasCorrect ? 'WIN' : 'LOSS';
        currentStreak = 1;
      } else if ((s.wasCorrect && currentStreakType === 'WIN') || (!s.wasCorrect && currentStreakType === 'LOSS')) {
        currentStreak++;
      } else {
        break;
      }
    }`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/components/HistoricalAccuracy.tsx', code);
  console.log('Metrics replaced successfully');
} else {
  console.log('Could not find target block to replace!');
}
