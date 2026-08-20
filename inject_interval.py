import re

with open('server.ts', 'r') as f:
    code = f.read()

old_interval = """    // 3. Tertiary: CoinGecko
    if (!fetchSuccess) {
      try {
        const cgRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
        if (cgRes.ok) {
          const cgData = await cgRes.json();
          const p = parseFloat(cgData?.bitcoin?.usd);
          if (p && p > 0) {
            livePrice = p;
            currentBtcPrice = livePrice;
            fetchSuccess = true;
          }
        }
      } catch (e) {
        // CoinGecko fallback fail
      }
    }"""

new_interval = """    // 3. Tertiary: CoinGecko
    if (!fetchSuccess) {
      try {
        const cgRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
        if (cgRes.ok) {
          const cgData = await cgRes.json();
          const p = parseFloat(cgData?.bitcoin?.usd);
          if (p && p > 0) {
            livePrice = p;
            currentBtcPrice = livePrice;
            fetchSuccess = true;
          }
        }
      } catch (e) {
        // CoinGecko fallback fail
      }
    }
    
    // Evaluate 15M cycle boundaries
    await checkAndSettle15mCycle(livePrice);
"""

if old_interval in code:
    code = code.replace(old_interval, new_interval)
    with open('server.ts', 'w') as f:
        f.write(code)
    print("Injected into interval")
else:
    print("Failed to find interval block")
