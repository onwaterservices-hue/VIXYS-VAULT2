const fetch = globalThis.fetch;
async function run() {
  const compLogin = await fetch("http://localhost:3000/api/auth/login", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'comp_user_no_pwd@test.com', password: 'TestPassword123!' })
  }).then(r => r.json());
  console.log(compLogin);
}
run();
