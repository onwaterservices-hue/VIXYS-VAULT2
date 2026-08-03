-- Run after migration_models.sql
-- Adds the flag that makes model promotion explicit and safe: the live engine
-- reads the ACTIVE model, not just the most recently trained one. A new
-- model only becomes active if promoteModel.js proves it's actually better.

ALTER TABLE models ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT false;

-- Only one active model per asset+desk at a time.
CREATE UNIQUE INDEX IF NOT EXISTS idx_models_one_active_per_desk
  ON models (asset, desk) WHERE is_active = true;
