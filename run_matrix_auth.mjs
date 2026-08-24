import fs from 'fs';
const fetch = globalThis.fetch;
async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
async function runTest() {
  const API_URL = 'http://localhost:3000/api';
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }
  
  console.log("\n=== AUTHENTICATION TEST MATRIX ===");

  await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'comp_user_v4@test.com', password: 'TestPassword123!', name: 'Comp User' })
  });
  
  await fetch(`${API_URL}/admin/strip-pwd`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'comp_user_v4@test.com' })
  });
  
  await wait(500); 
  
  const monthlyLogin = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'comp_user_v4@test.com', password: 'TestPassword123!' })
  }).then(r => r.json());
  
  assert(!monthlyLogin.success && monthlyLogin.error === 'ACCOUNT_NEEDS_PASSWORD' && monthlyLogin.needsPassword === true, "2. Login WITHOUT password -> returns ACCOUNT_NEEDS_PASSWORD");
  
  // Request token
  const reqToken = await fetch(`${API_URL}/auth/request-password-setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'comp_user_v4@test.com' })
  }).then(r => r.json());
  assert(reqToken.success === true, "Request password setup succeeds");

  // Read token from file
  const tokenData = JSON.parse(fs.readFileSync('data/latest_setup_token.json', 'utf8'));
  
  const initRes = await fetch(`${API_URL}/auth/initialize-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'comp_user_v4@test.com', password: 'NewPassword123!', token: tokenData.token })
  }).then(r => r.json());
  assert(initRes.success === true && initRes.user, "2.5 Initialize password succeeds and returns session");
  
  const compLoginAgain = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'comp_user_v4@test.com', password: 'NewPassword123!' })
  }).then(r => r.json());
  assert(compLoginAgain.success === true, "3. Same user logs in again -> normal login succeeds");

  const regExisting = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'comp_user_v4@test.com', password: 'HackerPassword123!', name: 'Hacker' })
  }).then(r => r.json());
  assert(regExisting.success === false && regExisting.error === 'USER_EXISTS' && regExisting.needsPassword === false, "5. Existing user WITH password registration -> USER_EXISTS + needsPassword: false");

  await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'comp_reg_v4@test.com', password: 'TestPassword123!', name: 'Comp Reg' })
  });
  await fetch(`${API_URL}/admin/strip-pwd`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'comp_reg_v4@test.com' })
  });
  
  await wait(500);

  const regNoPwd = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'comp_reg_v4@test.com', password: 'HackerPassword123!', name: 'Hacker' })
  }).then(r => r.json());
  assert(regNoPwd.success === false && regNoPwd.error === 'USER_EXISTS' && regNoPwd.needsPassword === true, "6. Existing user WITHOUT password registration -> USER_EXISTS + needsPassword: true");
  
  const noLogin = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nobody_v4@example.com', password: 'TestPassword123!' })
  }).then(r => r.json());
  assert(noLogin.success === false && noLogin.error === 'INVALID_CREDENTIALS', "7. Nonexistent account login fails -> INVALID_CREDENTIALS");

  console.log(`\nTESTS COMPLETE: ${passed} PASSED, ${failed} FAILED.`);
}
runTest().catch(console.error);
