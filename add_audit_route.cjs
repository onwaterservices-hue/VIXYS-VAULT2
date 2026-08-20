const fs = require('fs');
let code = fs.readFileSync('backend.ts', 'utf-8');

const route = `
// AUDIT ROUTE
app.get('/api/admin/audit-day-passes', (req, res) => {
  const passes = Array.from(userDayPasses.values());
  const users = serverUsers;
  res.json({
    dayPasses: passes,
    users: users.length,
    usersWithPass: passes.filter(p => users.find(u => u.email === p.email || u.id === p.userId)).length,
    graceAppliedCount: passes.filter(p => p.troubleshootingGraceApplied).length
  });
});
`;

if (!code.includes('/api/admin/audit-day-passes')) {
  code = code.replace(/app\.listen/, route + '\napp.listen');
  fs.writeFileSync('backend.ts', code);
}
