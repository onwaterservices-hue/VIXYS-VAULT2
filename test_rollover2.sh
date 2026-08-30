#!/bin/bash
set -e
export PORT=3013
export SESSION_SIGNING_SECRET=$(openssl rand -hex 32)
node dist/server.cjs > vixy_rollover2.log 2>&1 &
SERVER_PID=$!
sleep 3

echo "--- TICK 1 (Normal) ---"
curl -s "http://localhost:$PORT/api/cron/engine-tick"
echo ""
curl -s "http://localhost:$PORT/api/vixy/state" | grep -o '"cycleId":"[^"]*"'

echo "--- TICK 2 (Jump 16 mins) ---"
OFFSET=$((16 * 60 * 1000))
curl -s "http://localhost:$PORT/api/cron/engine-tick?offset=$OFFSET"
echo ""
curl -s "http://localhost:$PORT/api/vixy/state" | grep -o '"cycleId":"[^"]*"'

echo "--- TICK 3 (Duplicate cron invocation - should not change cycle) ---"
curl -s "http://localhost:$PORT/api/cron/engine-tick?offset=$OFFSET"
echo ""
curl -s "http://localhost:$PORT/api/vixy/state" | grep -o '"cycleId":"[^"]*"'

kill $SERVER_PID
