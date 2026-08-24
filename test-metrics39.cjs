fetch('http://localhost:3000/api/signal/resolved-log?limit=500')
  .then(res => res.json())
  .then(data => {
    let resolved = data.recentResolved.filter(s => s.status === 'RESOLVED');
    console.log("Wins:", resolved.filter(s => s.wasCorrect && !s.dataSource).length);
    console.log("Losses:", resolved.filter(s => !s.wasCorrect && !s.dataSource).length);
  }).catch(console.error);
