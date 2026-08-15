fetch('http://localhost:3000/api/signal/resolved-log')
  .then(res => res.json())
  .then(data => {
    let resolvedLog = data.recentResolved;
    const settledMap = new Map();
    resolvedLog.forEach(s => {
      const isBTC = s.asset === 'BTC' || s.ticker === 'BTC/USD' || (s.market && s.market.includes('BTC'));
      const is15M = (s.market && s.market.includes('15M')) || s.desk === '15m' || (s.intervalEnd && s.intervalStart && (new Date(s.intervalEnd).getTime() - new Date(s.intervalStart).getTime() === 15 * 60000));
      const isResolvedLock = s.status === 'RESOLVED' && s.id && s.id.includes('lock');
      const notSkip = s.status !== 'NO_TRADE' && s.status !== 'SKIPPED' && s.status !== 'CRITICALLY_INVALIDATED' && (!s.id || !s.id.includes('skip'));
      const notReplay = !s.isReplay && !s.isReplayed && !s.isDuplicate && !s.replayed && s.dataSource !== 'REPLAY';
      if (isBTC && is15M && isResolvedLock && notSkip && notReplay) {
        if (!settledMap.has(s.intervalStart)) {
          settledMap.set(s.intervalStart, s);
        }
      }
    });
    
    const settled = Array.from(settledMap.values());
    const totalLocks = settled.length;
    const wins = settled.filter(s => s.wasCorrect).length;
    const losses = settled.length - wins;
    console.log(`LOCKS: ${totalLocks}, WINS: ${wins}, LOSSES: ${losses}, WIN RATE: ${(wins/totalLocks*100).toFixed(2)}%`);
  }).catch(console.error);
