import { fetchKalshiMarketPrice } from './src/services/trading/kalshiExecutionEngine';

async function run() {
  console.log("Fetching real BTC price from Kalshi PAPER...");
  // Kalshi markets typically look like KXBTC15M for some date, but maybe the API requires a specific ticker?
  // Let's try to just fetch orderbook for a known ticker, or if it fails, we at least get a real Kalshi HTTP error.
  const price = await fetchKalshiMarketPrice('paper', 'KXBTC15M', 'yes');
  console.log("Price:", price);
}
run().catch(console.error);
