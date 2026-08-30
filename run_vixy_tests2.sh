#!/bin/bash
set -e
export PORT=3011
export SESSION_SIGNING_SECRET=$(openssl rand -hex 32)
node dist/server.cjs > vixy_server2.log 2>&1 &
SERVER_PID=$!
sleep 3
if ! curl -s http://localhost:$PORT/api/health > /dev/null; then exit 1; fi

for i in {1..5}; do
  curl -s http://localhost:$PORT/api/cron/engine-tick > /dev/null
  curl -s http://localhost:$PORT/api/vixy/state | grep -o '^{.*' > state_json$i.json
  sleep 2
done
kill $SERVER_PID
