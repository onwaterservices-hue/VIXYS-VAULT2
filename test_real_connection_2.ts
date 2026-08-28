async function run() {
  console.log("Fetching real BTC price from Kalshi PAPER...");
  const baseUrl = 'https://demo-api.kalshi.co/trade-api/v2';
  const path = `/markets/KXBTC15M/orderbook`;
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Data:", JSON.stringify(data).slice(0, 100));
  } catch (err) {
    console.error(err);
  }
}
run();
