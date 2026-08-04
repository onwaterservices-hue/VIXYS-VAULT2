const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/vixy_vault';

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('render.com') || process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

module.exports = { pool };
