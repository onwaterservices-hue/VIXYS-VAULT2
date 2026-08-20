fetch('http://localhost:3000/api/signal/resolved-log')
  .then(res => res.json())
  .then(data => {
    let all = data.recentResolved;
    let resolved = all.filter(s => s.status === 'RESOLVED');
    console.log("total RESOLVED length in backend API response:", resolved.length);
    let ds = Array.from(new Map(resolved.map(s => [s.id, s])).values());
    console.log("Deduped total:", ds.length);
    console.log("Wins:", ds.filter(s => s.wasCorrect).length, "Losses:", ds.filter(s => !s.wasCorrect).length);
    let noSrc = ds.filter(s => !s.dataSource);
    console.log("No source Wins:", noSrc.filter(s => s.wasCorrect).length, "Losses:", noSrc.filter(s => !s.wasCorrect).length);
  }).catch(console.error);
