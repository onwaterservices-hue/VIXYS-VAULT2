fetch("http://localhost:3000/api/admin/system/diagnostics", {
  headers: { "x-user-email": "vixyvault0@gmail.com", "x-user-role": "OWNER" }
}).then(r => r.json()).then(data => {
  console.log(data);
}).catch(console.error);
