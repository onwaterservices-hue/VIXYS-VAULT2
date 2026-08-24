import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/vixy_vault';

export const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('render.com') || process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});
