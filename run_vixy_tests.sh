#!/bin/bash
set -e

export PORT=3010
export SESSION_SIGNING_SECRET=$(openssl rand -hex 32)
node dist/server.cjs > vixy_server.log 2>&1 &
SERVER_PID=$!

sleep 3
if ! curl -s http://localhost:$PORT/api/health > /dev/null; then
  echo "Server failed to start. Check vixy_server.log"
  kill $SERVER_PID
  exit 1
fi

echo "=== ENGINE TICK PROOF ==="
curl -s http://localhost:$PORT/api/cron/engine-tick > tick1.json
echo "TICK 1:"
cat tick1.json
sleep 2

curl -s http://localhost:$PORT/api/cron/engine-tick > tick2.json
echo "TICK 2:"
cat tick2.json
sleep 2

curl -s http://localhost:$PORT/api/cron/engine-tick > tick3.json
echo "TICK 3:"
cat tick3.json
sleep 2

echo "=== VIXY STATE POLLING ==="
for i in {1..5}; do
  date +%s
  curl -s -i http://localhost:$PORT/api/vixy/state > state$i.txt
  cat state$i.txt | grep -E "HTTP/|Cache-Control"
  cat state$i.txt | grep -o '^{.*' > state_json$i.json
  sleep 2
done

kill $SERVER_PID
