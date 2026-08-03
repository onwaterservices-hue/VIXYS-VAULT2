// scripts/trainModel.js
//
// Fits a logistic regression on real settled_contracts data (backfilled +
// live) and writes validated coefficients to the models table.

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
      const pred = sigmoid(z);
      const error = pred - y[i];
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
  const sumSq = probs.reduce((s, p, i) => s + (p - outcomes[i]) ** 2, 0);
  return sumSq / n;
}

async function loadTrainingData(asset, desk) {
  const { rows } = await pool.query(
    `SELECT features, outcome FROM settled_contracts
     WHERE asset = $1 AND desk = $2
     ORDER BY settled_at ASC`,
    [asset, desk]
  );

  const usable = rows.filter(
    (r) => r.features.momentum5m != null && r.features.momentum15m != null && r.features.volatility15m != null
  );

  const X = usable.map((r) => [r.features.momentum5m, r.features.momentum15m, r.features.volatility15m]);
  const y = usable.map((r) => (r.outcome === 'YES' ? 1 : 0));

  return { X, y, totalRows: rows.length, usableRows: usable.length };
}

function trainTestSplit(X, y, testFraction = 0.2) {
  const n = X.length;
  const splitIdx = Math.floor(n * (1 - testFraction));
  return {
    XTrain: X.slice(0, splitIdx),
    yTrain: y.slice(0, splitIdx),
    XTest: X.slice(splitIdx),
    yTest: y.slice(splitIdx),
  };
}

async function trainAndSave(asset, desk) {
  const { X, y, totalRows, usableRows } = await loadTrainingData(asset, desk);

  const MIN_ROWS = 200;
  if (usableRows < MIN_ROWS) {
    console.log(
      `[trainModel] ${asset}/${desk}: only ${usableRows} usable rows (${totalRows} total settled). Need ${MIN_ROWS}+. Not training yet -- run the backfill scripts for more history.`
    );
    return null;
  }

  const { XTrain, yTrain, XTest, yTest } = trainTestSplit(X, y);
  const { weights, bias } = trainLogistic(XTrain, yTrain);

  const testProbs = XTest.map((x) => sigmoid(bias + x.reduce((s, xi, j) => s + xi * weights[j], 0)));
  const brier = brierScore(testProbs, yTest);

  const coefficients = {
    intercept: bias,
    momentum5m: weights[0],
    momentum15m: weights[1],
    volatility15m: weights[2],
    orderBookImbalance: 0,
  };

  await pool.query(
    `INSERT INTO models (asset, desk, coefficients, validation_brier, validation_n, trained_at)
     VALUES ($1, $2, $3, $4, $5, now())`,
    [asset, desk, JSON.stringify(coefficients), brier, XTest.length]
  );

  console.log(`[trainModel] ${asset}/${desk}: trained on ${XTrain.length} rows, validated on ${XTest.length} rows`);
  console.log(`[trainModel] validation Brier score: ${brier.toFixed(4)} (lower is better; 0.25 = coin flip, 0 = perfect)`);
  console.log(`[trainModel] coefficients:`, coefficients);

  return { coefficients, brier, n: XTest.length };
}

async function main() {
  const args = process.argv.slice(2);
  const asset = args.includes('--asset') ? args[args.indexOf('--asset') + 1] : 'BTC';
  const desk = args.includes('--desk') ? args[args.indexOf('--desk') + 1] : '1h';

  await trainAndSave(asset, desk);
  process.exit(0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[trainModel] fatal error:', err);
    process.exit(1);
  });
}

module.exports = { trainAndSave };
