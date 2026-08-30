#!/bin/bash
set -e

echo "=== BUILDING PRODUCTION ==="
npm run build > /dev/null 2>&1

echo "=== STARTING PRODUCTION SERVER ==="
export SESSION_SIGNING_SECRET=$(openssl rand -hex 32)
export PORT=3006
node dist/server.cjs > server.log 2>&1 &
SERVER_PID=$!

sleep 4
if ! curl -s http://localhost:$PORT/api/health > /dev/null; then
  echo "Server failed to start. Check server.log"
  kill $SERVER_PID
  exit 1
fi

echo "=== RUNNING TESTS ==="
TEST_EMAIL="prod_test_$$@example.com"
ADMIN_EMAIL="vixyvault0@gmail.com"
OLD_PASS="oldpassword123"
NEW_PASS="newpassword456"

# 1. Register test user
curl -s -X POST http://localhost:$PORT/api/auth/register \
-H "Content-Type: application/json" \
-d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$OLD_PASS\"}" > /dev/null

# 2. Login & Capture Cookie
LOGIN_RESP=$(curl -i -s -X POST http://localhost:$PORT/api/auth/login \
-H "Content-Type: application/json" \
-d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$OLD_PASS\"}")

if echo "$LOGIN_RESP" | grep -q "200 OK"; then
  echo "Login: PASS"
else
  echo "Login: FAIL"
fi

COOKIE=$(echo "$LOGIN_RESP" | grep -i "set-cookie:" | head -n 1 | cut -d ':' -f 2- | xargs)
COOKIE_VAL=$(echo "$COOKIE" | cut -d ';' -f 1)

echo "Cookie String: $COOKIE" | grep -q "Secure" && SECURE_PASS="PASS" || SECURE_PASS="FAIL"
echo "Cookie String: $COOKIE" | grep -q "HttpOnly" && HTTPONLY_PASS="PASS" || HTTPONLY_PASS="FAIL"
echo "Cookie String: $COOKIE" | grep -q "SameSite=Strict" && SAMESITE_PASS="PASS" || SAMESITE_PASS="FAIL"

if [ "$SECURE_PASS" == "PASS" ] && [ "$HTTPONLY_PASS" == "PASS" ] && [ "$SAMESITE_PASS" == "PASS" ]; then
  echo "Cookie Attributes: PASS"
else
  echo "Cookie Attributes: FAIL"
fi

# 3. Client Spoofing Blocked
SPOOF_RESP=$(curl -s -o /dev/null -w "%{http_code}" -X GET http://localhost:$PORT/api/admin/dump-users \
-H "x-user-email: $ADMIN_EMAIL" -H "x-admin-role: true")
if [ "$SPOOF_RESP" == "401" ] || [ "$SPOOF_RESP" == "403" ]; then
  echo "Client Spoofing Blocked: PASS"
else
  echo "Client Spoofing Blocked: FAIL (Code: $SPOOF_RESP)"
fi

# 4. Admin test (using the normal test user, should be rejected)
ADMIN_ROUTE_RESP=$(curl -s -o /dev/null -w "%{http_code}" -X GET http://localhost:$PORT/api/admin/dump-users \
-H "Cookie: $COOKIE_VAL")
if [ "$ADMIN_ROUTE_RESP" == "403" ]; then
  echo "Admin Route Security: PASS"
else
  echo "Admin Route Security: FAIL (Code: $ADMIN_ROUTE_RESP)"
fi

# 5. Forgot Password
curl -s -X POST http://localhost:$PORT/api/auth/forgot-password \
-H "Content-Type: application/json" \
-d "{\"email\":\"$TEST_EMAIL\"}" > /dev/null
sleep 2

TOKEN_JSON=$(curl -s http://localhost:$PORT/api/_test/token/$TEST_EMAIL)
TOKEN=$(echo "$TOKEN_JSON" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo "Token Generation: FAIL"
else
  echo "Token Generation: PASS"
fi

# 6. Reset Password
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
