const fs = require('fs');
let c = fs.readFileSync('backend.ts', 'utf8');

if (!c.includes('// SELF-PING TO PREVENT CLOUD RUN FROM SLEEPING')) {
  c = c.replace(
    'AutomationScheduler.startScheduler();',
    `AutomationScheduler.startScheduler();\n\n  // SELF-PING TO PREVENT CLOUD RUN FROM SLEEPING\n  setInterval(() => {\n    fetch(\`http://localhost:\${PORT}/api/live-engine/health\`).catch(()=>{});\n    fetch(\`https://ais-pre-jaykgbpizhmicd5s6v3kng-703042285146.us-east1.run.app/api/live-engine/health\`).catch(()=>{});\n  }, 45000);`
  );
  fs.writeFileSync('backend.ts', c);
}
