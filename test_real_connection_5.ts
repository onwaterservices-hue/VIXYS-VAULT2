async function run() {
  const baseUrl = 'https://demo-api.kalshi.co/trade-api/v2';
  const path = `/markets/KXBTC15M/orderbook`;
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { 'Accept': 'application/json' }
  });
  console.log("Status:", res.status);
  const data = await res.json();
  console.log("Data:", JSON.stringify(data));
}
run();
