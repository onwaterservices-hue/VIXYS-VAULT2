// The Locks "Decision Provenance" modal must not fabricate hashes, prices or verification.
import { readRepoFile, createHarness } from './_engineSource.mjs';
const t = createHarness('provenance-modal.characterization');
const src = readRepoFile('src/components/HistoricalAccuracy.tsx');
const code = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
t.check('no fabricated proof hash prefix 0x7a8d', !code.includes('0x7a8d'));
t.check('no fabricated proof hash prefix 0x8f2a1e94', !code.includes('0x8f2a1e94'));
t.check('no $63,008 fallback price', !/\|\|\s*63008/.test(code));
t.check("no default cycle sequence '1407'", !code.includes("'1407'"));
t.check('no hardcoded reversalRisk: 38', !code.includes('reversalRisk: 38'));
t.check('live cycle never reports its spot as a settlement price', code.includes('settlementPrice: null,'));
t.check('verification badge is conditional on a RESOLVED record with a settlement price', code.includes("=== 'RESOLVED' ? (") && code.includes('UNSETTLED'));
t.check('no unconditional PROVED', !/>\s*PROVED\s*</.test(code));
t.check('missing hash is stated, not invented', code.includes('NO PROOF ARTEFACT'));
t.done();
