import fs from 'fs';
const fetch = globalThis.fetch;
async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
async function runTest() {
  const API_URL = 'http://localhost:3000/api';
  console.log("Creating user...");
  await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'comp_user_v5@test.com', password: 'TestPassword123!', name: 'Comp User' })
  });
  console.log("Stripping pwd...");
  await fetch(`${API_URL}/admin/strip-pwd`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'comp_user_v5@test.com' })
  });
  await wait(500); 
  const monthlyLogin = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'comp_user_v5@test.com', password: 'TestPassword123!' })
  }).then(r => r.json());
  console.log("Login response:", monthlyLogin);
  
  const reqToken = await fetch(`${API_URL}/auth/request-password-setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'comp_user_v5@test.com' })
  }).then(r => r.json());
  console.log("Req token response:", reqToken);
}
runTest();
