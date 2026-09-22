// backend/config/db.js
const { Pool } = require('pg');
require('dotenv').config();

// ─── Build the pool config ────────────────────────────────
// Production (Render, Railway, Heroku): DATABASE_URL is provided
// Development (localhost): individual DB_* vars are used
let poolConfig;

if (process.env.DATABASE_URL) {
  // Production path — Render provides a full connection URL
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.DB_SSL === 'false'
        ? false
        : { rejectUnauthorized: false }, // Render Postgres requires SSL
  };
} else {
  // Development path — individual vars from .env
  poolConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  };
}

const pool = new Pool(poolConfig);

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
});

// ─── Validation ───────────────────────────────────────────
function assertValidSchoolId(schoolId) {
  const id = Number(schoolId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid schoolId passed to tenant query: ${schoolId}`);
  }
  return id;
}

module.exports = {
  // 1. Global queries (Super Admin, schools table)
  query: (text, params) => pool.query(text, params),

  // 2. Single tenant-scoped query (own transaction)
  tenantQuery: async (text, params, schoolId) => {
    const id = assertValidSchoolId(schoolId);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT set_config($1, $2, true)', [
        'app.current_school_id',
        String(id),
      ]);
      const result = await client.query(text, params);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // 3. Multi-query tenant transaction (atomic)
  withTenantTransaction: async (schoolId, fn) => {
    const id = assertValidSchoolId(schoolId);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT set_config($1, $2, true)', [
        'app.current_school_id',
        String(id),
      ]);
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  getConnection: () => pool.connect(),
};