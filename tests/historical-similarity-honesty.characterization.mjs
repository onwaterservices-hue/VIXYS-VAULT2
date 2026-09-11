// CHARACTERIZATION -- "historical similarity" is not served without a similarity model.
//
// historicalSimilarityPct was 75 + 20 x (share of the last 10 ledger rows on the
// candidate side): a number that could only range 75-95, served on
// /api/vixy/state, /api/signal and /api/live-engine as a similarity percentage
// (83-85 in 40 of 40 responses, 2026-09-11 05:58Z), with an 84 fallback and 85
// seeds. No engine path read it.
import { serverSrc, readRepoFile, createHarness } from './_engineSource.mjs';

const t = createHarness('historical-similarity-honesty.characterization');
const code = serverSrc.split('\n').map((l) => l.split('//')[0]).join('\n');

t.section('server');
t.check('no 75-95 rescaling of the ledger share', !/75 \+ \(matchingDirCount/.test(code));
t.check('no 84 fallback or 85 seed', !/historicalSimilarityPct \|\| 84/.test(code) && !/historicalSimilarityPct: 8[45],/.test(code));
t.eq('the cycle field is set to null', (code.match(/active15mCycle\.historicalSimilarityPct = null;/g) || []).length, 1);
t.eq('both payloads pass it through as null', (code.match(/historicalSimilarityPct: active15mCycle\.historicalSimilarityPct \?\? null,/g) || []).length, 2);
{
  // Every remaining mention is one of the known null forms; nothing compares,
  // blends or gates on it.
  const leftover = code
    .replace(/active15mCycle\.historicalSimilarityPct = null;/g, '')
    .replace(/historicalSimilarityPct: active15mCycle\.historicalSimilarityPct \?\? null,/g, '')
    .replace(/historicalSimilarityPct: null,/g, '');
  t.check('nothing in the engine reads it', !/historicalSimilarity/.test(leftover));
}

t.section('replay sandbox matches');
t.check('sandbox cycle carries null', readRepoFile('scripts/replay15m/engineSandbox.ts').includes('historicalSimilarityPct: null,'));

t.done();
