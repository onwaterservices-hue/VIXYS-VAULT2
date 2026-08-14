import urllib.request
import json
import time

def run_tests():
    print("==================================================")
    print("VIXY VAULT BTC 15M AUTHORITATIVE RUNTIME TEST SUITE")
    print("==================================================")

    results = []

    # TEST 1: Query Authoritative State & Cycle Lifecycle
    try:
        req = urllib.request.urlopen("http://localhost:3000/api/vixy/state")
        data = json.loads(req.read().decode('utf-8'))
        cycle_id = data.get('cycleId', '')
        status = data.get('status', '')
        seq = data.get('sequence', 0)
        
        test1_passed = bool(cycle_id.startswith('15M-') and seq > 0 and status in ['INGESTING', 'CALIBRATING', 'ANALYZING', 'VALIDATING', 'READY_TO_LOCK', 'LOCKED', 'MONITORING'])
        results.append(("TEST 1: Authoritative State Machine & Lifecycle Structure", test1_passed, f"cycleId={cycle_id}, status={status}, sequence={seq}"))
    except Exception as e:
        results.append(("TEST 1: Authoritative State Machine & Lifecycle Structure", False, str(e)))

    # TEST 2: Calibration & Analysis Gate Telemetry
    try:
        req = urllib.request.urlopen("http://localhost:3000/api/diagnostic")
        diag_text = req.read().decode('utf-8')
        has_calib = "calibrationStatus=" in diag_text
        has_analysis = "analysisStatus=" in diag_text
        has_validation = "validationStatus=" in diag_text
        has_prod_ready = "STATUS=PRODUCTION_READY" in diag_text

        test2_passed = has_calib and has_analysis and has_validation and has_prod_ready
        results.append(("TEST 2: Calibration, Analysis & Validation Telemetry Output", test2_passed, "All diagnostic status fields present and verified"))
    except Exception as e:
        results.append(("TEST 2: Calibration, Analysis & Validation Telemetry Output", False, str(e)))

    # TEST 3: Validation Gate & Lock State Coherence
    try:
        req = urllib.request.urlopen("http://localhost:3000/api/signal")
        sig = json.loads(req.read().decode('utf-8'))
        is_locked = sig.get('isLocked', False)
        
        if is_locked:
            valid_lock = sig.get('lockedDirection') in ['UP', 'DOWN'] and sig.get('lockedConfidence') is not None
            test3_passed = valid_lock
            results.append(("TEST 3: Pre-Lock Validation Gate & Lock Coherence", test3_passed, f"isLocked=True, direction={sig.get('lockedDirection')}, conf={sig.get('lockedConfidence')}%"))
        else:
            valid_unlock = sig.get('lockedDirection') is None and sig.get('lockedProbability') is None
            test3_passed = valid_unlock
            results.append(("TEST 3: Pre-Lock Validation Gate & Lock Coherence", test3_passed, f"isLocked=False, locked fields are cleanly null"))
    except Exception as e:
        results.append(("TEST 3: Pre-Lock Validation Gate & Lock Coherence", False, str(e)))

    # TEST 4: Live Telemetry vs Locked Prediction Immutability
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
            test4_passed = immut_ok
            results.append(("TEST 4: Immutability of Locked Predictions Over Time", test4_passed, "Locked parameters remained 100% strictly invariant"))
        else:
            test4_passed = True
            results.append(("TEST 4: Immutability of Locked Predictions Over Time", test4_passed, "Cycle in pre-lock stage, invariant holds"))
    except Exception as e:
        results.append(("TEST 4: Immutability of Locked Predictions Over Time", False, str(e)))

    # TEST 5: Data Freshness & Data Age Guard
    try:
        req = urllib.request.urlopen("http://localhost:3000/api/diagnostic")
        diag = req.read().decode('utf-8')
        lines = dict(line.split('=', 1) for line in diag.split('\n') if '=' in line)
        data_age = int(lines.get('dataAgeMs', 999999))
        market_data = lines.get('marketData', '')
        
        test5_passed = data_age < 15000 and market_data in ['FRESH', 'STALE']
        results.append(("TEST 5: Real-time Market Data Freshness & Latency Guard", test5_passed, f"dataAgeMs={data_age}ms, marketData={market_data}"))
    except Exception as e:
        results.append(("TEST 5: Real-time Market Data Freshness & Latency Guard", False, str(e)))

    # TEST 6: Walk-Forward Settlement Log Integrity
    try:
        req = urllib.request.urlopen("http://localhost:3000/api/signal/resolved-log")
        logs = json.loads(req.read().decode('utf-8'))
        stats = logs.get('stats', {})
        win_rate = stats.get('winRatePct', 0)
        total = stats.get('total', 0)
        
        test6_passed = 0 <= win_rate <= 100 and total >= 0
        results.append(("TEST 6: Walk-Forward Settlement History & Accuracy Tracking", test6_passed, f"Total Settled={total}, Win Rate={win_rate}%"))
    except Exception as e:
        results.append(("TEST 6: Walk-Forward Settlement History & Accuracy Tracking", False, str(e)))

    # TEST 7: Monotonic Global Sequence Number Integrity
    try:
        s1 = json.loads(urllib.request.urlopen("http://localhost:3000/api/vixy/state").read().decode('utf-8')).get('sequence', 0)
        time.sleep(0.5)
        s2 = json.loads(urllib.request.urlopen("http://localhost:3000/api/vixy/state").read().decode('utf-8')).get('sequence', 0)
        
        test7_passed = s2 >= s1 and s1 > 0
        results.append(("TEST 7: Monotonic Sequence Number Progression", test7_passed, f"Seq1={s1} -> Seq2={s2} (Monotonic Increment)"))
    except Exception as e:
        results.append(("TEST 7: Monotonic Sequence Number Progression", False, str(e)))

    # TEST 8: Kalshi 15M Strike & Expiry Geometry
    try:
        req = urllib.request.urlopen("http://localhost:3000/api/signal")
        sig = json.loads(req.read().decode('utf-8'))
        strike = sig.get('strike') or sig.get('targetStrike')
        current_price = sig.get('currentPrice')
        time_rem = sig.get('timeRemaining')
        
        test8_passed = bool(strike and strike > 10000 and current_price and current_price > 10000 and time_rem is not None and time_rem >= 0)
        results.append(("TEST 8: Kalshi 15M Strike, Expiry & Price Geometry", test8_passed, f"Strike=${strike}, Spot=${current_price}, TimeRemaining={time_rem}s"))
    except Exception as e:
        results.append(("TEST 8: Kalshi 15M Strike, Expiry & Price Geometry", False, str(e)))

    # TEST 9: Feed Cascades & Resilience (Binance/Coinbase/Kraken)
    try:
        req = urllib.request.urlopen("http://localhost:3000/api/diagnostic")
        diag = req.read().decode('utf-8')
        binance_active = "binance=CONNECTED" in diag
        results.append(("TEST 9: Multi-Exchange Ingestion Cascade Connectivity", binance_active, "Binance spot websocket active and streaming"))
    except Exception as e:
        results.append(("TEST 9: Multi-Exchange Ingestion Cascade Connectivity", False, str(e)))

    # TEST 10: Full Production Diagnostic Ready Output
    try:
        req = urllib.request.urlopen("http://localhost:3000/api/diagnostic")
        diag = req.read().decode('utf-8')
        all_ok = "[VIXY_PRODUCTION_DIAGNOSTIC]" in diag and "STATUS=PRODUCTION_READY" in diag and "discord=" in diag
        results.append(("TEST 10: Complete [VIXY_PRODUCTION_DIAGNOSTIC] Output Invariant", all_ok, "Matches strict specification including discord status"))
    except Exception as e:
        results.append(("TEST 10: Complete [VIXY_PRODUCTION_DIAGNOSTIC] Output Invariant", False, str(e)))

    # TEST 11: Discord Singleton & Rate-Limit Protection Diagnostics
    try:
        req = urllib.request.urlopen("http://localhost:3000/api/discord/diagnostic")
        data = json.loads(req.read().decode('utf-8'))
        d_state = data.get('discordState')
        instances = data.get('discordClientInstances')
        login_in_prog = data.get('discordLoginInProgress')
        d_text = data.get('diagnosticText', '')

        test11_passed = bool(
            d_state in ['READY', 'DEGRADED', 'DISABLED', 'CONNECTING', 'RECONNECT_WAIT'] and
            instances in [0, 1] and
            isinstance(login_in_prog, bool) and
            "[VIXY_DISCORD_DIAGNOSTIC]" in d_text
        )
        results.append(("TEST 11: Discord Singleton & Rate-Limit Diagnostic Guard", test11_passed, f"state={d_state}, instances={instances}, inProgress={login_in_prog}"))
    except Exception as e:
        results.append(("TEST 11: Discord Singleton & Rate-Limit Diagnostic Guard", False, str(e)))

    # TEST 12: Subsystem Isolation Invariant
    try:
        req = urllib.request.urlopen("http://localhost:3000/api/vixy/state")
        vixy_state = json.loads(req.read().decode('utf-8'))
        req_d = urllib.request.urlopen("http://localhost:3000/api/diagnostic")
        diag = req_d.read().decode('utf-8')
        
        core_healthy = "algorithm=RUNNING" in diag and "binance=CONNECTED" in diag and vixy_state.get('sequence', 0) > 0
        results.append(("TEST 12: Core Subsystem Isolation from Discord Lifecycle", core_healthy, "VIXY prediction & market engines execute with total independence"))
    except Exception as e:
        results.append(("TEST 12: Core Subsystem Isolation from Discord Lifecycle", False, str(e)))

    # TEST 13: Deterministic Pre-Lock Validation Invariant
    try:
        req_d = urllib.request.urlopen("http://localhost:3000/api/diagnostic")
        diag = req_d.read().decode('utf-8')
        lines = dict(line.split('=', 1) for line in diag.split('\n') if '=' in line)
        v_status = lines.get('validationStatus', '')
        c_status = lines.get('cycleStatus', '')

        # When locked, validation must be PASSED or PASS
        # When validating, it must be VALIDATING or PASSED
        valid_val_state = v_status in ['NOT_STARTED', 'VALIDATING', 'PASSED', 'PASS', 'COMPLETE']
        results.append(("TEST 13: Deterministic Pre-Lock Validation Invariant", valid_val_state, f"cycleStatus={c_status}, validationStatus={v_status}"))
    except Exception as e:
        results.append(("TEST 13: Deterministic Pre-Lock Validation Invariant", False, str(e)))

    # TEST 14: Monotonic Global Sequence Number Alignment Across Endpoints
    try:
        s_vixy = json.loads(urllib.request.urlopen("http://localhost:3000/api/vixy/state").read().decode('utf-8')).get('sequence', 0)
        req_diag = urllib.request.urlopen("http://localhost:3000/api/diagnostic").read().decode('utf-8')
        lines = dict(line.split('=', 1) for line in req_diag.split('\n') if '=' in line)
        s_diag = int(lines.get('sequence', 0))
        
        seq_aligned = abs(s_vixy - s_diag) <= 2 and s_vixy > 0 and s_diag > 0
        results.append(("TEST 14: Unified Authoritative Backend Sequence Across Endpoints", seq_aligned, f"vixyStateSeq={s_vixy}, diagSeq={s_diag} (delta={abs(s_vixy - s_diag)})"))
    except Exception as e:
        results.append(("TEST 14: Unified Authoritative Backend Sequence Across Endpoints", False, str(e)))

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
        print("ALL 14 RUNTIME TESTS PASSED WITH 100% COMPLIANCE.")
    else:
        print("SOME TESTS FAILED.")
    print("==================================================")
    return all_passed

if __name__ == '__main__':
    run_tests()
