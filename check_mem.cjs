fetch("http://localhost:3000/api/admin/users", {
  headers: { "x-user-email": "vixyvault0@gmail.com", "x-user-role": "OWNER" }
}).then(r => r.json()).then(data => {
  const s = data.users.find(u => u.email === "sergioaddiaz1711@icloud.com");
  console.log("Sergio in mem:", s);
}).catch(console.error);
