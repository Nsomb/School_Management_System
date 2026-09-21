// backend/config/db.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => console.log('✅ Connected to PostgreSQL'));
pool.on('error', (err) => console.error('❌ PostgreSQL idle client error', err));

function assertValidSchoolId(schoolId) {
    const id = Number(schoolId);
    if (!Number.isInteger(id) || id <= 0) {
        throw new Error(`Invalid schoolId: ${schoolId}`);
    }
    return id;
}

module.exports = {
    // 1. Global queries (Super Admin, schools table) — NO tenant scoping
    query: (text, params) => pool.query(text, params),

    // 2. Single tenant-scoped query (own transaction)
    tenantQuery: async (text, params, schoolId) => {
        const id = assertValidSchoolId(schoolId);
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('SELECT set_config($1, $2, true)', ['app.current_school_id', String(id)]);
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

    // 3. Multi-query tenant transaction (atomic operations, e.g. fee payments)
    withTenantTransaction: async (schoolId, fn) => {
        const id = assertValidSchoolId(schoolId);
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('SELECT set_config($1, $2, true)', ['app.current_school_id', String(id)]);
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