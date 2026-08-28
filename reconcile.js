async function reconcileUserEntitlement(identity) {
  const cleanEmail = (identity.email || "").toLowerCase().trim();
  const cleanUid = (identity.userId || identity.uid || "").trim();
  const cleanDiscordId = (identity.discordUserId || "").trim();
  const cleanSessionId = (identity.stripeSessionId || "").trim();
  const cleanStripeCustId = (identity.stripeCustomerId || "").trim();
  if (
    cleanEmail === "vixyvault0@gmail.com" ||
    (process.env.ADMIN_EMAIL &&
      cleanEmail === process.env.ADMIN_EMAIL.toLowerCase())
  ) {
    return getUserEntitlement("vixyvault0@gmail.com");
  }
  const lookupKey = cleanEmail || cleanUid || "unknown";
  let currentFast = getUserEntitlement(lookupKey);
  const isCurrentlyPaid =
    currentFast.plan !== "NONE" || currentFast.dayPass.active;
  if (isCurrentlyPaid && !cleanSessionId) {
    return currentFast;
  }
  const cacheKey = `${cleanEmail}:${cleanUid}:${cleanSessionId}`;
  const now = Date.now();
  const lastTime = lastReconcileTime.get(cacheKey) || 0;
  if (now - lastTime < 3e4 && !cleanSessionId) {
    return currentFast;
  }
  lastReconcileTime.set(cacheKey, now);
  if (db) {
    try {
      await ensureFirestoreNetworkEnabled();
      const emailDocId = cleanEmail
        ? `usr_${cleanEmail.replace(/[^a-zA-Z0-9_]/g, "_")}`
        : "";
      const emailSubId1 = cleanEmail
        ? `sub_${cleanEmail.replace(/[^a-zA-Z0-9_]/g, "_")}`
        : "";
      const emailSubId2 = cleanEmail
        ? `sub_usr_${cleanEmail.replace(/[^a-zA-Z0-9_]/g, "_")}`
        : "";
      const emailDpId1 = cleanEmail
        ? `dp_${cleanEmail.replace(/[^a-zA-Z0-9_]/g, "_")}`
        : "";
      const userKeys = [cleanUid, cleanEmail, emailDocId].filter(Boolean);
      for (const k of userKeys) {
        try {
          const userSnap = await getDoc(doc(db, "users", k));
          if (userSnap.exists()) {
            const userData = userSnap.data();
            if (userData) {
              const matchedEmail = (userData.email || cleanEmail).toLowerCase();
              const existingMemUser = serverUsers.find(
                (u) =>
                  u.email?.toLowerCase() === matchedEmail ||
                  u.id === userData.id ||
                  u.uid === userData.uid,
              );
              if (!existingMemUser) {
                serverUsers.unshift({
                  id: userData.id || userData.userId || k,
                  uid: userData.uid || cleanUid || void 0,
                  email: matchedEmail,
                  name: userData.name || matchedEmail.split("@")[0],
                  role: userData.role || "USER",
                  subscription: userData.subscription || "NONE",
                  passwordHash:
                    userData.passwordHash &&
                    userData.passwordHash !== "AuthManaged2026!"
                      ? userData.passwordHash
                      : void 0,
                  verificationStatus: userData.verificationStatus || "VERIFIED",
                  hardwareFingerprint:
                    userData.hardwareFingerprint || `hw_${k}`,
                  ipHash: userData.ipHash || "127.0.0.1",
                  joined:
                    userData.joined || new Date().toISOString().split("T")[0],
                  status: userData.status || "ACTIVE",
                  volumeTrades: userData.volumeTrades || 0,
                  stripeCustomerId: userData.stripeCustomerId,
                  stripeSubscriptionId: userData.stripeSubscriptionId,
                  discordId: userData.discordId || userData.discordUserId,
                  discordTag: userData.discordTag,
                  discordLinked: Boolean(
                    userData.discordLinked || userData.discordId,
                  ),
                });
              } else {
                if (
                  userData.passwordHash &&
                  userData.passwordHash !== "AuthManaged2026!"
                )
                  existingMemUser.passwordHash = userData.passwordHash;
                if (userData.subscription)
                  existingMemUser.subscription = userData.subscription;
                if (userData.status) existingMemUser.status = userData.status;
                if (userData.stripeCustomerId)
                  existingMemUser.stripeCustomerId = userData.stripeCustomerId;
                if (userData.stripeSubscriptionId)
                  existingMemUser.stripeSubscriptionId =
                    userData.stripeSubscriptionId;
                if (userData.discordId)
                  existingMemUser.discordId = userData.discordId;
              }
              if (userData.dayPass && userData.dayPass.expiresAt) {
                const dp = userData.dayPass;
                if (
                  new Date(dp.expiresAt).getTime() > Date.now() &&
                  dp.status === "ACTIVE"
                ) {
                  userDayPasses.set(matchedEmail, dp);
                  if (userData.id) userDayPasses.set(userData.id, dp);
                  if (userData.uid) userDayPasses.set(userData.uid, dp);
                }
              }
              if (
                userData.subscription &&
                userData.subscription !== "NONE" &&
                userData.subscription !== "FREE_TRIAL"
              ) {
                const subRec = {
                  email: matchedEmail,
                  role:
                    userData.role === "ADMIN" || userData.role === "OWNER"
                      ? userData.role
                      : userData.subscription.includes("ELITE")
                        ? "ELITE"
                        : "PRO",
                  plan: userData.subscription,
                  status:
                    userData.status === "ACTIVE" ||
                    userData.status === "TRIALING"
                      ? "ACTIVE"
                      : userData.status || "ACTIVE",
                  stripeCustomerId: userData.stripeCustomerId,
                  stripeSubscriptionId: userData.stripeSubscriptionId,
                  updatedAt: userData.updatedAt || new Date().toISOString(),
                };
                userSubscriptions.set(matchedEmail, subRec);
                if (cleanUid) userSubscriptions.set(cleanUid, subRec);
              }
            }
          }
        } catch (uErr) {
          const msg = String(uErr?.message || uErr);
          if (!msg.includes("offline")) {
            console.warn(
              "[RECONCILE ENTITLEMENT] User doc hydration note:",
              msg,
            );
          }
        }
      }
      const dpKeys = [
        cleanEmail,
        cleanUid,
        cleanDiscordId,
        emailDocId,
        emailDpId1,
      ].filter(Boolean);
      for (const k of dpKeys) {
        if (!userDayPasses.has(k)) {
          const dpSnap = await getDoc(doc(db, "day_passes", k));
          if (dpSnap.exists()) {
            const data = dpSnap.data();
            if (data && data.expiresAt) {
              userDayPasses.set(k, data);
              if (data.email) userDayPasses.set(data.email.toLowerCase(), data);
              if (data.userId) userDayPasses.set(data.userId, data);
            }
          }
        }
      }
      const subKeys = [
        cleanEmail,
        cleanUid,
        cleanStripeCustId,
        emailSubId1,
        emailSubId2,
        emailDocId,
      ].filter(Boolean);
      for (const k of subKeys) {
        if (!userSubscriptions.has(k)) {
          const subSnap = await getDoc(doc(db, "subscriptions", k));
          if (subSnap.exists()) {
            const data = subSnap.data();
            if (
              data &&
              (data.status === "ACTIVE" || data.status === "TRIALING")
            ) {
              userSubscriptions.set(k, data);
              if (data.email)
                userSubscriptions.set(data.email.toLowerCase(), data);
            }
          }
        }
      }
    } catch (fsErr) {
      const msg = String(fsErr?.message || fsErr);
      if (!msg.includes("offline")) {
        console.warn("[RECONCILE ENTITLEMENT] Firestore hydration note:", msg);
      }
    }
  }
  currentFast = getUserEntitlement(cleanEmail || cleanUid || "unknown");
  if (currentFast.plan !== "NONE" || currentFast.dayPass.active) {
    return currentFast;
  }
  const stripe = getStripe();
  if (stripe) {
    try {
      if (cleanSessionId) {
        const session = await stripe.checkout.sessions.retrieve(
          cleanSessionId,
          { expand: ["line_items", "payment_intent", "subscription"] },
        );
        if (session && session.payment_status === "paid") {
          const targetEmail = (
            session.customer_details?.email ||
            session.customer_email ||
            cleanEmail ||
            ""
          )
            .toLowerCase()
            .trim();
          const expectedPriceId =
            process.env.STRIPE_DAY_PASS_PRICE_ID ||
            "price_1U4cKTCYsvFDvgUJZHASVwRG";
          const isDayPass =
            session.mode === "payment" &&
            session.line_items?.data.some(
              (item) => item.price?.id === expectedPriceId,
            );
          const sessionCreatedMs = session.created
            ? session.created * 1e3
            : Date.now();
          const nowMs = Date.now();
          const elapsedMs = nowMs - sessionCreatedMs;
          const twentyFourHoursMs = 24 * 3600 * 1e3;
          if (isDayPass && targetEmail) {
            const startedAt = new Date(sessionCreatedMs).toISOString();
            const expiresAt =
              elapsedMs < twentyFourHoursMs
                ? new Date(sessionCreatedMs + twentyFourHoursMs).toISOString()
                : new Date(nowMs + twentyFourHoursMs).toISOString();
            const dpRecord = {
              entitlementId: `dp_restored_${session.id}`,
              userId:
                cleanUid ||
                session.client_reference_id ||
                `usr_${targetEmail.replace(/[^a-zA-Z0-9_]/g, "_")}`,
              email: targetEmail,
              discordUserId: cleanDiscordId || void 0,
              guildId: process.env.DISCORD_GUILD_ID || "1451337712937336985",
              entitlementType: "DAY_PASS",
              accessTier: "ELITE",
              status: "ACTIVE",
              duration: "24 hours",
              activatedAt: startedAt,
              expiresAt,
              startedAt,
              stripePaymentStatus: "PAID",
              stripePaymentLink:
                "https://buy.stripe.com/fZu7sK7qr2Zs70M7Nn1oI09",
              stripePaymentId:
                typeof session.payment_intent === "object" &&
                session.payment_intent
                  ? session.payment_intent.id
                  : session.payment_intent || session.id,
              stripeCheckoutSessionId: session.id,
              stripeEventId: `restore_${session.id}`,
              stripePriceId:
                process.env.STRIPE_DAY_PASS_PRICE_ID ||
                "price_1U4cKTCYsvFDvgUJZHASVwRG",
              discordRoleId:
                process.env.DISCORD_24H_ROLE_ID ||
                process.env.DISCORD_ROLE_DAY_PASS ||
                process.env.DISCORD_DAY_PASS_ROLE_ID ||
                "1538094678870593547",
              discordRoleAssigned: false,
              createdAt: startedAt,
              updatedAt: new Date().toISOString(),
            };
            userDayPasses.set(targetEmail, dpRecord);
            if (cleanUid) userDayPasses.set(cleanUid, dpRecord);
            if (dpRecord.userId) userDayPasses.set(dpRecord.userId, dpRecord);
            if (db) {
              const cleanDp = sanitizeForFirestore(dpRecord);
              setDoc(doc(db, "day_passes", targetEmail), cleanDp, {
                merge: true,
              }).catch(() => {});
              if (cleanUid)
                setDoc(doc(db, "day_passes", cleanUid), cleanDp, {
                  merge: true,
                }).catch(() => {});
            }
            syncUserEntitlementToDiscord(targetEmail).catch(() => {});
          } else if (
            (session.mode === "subscription" || session.subscription) &&
            targetEmail
          ) {
            const subId =
              typeof session.subscription === "object" && session.subscription
                ? session.subscription.id
                : session.subscription || "";
            let resolvedPlan = "PRO";
            let stripePriceId = "";
            if (subId) {
              try {
                const subObj = await stripe.subscriptions.retrieve(subId);
                stripePriceId = subObj.items?.data?.[0]?.price?.id || "";
                resolvedPlan = getPlanFromPriceId(stripePriceId);
              } catch (subErr) {
                console.warn(
                  "[RECONCILE ENTITLEMENT] Subscription fetch note:",
                  subErr,
                );
              }
            }
            await updateSubscriptionInFirestore(targetEmail, {
              stripeCustomerId:
                typeof session.customer === "string"
                  ? session.customer
                  : session.customer?.id,
              stripeSubscriptionId: subId || `sub_${session.id}`,
              stripePriceId,
              plan: resolvedPlan,
              status: "ACTIVE",
              lastStripeEventId: `restore_${session.id}`,
            });
            syncUserEntitlementToDiscord(targetEmail).catch(() => {});
          }
        }
      }
      if (cleanEmail) {
        const customers = await stripe.customers.list({
          email: cleanEmail,
          limit: 5,
        });
        for (const cust of customers.data) {
          const subs = await stripe.subscriptions.list({
            customer: cust.id,
            limit: 5,
          });
          const activeSub = subs.data.find(
            (s) =>
              s.status === "active" ||
              s.status === "trialing" ||
              s.status === "past_due",
          );
          if (activeSub) {
            const priceId = activeSub.items?.data?.[0]?.price?.id;
            const plan = getPlanFromPriceId(priceId);
            await updateSubscriptionInFirestore(cleanEmail, {
              stripeCustomerId: cust.id,
              stripeSubscriptionId: activeSub.id,
              stripePriceId: priceId,
              plan,
              status: "ACTIVE",
              currentPeriodStart: activeSub.current_period_start,
              currentPeriodEnd: activeSub.current_period_end,
              cancelAtPeriodEnd: activeSub.cancel_at_period_end,
              lastStripeEventId: `reconcile_${activeSub.id}`,
            });
            syncUserEntitlementToDiscord(cleanEmail).catch(() => {});
            break;
          }
          const payments = await stripe.paymentIntents.list({
            customer: cust.id,
            limit: 10,
          });
          const successfulDayPassPayment = payments.data.find(
            (p) =>
              p.status === "succeeded" &&
              (p.amount === 999 || p.description?.includes("Day Pass")),
          );
          if (successfulDayPassPayment) {
            const paymentCreatedMs = successfulDayPassPayment.created * 1e3;
            const nowMs = Date.now();
            const elapsedMs = nowMs - paymentCreatedMs;
            const twentyFourHoursMs = 24 * 3600 * 1e3;
            const startedAt = new Date(paymentCreatedMs).toISOString();
            const expiresAt =
              elapsedMs < twentyFourHoursMs
                ? new Date(paymentCreatedMs + twentyFourHoursMs).toISOString()
                : new Date(nowMs + twentyFourHoursMs).toISOString();
            const dpRecord = {
              entitlementId: `dp_pi_${successfulDayPassPayment.id}`,
              userId:
                cleanUid || `usr_${cleanEmail.replace(/[^a-zA-Z0-9_]/g, "_")}`,
              email: cleanEmail,
              discordUserId: cleanDiscordId || void 0,
              guildId: process.env.DISCORD_GUILD_ID || "1451337712937336985",
              entitlementType: "DAY_PASS",
              accessTier: "ELITE",
              status: "ACTIVE",
              duration: "24 hours",
              activatedAt: startedAt,
              expiresAt,
              startedAt,
              stripePaymentStatus: "PAID",
              stripePaymentLink:
                "https://buy.stripe.com/fZu7sK7qr2Zs70M7Nn1oI09",
              stripePaymentId: successfulDayPassPayment.id,
              stripeCheckoutSessionId: `sess_pi_${successfulDayPassPayment.id}`,
              stripeEventId: `reconcile_${successfulDayPassPayment.id}`,
              stripePriceId:
                process.env.STRIPE_DAY_PASS_PRICE_ID ||
                "price_1U4cKTCYsvFDvgUJZHASVwRG",
              discordRoleId:
                process.env.DISCORD_24H_ROLE_ID ||
                process.env.DISCORD_ROLE_DAY_PASS ||
                process.env.DISCORD_DAY_PASS_ROLE_ID ||
                "1538094678870593547",
              discordRoleAssigned: false,
              createdAt: startedAt,
              updatedAt: new Date().toISOString(),
            };
            userDayPasses.set(cleanEmail, dpRecord);
            if (cleanUid) userDayPasses.set(cleanUid, dpRecord);
            if (db) {
              setDoc(doc(db, "day_passes", cleanEmail), sanitizeForFirestore(dpRecord), {
                merge: true,
              }).catch(() => {});
            }
            syncUserEntitlementToDiscord(cleanEmail).catch(() => {});
            break;
          }
        }
        const fastCheck = getUserEntitlement(cleanEmail || cleanUid);
        if (fastCheck.plan === "NONE" && !fastCheck.dayPass.active) {
          const recentSessions = await stripe.checkout.sessions.list({
            limit: 100,
          });
          const matchingSession = recentSessions.data.find(
            (s) =>
              s.payment_status === "paid" &&
              ((s.customer_details?.email &&
                s.customer_details.email.toLowerCase().trim() === cleanEmail) ||
                (s.customer_email &&
                  s.customer_email.toLowerCase().trim() === cleanEmail) ||
                (s.metadata?.userEmail &&
                  s.metadata.userEmail.toLowerCase().trim() === cleanEmail) ||
                (s.metadata?.email &&
                  s.metadata.email.toLowerCase().trim() === cleanEmail) ||
                (s.client_reference_id &&
                  (s.client_reference_id === cleanUid ||
                    s.client_reference_id === cleanEmail))),
          );
          if (matchingSession) {
            const expectedPriceId2 =
              process.env.STRIPE_DAY_PASS_PRICE_ID ||
              "price_1U4cKTCYsvFDvgUJZHASVwRG";
            const isDayPass =
              matchingSession.mode === "payment" &&
              matchingSession.line_items?.data.some(
                (item) => item.price?.id === expectedPriceId2,
              );
            const sessionCreatedMs = matchingSession.created * 1e3;
            const nowMs = Date.now();
            const elapsedMs = nowMs - sessionCreatedMs;
            const twentyFourHoursMs = 24 * 3600 * 1e3;
            const startedAt = new Date(sessionCreatedMs).toISOString();
            const expiresAt =
              elapsedMs < twentyFourHoursMs
                ? new Date(sessionCreatedMs + twentyFourHoursMs).toISOString()
                : new Date(nowMs + twentyFourHoursMs).toISOString();
            if (isDayPass) {
              const dpRecord = {
                entitlementId: `dp_sess_${matchingSession.id}`,
                userId:
                  cleanUid ||
                  matchingSession.client_reference_id ||
                  `usr_${cleanEmail.replace(/[^a-zA-Z0-9_]/g, "_")}`,
                email: cleanEmail,
                discordUserId: cleanDiscordId || void 0,
                guildId: process.env.DISCORD_GUILD_ID || "1451337712937336985",
                entitlementType: "DAY_PASS",
                accessTier: "ELITE",
                status: "ACTIVE",
                duration: "24 hours",
                activatedAt: startedAt,
                expiresAt,
                startedAt,
                stripePaymentStatus: "PAID",
                stripePaymentLink:
                  "https://buy.stripe.com/fZu7sK7qr2Zs70M7Nn1oI09",
                stripePaymentId:
                  typeof matchingSession.payment_intent === "string"
                    ? matchingSession.payment_intent
                    : matchingSession.id,
                stripeCheckoutSessionId: matchingSession.id,
                stripeEventId: `reconcile_${matchingSession.id}`,
                stripePriceId:
                  process.env.STRIPE_DAY_PASS_PRICE_ID ||
                  "price_1U4cKTCYsvFDvgUJZHASVwRG",
                discordRoleId:
                  process.env.DISCORD_24H_ROLE_ID ||
                  process.env.DISCORD_ROLE_DAY_PASS ||
                  process.env.DISCORD_DAY_PASS_ROLE_ID ||
                  "1538094678870593547",
                discordRoleAssigned: false,
                troubleshootingGraceApplied: true,
                createdAt: startedAt,
                updatedAt: new Date().toISOString(),
              };
              userDayPasses.set(cleanEmail, dpRecord);
              if (cleanUid) userDayPasses.set(cleanUid, dpRecord);
              if (db) {
                setDoc(doc(db, "day_passes", cleanEmail), sanitizeForFirestore(dpRecord), {
                  merge: true,
                }).catch(() => {});
              }
              syncUserEntitlementToDiscord(cleanEmail).catch(() => {});
            } else if (
              matchingSession.mode === "subscription" ||
              matchingSession.subscription
            ) {
              const subId =
                typeof matchingSession.subscription === "string"
                  ? matchingSession.subscription
                  : matchingSession.subscription?.id;
              let resolvedPlan = "PRO";
              let stripePriceId = "";
              if (subId) {
                try {
                  const subObj = await stripe.subscriptions.retrieve(subId);
                  stripePriceId = subObj.items?.data?.[0]?.price?.id || "";
                  resolvedPlan = getPlanFromPriceId(stripePriceId);
                } catch (subErr) {
                  console.warn(
                    "[RECONCILE ENTITLEMENT] Subscription fetch note:",
                    subErr,
                  );
                }
              }
              await updateSubscriptionInFirestore(cleanEmail, {
                stripeCustomerId:
                  typeof matchingSession.customer === "string"
                    ? matchingSession.customer
                    : matchingSession.customer?.id,
                stripeSubscriptionId: subId || `sub_${matchingSession.id}`,
                stripePriceId,
                plan: resolvedPlan,
                status: "ACTIVE",
                lastStripeEventId: `reconcile_${matchingSession.id}`,
              });
              syncUserEntitlementToDiscord(cleanEmail).catch(() => {});
            }
          }
        }
      }
    } catch (stripeErr) {
      console.warn("[RECONCILE ENTITLEMENT] Stripe query warning:", stripeErr);
    }
  }
  return getUserEntitlement(cleanEmail || cleanUid || "unknown");
}