fetch('http://localhost:3000/api/signal/resolved-log')
  .then(res => res.json())
  .then(data => console.log('recentResolved length:', data.recentResolved.length, 'stats:', data.stats))
  .catch(console.error);
