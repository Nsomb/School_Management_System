// backend/models/teacherModel.js
const db = require("../config/db");
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-32-byte-encryption-key-!';
const IV_LENGTH = 16;

const generateKey = (key) => crypto.createHash('sha256').update(key).digest();

const encrypt = (text) => {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = generateKey(ENCRYPTION_KEY);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    return text;
  }
};

const decrypt = (text) => {
  try {
    if (!text || !text.includes(':')) return text;
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedText = parts.join(':');
    const key = generateKey(ENCRYPTION_KEY);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return text;
  }
};

const TeacherModel = {
  // 🔑 Uses tenantQuery — sets app.current_school_id so RLS WITH CHECK passes
  create: async ({ username, password_hash, full_name, phone_number, plain_password, school_id }) => {
    const encryptedPassword = encrypt(plain_password || '');

    const result = await db.tenantQuery(
      `INSERT INTO teachers
        (username, password_hash, encrypted_password, full_name, phone_number, school_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, username, full_name, phone_number, school_id, created_at`,
      [username, password_hash, encryptedPassword, full_name, phone_number, school_id],
      school_id
    );
    return result.rows[0];
  },

  findByUsername: async (username, schoolId) => {
    const result = await db.tenantQuery(
      `SELECT * FROM teachers WHERE username = $1 AND school_id = $2`,
      [username, schoolId],
      schoolId
    );
    return result.rows[0];
  },

  findByUsernameOrEmail: async (username, schoolId) => {
    const result = await db.tenantQuery(
      `SELECT * FROM teachers WHERE username = $1 AND school_id = $2`,
      [username, schoolId],
      schoolId
    );
    return result.rows[0];
  },

  getById: async (id, schoolId) => {
    const result = await db.tenantQuery(
      `SELECT t.id, t.username, t.full_name, t.phone_number, t.school_id, t.created_at, t.encrypted_password,
              COALESCE(
                json_agg(
                  DISTINCT jsonb_build_object(
                    'id', ta.id,
                    'subject_id', s.id,
                    'subject_name', s.name,
                    'class_id', c.id,
                    'class_name', c.class_name
                  )
                ) FILTER (WHERE ta.id IS NOT NULL), '[]'
              ) as assignments
       FROM teachers t
       LEFT JOIN teacher_assignments ta ON t.id = ta.teacher_id
       LEFT JOIN subjects s ON ta.subject_id = s.id
       LEFT JOIN classes c ON ta.class_id = c.id
       WHERE t.id = $1 AND t.school_id = $2
       GROUP BY t.id`,
      [id, schoolId],
      schoolId
    );
    return result.rows[0];
  },

  getByName: async (name, schoolId) => {
    const result = await db.tenantQuery(
      `SELECT id, full_name AS name FROM teachers
       WHERE LOWER(full_name) = LOWER($1) AND school_id = $2`,
      [name, schoolId],
      schoolId
    );
    return result.rows[0];
  },

  getAll: async (schoolId) => {
    const result = await db.tenantQuery(
      `SELECT t.id, t.username, t.full_name, t.phone_number, t.school_id, t.created_at, t.encrypted_password,
              COALESCE(
                json_agg(
                  DISTINCT jsonb_build_object(
                    'id', ta.id,
                    'subject_id', s.id,
                    'subject_name', s.name,
                    'class_id', c.id,
                    'class_name', c.class_name
                  )
                ) FILTER (WHERE ta.id IS NOT NULL), '[]'
              ) as assignments
       FROM teachers t
       LEFT JOIN teacher_assignments ta ON t.id = ta.teacher_id
       LEFT JOIN subjects s ON ta.subject_id = s.id
       LEFT JOIN classes c ON ta.class_id = c.id
       WHERE t.school_id = $1
       GROUP BY t.id
       ORDER BY t.full_name`,
      [schoolId],
      schoolId
    );

    return result.rows.map((teacher) => ({
      ...teacher,
      assignments: teacher.assignments || [],
    }));
  },

  deleteByUsername: async (username, schoolId) => {
    const result = await db.tenantQuery(
      `DELETE FROM teachers WHERE username = $1 AND school_id = $2 RETURNING id`,
      [username, schoolId],
      schoolId
    );
    return result.rowCount > 0;
  },

  update: async (id, updateData, schoolId) => {
    const allowedUpdates = ['full_name', 'phone_number', 'password_hash'];
    const fields = [];
    const values = [];
    let queryIndex = 1;

    for (const key of allowedUpdates) {
      if (updateData.hasOwnProperty(key)) {
        fields.push(`${key} = $${queryIndex++}`);
        values.push(updateData[key]);
      }
    }

    if (fields.length === 0) return null;

    values.push(id);
    values.push(schoolId);

    const result = await db.tenantQuery(
      `UPDATE teachers SET ${fields.join(', ')}
       WHERE id = $${queryIndex} AND school_id = $${queryIndex + 1}
       RETURNING id, username, full_name, phone_number, school_id, created_at`,
      values,
      schoolId
    );
    return result.rows[0] || null;
  },

  getDecryptedPassword: async (teacherId, schoolId) => {
    const result = await db.tenantQuery(
      `SELECT encrypted_password FROM teachers WHERE id = $1 AND school_id = $2`,
      [teacherId, schoolId],
      schoolId
    );

    if (result.rows[0] && result.rows[0].encrypted_password) {
      try {
        return decrypt(result.rows[0].encrypted_password);
      } catch (error) {
        console.error('Decryption failed:', error);
        return 'teacher123';
      }
    }
    return 'teacher123';
  },

  updateEncryptedPassword: async (teacherId, plainPassword, schoolId) => {
    const encryptedPassword = encrypt(plainPassword);
    const result = await db.tenantQuery(
      `UPDATE teachers SET encrypted_password = $1 WHERE id = $2 AND school_id = $3 RETURNING id`,
      [encryptedPassword, teacherId, schoolId],
      schoolId
    );
    return result.rows[0];
  },

  getAssignedSubjects: async (teacherId, schoolId) => {
    const result = await db.tenantQuery(
      `SELECT ta.id as assignment_id, ta.subject_id, s.name AS subject_name,
              ta.class_id, c.class_name
       FROM teacher_assignments ta
       JOIN subjects s ON ta.subject_id = s.id
       JOIN classes c ON ta.class_id = c.id
       WHERE ta.teacher_id = $1 AND ta.school_id = $2
       ORDER BY s.name`,
      [teacherId, schoolId],
      schoolId
    );
    return result.rows;
  },
};

module.exports = TeacherModel;