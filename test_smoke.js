async function testSuite() {
  console.log("=== VIXY VAULT FINAL PRODUCTION SMOKE TEST ===\n");
  const API_URL = "http://localhost:3000/api";

  console.log("Setting up mock existing monthly subscriber...");
  await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "monthly@vixyvault.com", password: "password123", name: "Monthly User" })
  });
  
  await fetch(`${API_URL}/admin/users/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-user-email": "vixyvault0@gmail.com" },
    body: JSON.stringify({ userId: "monthly@vixyvault.com", subscription: "PRO_QUANT", status: "active" })
  });

  console.log("\n--- Test 1: Existing monthly subscriber ---");
  const loginRes1 = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "monthly@vixyvault.com", password: "password123" })
  });
  const loginData1 = await loginRes1.json();
  console.log("Login Result:", loginData1.success ? "SUCCESS" : "FAILED", loginData1.user?.role);
  
  const entRes1 = await fetch(`${API_URL}/entitlements?email=monthly@vixyvault.com&userId=${loginData1.user?.id || ''}`);
  const entData1 = await entRes1.json();
  console.log("Entitlement Active:", entData1.status === 'active');
  console.log("Plan:", entData1.plan);

  console.log("\n--- Test 2: August 15 Day Pass customer ---");
  const loginRes2 = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "ogershey@gmail.com", password: "newpassword!" })
  });
  const loginData2 = await loginRes2.json();
  console.log("Login Result:", loginData2.success ? "SUCCESS" : "FAILED", loginData2.user?.role);
  
  const entRes2 = await fetch(`${API_URL}/entitlements?email=ogershey@gmail.com&userId=${loginData2.user?.id || ''}`);
  const entData2 = await entRes2.json();
  console.log("Entitlement Active:", entData2.dayPass?.active);
  console.log("Expiration:", entData2.dayPass?.expiresAt);

  console.log("\n--- Test 3: Brand-new customer ---");
  console.log("Registering new customer...");
  await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "new_customer@vixyvault.com", password: "password123", name: "New Cust" })
  });
  
  await fetch(`${API_URL}/admin/users/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-user-email": "vixyvault0@gmail.com" },
    body: JSON.stringify({ userId: "new_customer@vixyvault.com", subscription: "STARTER", status: "active" })
  });

  const entRes3 = await fetch(`${API_URL}/entitlements?email=new_customer@vixyvault.com`);
  const entData3 = await entRes3.json();
  console.log("New Customer Entitlement Active:", entData3.status === 'active');
  console.log("Plan:", entData3.plan);

  console.log("\n--- Test 4: Discord broken ---");
  const resyncRes = await fetch(`${API_URL}/admin/resync-discord`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-user-email": "vixyvault0@gmail.com" },
    body: JSON.stringify({ identifier: "monthly@vixyvault.com" })
  });
  const resyncData = await resyncRes.json();
  console.log("Discord Resync Failed Gracefully:", !resyncData.success && resyncData.syncResult?.code === 'INVALID_BOT_TOKEN');
  
  const entRes4 = await fetch(`${API_URL}/entitlements?email=monthly@vixyvault.com`);
  const entData4 = await entRes4.json();
  console.log("Terminal remains unlocked (entitlement still active):", entData4.status === 'active');

  console.log("\n=== SMOKE TEST COMPLETE ===");
}
testSuite();
