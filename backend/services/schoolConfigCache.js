// backend/services/schoolConfigCache.js
const db = require('../config/db');

const cache = new Map(); // schoolId -> { data, expiresAt }
const TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getSchoolConfig(schoolId) {
    const id = Number(schoolId);
    const cached = cache.get(id);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
    }

    const result = await db.query('SELECT * FROM schools WHERE id = $1', [id]);
    if (result.rows.length === 0) throw new Error('School not found');

    const data = result.rows[0];
    cache.set(id, { data, expiresAt: Date.now() + TTL_MS });
    return data;
}

function invalidateSchoolConfig(schoolId) {
    cache.delete(Number(schoolId));
}

module.exports = { getSchoolConfig, invalidateSchoolConfig };