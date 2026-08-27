const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

// Find the start of the corruption
const corruptionStart = content.indexOf('persistenceState = db\n');
if (corruptionStart !== -1) {
    // Truncate at the start of persistenceState = db
    content = content.substring(0, corruptionStart);
    
    // Append the correct block
    const correctBlock = `            persistenceState = db
              ? "DEGRADED_LOCAL_FALLBACK"
              : "LOCAL_DISK_ONLY";
            console.warn(
              \`[FIRESTORE_CIRCUIT] Hydrated OPEN circuit breaker state from disk cache on boot. retryAt=\${firestoreRetryAt}\`,
            );
            if (db && !firestoreNetworkDisabled) {
              firestoreNetworkDisabled = true;
              disableNetwork(db).catch((err) =>
                console.error(
                  "[FIRESTORE_CIRCUIT] Error disabling network stream on boot:",
                  err,
                ),
              );
            }
          } else {
            firestoreRetryAtMs = 0;
            firestoreRetryAt = null;
            if (db) persistenceState = "HEALTHY_FIRESTORE";
          }
        }
      }
      if (Array.isArray(data.discordSyncQueue)) {
        discordSyncQueue.length = 0;
        data.discordSyncQueue.forEach((item) => {
          discordSyncQueue.push(item);
        });
      }
      if (data.discordSyncMetrics) {
        discordSyncMetrics = {
          ...discordSyncMetrics,
          ...data.discordSyncMetrics,
        };
      }
      if (data.calibrationState && typeof data.calibrationState === "object") {
        latestCalibrationState = {
          ...latestCalibrationState,
          ...data.calibrationState,
        };
      }
      if (data.learningEngine && typeof data.learningEngine === "object") {
        Object.assign(serverLearningEngine, data.learningEngine);
      }
      if (data.maintenanceState && typeof data.maintenanceState === "object") {
        productionMaintenanceState = {
          ...productionMaintenanceState,
          ...data.maintenanceState,
        };
      }
      console.log(
        \`[Store] Loaded \${serverUsers.length} users, \${userDiscordProfiles.size} Discord profiles, \${userSubscriptions.size} subscriptions, \${persistentSignalLogs.length} signal logs & \${persistentTelemetryObservations.length} telemetry observations from disk store.\`,
      );
    }
  } catch (err) {
    console.warn("[Store] Notice loading store from disk:", err);
  }
}
__name(loadPersistentStore, "loadPersistentStore");
async function loadPersistentStoreAsync() {
  if (!db) {
    console.warn(
      "[Firestore] Firestore is not initialized. Skipping Firestore sync.",
    );
    return;
  }
  if (!canAttemptFirestoreWrite("loadPersistentStoreAsync")) {
    console.warn(
      "[Firestore] Circuit is OPEN. Skipping Firestore sync on boot.",
    );
    return;
  }
  try {
    console.log("[Firestore] Synchronizing state with Firestore...");
    const usersSnap = await getDocs(collection(db, "users"));
    let fetchedUsersCount = 0;
    for (const docSnap of usersSnap.docs) {
      const data = docSnap.data();
      if (data && (data.id || data.email || docSnap.id)) {
        fetchedUsersCount++;
        const cleanEmail = (data.email || "").toLowerCase().trim();
        if (
          cleanEmail !== "vixyvault0@gmail.com" &&
          (data.role === "OWNER" || data.role === "ADMIN")
        ) {
          data.role = "USER";
          try {
            await setDoc(
              doc(db, "users", docSnap.id),
              { role: "USER" },
              { merge: true },
            );
          } catch (e) {}
        }
        const matchByUid =
          data.uid &&
          serverUsers.find((u) => u.uid === data.uid || u.id === data.uid);
        const matchByEmail =
          cleanEmail &&
          serverUsers.find((u) => u.email?.toLowerCase() === cleanEmail);
        const existing = matchByUid || matchByEmail;
        if (!existing) {
          serverUsers.push(data);
        } else {
          for (const [k, v] of Object.entries(data)) {
            if (k === "passwordHash") {
              if (
                v &&
                typeof v === "string" &&
                v.length > 0 &&
                v !== "AuthManaged2026!"
              ) {
                if (
                  !existing.passwordHash ||
                  !existing.passwordHash.startsWith("vixy$") ||
                  v.startsWith("vixy$")
                ) {
                  existing.passwordHash = v;
                }
              }
            } else if (v !== void 0 && v !== null) {
              existing[k] = v;
            }
          }
        }
      }
    }
    sanitizeAndNormalizeServerUsers();
    const subsSnap = await getDocs(collection(db, "subscriptions"));
    let fetchedSubsCount = 0;
    subsSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && docSnap.id) {
        fetchedSubsCount++;
        userSubscriptions.set(docSnap.id, data);
      }
    });
    try {
      const dayPassesSnap = await getDocs(collection(db, "day_passes"));
      dayPassesSnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && docSnap.id) {
          userDayPasses.set(docSnap.id, data);
          if (data.email) userDayPasses.set(data.email.toLowerCase(), data);
          if (data.userId) userDayPasses.set(data.userId, data);
        }
      });
    } catch (dpErr) {
      console.warn("[Firestore] Error loading day_passes collection:", dpErr);
    }
    let fetchedProfilesCount = 0;
    const processProfileDoc = (data, docId) => {
      if (data && docId) {
        fetchedProfilesCount++;
        const profileObj = {
          email: data.email || data.userEmail || "",
          discordUserId: data.discordUserId || docId,
          discordUsername:
            data.username || data.discordUsername || "Discord User",
          discordGlobalName:
            data.globalName ||
            data.discordGlobalName ||
            data.username ||
            "Discord User",
          discordAvatar: data.avatar
            ? data.avatar.startsWith("http")
              ? data.avatar
              : \`https://cdn.discordapp.com/avatars/\${docId}/\${data.avatar}.png\`
            : null,
        };
        userDiscordProfiles.set(docId, profileObj);
        if (profileObj.email) {
          userDiscordProfiles.set(profileObj.email.toLowerCase(), profileObj);
        }
      }
    };
    try {
      const profilesSnap = await getDocs(collection(db, "discord_profiles"));
      profilesSnap.forEach((docSnap) => {
        processProfileDoc(docSnap.data(), docSnap.id);
      });
    } catch (profErr) {
      console.warn("[Firestore] Error loading discord_profiles collection:", profErr);
    }
    console.log(\`[Store] Loaded \${fetchedProfilesCount} Discord profiles from Firestore\`);
  } catch (err) {
    console.error("[Firestore] Boot sync error:", err);
  }
}

async function startServer() {
  const port = 3000;
  if (process.env.NODE_ENV !== "production") {
    const { createServer } = await import("vite");
    const viteServer = await createServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(viteServer.middlewares);
  } else {
    const distPath = require("path").join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(require("path").join(distPath, "index.html"));
    });
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(\`Server listening on port \${port}\`);
  });
}

if (!process.env.VERCEL && !process.env.NOW_REGION) {
  startServer();
}

export { app, startServer };
export default app;
`;
    content += correctBlock;
    
    fs.writeFileSync('server.ts', content);
    console.log('Successfully patched server.ts');
} else {
    console.log('Could not find corruption start');
}
