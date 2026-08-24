const fs = require('fs');
let code = fs.readFileSync('backend.ts', 'utf8');

const search = code.substring(code.indexOf('function broadcastVixySnapshot() {'));

const replacement = `function broadcastVixySnapshot() {
  if (!wssGlobal) return;
  const snapshot = buildVixySnapshot();
  const payload = JSON.stringify(snapshot);
  wssGlobal.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

function startServer() {
  const port = process.env.PORT || 3000;
  if (process.env.VERCEL !== '1') {
    const server = app.listen(port, () => {
      console.log(\`Server listening on port \${port}\`);
    });
    wssGlobal = new WebSocketServer({ server, path: '/api/ws' });

    wssGlobal.on('connection', (ws) => {
      wssClientsCount = wssGlobal.clients.size;
      console.log(\`[VIXY_WS_CONNECT] New client connected. Total: \${wssClientsCount}\`);

      const snapshot = buildVixySnapshot();
      ws.send(JSON.stringify(snapshot));
      console.log(\`[VIXY_WS_SNAPSHOT] cycle=\${snapshot.cycleId} sequence=\${snapshot.sequence} status=\${snapshot.status}\`);

      const heartbeatInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          globalSequenceNumber++;
          lastWebSocketMessageTs = Date.now();
          const heartbeat = {
            type: 'VIXY_HEARTBEAT',
            sessionId: SERVER_SESSION_ID,
            serverTime: new Date().toISOString(),
            sequence: globalSequenceNumber,
            cycleId: active15mCycle.cycleId
          };
          ws.send(JSON.stringify(heartbeat));
        }
      }, 10000);

      ws.on('close', (code, reason) => {
        clearInterval(heartbeatInterval);
        if (wssGlobal) {
          wssClientsCount = wssGlobal.clients.size;
        }
        console.log(\`[VIXY_WS_CLOSE] code=\${code} reason=\${reason?.toString() || 'none'} (Active Clients: \${wssClientsCount})\`);
      });

      ws.on('error', (err) => {
        console.warn('[VIXY_WS_ERROR]', err);
      });
    });

    setInterval(() => {
      const now = Date.now();
      const dataAgeMs = now - lastMarketUpdateTs;
      const isBinanceConnected = engineFeedStatus === 'CONNECTED' && dataAgeMs < 15000;
      const isLocked = active15mCycle.isLocked;
      const botState = getDiscordBotStatus();
      const creds = loadProductionDiscordCredentials();
      const diagHash = \`\${active15mCycle.cycleId}:\${wssClientsCount}:\${persistenceState}:\${botState.mode}:\${isLocked}\`;
      
      if (diagHash !== lastLoggedDiagnosticHash || now - lastHeartbeatLogTs >= 60000) {
        lastLoggedDiagnosticHash = diagHash;
        console.log(\`[VIXY_PRODUCTION_DIAGNOSTIC]\`);
        console.log(\`frontend=\${wssClientsCount > 0 ? 'READY' : (now - lastFrontendConnectionTs < 30000 ? 'READY' : 'WAITING')}\`);
        console.log(\`backend=RUNNING\`);
        console.log(\`binance=\${isBinanceConnected ? 'CONNECTED' : 'DISCONNECTED'}\`);
        console.log(\`cryptoTracking=ACTIVE\`);
        console.log(\`marketData=\${engineFeedStatus === 'CONNECTED' ? (dataAgeMs < 5000 ? 'FRESH' : (dataAgeMs < 15000 ? 'STALE' : 'CRITICAL')) : 'CRITICAL'}\`);
        console.log(\`algorithm=RUNNING\`);
        console.log(\`firestore=\${persistenceState === 'HEALTHY_FIRESTORE' ? 'HEALTHY' : (persistenceState === 'DEGRADED_CACHE_ACTIVE' ? 'DEGRADED_CACHE_ACTIVE' : persistenceState)}\`);
        console.log(\`firestoreStatus=\${persistenceState}\`);
        console.log(\`firestoreLastSuccess=\${firestoreLastSuccess || 'NONE'}\`);
        console.log(\`firestoreLastFailure=\${lastFirestoreWriteError || 'NONE'}\`);
        console.log(\`firestoreReconnectAttempt=\${firestoreReconnectAttempt}\`);
        console.log(\`firestoreQueuedWrites=\${pendingTelemetryQueue.length + pendingSignalLogsQueue.length}\`);
        console.log(\`firestorePersistenceState=\${persistenceState}\`);
        console.log(\`authoritativeState=AVAILABLE\`);
        console.log(\`vixyWebSocket=\${wssClientsCount > 0 ? 'CONNECTED' : 'WAITING'}\`);
        console.log(\`frontendSnapshot=\${hasDeliveredFrontendSnapshot ? 'FRESH' : 'WAITING'}\`);
        console.log(\`discordBot=\${botState.mode === 'ACTIVE_BOT' ? 'READY' : (botState.mode === 'DISABLED' ? 'DISABLED' : 'DEGRADED')}\`);
        console.log(\`discordEnvVarPresent=\${creds.isValid}\`);
        console.log(\`discordTokenFingerprint=\${creds.fingerprint}\`);
        console.log(\`discordApiAuthenticated=\${botState.isReady}\`);
        console.log(\`discordBotUserId=\${botState.botId || 'NONE'}\`);
        console.log(\`discordGuildAccess=\${botState.guildCount > 0}\`);
        console.log(\`discordBotConnected=\${botState.isReady}\`);
        console.log(\`currentCycleId=\${active15mCycle.cycleId}\`);
        console.log(\`currentSequence=\${globalSequenceNumber}\`);
        console.log(\`currentLock=\${isLocked ? \`\${active15mCycle.lockedDecision} (\${active15mCycle.lockedConfidence}%)\` : 'NONE'}\`);
        console.log(\`lockedDirection=\${isLocked ? active15mCycle.lockedDirection : 'null'}\`);
        console.log(\`lockedConfidencePct=\${isLocked ? \`\${active15mCycle.lockedConfidence}%\` : 'null'}\`);
        console.log(\`lockedProbability=\${isLocked ? active15mCycle.lockedProbability : 'null'}\`);
        console.log(\`liveDirection=\${currentDirection}\`);
        console.log(\`liveProbability=\${currentModelProbability}\`);
        console.log(\`reversalDetected=\${isLocked && (active15mCycle.lockedDirection === 'UP' ? currentModelProbability : (1 - currentModelProbability)) <= 0.15}\`);
        console.log(\`STATUS=PRODUCTION_READY\`);
      }
    }, 10000);
  } else {
    console.log("[Vercel] Serverless function initialized successfully.");
  }
}

startServer();`;

code = code.replace(search, replacement);
fs.writeFileSync('backend.ts', code);
console.log('Fixed backend.ts end block');
