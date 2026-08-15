fetch('http://localhost:3000/api/signal/resolved-log')
  .then(res => res.json())
  .then(data => {
    let resolvedLog = data.recentResolved;
    const sources = {};
    resolvedLog.forEach(s => {
      sources[s.dataSource] = (sources[s.dataSource] || 0) + 1;
    });
    console.log(sources);
  }).catch(console.error);
