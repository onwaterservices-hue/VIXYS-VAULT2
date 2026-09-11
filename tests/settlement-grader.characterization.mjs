// CHARACTERIZATION TESTS -- 15M late-settlement grader.
//
// Executes the REAL grading statements sliced verbatim out of
// checkAndSettle15mCycle in server.ts. The surrounding function is ~200 lines
// of Firestore persistence and shadow calibration; the grading arithmetic
// itself is the part that decides what goes in the ledger, so that is what is
// extracted and executed here. Nothing is reimplemented -- if the source
// changes, the string sliced below changes with it.
//
// This pins actualOutcome, wasCorrect and the Brier computation exactly as
// they ship today, INCLUDING two behaviours that are almost certainly wrong
// and are marked PINNED-AS-IS rather than fixed.
import { serverSrc, sliceBetween, extractFn, createHarness } from './_engineSource.mjs';

const t = createHarness('settlement-grader.characterization');

// The grader calls brierOfRow; run the real one beside the slice.
const brierOfRow = new Function(`${extractFn('brierOfRow', 'function brierOfRow(')}; return brierOfRow;`)();

const graderSrc = sliceBetween(
  serverSrc,
  'prevLog.settlementPrice = livePrice;',
  'serverLearningEngine.todaySettledCount += 1;',
  'settlement grader',
);

// Sanity: the slice really is the grader and not something that drifted.
t.section('slice integrity');
for (const frag of ['prevLog.actualOutcome', 'prevLog.wasCorrect', 'prevLog.brierScore', 'prevLog.outcome']) {
  t.check(`extracted slice assigns ${frag}`, graderSrc.includes(frag));
}

// Run the real statements against a controlled prevLog.
function grade({ direction, confidence, probability, targetStrike, settlementPrice }) {
  const prevLog = { direction, confidence, probability, targetStrike, resolvedAt: '2026-09-09T00:00:00.000Z' };
  const fn = new Function('prevLog', 'livePrice', 'Math', 'brierOfRow', `${graderSrc}; return prevLog;`);
  return fn(prevLog, settlementPrice, Math, brierOfRow);
}

t.section('actualOutcome is decided purely by settlementPrice vs targetStrike');
t.eq('settle above strike -> UP',   grade({ direction: 'UP', confidence: 80, targetStrike: 64000, settlementPrice: 64100 }).actualOutcome, 'UP');
t.eq('settle below strike -> DOWN', grade({ direction: 'UP', confidence: 80, targetStrike: 64000, settlementPrice: 63900 }).actualOutcome, 'DOWN');
// The comparison is `>=`, so an exact touch of the strike grades UP. Pinned
// because it is a real tie-break rule that a refactor to `>` would silently
// invert, and Kalshi's own settlement convention is not necessarily this one.
t.eq('settle EXACTLY at strike -> UP (>= is inclusive)', grade({ direction: 'UP', confidence: 80, targetStrike: 64000, settlementPrice: 64000 }).actualOutcome, 'UP');

t.section('wasCorrect is strict equality against the logged direction');
t.eq('UP called, UP settled -> correct',     grade({ direction: 'UP', confidence: 80, targetStrike: 64000, settlementPrice: 64100 }).wasCorrect, true);
t.eq('UP called, DOWN settled -> incorrect', grade({ direction: 'UP', confidence: 80, targetStrike: 64000, settlementPrice: 63900 }).wasCorrect, false);
t.eq('DOWN called, DOWN settled -> correct', grade({ direction: 'DOWN', confidence: 80, targetStrike: 64000, settlementPrice: 63900 }).wasCorrect, true);
t.eq('DOWN called, UP settled -> incorrect', grade({ direction: 'DOWN', confidence: 80, targetStrike: 64000, settlementPrice: 64100 }).wasCorrect, false);
// PINNED-AS-IS: actualOutcome is only ever "UP" or "DOWN", so any log whose
// direction is NEUTRAL/SKIP is graded a LOSS rather than excluded from the
// ledger. That drags the denominator of the published win rate.
t.eq('PINNED-AS-IS: NEUTRAL direction always grades as a LOSS',
  grade({ direction: 'NEUTRAL', confidence: 80, targetStrike: 64000, settlementPrice: 64100 }).wasCorrect, false);
t.eq('PINNED-AS-IS: SKIP direction always grades as a LOSS',
  grade({ direction: 'SKIP', confidence: 80, targetStrike: 64000, settlementPrice: 64100 }).wasCorrect, false);

t.section('outcome label mirrors wasCorrect');
t.eq('correct -> WIN',   grade({ direction: 'UP', confidence: 80, targetStrike: 64000, settlementPrice: 64100 }).outcome, 'WIN');
t.eq('incorrect -> LOSS', grade({ direction: 'UP', confidence: 80, targetStrike: 64000, settlementPrice: 63900 }).outcome, 'LOSS');
t.eq('actualDirection mirrors actualOutcome',
  grade({ direction: 'UP', confidence: 80, targetStrike: 64000, settlementPrice: 63900 }).actualDirection, 'DOWN');

t.section('Brier score = round((recorded P(win) - wasCorrect)^2 * 1000) / 1000');
// This was round((confidence/100 - wasCorrect)^2) and was pinned here as
// "NOT the Brier score of a directional probability forecast": confidence is
// the engine score, not a probability. The grader now scores the recorded
// P(win) of the called side (prevLog.probability); confidence is ignored, and a
// row with no recorded probability gets no Brier score.
const cases = [
  // recorded P(win), settlementPrice, expected Brier
  [0.9, 64100, 0.01],   // won at 0.90 -> (0.9-1)^2
  [0.9, 63900, 0.81],   // lost at 0.90 -> (0.9-0)^2
  [0.5, 64100, 0.25],   // won at 0.50
  [0.5, 63900, 0.25],   // lost at 0.50 -- symmetric at the coin flip
  [1, 64100, 0],        // won at 1.0
  [1, 63900, 1],        // lost at 1.0
  [0.75, 64100, 0.063], // (0.75-1)^2 = 0.0625 -> rounds to 0.063
  [0.66, 63900, 0.436], // 0.66^2 = 0.4356 -> rounds to 0.436
];
for (const [probability, settlementPrice, expected] of cases) {
  const r = grade({ direction: 'UP', confidence: 93, probability, targetStrike: 64000, settlementPrice });
  t.eq(`p=${probability} ${r.outcome} -> brier ${expected}`, r.brierScore, expected);
}
t.eq('engine score is not used: confidence 93 with p 0.9 scores 0.01, not 0.005',
  grade({ direction: 'UP', confidence: 93, probability: 0.9, targetStrike: 64000, settlementPrice: 64100 }).brierScore, 0.01);
t.eq('no recorded probability -> no Brier score',
  grade({ direction: 'UP', confidence: 93, targetStrike: 64000, settlementPrice: 64100 }).brierScore, null);
// Brier is rounded to 3dp, so it is quantised and cannot express finer error.
t.check('brierScore is rounded to 3 decimal places',
  String(grade({ direction: 'UP', confidence: 77, probability: 0.77, targetStrike: 64000, settlementPrice: 64100 }).brierScore).split('.')[1]?.length <= 3);

t.section('status transition');
t.check('grader sets settlementAt from resolvedAt',
  grade({ direction: 'UP', confidence: 80, targetStrike: 64000, settlementPrice: 64100 }).settlementAt === '2026-09-09T00:00:00.000Z');

t.done();
