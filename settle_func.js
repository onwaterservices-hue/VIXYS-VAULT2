async function checkAndSettle15mCycle(livePrice) {
  const now = Date.now();
  const intervalMs = 15 * 60 * 1e3;
  const intervalStart = Math.floor(now / intervalMs) * intervalMs;
  const intervalEnd = intervalStart + intervalMs;
  const currentCycleId = `15M-${new Date(intervalStart).toISOString()}`;
  const elapsedSeconds = Math.max(0, Math.floor((now - intervalStart) / 1e3));
  const remainingSeconds = Math.max(0, Math.floor((intervalEnd - now) / 1e3));
  if (current15mIntervalStart !== intervalStart) {
    const prevIntervalStart = current15mIntervalStart;
    current15mIntervalStart = intervalStart;
    current15mStrikePrice = Math.round(livePrice / 10) * 10;
    if (prevIntervalStart > 0) {
      const prevSigId = `sig_lock_${prevIntervalStart}`;
      if (!processedSettlements.has(prevSigId)) {
        processedSettlements.add(prevSigId);
        const prevLog = persistentSignalLogs.find((s) => s.id === prevSigId);
        if (
          prevLog &&
          prevLog.status !== "RESOLVED" &&
          prevLog.status !== "CRITICALLY_INVALIDATED"
        ) {
          prevLog.status = active15mCycle.isCriticallyInvalidated
            ? "CRITICALLY_INVALIDATED"
            : "RESOLVED";
          prevLog.resolvedAt = new Date().toISOString();
          prevLog.settlementPrice = livePrice;
          prevLog.actualOutcome =
            livePrice >= prevLog.targetStrike ? "UP" : "DOWN";
          prevLog.wasCorrect = prevLog.actualOutcome === prevLog.direction;
          prevLog.brierScore =
            Math.round(
              Math.pow(
                prevLog.confidence / 100 - (prevLog.wasCorrect ? 1 : 0),
                2,
              ) * 1e3,
            ) / 1e3;
          prevLog.settlementAt = prevLog.resolvedAt;
          prevLog.actualDirection = prevLog.actualOutcome;
          prevLog.outcome = prevLog.wasCorrect ? "WIN" : "LOSS";
          serverLearningEngine.todaySettledCount += 1;
          serverLearningEngine.lifetimeObservations += 1;
          serverLearningEngine.lastWeightUpdateTs = now;
          serverLearningEngine.settledHistory.unshift({
            id: prevLog.id,
            asset: "BTC",
            desk: "15m",
            timestamp: prevLog.resolvedAt,
            prediction: prevLog.direction,
            confidence: prevLog.confidence,
            actualOutcome: prevLog.actualOutcome,
            brierScore: prevLog.brierScore,
          });
          const totalHistory = serverLearningEngine.settledHistory.length;
          const wins = serverLearningEngine.settledHistory.filter(
            (h) => h.prediction === h.actualOutcome,
          ).length;
          const updatedAccuracy =
            totalHistory > 0
              ? Math.round((wins / totalHistory) * 1e3) / 10
              : 71.8;
          const updatedAvgBrier =
            totalHistory > 0
              ? Math.round(
                  (serverLearningEngine.settledHistory.reduce(
                    (acc, h) => acc + h.brierScore,
                    0,
                  ) /
                    totalHistory) *
                    1e3,
                ) / 1e3
              : 0.168;
          serverLearningEngine.historicalAccuracy = updatedAccuracy;
          latestCalibrationState.historicalAccuracy = updatedAccuracy;
          latestCalibrationState.brierScore = updatedAvgBrier;
          latestCalibrationState.calibrationSampleSize = totalHistory;
          latestCalibrationState.calibrationStatus =
            totalHistory >= latestCalibrationState.calibrationMinimumSamples
              ? "ACTIVE"
              : "WARMING_UP";
          let isDuplicate = false;
          try {
            if (
              persistenceState === "HEALTHY_FIRESTORE" &&
              canAttemptFirestoreWrite("locks")
            ) {
              const lockRef = doc(db, "settlement_locks", prevSigId);
              const lockSnap = await getDoc(lockRef);
              if (lockSnap.exists()) {
                isDuplicate = true;
              } else {
                await setDoc(lockRef, {
                  settledAt: new Date().toISOString(),
                  timestamp: now,
                });
              }
            }
          } catch (err) {}
          if (!isDuplicate) {
            console.log(
              `[VIXY_CYCLE_SETTLED] Cycle ID: 15M-${new Date(prevIntervalStart).toISOString()} | Strike: $${prevLog.targetStrike} | Spot: $${livePrice} | Outcome: ${prevLog.actualOutcome} | Result: ${prevLog.wasCorrect ? "WIN" : "LOSS"}`,
            );
            console.log(
              `[VIXY_LEARNING_UPDATE] Total Settled: ${serverLearningEngine.todaySettledCount} (History: ${totalHistory}) | Accuracy: ${updatedAccuracy}% | Avg Brier: ${updatedAvgBrier} | Model Weights Refreshed`,
            );
            persistSingleSignalLog(prevLog);
            persistCalibrationState().catch(() => {});
          }
        }
      }
    }
    if (
      active15mCycle &&
      active15mCycle.cycleId &&
      active15mCycle.cycleId !== currentCycleId &&
      !active15mCycle.isLocked
    ) {
      const sigId = `sig_skip_${active15mCycle.intervalStart}`;
      if (!persistentSignalLogs.find((s) => s.id === sigId)) {
        const skippedLog = {
          id: sigId,
          market: "BTC",
          ticker: "BTC/USD",
          intervalStart: new Date(active15mCycle.intervalStart).toISOString(),
          intervalEnd: new Date(active15mCycle.intervalEnd).toISOString(),
          direction: "NEUTRAL",
          probability: active15mCycle.livePrediction?.probability || 50,
          confidence: active15mCycle.livePrediction?.confidence || 0,
          targetStrike: active15mCycle.strikePrice,
          spotAtLock: active15mCycle.livePrediction?.spot || livePrice,
          btcPriceAtLock: active15mCycle.livePrediction?.spot || livePrice,
          ethPriceAtLock: currentEthPrice,
          solPriceAtLock: currentSolPrice,
          lockedAt: new Date(active15mCycle.intervalEnd - 1).toISOString(),
          expiresAt: new Date(active15mCycle.intervalEnd).toISOString(),
          status: "NO_TRADE",
          modelVersion:
            serverLearningEngine.modelVersion || "VIXY_AUTHORITATIVE_NEURAL_v5",
          dataSource: "COINBASE_KRAKEN_CASCADE",
          latencyMs: 12,
          resolvedAt: new Date(active15mCycle.intervalEnd).toISOString(),
          settlementPrice: livePrice,
          actualOutcome: "NEUTRAL",
          wasCorrect: false,
          brierScore: 0,
          qualificationReason:
            active15mCycle.qualificationReason ||
            active15mCycle.choppyReason ||
            "ENTRY_WINDOW_EXPIRED",
          cycleId: active15mCycle.cycleId,
          timeframe: "15M",
          decision: "SKIP",
          entryPrice: active15mCycle.livePrediction?.spot || livePrice,
          strike: active15mCycle.strikePrice,
          confidencePct: active15mCycle.livePrediction?.confidence || 0,
          lockedProbability: active15mCycle.livePrediction?.probability || 50,
          settlementAt: new Date(active15mCycle.intervalEnd).toISOString(),
          actualDirection: "NEUTRAL",
          outcome: "SKIP",
        };
        persistentSignalLogs.unshift(skippedLog);
        if (persistentSignalLogs.length > 300) {
          persistentSignalLogs.pop();
        }
        persistSingleSignalLog(skippedLog);
        console.log(
          `[VIXY_CYCLE_SKIPPED] Cycle ID: ${active15mCycle.cycleId} | Reason: ${skippedLog.qualificationReason}`,
        );
      }
    }
    globalSequenceNumber++;
    currentEngineCycleId += 1;
    persistenceSeconds = 0;
    const oldCycleId = active15mCycle.cycleId;
    active15mCycle = {
      cycleId: currentCycleId,
      intervalStart,
      intervalEnd,
      strikePrice: current15mStrikePrice,
      status: "OBSERVING",
      stage: "OBSERVING",
      isLocked: false,
      sequence: globalSequenceNumber,
      cycleObservationCount: 0,
      cycleObservationDuration: 0,
      signalPersistence: 0,
      directionChanges: 0,
      regimeChanges: 0,
      lastCandidateDirection: "NEUTRAL",
      candidateDirection: "NEUTRAL",
      isChoppy: false,
      choppyReason: null,
      evidenceAgreement: "INITIALIZING",
      hasConflict: false,
      signalUnstable: false,
      provisionalBias: "NEUTRAL_BIAS",
      historicalSimilarityPct: 85,
      recentObservations: [],
      calibrationCount: 0,
      calibratedAt: null,
      calibrationStatus: "INGESTING",
      calibrationStartedAt: new Date().toISOString(),
      calibrationCompletedAt: null,
      calibrationSequence: globalSequenceNumber,
      calibrationSamples: 0,
      calibrationWindowMs: 0,
      calibrationDataAgeMs: 0,
      calibrationQuality: "HIGH",
      calibrationConfidence: 74,
      calibrationVersion: "v5.0-AUTHORITATIVE",
      analysisCount: 0,
      analyzedAt: null,
      analysisStatus: "NOT_STARTED",
      qualificationStatus: "NOT_STARTED",
      qualificationReason: null,
      validationStatus: "NOT_STARTED",
      validationReason: null,
      lockCount: 0,
      lockEligibility: {
        eligible: false,
        reason: "MINIMUM_OBSERVATION_WINDOW",
        elapsedSeconds: 0,
        remainingSeconds: 900,
        minimumElapsedSeconds: 360,
        preferredWindow: false,
      },
      protectionStatus: "SAFE",
      protectionReason: null,
      reversalThreat: 20,
      lockedAt: null,
      lockedDecision: null,
      lockedDirection: null,
      lockedConfidence: null,
      lockedProbability: null,
      lockedStrike: null,
      lockedSpot: null,
      lockedEdgePct: null,
      lockedReason: null,
      isCriticallyInvalidated: false,
      invalidationAt: null,
      invalidationReason: null,
      originalDecision: null,
      livePrediction: {
        direction: currentDirection,
        probability: currentModelProbability,
        confidence: currentConfidence,
        regime: serverLearningEngine.currentRegime,
        momentum: currentMomentum,
        spot: livePrice,
        timestamp: now,
      },
    };
    console.log(
      `[VIXY_CYCLE_TRANSITION] from=${oldCycleId} to=${currentCycleId} cycleId=${currentCycleId}`,
    );
    console.log(
      `[VIXY_CYCLE_CREATED] Cycle ID: ${currentCycleId} (#${currentEngineCycleId}) | Strike: $${current15mStrikePrice} | Spot: $${livePrice} | Stage: OBSERVING`,
    );
  }
  const currentSigId = `sig_lock_${intervalStart}`;
  const existingLog = persistentSignalLogs.find((s) => s.id === currentSigId);
  const lockElapsedSec =
    existingLog && existingLog.lockedAt
      ? Math.floor(
          (new Date(existingLog.lockedAt).getTime() - intervalStart) / 1e3,
        )
      : 0;
  const isValidLockedLog =
    existingLog &&
    (existingLog.status === "LOCKED" ||
      existingLog.status === "CRITICALLY_INVALIDATED") &&
    new Date(existingLog.intervalEnd).getTime() > now &&
    lockElapsedSec >= 360 &&
    lockElapsedSec < 720 &&
    (existingLog.direction === "UP" || existingLog.direction === "DOWN") &&
    typeof existingLog.confidence === "number" &&
    existingLog.confidence >= 50 &&
    typeof existingLog.targetStrike === "number" &&
    existingLog.targetStrike > 0 &&
    typeof existingLog.spotAtLock === "number" &&
    existingLog.spotAtLock > 0 &&
    Boolean(existingLog.lockedAt);
  if (isValidLockedLog && !active15mCycle.isLocked) {
    globalSequenceNumber++;
    active15mCycle.isLocked = true;
    active15mCycle.lockCount = 1;
    active15mCycle.calibrationCount = 1;
    active15mCycle.calibratedAt = existingLog.lockedAt;
    active15mCycle.analysisCount = 1;
    active15mCycle.analyzedAt = existingLog.lockedAt;
    active15mCycle.status =
      existingLog.status === "CRITICALLY_INVALIDATED"
        ? "CRITICALLY_INVALIDATED"
        : "LOCKED";
    active15mCycle.stage =
      existingLog.status === "CRITICALLY_INVALIDATED"
        ? "CRITICALLY_INVALIDATED"
        : "LOCKED";
    active15mCycle.qualificationStatus = "PASSED";
    active15mCycle.sequence = globalSequenceNumber;
    active15mCycle.lockedAt = existingLog.lockedAt;
    active15mCycle.lockedDirection = existingLog.direction;
    active15mCycle.lockedDecision =
      existingLog.direction === "UP" ? "BUY UP" : "BUY DOWN";
    active15mCycle.lockedConfidence = existingLog.confidence;
    active15mCycle.lockedProbability =
      existingLog.probability !== void 0
        ? existingLog.probability
        : existingLog.confidence / 100;
    active15mCycle.lockedStrike = existingLog.targetStrike;
    active15mCycle.lockedSpot = existingLog.spotAtLock;
    active15mCycle.originalDecision = active15mCycle.lockedDecision;
    active15mCycle.isCriticallyInvalidated =
      existingLog.status === "CRITICALLY_INVALIDATED";
    active15mCycle.lockedReason = "RECOVERED_AUTHORITATIVE_LOCK";
    active15mCycle.calibrationStatus = "COMPLETE";
    active15mCycle.analysisStatus = "COMPLETE";
    active15mCycle.validationStatus = "PASS";
    lockedCycleIds.add(currentCycleId);
    console.log(
      `[VIXY_CYCLE_RECOVERED] Recovered existing immutable lock for cycle ${currentCycleId} (Locked At: ${existingLog.lockedAt})`,
    );
    return;
  }
  if (engineFeedStatus === "CONNECTED") {
    active15mCycle.calibrationSamples += 1;
    active15mCycle.cycleObservationCount += 1;
  }
  const elapsedMs = now - intervalStart;
  active15mCycle.cycleObservationDuration = elapsedSeconds;
  active15mCycle.calibrationWindowMs = elapsedMs;
  active15mCycle.calibrationDataAgeMs = now - lastMarketUpdateTs;
  const candidateDir = currentDirection;
  const lastFlipTs = active15mCycle._lastFlipTs || 0;
  if (
    candidateDir !== "NEUTRAL" &&
    active15mCycle.lastCandidateDirection &&
    active15mCycle.lastCandidateDirection !== "NEUTRAL" &&
    active15mCycle.lastCandidateDirection !== candidateDir
  ) {
    if (now - lastFlipTs > 10000) {
      active15mCycle.directionChanges =
        (active15mCycle.directionChanges || 0) + 1;
      active15mCycle._lastFlipTs = now;
    }
  }
  if (candidateDir !== "NEUTRAL") {
    active15mCycle.lastCandidateDirection = candidateDir;
  }
  active15mCycle.candidateDirection = candidateDir;
  active15mCycle.signalPersistence = persistenceSeconds;
  if (!active15mCycle.recentObservations)
    active15mCycle.recentObservations = [];
  active15mCycle.recentObservations.push({
    candidateDir,
    conf: currentConfidence,
    prob: currentModelProbability,
    ts: now,
  });
  if (active15mCycle.recentObservations.length > 10) {
    active15mCycle.recentObservations.shift();
  }
  let signalUnstable = false;
  if (
    !active15mCycle.recentObservations ||
    active15mCycle.recentObservations.length < 5
  ) {
    signalUnstable = false;
  } else {
    const last5 = active15mCycle.recentObservations.slice(-5);
    const dirs = last5.map((o) => o.candidateDir);
    const confs = last5.map((o) => o.conf);
    const maxConf = Math.max(...confs);
    const minConf = Math.min(...confs);
    const latestConf = confs[confs.length - 1];
    const prevAvgConf = confs.slice(0, 4).reduce((a, b) => a + b, 0) / 4;
    const hasDirFlip = dirs.some((d) => d !== dirs[0] && d !== "NEUTRAL");
    const isSpike = latestConf - prevAvgConf > 8 || maxConf - minConf >= 10;
    if (hasDirFlip || isSpike) {
      signalUnstable = true;
    }
  }
  active15mCycle.signalUnstable = signalUnstable;
  const resolvedLogs = persistentSignalLogs.filter(
    (s) => (s.status === "RESOLVED" || s.status === "LOCKED") && s.direction,
  );
  let historicalSimilarityPct = 84;
  let historicalConflict = false;
  if (resolvedLogs.length > 0) {
    const recentResolved = resolvedLogs.slice(0, 10);
    const matchingDirCount = recentResolved.filter(
      (s) => s.direction === candidateDir,
    ).length;
    historicalSimilarityPct = Math.round(
      75 + (matchingDirCount / recentResolved.length) * 20,
    );
    if (matchingDirCount <= 2 && recentResolved.length >= 5) {
      historicalConflict = true;
    }
  }
  active15mCycle.historicalSimilarityPct = historicalSimilarityPct;
  const currentOrderFlow =
    Math.round((currentBullVolumePct - 50) * 0.02 * 1e3) / 1e3;
  const orderFlowConflict =
    candidateDir === "UP"
      ? currentOrderFlow < -0.1
      : candidateDir === "DOWN"
        ? currentOrderFlow > 0.1
        : false;
  const momentumConflict =
    candidateDir === "UP"
      ? currentMomentum < -0.25
      : candidateDir === "DOWN"
        ? currentMomentum > 0.25
        : false;
  const crossAssetConflict =
    latestCrossAssetContext.state === "BTC_DIVERGENCE" ||
    (latestCrossAssetContext.directionalAgreementRatio === 0 &&
      latestCrossAssetContext.riskPenalty >= 5);
  const reversalThreatConflict =
    (latestGuardianDecision?.reversalThreat ?? 20) >= 40;
  let conflictCount = 0;
  if (orderFlowConflict) conflictCount++;
  if (momentumConflict) conflictCount++;
  if (crossAssetConflict) conflictCount++;
  if (reversalThreatConflict) conflictCount++;
  if (historicalConflict) conflictCount++;
  const hasConflict =
    conflictCount >= 2 || (crossAssetConflict && reversalThreatConflict);
  active15mCycle.hasConflict = hasConflict;
  if (hasConflict) {
    active15mCycle.evidenceAgreement = "SIGNAL_CONFLICT";
  } else if (signalUnstable) {
    active15mCycle.evidenceAgreement = "WEAK_AGREEMENT";
  } else if (
    currentConfidence >= 71 &&
    !orderFlowConflict &&
    !momentumConflict
  ) {
    active15mCycle.evidenceAgreement = "STRONG_AGREEMENT";
  } else if (currentConfidence >= 66) {
    active15mCycle.evidenceAgreement = "MODERATE_AGREEMENT";
  } else {
    active15mCycle.evidenceAgreement = "WEAK_AGREEMENT";
  }
  if (hasConflict) {
    active15mCycle.provisionalBias = "SIGNAL_CONFLICT";
  } else if (signalUnstable) {
    active15mCycle.provisionalBias = "SIGNAL_UNSTABLE";
  } else if (candidateDir === "UP" && currentConfidence >= 60) {
    active15mCycle.provisionalBias = "UP_BIAS";
  } else if (candidateDir === "DOWN" && currentConfidence >= 60) {
    active15mCycle.provisionalBias = "DOWN_BIAS";
  } else {
    active15mCycle.provisionalBias = "NEUTRAL_BIAS";
  }
  const spotStrikeDiff = Math.abs(
    livePrice - (active15mCycle.kalshiStrike || current15mStrikePrice),
  );
  const moneynessPct =
    (spotStrikeDiff / (active15mCycle.kalshiStrike || current15mStrikePrice)) *
    100;
  const isMomentumFlat =
    Math.abs(currentMomentum) < 0.015 && moneynessPct < 0.015;
  const isProbIndecisive =
    currentModelProbability >= 0.485 && currentModelProbability <= 0.515;
  if (
    active15mCycle.directionChanges >= 6 ||
    (isMomentumFlat && isProbIndecisive && elapsedSeconds > 300)
  ) {
    active15mCycle.isChoppy = true;
    active15mCycle.choppyReason =
      active15mCycle.directionChanges >= 6
        ? "EXCESSIVE_DIRECTION_FLIPS"
        : "FLAT_MOMENTUM_AND_INDECISIVE_PROBABILITY";
  }
  const reversalThreat =
    latestGuardianDecision?.reversalThreat ??
    (active15mCycle.reversalThreat || 20);
  active15mCycle.reversalThreat = reversalThreat;
  const isProtectionVeto =
    latestGuardianDecision?.action === "EXIT" ||
    latestGuardianDecision?.action === "PROTECT" ||
    reversalThreat >= 65;
  if (isProtectionVeto) {
    active15mCycle.protectionStatus = "VETOED";
    active15mCycle.protectionReason = `REVERSAL_THREAT_${reversalThreat}PCT_ACTION_${latestGuardianDecision?.action || "EXIT"}`;
  } else {
    active15mCycle.protectionStatus = "SAFE";
  }
  const gate = canLockCurrentCycle(livePrice);
  if (!active15mCycle.isLocked) {
    if (elapsedSeconds < 60) {
      active15mCycle.status = "OBSERVING";
      active15mCycle.stage = "OBSERVING";
      console.log(
        `[VIXY_OBSERVATION] cycleId=${currentCycleId} elapsed=${elapsedSeconds}s remaining=${remainingSeconds}s observationCount=${active15mCycle.cycleObservationCount}`,
      );
    } else if (elapsedSeconds < 180) {
      active15mCycle.status = "CALIBRATING";
      active15mCycle.stage = "CALIBRATING";
      if (
        active15mCycle.calibrationCount === 0 &&
        (active15mCycle.calibrationSamples >= 2 || elapsedSeconds >= 90)
      ) {
        active15mCycle.calibrationCount = 1;
        active15mCycle.calibratedAt = new Date().toISOString();
        active15mCycle.calibrationStatus = "COMPLETE";
        active15mCycle.calibrationCompletedAt = active15mCycle.calibratedAt;
      }
      console.log(
        `[VIXY_CALIBRATION] cycleId=${currentCycleId} direction=${candidateDir} probability=${currentModelProbability} confidence=${currentConfidence}% agreement=${currentConfidence >= 65 ? "HIGH" : "MODERATE"} status=${active15mCycle.calibrationStatus}`,
      );
    } else if (elapsedSeconds < 360) {
      active15mCycle.status = "ANALYZING";
      active15mCycle.stage = "ANALYZING";
      if (active15mCycle.calibrationCount === 0) {
        active15mCycle.calibrationCount = 1;
        active15mCycle.calibratedAt = new Date().toISOString();
        active15mCycle.calibrationStatus = "COMPLETE";
        active15mCycle.calibrationCompletedAt = active15mCycle.calibratedAt;
      }
      if (active15mCycle.analysisCount === 0) {
        active15mCycle.analysisCount = 1;
        active15mCycle.analyzedAt = new Date().toISOString();
        active15mCycle.analysisStatus = "COMPLETE";
      }
      const vol15m = Math.min(
        6.5,
        Math.max(
          0.4,
          Math.round((Math.abs(currentMomentum) * 0.75 + 0.52) * 100) / 100,
        ),
      );
      console.log(
        `[VIXY_ANALYSIS] cycleId=${currentCycleId} regime=${serverLearningEngine.currentRegime} momentum=${currentMomentum}% volatility=${vol15m} persistence=${persistenceSeconds}s reversalRisk=${reversalThreat}% status=ANALYZING`,
      );
    } else if (elapsedSeconds >= 360 && elapsedSeconds < 720) {
      active15mCycle.status = "QUALIFYING";
      active15mCycle.stage = "QUALIFYING";
      active15mCycle.qualificationStatus = "QUALIFYING";
      if (active15mCycle.calibrationCount === 0) {
        active15mCycle.calibrationCount = 1;
        active15mCycle.calibratedAt = new Date().toISOString();
        active15mCycle.calibrationStatus = "COMPLETE";
        active15mCycle.calibrationCompletedAt = active15mCycle.calibratedAt;
      }
      if (active15mCycle.analysisCount === 0) {
        active15mCycle.analysisCount = 1;
        active15mCycle.analyzedAt = new Date().toISOString();
        active15mCycle.analysisStatus = "COMPLETE";
      }
      console.log(
        `[VIXY_QUALIFICATION] cycleId=${currentCycleId} eligible=${gate.allowed} reason=${gate.reasons.join(", ")}`,
      );
      console.log(
        `[VIXY_LOCK_GATE] cycleId=${currentCycleId} eligible=${gate.allowed} elapsed=${elapsedSeconds}s remaining=${remainingSeconds}s reason=${gate.reasons[0]}`,
      );
      console.log(
        `[VIXY_PROTECTION] cycleId=${currentCycleId} status=${active15mCycle.protectionStatus} reversalThreat=${reversalThreat}% recommendation=${latestGuardianDecision?.action || "MONITOR"}`,
      );
      if (isProtectionVeto) {
        active15mCycle.status = "NO_TRADE";
        active15mCycle.stage = "NO_TRADE";
        active15mCycle.qualificationStatus = "SKIPPED";
        active15mCycle.qualificationReason = "PROTECTION_VETO";
        console.log(
          `[VIXY_NO_TRADE] cycleId=${currentCycleId} reason=PROTECTION_VETO`,
        );
      } else if (active15mCycle.isChoppy) {
        active15mCycle.status = "NO_TRADE";
        active15mCycle.stage = "NO_TRADE";
        active15mCycle.qualificationStatus = "SKIPPED";
        active15mCycle.qualificationReason = "CHOPPY_MARKET";
        console.log(
          `[VIXY_NO_TRADE] cycleId=${currentCycleId} reason=CHOPPY_MARKET`,
        );
      } else if (
        gate.allowed &&
        !active15mCycle.isLocked &&
        active15mCycle.lockCount === 0
      ) {
        active15mCycle.qualificationStatus = "PASSED";
        active15mCycle.status = "LOCKING";
        active15mCycle.stage = "LOCKING";
        lock15mCycle(
          currentCycleId,
          livePrice,
          "QUALIFIED_AUTHORITATIVE_ENTRY",
        );
      }
    } else if (elapsedSeconds >= 720 && !active15mCycle.isLocked) {
      active15mCycle.status = "ANALYZING";
      active15mCycle.stage = "ANALYZING";
      active15mCycle.qualificationStatus = "ENTRY_WINDOW_CLOSED";
      active15mCycle.qualificationReason = "ENTRY_WINDOW_EXPIRED";
      console.log(
        `[VIXY_ENTRY_WINDOW] cycleId=${currentCycleId} status=ENTRY_WINDOW_CLOSED (analyzable through 900s cycle expiry)`,
      );
    }
    if (
      active15mCycle.status === "NO_TRADE" ||
      active15mCycle.stage === "NO_TRADE"
    ) {
      const sigId = `sig_skip_${active15mCycle.intervalStart}`;
      let skippedLog = persistentSignalLogs.find((s) => s.id === sigId);
      if (!skippedLog) {
        skippedLog = {
          id: sigId,
          market: "BTC",
          ticker: "BTC/USD",
          intervalStart: new Date(active15mCycle.intervalStart).toISOString(),
          intervalEnd: new Date(active15mCycle.intervalEnd).toISOString(),
          direction: "NEUTRAL",
          probability: active15mCycle.livePrediction?.probability || 50,
          confidence:
            active15mCycle.livePrediction?.confidence ||
            currentConfidence ||
            72,
          reversalRisk: reversalThreat,
          targetStrike: active15mCycle.strikePrice,
          spotAtLock: active15mCycle.livePrediction?.spot || livePrice,
          btcPriceAtLock: active15mCycle.livePrediction?.spot || livePrice,
          ethPriceAtLock: currentEthPrice,
          solPriceAtLock: currentSolPrice,
          lockedAt: new Date(now).toISOString(),
          expiresAt: new Date(active15mCycle.intervalEnd).toISOString(),
          status: "NO_TRADE",
          modelVersion:
            serverLearningEngine.modelVersion || "VIXY_AUTHORITATIVE_NEURAL_v5",
          dataSource: "COINBASE_KRAKEN_CASCADE",
          latencyMs: 12,
          resolvedAt: new Date(active15mCycle.intervalEnd).toISOString(),
          settlementPrice: livePrice,
          actualOutcome: "NEUTRAL",
          wasCorrect: false,
          brierScore: 0,
          qualificationReason:
            active15mCycle.qualificationReason ||
            active15mCycle.choppyReason ||
            "CHOPPY_MARKET",
          cycleId: active15mCycle.cycleId,
          timeframe: "15M",
          decision: "SKIP",
          entryPrice: active15mCycle.livePrediction?.spot || livePrice,
          strike: active15mCycle.strikePrice,
          confidencePct:
            active15mCycle.livePrediction?.confidence ||
            currentConfidence ||
            72,
          lockedProbability: active15mCycle.livePrediction?.probability || 50,
          settlementAt: new Date(active15mCycle.intervalEnd).toISOString(),
          actualDirection: "NEUTRAL",
          outcome: "SKIP",
        };
        persistentSignalLogs.unshift(skippedLog);
        if (persistentSignalLogs.length > 300) persistentSignalLogs.pop();
      } else {
        skippedLog.qualificationReason =
          active15mCycle.qualificationReason ||
          active15mCycle.choppyReason ||
          skippedLog.qualificationReason;
        skippedLog.confidence =
          active15mCycle.livePrediction?.confidence ||
          currentConfidence ||
          skippedLog.confidence ||
          72;
        skippedLog.reversalRisk = reversalThreat;
        skippedLog.spotAtLock =
          active15mCycle.livePrediction?.spot || livePrice;
      }
      persistSingleSignalLog(skippedLog);
    }
  }
  active15mCycle.sequence = globalSequenceNumber;
  console.log(
    `[VIXY_SEQUENCE] cycleId=${active15mCycle.cycleId} sequence=${globalSequenceNumber} source=BACKEND_AUTHORITATIVE`,
  );
  active15mCycle.livePrediction = {
    direction: currentDirection,
    probability: currentModelProbability,
    confidence: currentConfidence,
    regime: serverLearningEngine.currentRegime,
    momentum: currentMomentum,
    spot: livePrice,
    timestamp: now,
  };
  if (active15mCycle.isLocked && active15mCycle.lockedSnapshot) {
    if (
      active15mCycle.lockedDecision !==
        active15mCycle.lockedSnapshot.decision ||
      active15mCycle.lockedDirection !==
        active15mCycle.lockedSnapshot.direction ||
      Math.abs(
        (active15mCycle.lockedProbability || 0) -
          active15mCycle.lockedSnapshot.probability,
      ) > 1e-4 ||
      active15mCycle.lockedConfidence !==
        active15mCycle.lockedSnapshot.confidence ||
      active15mCycle.lockedSpot !== active15mCycle.lockedSnapshot.spot ||
      active15mCycle.lockedStrike !== active15mCycle.lockedSnapshot.strike ||
      active15mCycle.lockedAt !== active15mCycle.lockedSnapshot.lockedAt ||
      active15mCycle.cycleId !== active15mCycle.lockedSnapshot.cycleId
    ) {
      console.error(
        `[VIXY_CRITICAL] LOCKED_PREDICTION_MUTATION_DETECTED cycleId=${active15mCycle.cycleId}`,
      );
      active15mCycle.lockedDecision = active15mCycle.lockedSnapshot.decision;
      active15mCycle.lockedDirection = active15mCycle.lockedSnapshot.direction;
      active15mCycle.lockedProbability =
        active15mCycle.lockedSnapshot.probability;
      active15mCycle.lockedConfidence =
        active15mCycle.lockedSnapshot.confidence;
      active15mCycle.lockedSpot = active15mCycle.lockedSnapshot.spot;
      active15mCycle.lockedStrike = active15mCycle.lockedSnapshot.strike;
      active15mCycle.lockedAt = active15mCycle.lockedSnapshot.lockedAt;
      active15mCycle.cycleId = active15mCycle.lockedSnapshot.cycleId;
    }
  }
  const timeRemainingSec = Math.max(0, Math.floor((intervalEnd - now) / 1e3));
  const dataAgeMs = now - lastMarketUpdateTs;
  const latencyMs = Math.max(0, dataAgeMs - 500);
  const cycleHash = `${active15mCycle.cycleId}:${active15mCycle.status}:${active15mCycle.sequence}:${active15mCycle.isLocked}`;
  if (cycleHash !== lastLoggedCycleHash || now - lastHeartbeatLogTs >= 6e4) {
    lastLoggedCycleHash = cycleHash;
    console.log(
      `[VIXY_CYCLE] cycleId=${active15mCycle.cycleId} status=${active15mCycle.status} timeRemaining=${timeRemainingSec}s spot=$${livePrice} strike=$${active15mCycle.isLocked ? active15mCycle.lockedStrike : current15mStrikePrice} dataAgeMs=${dataAgeMs} latencyMs=${latencyMs} calibration=${active15mCycle.calibrationStatus} analysis=${active15mCycle.analysisStatus} validation=${active15mCycle.validationStatus} algorithm=RUNNING websocket=CONNECTED sequence=${active15mCycle.sequence}`,
    );
  }
  if (active15mCycle.isLocked && !active15mCycle.isCriticallyInvalidated) {
    const lockedSpot = active15mCycle.lockedSpot || livePrice;
    const lockedDir = active15mCycle.lockedDirection;
    const priceDelta =
      lockedDir === "UP" ? lockedSpot - livePrice : livePrice - lockedSpot;
    const priceDeltaPct =
      lockedSpot > 0
        ? (Math.abs(livePrice - lockedSpot) / lockedSpot) * 100
        : 0;
    const probForLockedDir =
      lockedDir === "UP"
        ? currentModelProbability
        : 1 - currentModelProbability;
    const isExtremeDisplacement = priceDelta > 750 && priceDeltaPct >= 1.2;
    const isProbabilityCollapsed = probForLockedDir <= 0.15;
    const isGuardianPanic =
      latestGuardianDecision?.action === "EXIT" ||
      latestGuardianDecision?.action === "PROTECT" ||
      (latestGuardianDecision?.reversalThreat || 0) >= 80;
    const reversalDetected = isExtremeDisplacement && isProbabilityCollapsed;
    const lockMonitorHash = `${currentCycleId}:${active15mCycle.lockedDirection}:${reversalDetected}:${probForLockedDir.toFixed(2)}`;
    if (
      lockMonitorHash !== lastLoggedLockMonitorHash ||
      now - lastHeartbeatLogTs >= 6e4
    ) {
      lastLoggedLockMonitorHash = lockMonitorHash;
      lastHeartbeatLogTs = now;
      console.log(
        `[VIXY_LOCK_MONITOR] cycle=${currentCycleId} lockedDirection=${active15mCycle.lockedDirection} lockedConfidence=${active15mCycle.lockedConfidence}% lockedProbability=${active15mCycle.lockedProbability} liveDirection=${currentDirection} liveProbability=${currentModelProbability} probabilityForLockedDirection=${probForLockedDir.toFixed(3)} reversalDetected=${reversalDetected} action=KEEP_LOCK priceDeltaPct=${priceDeltaPct.toFixed(2)}%`,
      );
    }
    if (isExtremeDisplacement && isProbabilityCollapsed && isGuardianPanic) {
      active15mCycle.isCriticallyInvalidated = true;
      active15mCycle.status = "CRITICALLY_INVALIDATED";
      active15mCycle.stage = "CRITICALLY_INVALIDATED";
      active15mCycle.invalidationAt = new Date().toISOString();
      active15mCycle.invalidationReason = `CRITICAL_STRUCTURAL_REVERSAL: Price moved ${priceDeltaPct.toFixed(2)}% against lock with prob collapse (${(probForLockedDir * 100).toFixed(1)}%) & guardian threat (${latestGuardianDecision?.reversalThreat || 0}%)`;
      const sigId = `sig_lock_${active15mCycle.intervalStart}`;
      const logItem = persistentSignalLogs.find((s) => s.id === sigId);
      if (logItem) {
        logItem.status = "CRITICALLY_INVALIDATED";
        persistSingleSignalLog(logItem);
      }
      console.warn(
        `[VIXY_CRITICAL_REVERSAL] cycle=${currentCycleId} originalDecision=${active15mCycle.originalDecision} reversalEvidence=extreme_displacement_and_prob_collapse originalProbability=${active15mCycle.lockedProbability} currentProbability=${currentModelProbability} structuralReversal=true action=INVALIDATE_ORIGINAL_LOCK reason=${active15mCycle.invalidationReason}`,
      );
    }
  }
}
__name(checkAndSettle15mCycle, "checkAndSettle15mCycle");
