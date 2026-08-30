export PORT=3005
curl -s -o /dev/null -w "%{http_code}" -X GET http://localhost:$PORT/api/admin/dump-users \
-H "x-user-email: vixyvault0@gmail.com" -H "x-admin-role: true"
