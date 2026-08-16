const fs = require('fs');
let content = fs.readFileSync('backend.ts', 'utf8');

content = content.replace(
  "dayPassCount: serverDayPasses.size || userDayPasses?.size || 0,",
  "dayPassCount: userDayPasses?.size || 0,"
);

const dumpRoute = `
app.get('/api/admin/dump-users', (req, res) => {
  res.json({
    users: serverUsers,
    dayPasses: Array.from(userDayPasses.entries()),
    subscriptions: Array.from(userSubscriptions.entries())
  });
});
`;

if (!content.includes('/api/admin/dump-users')) {
  content = content.replace("app.get('/api/health/auth',", dumpRoute + "\\napp.get('/api/health/auth',");
}

fs.writeFileSync('backend.ts', content);
