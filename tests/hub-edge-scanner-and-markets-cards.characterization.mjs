// CHARACTERIZATION -- hub cards for Edge Scanner and Markets describe what those pages show.
//
// The hub badged Edge Scanner "+EV" as a "Liquidity imbalance & statistical edge radar", while the
// page itself states there is no measured edge against a market price for any asset and shows
// MEASURED · 15M for BTC only. Markets was "Broad market internals & cross-venue delta"; the page
// shows live spot per asset labelled with the single venue it came from.
import { readRepoFile, createHarness } from './_engineSource.mjs';

const t = createHarness('hub-edge-scanner-and-markets-cards.characterization');

t.section('hub cards');
{
  const hub = readRepoFile('src/components/VixyHubView.tsx');
  t.check('no +EV badge or edge-radar claim', !hub.includes('badge: "+EV"') && !hub.includes('statistical edge radar'));
  t.check('no market internals / cross-venue delta claim', !hub.includes('cross-venue delta') && !hub.includes('Broad market internals'));
  const scanner = readRepoFile('src/components/OpportunityScannerView.tsx');
  t.check('the scanner page itself says no edge is measured', scanner.includes('no measured edge against a market price'));
  const markets = readRepoFile('src/components/MarketCardsView.tsx');
  t.check('the markets page labels each price with its venue', markets.includes('labelled with the venue it came from'));
}

t.done();
