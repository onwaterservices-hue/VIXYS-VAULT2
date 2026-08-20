import re

with open('server.ts', 'r') as f:
    content = f.read()

# Check if crypto import is present
if 'import crypto from' not in content:
    content = "import crypto from 'crypto';\n" + content

kalshi_service_code = '''
// KALSHI PRODUCTION MARKET DATA SERVICE HELPER
function getKalshiAuthHeaders(method: string, requestPath: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const keyId = process.env.KALSHI_API_KEY_ID;
  const privateKeyRaw = process.env.KALSHI_PRIVATE_KEY;

  if (keyId && privateKeyRaw) {
    try {
      const timestamp = Date.now().toString();
      const pathOnly = requestPath.split('?')[0];
      const message = `${timestamp}${method.toUpperCase()}${pathOnly}`;

      let formattedKey = privateKeyRaw.trim();
      if (!formattedKey.includes('-----BEGIN')) {
        try {
          const decoded = Buffer.from(formattedKey, 'base64').toString('utf8');
          if (decoded.includes('-----BEGIN')) {
            formattedKey = decoded;
          }
        } catch {
          // Keep raw
        }
      }

      const signer = crypto.createSign('RSA-SHA256');
      signer.update(message);
      signer.end();
      const signature = signer.sign(formattedKey, 'base64');

      headers['KALSHI-ACCESS-KEY'] = keyId;
      headers['KALSHI-ACCESS-TIMESTAMP'] = timestamp;
      headers['KALSHI-ACCESS-SIGNATURE'] = signature;
    } catch (err: any) {
      console.error('[Kalshi Auth] RSA signature exception:', err.message);
    }
  }

  return headers;
}

// Kalshi Venue Endpoint with Production Fallback Handling
app.get('/api/venues/kalshi', async (req, res) => {
  const baseUrl = process.env.KALSHI_BASE_URL || 'https://external-api.kalshi.com/trade-api/v2';
  const apiPath = '/trade-api/v2/markets?status=open&limit=20';
  const fullUrl = `${baseUrl.replace(/\/trade-api\/v2\/?$/, '')}${apiPath}`;

  try {
    const headers = getKalshiAuthHeaders('GET', apiPath);
    const response = await fetch(fullUrl, { headers });

    if (response.ok) {
      const data = await response.json();
      const rawMarkets = data.markets || [];
      const formattedMarkets = rawMarkets.map((m: any) => ({
        ticker: m.ticker,
        title: m.title || m.subtitle || m.ticker,
        category: m.category || 'General',
        yesBid: m.yes_bid ? m.yes_bid / 100 : null,
        yesAsk: m.yes_ask ? m.yes_ask / 100 : null,
        noBid: m.no_bid ? m.no_bid / 100 : null,
        noAsk: m.no_ask ? m.no_ask / 100 : null,
        lastPrice: m.last_price ? m.last_price / 100 : null,
        volume: m.volume || 0,
        openInterest: m.open_interest || 0,
        status: m.status || 'open',
        closeTime: m.close_time || null,
        dataSource: 'kalshi',
        isLive: true,
        lastUpdatedAt: Date.now(),
      }));

      return res.json({
        venue: 'Kalshi',
        status: 'ACTIVE',
        isLive: true,
        dataSource: 'kalshi',
        count: formattedMarkets.length,
        markets: formattedMarkets,
        authenticated: !!(process.env.KALSHI_API_KEY_ID && process.env.KALSHI_PRIVATE_KEY),
        timestamp: Date.now(),
      });
    } else {
      const errText = await response.text();
      console.warn(`[Kalshi API] Non-200 status (${response.status}):`, errText);
    }
  } catch (err: any) {
    console.error('[Kalshi API] Network exception fetching venue markets:', err.message);
  }

  return res.json({
    venue: 'Kalshi',
    status: 'DATA UNAVAILABLE',
    isLive: false,
    dataSource: 'kalshi',
    markets: [],
    message: 'DATA UNAVAILABLE: Unable to retrieve live Kalshi market feed',
    timestamp: Date.now(),
  });
});

// Kalshi Multi-Market Discovery Endpoint
app.get('/api/kalshi/markets', async (req, res) => {
  const category = ((req.query.category as string) || 'all').toLowerCase();
  const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));
  const baseUrl = process.env.KALSHI_BASE_URL || 'https://external-api.kalshi.com/trade-api/v2';
  const apiPath = `/trade-api/v2/markets?status=open&limit=${limit}`;
  const fullUrl = `${baseUrl.replace(/\/trade-api\/v2\/?$/, '')}${apiPath}`;

  try {
    const headers = getKalshiAuthHeaders('GET', apiPath);
    const response = await fetch(fullUrl, { headers });

    if (response.ok) {
      const data = await response.json();
      let rawMarkets = data.markets || [];

      if (category !== 'all') {
        rawMarkets = rawMarkets.filter((m: any) => 
          (m.category || '').toLowerCase().includes(category) ||
          (m.title || '').toLowerCase().includes(category) ||
          (m.ticker || '').toLowerCase().includes(category)
        );
      }

      const formatted = rawMarkets.map((m: any) => ({
        ticker: m.ticker,
        eventTicker: m.event_ticker,
        title: m.title || m.subtitle || m.ticker,
        category: m.category || 'Crypto',
        yesBid: m.yes_bid ? m.yes_bid / 100 : null,
        yesAsk: m.yes_ask ? m.yes_ask / 100 : null,
        noBid: m.no_bid ? m.no_bid / 100 : null,
        noAsk: m.no_ask ? m.no_ask / 100 : null,
        lastPrice: m.last_price ? m.last_price / 100 : null,
        volume: m.volume || 0,
        volume24h: m.volume_24h || m.volume || 0,
        openInterest: m.open_interest || 0,
        closeTime: m.close_time || null,
        status: m.status || 'open',
        dataSource: 'kalshi',
        isLive: true,
        lastUpdatedAt: Date.now(),
      }));

      return res.json({
        success: true,
        count: formatted.length,
        category,
        markets: formatted,
        dataSource: 'kalshi',
        isLive: true,
        timestamp: Date.now(),
      });
    }
  } catch (err: any) {
    console.error('[Kalshi API] Exception in /api/kalshi/markets:', err.message);
  }

  return res.json({
    success: false,
    status: 'DATA UNAVAILABLE',
    isLive: false,
    dataSource: 'kalshi',
    markets: [],
    message: 'DATA UNAVAILABLE: Unable to reach Kalshi REST API',
    timestamp: Date.now(),
  });
});

// Kalshi Single Market Detail & Orderbook
app.get('/api/kalshi/market/:ticker', async (req, res) => {
  const ticker = req.params.ticker.toUpperCase();
  const baseUrl = process.env.KALSHI_BASE_URL || 'https://external-api.kalshi.com/trade-api/v2';
  const apiPath = `/trade-api/v2/markets/${ticker}`;
  const fullUrl = `${baseUrl.replace(/\/trade-api\/v2\/?$/, '')}${apiPath}`;

  try {
    const headers = getKalshiAuthHeaders('GET', apiPath);
    const response = await fetch(fullUrl, { headers });

    if (response.ok) {
      const data = await response.json();
      const m = data.market || data;

      // Fetch orderbook
      let orderbook: any = null;
      try {
        const obPath = `/trade-api/v2/markets/${ticker}/orderbook`;
        const obUrl = `${baseUrl.replace(/\/trade-api\/v2\/?$/, '')}${obPath}`;
        const obHeaders = getKalshiAuthHeaders('GET', obPath);
        const obRes = await fetch(obUrl, { headers: obHeaders });
        if (obRes.ok) {
          const obData = await obRes.json();
          orderbook = obData.orderbook || obData;
        }
      } catch (obErr) {
        // Orderbook optional
      }

      return res.json({
        success: true,
        market: {
          ticker: m.ticker,
          eventTicker: m.event_ticker,
          title: m.title || m.subtitle || m.ticker,
          yesBid: m.yes_bid ? m.yes_bid / 100 : null,
          yesAsk: m.yes_ask ? m.yes_ask / 100 : null,
          noBid: m.no_bid ? m.no_bid / 100 : null,
          noAsk: m.no_ask ? m.no_ask / 100 : null,
          lastPrice: m.last_price ? m.last_price / 100 : null,
          volume: m.volume || 0,
          openInterest: m.open_interest || 0,
          closeTime: m.close_time || null,
          status: m.status || 'open',
          orderbook,
          dataSource: 'kalshi',
          isLive: true,
          lastUpdatedAt: Date.now(),
        }
      });
    }
  } catch (err: any) {
    console.error(`[Kalshi API] Exception fetching market ${ticker}:`, err.message);
  }

  return res.json({
    success: false,
    status: 'DATA UNAVAILABLE',
    isLive: false,
    dataSource: 'kalshi',
    market: null,
    message: `DATA UNAVAILABLE for Kalshi ticker ${ticker}`,
    timestamp: Date.now(),
  });
});
'''

# Find existing app.get('/api/venues/kalshi', ...) block and replace it
pattern = r"app\.get\('/api/venues/kalshi', async \(req, res\) => \{.*?\n\}\);\n"
if re.search(pattern, content, flags=re.DOTALL):
    content = re.sub(pattern, kalshi_service_code + "\n", content, flags=re.DOTALL)
else:
    # Append before app.listen or at the end
    content += "\n" + kalshi_service_code + "\n"

with open('server.ts', 'w') as f:
    f.write(content)

print("Kalshi production market data service updated successfully in server.ts")
