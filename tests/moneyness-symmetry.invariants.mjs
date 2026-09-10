// RUNTIME INVARIANT TESTS — 15M MONEYNESS IS DIRECTION-NEUTRAL
//
// Executes the REAL probability-assembly slice from server.ts in THIS
// repository (agreementBonus -> moneynessBonus -> rawDirectionalBias ->
// baseProb -> boundedProb) with controlled inputs. No reimplementation.
//
// Guards the defect fixed in fix/discord-link-and-directional-moneyness:
// moneynessBonus was `candidateDir === "UP" ? 0.04 : -0.04` whenever the spot
// was >$5 from the strike but not in-the-money, so an UP candidate and a DOWN
// candidate with IDENTICAL evidence and mirrored price position got P(side)
// values 8 points apart. Production on 2026-09-09 showed 68 of 74 locks UP.
import { serverSrc, sliceThrough } from './_engineSource.mjs';

const slice = sliceThrough(
  serverSrc,
  'const agreementBonus = (agreementCount - 6) * 0.05;',
  'Math.max(0.05, Math.round(baseProb * 1e3) / 1e3),\n  );',
  'moneyness/probability assembly',
);

// Returns P(UP) exactly as the engine computes boundedProb.
const pUp = ({ candidateDir, agreementCount, distFromStrike, isITM }) =>
  new Function(
    'candidateDir', 'agreementCount', 'distFromStrike', 'distFromStrikeAbs', 'isITM', 'Math',
    `${slice}\nreturn boundedProb;`,
  )(candidateDir, agreementCount, distFromStrike, Math.abs(distFromStrike), isITM, Math);

const pSide = (args) => (args.candidateDir === 'UP' ? pUp(args) : 1 - pUp(args));

let pass = 0, fail = 0;
const t = (name, actual, expected) => {
  const ok = Math.abs(actual - expected) < 1e-9;
  ok ? pass++ : fail++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : ` -> got ${actual}, want ${expected}`}`);
};

console.log('== mirrored inputs give mirrored P(side) ==');
for (const agreementCount of [7, 8, 9, 10, 11]) {
  for (const dist of [6, 8, 9.9]) {
    const up = pSide({ candidateDir: 'UP', agreementCount, distFromStrike: +dist, isITM: false });
    const down = pSide({ candidateDir: 'DOWN', agreementCount, distFromStrike: -dist, isITM: false });
    t(`on-side, agreement=${agreementCount}, dist=${dist}: P(UP|UP) == P(DOWN|DOWN)`, up, down);
    const upAgainst = pSide({ candidateDir: 'UP', agreementCount, distFromStrike: -dist, isITM: false });
    const downAgainst = pSide({ candidateDir: 'DOWN', agreementCount, distFromStrike: +dist, isITM: false });
    t(`against-side, agreement=${agreementCount}, dist=${dist}: mirrored`, upAgainst, downAgainst);
  }
}

console.log('== the reward follows price position, not the side being scored ==');
const onSideUp = pSide({ candidateDir: 'UP', agreementCount: 9, distFromStrike: +7, isITM: false });
const againstUp = pSide({ candidateDir: 'UP', agreementCount: 9, distFromStrike: -7, isITM: false });
const onSideDown = pSide({ candidateDir: 'DOWN', agreementCount: 9, distFromStrike: -7, isITM: false });
const againstDown = pSide({ candidateDir: 'DOWN', agreementCount: 9, distFromStrike: +7, isITM: false });
t('UP on its side beats UP against by 0.08', onSideUp - againstUp, 0.08);
t('DOWN on its side beats DOWN against by 0.08', onSideDown - againstDown, 0.08);

console.log('== unchanged behaviour at the strike and in the money ==');
t('within $5 of strike: no moneyness term (UP)',   pSide({ candidateDir: 'UP', agreementCount: 9, distFromStrike: 2, isITM: false }), 0.65);
t('within $5 of strike: no moneyness term (DOWN)', pSide({ candidateDir: 'DOWN', agreementCount: 9, distFromStrike: -2, isITM: false }), 0.65);
t('in the money adds 0.10 (UP)',   pSide({ candidateDir: 'UP', agreementCount: 9, distFromStrike: 40, isITM: true }), 0.75);
t('in the money adds 0.10 (DOWN)', pSide({ candidateDir: 'DOWN', agreementCount: 9, distFromStrike: -40, isITM: true }), 0.75);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
