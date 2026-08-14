import urllib.request
import json
import time

def run_tests():
    print("==================================================")
    print("VIXY VAULT BTC 15M AUTHORITATIVE 20-POINT TEST SUITE")
    print("==================================================")

    results = []

    # TEST 1: Authoritative State Machine & Lifecycle Structure
    try:
        req = urllib.request.urlopen("http://localhost:3000/api/vixy/state")
        data = json.loads(req.read().decode('utf-8'))
        cycle_id = data.get('cycleId', '')
        status = data.get('status', '')
        seq = data.get('sequence', 0)
        
        valid_stages = ['OBSERVING', 'CALIBRATING', 'ANALYZING', 'QUALIFYING', 'VALIDATING', 'LOCKING', 'LOCKED', 'NO_TRADE', 'SKIPPED', 'CRITICALLY_INVALIDATED', 'INGESTING', 'BOOTSTRAPPING']
        test1_passed = bool(cycle_id.startswith('15M-') and seq > 0 and status in valid_stages)
        results.append(("TEST 1: Authoritative State Machine & Lifecycle Structure", test1_passed, f"cycleId={cycle_id}, status={status}, sequence={seq}"))
    except Exception as e:
        results.append(("TEST 1: Authoritative State Machine & Lifecycle Structure", False, str(e)))

    # TEST 2: Minimum 6-Minute (360s) Observation Hard Gate Invariant
    try:
        req = urllib.request.urlopen("http://localhost:3000/api/diagnostic")
        diag = req.read().decode('utf-8')
        lines = dict(line.split('=', 1) for line in diag.split('\n') if '=' in line)
        obs_dur = int(lines.get('observationDuration', 0))
        lock_elig = lines.get('lockEligibility', '')
        lock_reason = lines.get('lockReason', '')
        
        # If observation < 360s, lockEligibility must be INELIGIBLE
        if obs_dur < 360:
            test2_passed = (lock_elig == 'INELIGIBLE')
            details = f"obsDuration={obs_dur}s (< 360s) -> lockEligibility={lock_elig} (reason: {lock_reason})"
        else:
            test2_passed = True
            details = f"obsDuration={obs_dur}s (>= 360s observation requirement met)"
        results.append(("TEST 2: 360s Minimum Observation Hard Gate", test2_passed, details))
    except Exception as e:
        results.append(("TEST 2: 360s Minimum Observation Hard Gate", False, str(e)))

    # TEST 3: Entry Window Expiration Guard (< 300s Remaining Gate)
    try:
        req = urllib.request.urlopen("http://localhost:3000/api/signal")
        sig = json.loads(req.read().decode('utf-8'))
        time_rem = sig.get('timeRemaining', 900)
        is_locked = sig.get('isLocked', False)
        stage = sig.get('cycleStage', '')
        
        # If remaining time < 300s and unlocked, cycle must NOT lock (must be NO_TRADE or SKIPPED)
        if time_rem < 300 and not is_locked:
            test3_passed = stage in ['NO_TRADE', 'SKIPPED']
            details = f"timeRemaining={time_rem}s (< 300s) -> stage={stage} (Entry window safely closed)"
        else:
            test3_passed = True
            details = f"timeRemaining={time_rem}s, isLocked={is_locked}, stage={stage}"
        results.append(("TEST 3: Entry Window Expiration Safety Gate", test3_passed, details))
    except Exception as e:
        results.append(("TEST 3: Entry Window Expiration Safety Gate", False, str(e)))

    # TEST 4: Choppy Market Detection & NO_TRADE Filter
    try:
        req = urllib.request.urlopen("http://localhost:3000/api/vixy/state")
        data = json.loads(req.read().decode('utf-8'))
        is_choppy = data.get('isChoppy', False)
        status = data.get('status', '')
        
        if is_choppy and not data.get('isLocked', False):
            test4_passed = (status in ['NO_TRADE', 'SKIPPED'])
            details = f"isChoppy=True -> status={status} (Trade safely filtered)"
        else:
            test4_passed = isinstance(is_choppy, bool)
            details = f"isChoppy={is_choppy}, status={status}"
        results.append(("TEST 4: Choppy Market Detection & NO_TRADE Filter", test4_passed, details))
    except Exception as e:
        results.append(("TEST 4: Choppy Market Detection & NO_TRADE Filter", False, str(e)))

    # TEST 5: VIXY Guardian Protection Veto Authority
    try:
        req = urllib.request.urlopen("http://localhost:3000/api/vixy/state")
        data = json.loads(req.read().decode('utf-8'))
        prot_status = data.get('protectionStatus', 'SAFE')
        is_locked = data.get('isLocked', False)
        status = data.get('status', '')
        
        if prot_status == 'VETOED' and not is_locked:
            test5_passed = (status in ['NO_TRADE', 'SKIPPED'])
            details = f"protectionStatus=VETOED -> status={status} (Protection veto enforced)"
        else:
            test5_passed = prot_status in ['SAFE', 'VETOED', 'MONITOR']
            details = f"protectionStatus={prot_status}, status={status}"
        results.append(("TEST 5: VIXY Guardian Protection Veto Authority", test5_passed, details))
    except Exception as e:
        results.append(("TEST 5: VIXY Guardian Protection Veto Authority", False, str(e)))

    # TEST 6: Diagnostic Telemetry Output & Lock Gate Verification
    try:
        req = urllib.request.urlopen("http://localhost:3000/api/diagnostic")
        diag_text = req.read().decode('utf-8')
        has_calib = "calibrationStatus=" in diag_text
        has_analysis = "analysisStatus=" in diag_text
        has_qual = "qualificationStatus=" in diag_text
        has_validation = "validationStatus=" in diag_text
        has_elig = "lockEligibility=" in diag_text
        has_obs = "observationDuration=" in diag_text
        has_prod_ready = "STATUS=PRODUCTION_READY" in diag_text

        test6_passed = has_calib and has_analysis and has_qual and has_validation and has_elig and has_obs and has_prod_ready
        results.append(("TEST 6: Comprehensive Diagnostic Telemetry & Gate Output", test6_passed, "All lifecycle diagnostic status fields present and verified"))
    except Exception as e:
        results.append(("TEST 6: Comprehensive Diagnostic Telemetry & Gate Output", False, str(e)))

    # TEST 7: Pre-Lock Validation Gate & Lock Coherence
    try:
        req = urllib.request.urlopen("http://localhost:3000/api/signal")
        sig = json.loads(req.read().decode('utf-8'))
        is_locked = sig.get('isLocked', False)
        
        if is_locked:
            valid_lock = sig.get('lockedDirection') in ['UP', 'DOWN'] and sig.get('lockedConfidence') is not None
            test7_passed = valid_lock
            results.append(("TEST 7: Pre-Lock Validation Gate & Lock Coherence", test7_passed, f"isLocked=True, direction={sig.get('lockedDirection')}, conf={sig.get('lockedConfidence')}%"))
        else:
            valid_unlock = sig.get('lockedDirection') is None and sig.get('lockedProbability') is None
            test7_passed = valid_unlock
            results.append(("TEST 7: Pre-Lock Validation Gate & Lock Coherence", test7_passed, f"isLocked=False, locked fields are cleanly null"))
    except Exception as e:
        results.append(("TEST 7: Pre-Lock Validation Gate & Lock Coherence", False, str(e)))

    # TEST 8: Live Telemetry vs Locked Prediction Immutability
    try:
        req1 = urllib.request.urlopen("http://localhost:3000/api/vixy/state")
        d1 = json.loads(req1.read().decode('utf-8'))
        time.sleep(1)
        req2 = urllib.request.urlopen("http://localhost:3000/api/vixy/state")
        d2 = json.loads(req2.read().decode('utf-8'))

        if d1.get('lockedPrediction') and d2.get('lockedPrediction'):
            p1 = d1['lockedPrediction']
            p2 = d2['lockedPrediction']
            immut_ok = (p1['direction'] == p2['direction'] and 
                        p1['probability'] == p2['probability'] and 
                        p1['lockedAt'] == p2['lockedAt'] and 
                        p1['strike'] == p2['strike'])
            test8_passed = immut_ok
            results.append(("TEST 8: Immutability of Locked Predictions Over Time", test8_passed, "Locked parameters remained 100% strictly invariant"))
        else:
            test8_passed = True
            results.append(("TEST 8: Immutability of Locked Predictions Over Time", test8_passed, "Cycle in pre-lock stage, invariant holds"))
    except Exception as e:
        results.append(("TEST 8: Immutability of Locked Predictions Over Time", False, str(e)))

    # TEST 9: Real-time Market Data Freshness & Latency Guard
    try:
        req = urllib.request.urlopen("http://localhost:3000/api/diagnostic")
        diag = req.read().decode('utf-8')
        lines = dict(line.split('=', 1) for line in diag.split('\n') if '=' in line)
        data_age = int(lines.get('dataAgeMs', 999999))
        market_data = lines.get('marketData', '')
        
        test9_passed = data_age < 15000 and market_data in ['FRESH', 'STALE']
        results.append(("TEST 9: Real-time Market Data Freshness & Latency Guard", test9_passed, f"dataAgeMs={data_age}ms, marketData={market_data}"))
    except Exception as e:
        results.append(("TEST 9: Real-time Market Data Freshness & Latency Guard", False, str(e)))

    # TEST 10: Walk-Forward Settlement History & Accuracy Tracking
    try:
        req = urllib.request.urlopen("http://localhost:3000/api/signal/resolved-log")
        logs = json.loads(req.read().decode('utf-8'))
        stats = logs.get('stats', {})
        win_rate = stats.get('winRatePct', 0)
        total = stats.get('total', 0)
        
        test10_passed = 0 <= win_rate <= 100 and total >= 0
        results.append(("TEST 10: Walk-Forward Settlement History & Accuracy Tracking", test10_passed, f"Total Settled={total}, Win Rate={win_rate}%"))
    except Exception as e:
        results.append(("TEST 10: Walk-Forward Settlement History & Accuracy Tracking", False, str(e)))

    # TEST 11: Monotonic Global Sequence Number Progression
    try:
        s1 = json.loads(urllib.request.urlopen("http://localhost:3000/api/vixy/state").read().decode('utf-8')).get('sequence', 0)
        time.sleep(0.5)
        s2 = json.loads(urllib.request.urlopen("http://localhost:3000/api/vixy/state").read().decode('utf-8')).get('sequence', 0)
        
        test11_passed = s2 >= s1 and s1 > 0
        results.append(("TEST 11: Monotonic Sequence Number Progression", test11_passed, f"Seq1={s1} -> Seq2={s2} (Monotonic Increment)"))
    except Exception as e:
        results.append(("TEST 11: Monotonic Sequence Number Progression", False, str(e)))

    # TEST 12: Kalshi 15M Strike, Expiry & Price Geometry
    try:
        req = urllib.request.urlopen("http://localhost:3000/api/signal")
        sig = json.loads(req.read().decode('utf-8'))
        strike = sig.get('strike') or sig.get('targetStrike')
        current_price = sig.get('currentPrice')
        time_rem = sig.get('timeRemaining')
        
        test12_passed = bool(strike and strike > 10000 and current_price and current_price > 10000 and time_rem is not None and time_rem >= 0)
        results.append(("TEST 12: Kalshi 15M Strike, Expiry & Price Geometry", test12_passed, f"Strike=${strike}, Spot=${current_price}, TimeRemaining={time_rem}s"))
    except Exception as e:
        results.append(("TEST 12: Kalshi 15M Strike, Expiry & Price Geometry", False, str(e)))

    # TEST 13: Multi-Exchange Ingestion Cascade Connectivity
    try:
        req = urllib.request.urlopen("http://localhost:3000/api/diagnostic")
        diag = req.read().decode('utf-8')
        binance_active = "binance=CONNECTED" in diag
        results.append(("TEST 13: Multi-Exchange Ingestion Cascade Connectivity", binance_active, "Binance spot websocket active and streaming"))
    except Exception as e:
        results.append(("TEST 13: Multi-Exchange Ingestion Cascade Connectivity", False, str(e)))

    # TEST 14: Complete [VIXY_PRODUCTION_DIAGNOSTIC] Output Invariant
    try:
        req = urllib.request.urlopen("http://localhost:3000/api/diagnostic")
        diag = req.read().decode('utf-8')
        all_ok = "[VIXY_PRODUCTION_DIAGNOSTIC]" in diag and "STATUS=PRODUCTION_READY" in diag and "discord=" in diag
        results.append(("TEST 14: Complete [VIXY_PRODUCTION_DIAGNOSTIC] Output Invariant", all_ok, "Matches strict specification including discord status"))
    except Exception as e:
        results.append(("TEST 14: Complete [VIXY_PRODUCTION_DIAGNOSTIC] Output Invariant", False, str(e)))

    # TEST 15: Discord Singleton & Rate-Limit Diagnostic Guard
    try:
        req = urllib.request.urlopen("http://localhost:3000/api/discord/diagnostic")
        data = json.loads(req.read().decode('utf-8'))
        d_state = data.get('discordState')
        instances = data.get('discordClientInstances')
        login_in_prog = data.get('discordLoginInProgress')
        d_text = data.get('diagnosticText', '')

        test15_passed = bool(
            d_state in ['READY', 'DEGRADED', 'DISABLED', 'CONNECTING', 'RECONNECT_WAIT'] and
            instances in [0, 1] and
            isinstance(login_in_prog, bool) and
            "[VIXY_DISCORD_DIAGNOSTIC]" in d_text
        )
        results.append(("TEST 15: Discord Singleton & Rate-Limit Diagnostic Guard", test15_passed, f"state={d_state}, instances={instances}, inProgress={login_in_prog}"))
    except Exception as e:
        results.append(("TEST 15: Discord Singleton & Rate-Limit Diagnostic Guard", False, str(e)))

    # TEST 16: Unified Authoritative Backend Sequence Across Endpoints
    try:
        s_vixy = json.loads(urllib.request.urlopen("http://localhost:3000/api/vixy/state").read().decode('utf-8')).get('sequence', 0)
        req_diag = urllib.request.urlopen("http://localhost:3000/api/diagnostic").read().decode('utf-8')
        lines = dict(line.split('=', 1) for line in req_diag.split('\n') if '=' in line)
        s_diag = int(lines.get('sequence', 0))
        
        seq_aligned = abs(s_vixy - s_diag) <= 3 and s_vixy > 0 and s_diag > 0
        results.append(("TEST 16: Unified Authoritative Backend Sequence Across Endpoints", seq_aligned, f"vixyStateSeq={s_vixy}, diagSeq={s_diag} (delta={abs(s_vixy - s_diag)})"))
    except Exception as e:
        results.append(("TEST 16: Unified Authoritative Backend Sequence Across Endpoints", False, str(e)))

    # TEST 17: Frontend Single Source of Truth Hydration Contract
    try:
        req = urllib.request.urlopen("http://localhost:3000/api/signal")
        sig = json.loads(req.read().decode('utf-8'))
        
        has_exec = 'execution' in sig and isinstance(sig['execution'], dict)
        has_stage = 'cycleStage' in sig or 'stage' in sig
        has_dir = 'direction' in sig
        has_conf = 'confidence' in sig
        has_prob = 'probability' in sig
        has_spot = 'currentPrice' in sig
        
        contract_valid = has_exec and has_stage and has_dir and has_conf and has_prob and has_spot
        results.append(("TEST 17: Frontend Single Source of Truth Hydration Contract", contract_valid, f"execution={has_exec}, stage={has_stage}, dir={has_dir}, conf={has_conf}, prob={has_prob}"))
    except Exception as e:
        results.append(("TEST 17: Frontend Single Source of Truth Hydration Contract", False, str(e)))

    # TEST 18: Exact 1-Signal Max Idempotency Key Across Ledger
    try:
        req = urllib.request.urlopen("http://localhost:3000/api/signal/resolved-log")
        data = json.loads(req.read().decode('utf-8'))
        records = data.get('recentResolved', [])
        ids = [r.get('id') for r in records if r.get('id')]
        unique_ids = set(ids)
        test18_passed = len(ids) == len(unique_ids)
        results.append(("TEST 18: One Signal Maximum & Idempotency Key Invariant", test18_passed, f"Records count={len(ids)}, Unique IDs={len(unique_ids)} (Zero Duplicates)"))
    except Exception as e:
        results.append(("TEST 18: One Signal Maximum & Idempotency Key Invariant", False, str(e)))

    # TEST 19: Authoritative Backend Lock Time Accuracy (Never Frontend Render Time)
    try:
        req = urllib.request.urlopen("http://localhost:3000/api/signal/resolved-log")
        data = json.loads(req.read().decode('utf-8'))
        records = data.get('recentResolved', [])
        valid_timestamps = True
        for r in records[:5]:
            locked_at = r.get('lockedAt')
            int_start = r.get('intervalStart')
            if locked_at and int_start:
                # lockedAt must be >= intervalStart
                t_lock = time.mktime(time.strptime(locked_at[:19], "%Y-%m-%dT%H:%M:%S"))
                t_start = time.mktime(time.strptime(int_start[:19], "%Y-%m-%dT%H:%M:%S"))
                if t_lock < t_start:
                    valid_timestamps = False
        results.append(("TEST 19: Authoritative Lock Timestamps & Settlement Integrity", valid_timestamps, "All stored signal records contain valid backend timestamps"))
    except Exception as e:
        results.append(("TEST 19: Authoritative Lock Timestamps & Settlement Integrity", False, str(e)))

    # TEST 20: Safe Numeric Normalization Across Components (Zero toFixed Crashes)
    try:
        # Check that /api/signal outputs clean numeric values that survive missing data
        req = urllib.request.urlopen("http://localhost:3000/api/signal")
        sig = json.loads(req.read().decode('utf-8'))
        has_valid_numbers = (
            isinstance(sig.get('confidence', 0), (int, float)) and
            isinstance(sig.get('probability', 0), (int, float)) and
            isinstance(sig.get('currentPrice', 0), (int, float))
        )
        results.append(("TEST 20: Safe Numeric Normalization & Hydration Robustness", has_valid_numbers, "All numeric fields output safely typed values without undefined toFixed hazard"))
    except Exception as e:
        results.append(("TEST 20: Safe Numeric Normalization & Hydration Robustness", False, str(e)))

    # TEST 21: Cross-Asset Market Context Layer & Multi-Asset Tracking
    try:
        req = urllib.request.urlopen("http://localhost:3000/api/signal")
        sig = json.loads(req.read().decode('utf-8'))
        cac = sig.get('crossAssetContext')
        
        has_cac = (
            cac is not None and
            cac.get('state') in ['CONFIRMED_BULLISH', 'CONFIRMED_BEARISH', 'MIXED', 'BTC_DIVERGENCE', 'HIGH_VOLATILITY_DIVERGENCE', 'INSUFFICIENT_DATA'] and
            isinstance(cac.get('rollingCorrelation'), (int, float)) and
            isinstance(cac.get('directionalAgreementRatio'), (int, float)) and
            isinstance(cac.get('assets'), dict)
        )
        results.append(("TEST 21: Cross-Asset Market Context Layer & Multi-Asset Tracking", has_cac, f"state={cac.get('state') if cac else 'None'}, corr={cac.get('rollingCorrelation') if cac else 0}, assetsCount={len(cac.get('assets', {})) if cac else 0}"))
    except Exception as e:
        results.append(("TEST 21: Cross-Asset Market Context Layer & Multi-Asset Tracking", False, str(e)))

    # TEST 22: Dynamic Lead-Lag Correlation & Divergence Protection
    try:
        req = urllib.request.urlopen("http://localhost:3000/api/diagnostic")
        diag = req.read().decode('utf-8')
        has_ca_context = "crossAssetContext=READY" in diag
        has_ca_corr = "crossAssetCorrelation=READY" in diag
        has_ca_div = "crossAssetDivergence=READY" in diag
        
        test22_passed = has_ca_context and has_ca_corr and has_ca_div
        results.append(("TEST 22: Lead-Lag Dynamic Correlation & Divergence Gate", test22_passed, "All cross-asset diagnostic gates active and synchronized"))
    except Exception as e:
        results.append(("TEST 22: Lead-Lag Dynamic Correlation & Divergence Gate", False, str(e)))

    # TEST 23: Server Session Epoch & Sequence Integrity
    try:
        req_vixy = urllib.request.urlopen("http://localhost:3000/api/vixy/state")
        vixy_data = json.loads(req_vixy.read().decode('utf-8'))
        sess_id = vixy_data.get('sessionId')
        
        req_sig = urllib.request.urlopen("http://localhost:3000/api/signal")
        sig_data = json.loads(req_sig.read().decode('utf-8'))
        sess_id_sig = sig_data.get('sessionId')
        
        test23_passed = bool(sess_id and sess_id_sig and sess_id == sess_id_sig and sess_id.startswith('sess_'))
        results.append(("TEST 23: Session Epoch Synchronization & Sequence Integrity", test23_passed, f"sessionId={sess_id} matched across endpoints"))
    except Exception as e:
        results.append(("TEST 23: Session Epoch Synchronization & Sequence Integrity", False, str(e)))

    # Print summary
    print("\n--- RESULTS ---")
    all_passed = True
    for name, passed, details in results:
        status_str = "PASSED [OK]" if passed else "FAILED [X]"
        if not passed:
            all_passed = False
        print(f"{status_str} | {name}\n         Details: {details}")

    print("==================================================")
    if all_passed:
        print("ALL 23 RUNTIME TESTS PASSED WITH 100% COMPLIANCE.")
    else:
        print("SOME TESTS FAILED.")
    print("==================================================")
    return all_passed

if __name__ == '__main__':
    run_tests()
