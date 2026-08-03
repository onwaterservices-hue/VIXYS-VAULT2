// scripts/trainModel15s.js
//
// Same approach as trainModel.js, but trained on momentum15s/volatility15m
// (the features backfillFeatures15s.js actually populates) instead of the
// momentum5m/momentum15m pair the 15m/1h desks use.
//
// Run: node scripts/trainModel15s.js --asset BTC

const { pool } = require('../lib/db');

function sigmoid(z) {
  return 1 / (1 + Math.exp(-z));
}

function trainLogistic(X, y, { epochs = 2000, lr = 0.1 } = {}) {
  const nFeatures = X[0].length;
  let weights = new Array(nFeatures).fill(0);
  let bias = 0;

  for (let epoch = 0; epoch < epochs; epoch++) {
    const gradW = new Array(nFeatures).fill(0);
    let gradB = 0;
    for (let i = 0; i < X.length; i++) {
      const z = bias + X[i].reduce((s, x, j) => s + x * weights[j], 0);
      const error = sigmoid(z) - y[i];
      for (let j = 0; j < nFeatures; j++) gradW[j] += error * X[i][j];
      gradB += error;
    }
    for (let j = 0; j < nFeatures; j++) weights[j] -= (lr * gradW[j]) / X.length;
    bias -= (lr * gradB) / X.length;
  }
  return { weights, bias };
}

function brierScore(probs, outcomes) {
  const n = probs.length;
  return probs.reduce((s, p, i) => s + (p - outcomes[i]) ** 2, 0) / n;
}

async function loadTrainingData(asset) {
  const { rows } = await pool.query(
    `SELECT features, outcome FROM settled_contracts
     WHERE asset = $1 AND desk = '15s'
     ORDER BY settled_at ASC`,
    [asset]
  );

  const usable = rows.filter(
    (r) => r.features.momentum15s != null && r.features.volatility15m != null
  );

  const X = usable.map((r) => [r.features.momentum15s, r.features.volatility15m]);
  const y = usable.map((r) => (r.outcome === 'YES' ? 1 : 0));
  return { X, y, totalRows: rows.length, usableRows: usable.length };
}

async function trainAndSave(asset) {
  const { X, y, totalRows, usableRows } = await loadTrainingData(asset);

  const MIN_ROWS = 200;
  if (usableRows < MIN_ROWS) {
    console.log(
      `[trainModel15s] ${asset}: only ${usableRows}/${totalRows} usable rows. Need ${MIN_ROWS}+. The 15s desk's real 1s Binance history is limited, so live capture matters more here than backfill -- see backfillFeatures15s.js notes.`
    );
    return null;
  }

  const splitIdx = Math.floor(X.length * 0.8);
  const XTrain = X.slice(0, splitIdx), yTrain = y.slice(0, splitIdx);
  const XTest = X.slice(splitIdx), yTest = y.slice(splitIdx);

  const { weights, bias } = trainLogistic(XTrain, yTrain);
  const testProbs = XTest.map((x) => sigmoid(bias + x.reduce((s, xi, j) => s + xi * weights[j], 0)));
  const brier = brierScore(testProbs, yTest);

  const coefficients = {
    intercept: bias,
    momentum15s: weights[0],
    volatility15m: weights[1],
    orderBookImbalance: 0,
    momentum5m: 0,
    momentum15m: 0,
  };

  const { rows } = await pool.query(
    `INSERT INTO models (asset, desk, coefficients, validation_brier, validation_n, trained_at, is_active)
     VALUES ($1, '15s', $2, $3, $4, now(), false) RETURNING id`,
    [asset, JSON.stringify(coefficients), brier, XTest.length]
  );

  console.log(`[trainModel15s] ${asset}: trained on ${XTrain.length}, validated on ${XTest.length}`);
  console.log(`[trainModel15s] validation Brier: ${brier.toFixed(4)}`);
  console.log(`[trainModel15s] saved as candidate id=${rows[0].id} (NOT active) -- run promoteModel.js --desk 15s to consider it`);

  return { coefficients, brier, n: XTest.length, modelId: rows[0].id };
}

async function main() {
  const args = process.argv.slice(2);
  const asset = args.includes('--asset') ? args[args.indexOf('--asset') + 1] : 'BTC';
  await trainAndSave(asset);
  process.exit(0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[trainModel15s] fatal error:', err);
    process.exit(1);
  });
}

module.exports = { trainAndSave };
