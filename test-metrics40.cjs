fetch('http://localhost:3000/api/signal/resolved-log?limit=500')
  .then(res => res.json())
  .then(data => {
    let resolved = data.recentResolved.filter(s => s.status === 'RESOLVED');
    console.log("Unique dataSources:", Array.from(new Set(resolved.map(s => s.dataSource))));
    let notMock = resolved.filter(s => s.dataSource !== 'COINBASE_KRAKEN_CASCADE');
    console.log("Not mock Wins:", notMock.filter(s => s.wasCorrect).length);
    console.log("Not mock Losses:", notMock.filter(s => !s.wasCorrect).length);
  }).catch(console.error);
