fetch('http://localhost:3000/api/signal/resolved-log')
  .then(res => res.json())
  .then(data => {
    let all = data.recentResolved;
    let resolved = all.filter(s => s.status === 'RESOLVED');
    console.log("total RESOLVED length in backend API response:", resolved.length);
    console.log("Wins:", resolved.filter(s => s.wasCorrect).length);
    console.log("Losses:", resolved.filter(s => !s.wasCorrect).length);
    
    // Count without 'dataSource' 
    let withoutDs = resolved.filter(s => !s.dataSource);
    console.log("Without dataSource wins:", withoutDs.filter(s => s.wasCorrect).length, "losses:", withoutDs.filter(s => !s.wasCorrect).length);
    
    // Check if there are non BTC
    console.log("non BTC:", resolved.filter(s => s.market !== 'BTC_KALSHI_15M').length);

    // What if we deduplicate by ID?
    let deduped = new Map();
    resolved.forEach(s => deduped.set(s.id, s));
    let ds = Array.from(deduped.values());
    console.log("Deduped by ID wins:", ds.filter(s => s.wasCorrect).length, "losses:", ds.filter(s => !s.wasCorrect).length);
  }).catch(console.error);
