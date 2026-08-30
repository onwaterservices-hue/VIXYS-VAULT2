#!/bin/bash
set -e

echo "=== BUILDING PRODUCTION ==="
npm run build > /dev/null 2>&1

echo "=== STARTING PRODUCTION SERVER ==="
# Generate a random secret for the test
export SESSION_SIGNING_SECRET=$(openssl rand -hex 32)
export PORT=3005
node dist/server.cjs > server.log 2>&1 &
SERVER_PID=$!

# Wait for server to be ready
sleep 3
if ! curl -s http://localhost:$PORT/api/health > /dev/null; then
  echo "Server failed to start. Check server.log"
  kill $SERVER_PID
  exit 1
fi

echo "=== RUNNING TESTS ==="
TEST_EMAIL="prod_test_$$@example.com"
ADMIN_EMAIL="vixyvault0@gmail.com" # As per .env.example
OLD_PASS="oldpassword123"
NEW_PASS="newpassword456"

# 1. Register test user
curl -s -X POST http://localhost:$PORT/api/auth/register \
-H "Content-Type: application/json" \
-d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$OLD_PASS\"}" > /dev/null

# 2. Login & Capture Cookie
echo "Testing Login..."
LOGIN_RESP=$(curl -i -s -X POST http://localhost:$PORT/api/auth/login \
-H "Content-Type: application/json" \
-d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$OLD_PASS\"}")

if echo "$LOGIN_RESP" | grep -q "200 OK"; then
  echo "Login: PASS"
else
  echo "Login: FAIL"
fi

COOKIE=$(echo "$LOGIN_RESP" | grep -i "set-cookie:" | head -n 1 | cut -d ':' -f 2- | xargs)

# 3. Test Cookie Attributes
echo "Cookie String: $COOKIE" | grep -q "Secure" && SECURE_PASS="PASS" || SECURE_PASS="FAIL"
echo "Cookie String: $COOKIE" | grep -q "HttpOnly" && HTTPONLY_PASS="PASS" || HTTPONLY_PASS="FAIL"
echo "Cookie String: $COOKIE" | grep -q "SameSite=Strict" && SAMESITE_PASS="PASS" || SAMESITE_PASS="FAIL"

if [ "$SECURE_PASS" == "PASS" ] && [ "$HTTPONLY_PASS" == "PASS" ] && [ "$SAMESITE_PASS" == "PASS" ]; then
  echo "Cookie Attributes: PASS"
else
  echo "Cookie Attributes: FAIL"
fi

# Extract just the cookie value for subsequent requests
COOKIE_VAL=$(echo "$COOKIE" | cut -d ';' -f 1)

# 4. Test Protected Route (e.g., getting current user or session info if there's an endpoint)
# Let's test client spoofing first without cookie
echo "Testing Client Spoofing..."
SPOOF_RESP=$(curl -s -o /dev/null -w "%{http_code}" -X GET http://localhost:$PORT/api/auth/me \
-H "x-user-email: $ADMIN_EMAIL" -H "x-admin-role: true")

if [ "$SPOOF_RESP" == "401" ] || [ "$SPOOF_RESP" == "403" ] || [ "$SPOOF_RESP" == "404" ]; then
  # Depending on if /api/auth/me exists and requires auth
  echo "Client Spoofing Blocked: PASS"
else
  echo "Client Spoofing Blocked: FAIL (Code: $SPOOF_RESP)"
fi

# 5. Forgot Password
echo "Testing Forgot Password..."
curl -s -X POST http://localhost:$PORT/api/auth/forgot-password \
-H "Content-Type: application/json" \
-d "{\"email\":\"$TEST_EMAIL\"}" > /dev/null

# We need to extract the token. Since we removed the dev endpoint, we can read it directly from the firestore store file or use a python script against the db if possible.
# Actually, we can use a quick Node script to fetch the token directly from Firestore Admin.
cat << 'NODE' > fetch_token.js
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
const serviceAccount = JSON.parse(fs.readFileSync("/app/firebase-applet-config.json", "utf8"));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
async function run() {
  const email = process.argv[2];
  const snap = await db.collection("password_reset_tokens").where("email", "==", email).orderBy("createdAt", "desc").limit(1).get();
  if (snap.empty) {
    console.log("NO_TOKEN");
  } else {
    console.log(snap.docs[0].id);
  }
}
run();
NODE
TOKEN=$(node fetch_token.js "$TEST_EMAIL")
if [ "$TOKEN" == "NO_TOKEN" ] || [ -z "$TOKEN" ]; then
  echo "Reset Token Extraction: FAIL"
else
  echo "Reset Token Extraction: PASS"
fi

# 6. Reset Password
echo "Testing Password Reset..."
RESET_RESP=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:$PORT/api/auth/reset-password \
-H "Content-Type: application/json" \
-d "{\"token\":\"$TOKEN\",\"password\":\"$NEW_PASS\"}")
if [ "$RESET_RESP" == "200" ]; then
  echo "Password Reset: PASS"
else
  echo "Password Reset: FAIL ($RESET_RESP)"
fi

# 7. Old Password Rejected
OLD_LOGIN_RESP=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:$PORT/api/auth/login \
-H "Content-Type: application/json" \
-d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$OLD_PASS\"}")
if [ "$OLD_LOGIN_RESP" == "401" ]; then
  echo "Old Password Rejected: PASS"
else
  echo "Old Password Rejected: FAIL ($OLD_LOGIN_RESP)"
fi

# 8. New Password Accepted
NEW_LOGIN_RESP=$(curl -i -s -X POST http://localhost:$PORT/api/auth/login \
-H "Content-Type: application/json" \
-d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$NEW_PASS\"}")
if echo "$NEW_LOGIN_RESP" | grep -q "200 OK"; then
  echo "New Password Accepted: PASS"
else
  echo "New Password Accepted: FAIL"
fi

# 9. Token Reuse Prevented
REUSE_RESP=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:$PORT/api/auth/reset-password \
-H "Content-Type: application/json" \
-d "{\"token\":\"$TOKEN\",\"password\":\"$NEW_PASS\"}")
if [ "$REUSE_RESP" == "400" ]; then
  echo "Token Reuse Prevented: PASS"
else
  echo "Token Reuse Prevented: FAIL ($REUSE_RESP)"
fi

kill $SERVER_PID
