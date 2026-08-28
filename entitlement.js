function getUserEntitlement(emailOrUid) {
  const clean = emailOrUid.toLowerCase().trim();
  if (clean === "ogaccount85@gmail.com" || clean === "ogacount85@gmail.com") {
    const memUser = serverUsers.find(
      (u) => u.email?.toLowerCase() === clean,
    );
    const sub = userSubscriptions.get(clean);
    const grantStartedAt = "2026-08-16T00:00:00.000Z";
    const grantExpiresAt = sub?.expiresAt || sub?.subscriptionExpiresAt || memUser?.expiresAt || memUser?.subscriptionExpiresAt || "2026-10-16T00:00:00.000Z";
    const nowMs2 = Date.now();
    const expMs = new Date(grantExpiresAt).getTime();
    const secondsRemaining = Math.max(0, Math.floor((expMs - nowMs2) / 1e3));
    const active = secondsRemaining > 0;
    const proEntitlements = getEntitlementsFromSubscription(
      "PRO_QUANT",
      "ACTIVE",
      false,
    );
    const discordVerified = Boolean(
      memUser &&
      memUser.verificationStatus === "VERIFIED" &&
      memUser.discordLinked,
    );
    return {
      authenticated: true,
      entitled: active,
      access: active,
      userId: memUser?.id || "usr_ogaccount85_gmail_com",
      email: clean,
      stripeVerified: false,
      plan: active ? "PRO_QUANT" : "NONE",
      logicalPlan: active ? "PRO_QUANT_MONTHLY" : "NONE",
      billing: "MONTHLY",
      status: active ? "active" : "inactive",
      expiresAt: grantExpiresAt,
      compensationApplied: true,
      stripeCustomerId: "cus_venmo_ogaccount85",
      subscriptionId: "sub_ogaccount85_pro",
      currentPeriodStart: Math.floor(new Date(grantStartedAt).getTime() / 1e3),
      currentPeriodEnd: Math.floor(expMs / 1e3),
      cancelAtPeriodEnd: false,
      discordVerified: true,
      discordUserId: memUser?.discordId || void 0,
      guildMember: true,
      entitlements: active
        ? proEntitlements.entitlements
        : {
            starter: false,
            proQuant: false,
            eliteQuant: false,
            scalping15s: false,
            canAccessProDesks: false,
            canAccessAdminPanel: false,
          },
      entitlementState: {
        status: active ? "PRO_ACTIVE" : "EXPIRED",
        plan: active ? "PRO" : "FREE",
        type: "SUBSCRIPTION",
        expiresAt: grantExpiresAt,
        updatedAt: new Date().toISOString(),
      },
      sessionVersion: memUser?.sessionVersion || 1,
      dayPass: { active: false, secondsRemaining: 0 },
      updatedAt: new Date().toISOString(),
    };
  }

  if (clean === "selvinrom1.6@gmail.com") {
    const grantStartedAt = "2026-08-16T00:00:00.000Z";
    const grantExpiresAt = "2026-09-16T00:00:00.000Z";
    const nowMs2 = Date.now();
    const expMs = new Date(grantExpiresAt).getTime();
    const secondsRemaining = Math.max(0, Math.floor((expMs - nowMs2) / 1e3));
    const active = secondsRemaining > 0;
    const proEntitlements = getEntitlementsFromSubscription(
      "PRO_QUANT",
      "ACTIVE",
      false,
    );
    const memUser = serverUsers.find(
      (u) => u.email?.toLowerCase() === "selvinrom1.6@gmail.com",
    );
    const discordVerified = Boolean(
      memUser &&
      memUser.verificationStatus === "VERIFIED" &&
      memUser.discordLinked,
    );
    return {
      authenticated: true,
      entitled: active,
      access: active,
      userId: memUser?.id || "usr_selvinrom1_6_gmail_com",
      email: clean,
      stripeVerified: false,
      plan: active ? "PRO_QUANT" : "NONE",
      logicalPlan: active ? "PRO_QUANT_MONTHLY" : "NONE",
      billing: "MONTHLY",
      status: active ? "active" : "inactive",
      expiresAt: grantExpiresAt,
      compensationApplied: false,
      stripeCustomerId: void 0,
      subscriptionId: void 0,
      currentPeriodStart: Math.floor(new Date(grantStartedAt).getTime() / 1e3),
      currentPeriodEnd: Math.floor(expMs / 1e3),
      cancelAtPeriodEnd: false,
      discordVerified,
      discordUserId: memUser?.discordId || void 0,
      guildMember: true,
      entitlements: active
        ? proEntitlements.entitlements
        : {
            starter: false,
            proQuant: false,
            eliteQuant: false,
            scalping15s: false,
            canAccessProDesks: false,
            canAccessAdminPanel: false,
          },
      entitlementState: {
        status: active ? "PRO_ACTIVE" : "EXPIRED",
        plan: active ? "PRO" : "FREE",
        type: "SUBSCRIPTION",
        expiresAt: grantExpiresAt,
        updatedAt: new Date().toISOString(),
      },
      sessionVersion: memUser?.sessionVersion || 1,
      dayPass: { active: false, secondsRemaining: 0 },
      updatedAt: new Date().toISOString(),
    };
  }
  if (clean === "ludinvelasquez47@gmail.com") {
    const grantStartedAt = "2026-08-15T00:00:00.000Z";
    const grantExpiresAt = "2026-10-15T00:00:00.000Z";
    const nowMs2 = Date.now();
    const expMs = new Date(grantExpiresAt).getTime();
    const secondsRemaining = Math.max(0, Math.floor((expMs - nowMs2) / 1e3));
    const active = secondsRemaining > 0;
    const starterEntitlements = getEntitlementsFromSubscription(
      "STARTER",
      "ACTIVE",
      false,
    );
    const memUser = serverUsers.find(
      (u) => u.email?.toLowerCase() === "ludinvelasquez47@gmail.com",
    );
    const discordVerified = Boolean(
      memUser &&
      memUser.verificationStatus === "VERIFIED" &&
      memUser.discordLinked,
    );
    return {
      authenticated: true,
      entitled: active,
      access: active,
      userId: memUser?.id || "usr_ludinvelasquez47_gmail_com",
      email: clean,
      stripeVerified: false,
      plan: active ? "STARTER" : "NONE",
      logicalPlan: active ? "STARTER_MONTHLY" : "NONE",
      billing: "MONTHLY",
      status: active ? "active" : "inactive",
      expiresAt: grantExpiresAt,
      compensationApplied: true,
      stripeCustomerId: "cus_V4zGkWKshUnahT",
      subscriptionId: "sub_ludin_starter_2months",
      currentPeriodStart: Math.floor(new Date(grantStartedAt).getTime() / 1e3),
      currentPeriodEnd: Math.floor(expMs / 1e3),
      cancelAtPeriodEnd: false,
      discordVerified,
      discordUserId: memUser?.discordId || void 0,
      guildMember: true,
      entitlements: active
        ? starterEntitlements.entitlements
        : {
            starter: false,
            proQuant: false,
            eliteQuant: false,
            scalping15s: false,
            canAccessProDesks: false,
            canAccessAdminPanel: false,
          },
      entitlementState: {
        status: active ? "STARTER_ACTIVE" : "EXPIRED",
        plan: active ? "STARTER" : "FREE",
        type: "SUBSCRIPTION",
        expiresAt: grantExpiresAt,
        updatedAt: new Date().toISOString(),
      },
      sessionVersion: memUser?.sessionVersion || 1,
      dayPass: { active: false, secondsRemaining: 0 },
      updatedAt: new Date().toISOString(),
    };
  }
  if (clean === "wasan@cartwrightrn.com") {
    const grantStartedAt = "2026-08-16T00:00:00.000Z";
    const grantExpiresAt = "2026-10-16T00:00:00.000Z";
    const nowMs2 = Date.now();
    const expMs = new Date(grantExpiresAt).getTime();
    const secondsRemaining = Math.max(0, Math.floor((expMs - nowMs2) / 1e3));
    const active = secondsRemaining > 0;
    const starterEntitlements = getEntitlementsFromSubscription(
      "STARTER",
      "ACTIVE",
      false,
    );
    const memUser = serverUsers.find(
      (u) => u.email?.toLowerCase() === "wasan@cartwrightrn.com",
    );
    const discordVerified = Boolean(
      memUser &&
      memUser.verificationStatus === "VERIFIED" &&
      memUser.discordLinked,
    );
    return {
      authenticated: true,
      entitled: active,
      access: active,
      userId: memUser?.id || "usr_wasan_cartwrightrn_com",
      email: clean,
      stripeVerified: false,
      plan: active ? "STARTER" : "NONE",
      logicalPlan: active ? "STARTER_MONTHLY" : "NONE",
      billing: "MONTHLY",
      status: active ? "active" : "inactive",
      expiresAt: grantExpiresAt,
      compensationApplied: true,
      stripeCustomerId: "cus_wasan_venmo_48",
      subscriptionId: "sub_wasan_starter_2months",
      currentPeriodStart: Math.floor(new Date(grantStartedAt).getTime() / 1e3),
      currentPeriodEnd: Math.floor(expMs / 1e3),
      cancelAtPeriodEnd: false,
      discordVerified,
      discordUserId: memUser?.discordId || void 0,
      guildMember: true,
      entitlements: active
        ? starterEntitlements.entitlements
        : {
            starter: false,
            proQuant: false,
            eliteQuant: false,
            scalping15s: false,
            canAccessProDesks: false,
            canAccessAdminPanel: false,
          },
      entitlementState: {
        status: active ? "STARTER_ACTIVE" : "EXPIRED",
        plan: active ? "STARTER" : "FREE",
        type: "SUBSCRIPTION",
        expiresAt: grantExpiresAt,
        updatedAt: new Date().toISOString(),
      },
      sessionVersion: memUser?.sessionVersion || 1,
      dayPass: { active: false, secondsRemaining: 0 },
      updatedAt: new Date().toISOString(),
    };
  }
  if (clean === "sergioaddiaz1711@icloud.com") {
    const grantStartedAt = "2026-08-17T02:38:34.000Z";
    const grantExpiresAt = "2026-08-20T02:38:34.000Z";
    const nowMs2 = Date.now();
    const expMs = new Date(grantExpiresAt).getTime();
    const secondsRemaining = Math.max(0, Math.floor((expMs - nowMs2) / 1e3));
    const active = secondsRemaining > 0;
    const eliteEntitlements = getEntitlementsFromSubscription(
      "ELITE_QUANT",
      "ACTIVE",
      false,
    );
    const memUser = serverUsers.find(
      (u) => u.email?.toLowerCase() === "sergioaddiaz1711@icloud.com",
    );
    const discordVerified = Boolean(
      memUser &&
      memUser.verificationStatus === "VERIFIED" &&
      memUser.discordLinked,
    );
    return {
      authenticated: true,
      entitled: active,
      access: active,
      userId: memUser?.id || "usr_sergioaddiaz1711_icloud_com",
      email: clean,
      stripeVerified: false,
      plan: active ? "ELITE_QUANT" : "NONE",
      logicalPlan: active ? "DAY_PASS_24H" : "NONE",
      billing: "NONE",
      status: active ? "active" : "inactive",
      expiresAt: grantExpiresAt,
      compensationApplied: false,
      stripeCustomerId: void 0,
      subscriptionId: void 0,
      discordVerified,
      discordUserId: memUser?.discordId || void 0,
      guildMember: true,
      entitlements: active
        ? eliteEntitlements.entitlements
        : {
            starter: false,
            proQuant: false,
            eliteQuant: false,
            scalping15s: false,
            canAccessProDesks: false,
            canAccessAdminPanel: false,
          },
      entitlementState: {
        status: active ? "DAY_PASS_ACTIVE" : "EXPIRED",
        plan: active ? "DAY_PASS" : "FREE",
        type: "DAY_PASS",
        expiresAt: grantExpiresAt,
        updatedAt: new Date().toISOString(),
      },
      sessionVersion: memUser?.sessionVersion || 1,
      dayPass: {
        active,
        startedAt: grantStartedAt,
        expiresAt: grantExpiresAt,
        secondsRemaining,
      },
      updatedAt: new Date().toISOString(),
    };
  }
  if (
    clean === "vixyvault0@gmail.com" ||
    clean === (process.env.ADMIN_EMAIL || "").toLowerCase()
  ) {
    const ownerRes = getEntitlementsFromSubscription(
      "ELITE_QUANT",
      "ACTIVE",
      true,
    );
    return {
      authenticated: true,
      userId: "usr_owner_01",
      email: clean,
      stripeVerified: true,
      plan: ownerRes.normalizedPlan,
      logicalPlan: "ELITE_QUANT_YEARLY",
      billing: "YEARLY",
      status: ownerRes.normalizedStatus,
      stripeCustomerId: "cus_vixy_owner",
      subscriptionId: "sub_vixy_owner_annual",
      currentPeriodStart: Math.floor(Date.now() / 1e3) - 86400 * 30,
      currentPeriodEnd: Math.floor(Date.now() / 1e3) + 86400 * 365,
      cancelAtPeriodEnd: false,
      discordVerified: true,
      discordUserId: "315284910382911234",
      guildMember: true,
      entitlements: ownerRes.entitlements,
      entitlementState: {
        status: "PRO_ACTIVE",
        plan: "ELITE",
        type: "SUBSCRIPTION",
        expiresAt: null,
        updatedAt: new Date().toISOString(),
      },
      sessionVersion: 1,
      dayPass: { active: false, secondsRemaining: 0 },
      updatedAt: new Date().toISOString(),
    };
  }
  const sub = userSubscriptions.get(clean);
  const user = serverUsers.find(
    (u) =>
      u.email?.toLowerCase() === clean || u.id === clean || u.uid === clean,
  );

  const subExpiresAt = sub?.subscriptionExpiresAt || sub?.expiresAt || user?.subscriptionExpiresAt || user?.expiresAt;
  let forceExpired = false;
  if (subExpiresAt) {
      if (new Date(subExpiresAt).getTime() < Date.now()) {
          forceExpired = true;
      }
  }

  const role = forceExpired ? "USER" : (sub?.role || user?.role || "USER").toUpperCase();
  const rawPlan = forceExpired ? "NONE" : (sub?.plan || user?.subscription || "NONE").toUpperCase();
  const status = forceExpired ? "EXPIRED" : (sub?.status || user?.status || "INACTIVE").toUpperCase();
  const isOwnerOrAdmin = ["OWNER", "ADMIN", "SUPPORT"].includes(role);
  const resolvedSub = getEntitlementsFromSubscription(
    rawPlan,
    status,
    isOwnerOrAdmin,
  );
  const discordProfile =
    userDiscordProfiles.get(clean) ||
    userDiscordProfiles.get(user?.email?.toLowerCase() || "");
  const discordId = discordProfile?.discordUserId || user?.discordId;
  const dayPassRecord =
    userDayPasses.get(clean) ||
    (user?.id ? userDayPasses.get(user.id) : void 0) ||
    (discordId ? userDayPasses.get(discordId) : void 0) ||
    user?.dayPass;
  if (dayPassRecord && !dayPassRecord.troubleshootingGraceApplied) {
    try {
      const expMs = new Date(dayPassRecord.expiresAt).getTime();
      const threeDaysMs = 3 * 24 * 60 * 60 * 1e3;
      const newExp = new Date(expMs + threeDaysMs);
      dayPassRecord.expiresAt = newExp.toISOString();
      dayPassRecord.troubleshootingGraceApplied = true;
      dayPassRecord.troubleshootingGraceAppliedAt = new Date().toISOString();
      if (dayPassRecord.status === "EXPIRED" && newExp.getTime() > Date.now()) {
        dayPassRecord.status = "ACTIVE";
      }
      console.log(
        `[GRACE APPLIED] Added 3 days to Day Pass for ${dayPassRecord.email}. New exp: ${dayPassRecord.expiresAt}`,
      );
      if (
        typeof canAttemptFirestoreWrite === "function" &&
        canAttemptFirestoreWrite("day_passes")
      ) {
        ensureFirestoreNetworkEnabled()
          .then(() => {
            if (db) {
              const cleanDp = sanitizeForFirestore(dayPassRecord);
              setDoc(
                doc(db, "day_passes", dayPassRecord.email.toLowerCase()),
                cleanDp,
                { merge: true },
              ).catch(() => {});
              if (dayPassRecord.userId) {
                setDoc(
                  doc(db, "day_passes", dayPassRecord.userId),
                  cleanDp,
                  { merge: true },
                ).catch(() => {});
              }
            }
          })
          .catch((e) => {});
      }
    } catch (e) {
      console.warn("Failed to apply grace", e);
    }
  }
  const nowMs = Date.now();
  let dayPassActive = false;
  let dayPassSecondsRemaining = 0;
  if (dayPassRecord && dayPassRecord.expiresAt) {
    const expMs = new Date(dayPassRecord.expiresAt).getTime();
    if (expMs > nowMs) {
      if (dayPassRecord.status === "ACTIVE") {
        dayPassActive = true;
        dayPassSecondsRemaining = Math.floor((expMs - nowMs) / 1e3);
      }
    } else {
      if (dayPassRecord.status === "ACTIVE") {
        dayPassRecord.status = "EXPIRED";
        dayPassRecord.updatedAt = new Date().toISOString();
        console.log(
          `[DAY PASS ON-DEMAND EXPIRED] Expired 24H Day Pass for email=${dayPassRecord.email}, userId=${dayPassRecord.userId}`,
        );
        const targetDiscordUser = dayPassRecord.discordUserId || discordId;
        if (targetDiscordUser) {
          assignDiscordRoleToUser(targetDiscordUser, "NONE").catch((err) => {
            console.warn(
              `[DAY PASS ON-DEMAND DISCORD DEMOTION WARN] User ${targetDiscordUser}:`,
              err,
            );
          });
          dayPassRecord.discordRoleAssigned = false;
        }
        if (db) {
          const cleanDp = sanitizeForFirestore(dayPassRecord);
          if (dayPassRecord.email)
            setDoc(
              doc(db, "day_passes", dayPassRecord.email.toLowerCase()),
              cleanDp,
              { merge: true },
            ).catch(() => {});
          if (dayPassRecord.userId)
            setDoc(doc(db, "day_passes", dayPassRecord.userId), cleanDp, {
              merge: true,
            }).catch(() => {});
        }
      }
    }
  }
  if (resolvedSub.normalizedPlan !== "NONE") {
    let logicalPlan = "NONE";
    let billing = "NONE";
    if (resolvedSub.normalizedPlan === "ELITE_QUANT") {
      billing =
        rawPlan.includes("YEAR") || rawPlan.includes("ANNUAL")
          ? "YEARLY"
          : "MONTHLY";
      logicalPlan =
        billing === "YEARLY" ? "ELITE_QUANT_YEARLY" : "ELITE_QUANT_MONTHLY";
    } else if (resolvedSub.normalizedPlan === "PRO_QUANT") {
      billing =
        rawPlan.includes("YEAR") || rawPlan.includes("ANNUAL")
          ? "YEARLY"
          : "MONTHLY";
      logicalPlan =
        billing === "YEARLY" ? "PRO_QUANT_YEARLY" : "PRO_QUANT_MONTHLY";
    } else if (resolvedSub.normalizedPlan === "STARTER") {
      billing =
        rawPlan.includes("YEAR") || rawPlan.includes("ANNUAL")
          ? "YEARLY"
          : "MONTHLY";
      logicalPlan = billing === "YEARLY" ? "STARTER_YEARLY" : "STARTER_MONTHLY";
    }
    const discordProfile2 =
      userDiscordProfiles.get(clean) ||
      userDiscordProfiles.get(user?.email?.toLowerCase() || "");
    const isCompensated = Boolean(
      dayPassRecord?.troubleshootingGraceApplied ||
      dayPassRecord?.compensationApplied ||
      AUGUST_15_COMPENSATED_USERS.includes(clean),
    );
    return {
      authenticated: Boolean(user || sub || clean),
      entitled: true,
      access: true,
      userId:
        user?.id || user?.uid || `usr_${clean.replace(/[^a-zA-Z0-9_]/g, "_")}`,
      email: clean,
      stripeVerified: resolvedSub.isStripeVerified,
      plan: resolvedSub.normalizedPlan,
      logicalPlan,
      billing,
      status: resolvedSub.normalizedStatus,
      expiresAt:
        dayPassRecord?.expiresAt ||
        new Date(Date.now() + 30 * 864e5).toISOString(),
      compensationApplied: isCompensated,
      stripeCustomerId: sub?.stripeCustomerId || user?.stripeCustomerId,
      subscriptionId: sub?.stripeSubscriptionId || user?.stripeSubscriptionId,
      currentPeriodStart: Math.floor(Date.now() / 1e3) - 86400 * 15,
      currentPeriodEnd: Math.floor(Date.now() / 1e3) + 86400 * 15,
      cancelAtPeriodEnd: false,
      discordVerified: Boolean(
        discordProfile2?.discordLinked || user?.discordLinked,
      ),
      discordUserId: discordProfile2?.discordUserId || user?.discordId,
      guildMember: Boolean(
        discordProfile2?.guildMember || user?.verificationStatus === "VERIFIED",
      ),
      entitlements: resolvedSub.entitlements,
      entitlementState: {
        status:
          status === "PAST_DUE"
            ? "PAYMENT_REQUIRED"
            : resolvedSub.normalizedPlan === "STARTER"
              ? "STARTER_ACTIVE"
              : "PRO_ACTIVE",
        plan:
          resolvedSub.normalizedPlan === "STARTER"
            ? "STARTER"
            : resolvedSub.normalizedPlan === "ELITE_QUANT"
              ? "ELITE"
              : "PRO",
        type: "SUBSCRIPTION",
        expiresAt:
          dayPassRecord?.expiresAt ||
          new Date(Date.now() + 30 * 864e5).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      sessionVersion: user?.sessionVersion || 1,
      dayPass: {
        active: dayPassActive,
        startedAt: dayPassRecord?.startedAt || null,
        expiresAt: dayPassRecord?.expiresAt || null,
        secondsRemaining: dayPassSecondsRemaining,
        stripeSessionId: dayPassRecord?.stripeCheckoutSessionId,
      },
      updatedAt: sub?.updatedAt || new Date().toISOString(),
    };
  }
  if (dayPassActive && dayPassRecord) {
    const discordProfile2 =
      userDiscordProfiles.get(clean) ||
      userDiscordProfiles.get(user?.email?.toLowerCase() || "");
    const isCompensated = Boolean(
      dayPassRecord?.troubleshootingGraceApplied ||
      dayPassRecord?.compensationApplied ||
      AUGUST_15_COMPENSATED_USERS.includes(clean),
    );
    return {
      authenticated: Boolean(user || sub || clean),
      entitled: true,
      access: true,
      userId:
        user?.id || user?.uid || `usr_${clean.replace(/[^a-zA-Z0-9_]/g, "_")}`,
      email: clean,
      stripeVerified: true,
      plan: "DAY_PASS",
      logicalPlan: "DAY_PASS_24H",
      billing: "ONE_TIME",
      status: "active",
      expiresAt: dayPassRecord.expiresAt,
      compensationApplied: isCompensated,
      stripeCustomerId: sub?.stripeCustomerId || user?.stripeCustomerId,
      subscriptionId: dayPassRecord.stripeCheckoutSessionId,
      currentPeriodStart: Math.floor(
        new Date(dayPassRecord.startedAt).getTime() / 1e3,
      ),
      currentPeriodEnd: Math.floor(
        new Date(dayPassRecord.expiresAt).getTime() / 1e3,
      ),
      cancelAtPeriodEnd: false,
      discordVerified: Boolean(
        discordProfile2?.discordLinked || user?.discordLinked,
      ),
      discordUserId: discordProfile2?.discordUserId || user?.discordId,
      guildMember: Boolean(
        discordProfile2?.guildMember || user?.verificationStatus === "VERIFIED",
      ),
      entitlements: {
        starter: true,
        proQuant: true,
        eliteQuant: true,
        scalping15s: true,
        canAccessProDesks: true,
        canAccessAdminPanel: false,
      },
      entitlementState: {
        status: "DAY_PASS_ACTIVE",
        plan: "DAY_PASS",
        type: "DAY_PASS",
        expiresAt: dayPassRecord.expiresAt,
        updatedAt: new Date().toISOString(),
      },
      sessionVersion: user?.sessionVersion || 1,
      dayPass: {
        active: true,
        startedAt: dayPassRecord.startedAt,
        expiresAt: dayPassRecord.expiresAt,
        secondsRemaining: dayPassSecondsRemaining,
        stripeSessionId: dayPassRecord.stripeCheckoutSessionId,
      },
      updatedAt: dayPassRecord.updatedAt || new Date().toISOString(),
    };
  }
  return {
    authenticated: Boolean(user || sub || clean),
    entitled: false,
    access: false,
    userId:
      user?.id || user?.uid || `usr_${clean.replace(/[^a-zA-Z0-9_]/g, "_")}`,
    email: clean,
    stripeVerified: false,
    plan: "NONE",
    logicalPlan: "NONE",
    billing: "NONE",
    status: status === "CANCELED" ? "canceled" : "inactive",
    expiresAt: dayPassRecord?.expiresAt || void 0,
    compensationApplied: Boolean(AUGUST_15_COMPENSATED_USERS.includes(clean)),
    stripeCustomerId: sub?.stripeCustomerId || user?.stripeCustomerId,
    subscriptionId: sub?.stripeSubscriptionId || user?.stripeSubscriptionId,
    discordVerified: Boolean(
      discordProfile?.discordLinked || user?.discordLinked,
    ),
    discordUserId: discordProfile?.discordUserId || user?.discordId,
    guildMember: Boolean(
      discordProfile?.guildMember || user?.verificationStatus === "VERIFIED",
    ),
    entitlements: {
      starter: false,
      proQuant: false,
      eliteQuant: false,
      scalping15s: false,
      canAccessProDesks: false,
      canAccessAdminPanel: false,
    },
    entitlementState: {
      status:
        user?.accountStatus === "RECONCILIATION_REQUIRED" ||
        user?.status === "RECONCILIATION_REQUIRED"
          ? "RECONCILIATION_REQUIRED"
          : user?.accountStatus === "SUSPENDED" || user?.status === "SUSPENDED"
            ? "SUSPENDED"
            : status === "PAST_DUE"
              ? "PAYMENT_REQUIRED"
              : status === "CANCELED"
                ? "CANCELED"
                : dayPassRecord && dayPassRecord.status === "EXPIRED"
                  ? "EXPIRED"
                  : "FREE",
      plan: "FREE",
      type: "NONE",
      expiresAt: dayPassRecord?.expiresAt || null,
      updatedAt: new Date().toISOString(),
    },
    sessionVersion: user?.sessionVersion || 1,
    dayPass: {
      active: false,
      startedAt: dayPassRecord?.startedAt || null,
      expiresAt: dayPassRecord?.expiresAt || null,
      secondsRemaining: 0,
      stripeSessionId: dayPassRecord?.stripeCheckoutSessionId,
    },
    updatedAt: sub?.updatedAt || new Date().toISOString(),
  };
}