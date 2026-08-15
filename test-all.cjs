const fs = require('fs');
// read backend.ts or whatever is exporting persistentSignalLogs
// actually we can just fetch without filter
fetch('http://localhost:3000/api/signal/resolved-log')
  .then(res => res.json())
  .then(data => {
    console.log(data.recentResolved.length);
  });
