async function run() {
  const baseUrl = 'https://demo-api.kalshi.co/trade-api/v2';
  const res = await fetch(`${baseUrl}/markets?limit=5`, {
    headers: { 'Accept': 'application/json' }
  });
  console.log("Status:", res.status);
  const data = await res.json();
  console.log("Markets:", data.markets?.map(m => m.ticker));
}
run();
