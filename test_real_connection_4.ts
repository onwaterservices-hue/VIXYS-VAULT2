import { fetchKalshiMarketPrice } from './src/services/trading/kalshiExecutionEngine';

async function run() {
  console.log("Fetching real BTC price from Kalshi PAPER...");
  // Kalshi markets typically look like KXBTC15M for some date, but maybe the API requires a specific ticker?
  const price = await fetchKalshiMarketPrice('paper', 'KXBTC15M', 'yes');
  console.log("Price:", price);
}
run().catch(console.error);
