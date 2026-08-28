fetch("http://localhost:3000/api/admin/system/diagnostics", {
  headers: { "x-user-email": "vixyvault0@gmail.com", "x-user-role": "OWNER" }
}).then(r => r.text()).then(t => console.log(t.substring(0, 50))).catch(console.error);
