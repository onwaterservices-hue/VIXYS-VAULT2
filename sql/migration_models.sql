-- Run this after schema.sql, before trainModel.js
CREATE TABLE IF NOT EXISTS models (
  id SERIAL PRIMARY KEY,
  asset TEXT NOT NULL,
  desk TEXT NOT NULL,
  coefficients JSONB NOT NULL,
  validation_brier NUMERIC(6, 4),
  validation_n INT,
  trained_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_models_asset_desk_trained ON models (asset, desk, trained_at DESC);
