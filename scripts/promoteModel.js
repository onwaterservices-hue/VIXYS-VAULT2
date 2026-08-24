// scripts/promoteModel.js
//
// Compares the newest trained-but-inactive model against the current active
// model for the same asset+desk and promotes it ONLY if it's genuinely
// better. This is what makes "the model updates automatically" safe instead
// of reckless -- a bad retrain (overfit, bad luck in the split, degraded
// after Kalshi changes a market spec) never silently replaces something
// that was working.
//
// Run: node scripts/promoteModel.js --asset BTC --desk 1h
// Or, for full automation after every trainModel.js run:
//   node scripts/trainModel.js --asset BTC --desk 1h && node scripts/promoteModel.js --asset BTC --desk 1h

const { pool } = require('../lib/db');

const MIN_IMPROVEMENT = 0.005;
const MIN_VALIDATION_N = 40;

async function getActiveModel(asset, desk) {
  const { rows } = await pool.query(
    `SELECT id, validation_brier, validation_n, trained_at FROM models
     WHERE asset = $1 AND desk = $2 AND is_active = true LIMIT 1`,
    [asset, desk]
  );
  return rows[0] || null;
}

async function getLatestCandidate(asset, desk) {
  const { rows } = await pool.query(
    `SELECT id, validation_brier, validation_n, trained_at FROM models
     WHERE asset = $1 AND desk = $2 AND is_active = false
     ORDER BY trained_at DESC LIMIT 1`,
    [asset, desk]
  );
  return rows[0] || null;
}

async function promote(asset, desk) {
  const active = await getActiveModel(asset, desk);
  const candidate = await getLatestCandidate(asset, desk);

  if (!candidate) {
    console.log(`[promoteModel] ${asset}/${desk}: no untested candidate model found. Run trainModel.js first.`);
    return { promoted: false, reason: 'no_candidate' };
  }

  if (candidate.validation_n < MIN_VALIDATION_N) {
    console.log(
      `[promoteModel] ${asset}/${desk}: candidate id=${candidate.id} only validated on ${candidate.validation_n} samples (need ${MIN_VALIDATION_N}+). Not promoting -- too noisy to trust.`
    );
    return { promoted: false, reason: 'insufficient_validation_data' };
  }

  if (!active) {
    if (candidate.validation_brier >= 0.25) {
      console.log(
        `[promoteModel] ${asset}/${desk}: candidate id=${candidate.id} Brier ${candidate.validation_brier} is no better than a coin flip. Not promoting.`
      );
      return { promoted: false, reason: 'no_better_than_random' };
    }
    await pool.query(`UPDATE models SET is_active = true WHERE id = $1`, [candidate.id]);
    console.log(
      `[promoteModel] ${asset}/${desk}: no prior active model. Promoted id=${candidate.id} (Brier ${candidate.validation_brier}, n=${candidate.validation_n}) as the first live model.`
    );
    return { promoted: true, modelId: candidate.id };
  }

  const improvement = active.validation_brier - candidate.validation_brier;

  if (improvement < MIN_IMPROVEMENT) {
    console.log(
      `[promoteModel] ${asset}/${desk}: candidate id=${candidate.id} (Brier ${candidate.validation_brier}) does not beat active id=${active.id} (Brier ${active.validation_brier}) by enough (${improvement.toFixed(4)} < ${MIN_IMPROVEMENT}). Keeping current model live.`
    );
    return { promoted: false, reason: 'insufficient_improvement', improvement };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`UPDATE models SET is_active = false WHERE id = $1`, [active.id]);
    await client.query(`UPDATE models SET is_active = true WHERE id = $1`, [candidate.id]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  console.log(
    `[promoteModel] ${asset}/${desk}: PROMOTED id=${candidate.id} (Brier ${candidate.validation_brier}) over id=${active.id} (Brier ${active.validation_brier}). Improvement: ${improvement.toFixed(4)}.`
  );
  return { promoted: true, modelId: candidate.id, previousModelId: active.id, improvement };
}

async function main() {
  const args = process.argv.slice(2);
  const asset = args.includes('--asset') ? args[args.indexOf('--asset') + 1] : 'BTC';
  const desk = args.includes('--desk') ? args[args.indexOf('--desk') + 1] : '1h';

  await promote(asset, desk);
  process.exit(0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[promoteModel] fatal error:', err);
    process.exit(1);
  });
}

module.exports = { promote };
