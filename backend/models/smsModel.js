// models/smsModel.js
const db = require("../config/db");

// The students table in this DB exposes exactly one phone column:
//   guidance_phone_number
// (verified via information_schema — no parent_phone_number exists)
const PARENT_PHONE_COLUMN = 'guidance_phone_number';

const SmsModel = {
  getDistinctParentPhoneNumbers: async (studentIds, schoolId) => {
    const query = `
      SELECT DISTINCT
        id,
        ${PARENT_PHONE_COLUMN} AS phone
      FROM students
      WHERE school_id = $1
        AND ${PARENT_PHONE_COLUMN} IS NOT NULL
        AND ${PARENT_PHONE_COLUMN} != ''
        ${studentIds && studentIds.length > 0 ? 'AND id IN (SELECT unnest($2::int[]))' : ''}
    `;
    const params = studentIds?.length ? [schoolId, studentIds] : [schoolId];
    const result = await db.tenantQuery(query, params, schoolId);
    return result.rows; // { id, phone }
  },

  getTeacherPhoneNumbers: async (teacherIds, schoolId) => {
    const query = `
      SELECT id, phone_number AS phone
      FROM teachers
      WHERE school_id = $1
        AND phone_number IS NOT NULL
        AND phone_number != ''
        ${teacherIds && teacherIds.length > 0 ? 'AND id IN (SELECT unnest($2::int[]))' : ''}
    `;
    const params = teacherIds?.length ? [schoolId, teacherIds] : [schoolId];
    const result = await db.tenantQuery(query, params, schoolId);
    return result.rows;
  },

  getRecipientOptions: async (schoolId) => {
    const studentsQuery = `
      SELECT s.id, s.name || COALESCE(' (' || c.class_name || ')', '') AS name
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE s.school_id = $1
        AND s.${PARENT_PHONE_COLUMN} IS NOT NULL
        AND s.${PARENT_PHONE_COLUMN} != ''
      ORDER BY s.name
    `;
    const teachersQuery = `
      SELECT id, full_name AS name
      FROM teachers
      WHERE school_id = $1
        AND phone_number IS NOT NULL
        AND phone_number != ''
      ORDER BY full_name
    `;
    const [studentsRes, teachersRes] = await Promise.all([
      db.tenantQuery(studentsQuery, [schoolId], schoolId),
      db.tenantQuery(teachersQuery, [schoolId], schoolId),
    ]);
    return { students: studentsRes.rows, teachers: teachersRes.rows };
  },

  createLog: async ({
    senderId, messageContent, recipientType, recipientCount,
    status, channel, whatsappCount, smsCount, failedCount,
    providerResponse, schoolId,
  }) => {
    const query = `
      INSERT INTO sms_logs
        (sender_id, message_content, recipient_type, recipient_count, status,
         channel, whatsapp_count, sms_count, failed_count,
         sms_provider_response, school_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id;
    `;
    const result = await db.tenantQuery(query, [
      senderId, messageContent, recipientType, recipientCount,
      status, channel, whatsappCount, smsCount, failedCount,
      JSON.stringify(providerResponse), schoolId,
    ], schoolId);
    return result.rows[0].id;
  },

  logDelivery: async ({
    smsLogId, recipientType, recipientId, phoneNumber,
    channel, status, providerMessageId, errorMessage, schoolId,
  }) => {
    const query = `
      INSERT INTO sms_deliveries
        (sms_log_id, recipient_type, recipient_id, phone_number,
         channel, status, provider_message_id, error_message, school_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
    `;
    await db.tenantQuery(query, [
      smsLogId, recipientType, recipientId || null, phoneNumber,
      channel, status, providerMessageId || null, errorMessage || null, schoolId,
    ], schoolId);
  },

  updateLogSummary: async (smsLogId, {
    status, channel, whatsappCount, smsCount, failedCount,
    providerResponse, schoolId,
  }) => {
    const query = `
      UPDATE sms_logs
      SET status = $1, channel = $2, whatsapp_count = $3,
          sms_count = $4, failed_count = $5, sms_provider_response = $6
      WHERE id = $7 AND school_id = $8
    `;
    await db.tenantQuery(query, [
      status, channel, whatsappCount, smsCount, failedCount,
      JSON.stringify(providerResponse), smsLogId, schoolId,
    ], schoolId);
  },

  getHistory: async (schoolId, filters = {}) => {
    let query = `
      SELECT
        sl.id, sl.message_content, sl.recipient_type, sl.recipient_count,
        sl.status, sl.channel, sl.whatsapp_count, sl.sms_count, sl.failed_count,
        sl.created_at, a.username AS sender_username
      FROM sms_logs sl
      LEFT JOIN admins a ON sl.sender_id = a.id
      WHERE sl.school_id = $1
    `;
    const params = [schoolId];
    let idx = 2;

    if (filters.status) {
      query += ` AND sl.status = $${idx++}`;
      params.push(filters.status);
    }

    query += ` ORDER BY sl.created_at DESC`;

    if (filters.limit) {
      query += ` LIMIT $${idx++}`;
      params.push(filters.limit);
    }

    const result = await db.tenantQuery(query, params, schoolId);
    return result.rows;
  },

  getDeliveriesForLog: async (smsLogId, schoolId) => {
    const result = await db.tenantQuery(
      `SELECT * FROM sms_deliveries
       WHERE sms_log_id = $1 AND school_id = $2
       ORDER BY id`,
      [smsLogId, schoolId], schoolId
    );
    return result.rows;
  },
};

module.exports = SmsModel;