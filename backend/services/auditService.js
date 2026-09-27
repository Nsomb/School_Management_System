// backend/services/auditService.js
const db = require('../config/db');

async function logAudit({
  userId,
  username,
  action,
  entityType,
  entityId,
  oldData = null,
  newData = null,
  ipAddress = null,
  userAgent = null,
  schoolId,
}) {
  try {
    if (!schoolId) {
      console.warn('logAudit called without schoolId – skipping');
      return;
    }
    await db.tenantQuery(
      `INSERT INTO audit_logs (
        user_id, username, action, entity_type, entity_id,
        old_data, new_data, ip_address, user_agent, school_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        userId || null,
        username || null,
        action,
        entityType,
        entityId || null,
        oldData ? JSON.stringify(oldData) : null,
        newData ? JSON.stringify(newData) : null,
        ipAddress || null,
        userAgent || null,
        schoolId,
      ],
      schoolId
    );
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}

async function getAuditLogs(filters = {}, schoolId) {
  // COALESCE(al.username, a.username) fills in the username for OLD audit
  // rows that were created before we started storing it. New rows store
  // it directly, so the JOIN is just a safety net.
  let query = `
    SELECT
      al.id,
      al.user_id,
      COALESCE(al.username, a.username) AS username,
      al.action,
      al.entity_type,
      al.entity_id,
      al.old_data,
      al.new_data,
      al.ip_address,
      al.user_agent,
      al.created_at
    FROM audit_logs al
    LEFT JOIN admins a ON al.user_id = a.id
    WHERE al.school_id = $1
  `;
  const params = [schoolId];
  let idx = 2;

  if (filters.userId)     { query += ` AND al.user_id = $${idx++}`;     params.push(filters.userId); }
  if (filters.action)     { query += ` AND al.action = $${idx++}`;      params.push(filters.action); }
  if (filters.entityType) { query += ` AND al.entity_type = $${idx++}`; params.push(filters.entityType); }
  if (filters.entityId)   { query += ` AND al.entity_id = $${idx++}`;   params.push(filters.entityId); }
  if (filters.startDate)  { query += ` AND al.created_at >= $${idx++}`; params.push(filters.startDate); }
  if (filters.endDate)    { query += ` AND al.created_at <= $${idx++}`; params.push(filters.endDate); }

  query += ` ORDER BY al.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
  params.push(filters.limit || 100, filters.offset || 0);

  const result = await db.tenantQuery(query, params, schoolId);
  return result.rows;
}

async function getDistinctActions(schoolId) {
  const result = await db.tenantQuery(
    `SELECT DISTINCT action FROM audit_logs WHERE school_id = $1 ORDER BY action`,
    [schoolId], schoolId
  );
  return result.rows.map(row => row.action);
}

module.exports = { logAudit, getAuditLogs, getDistinctActions };