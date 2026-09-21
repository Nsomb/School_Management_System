// backend/controllers/superAdminController.js
const bcrypt = require('bcrypt');
const db = require('../config/db');

/**
 * GET /api/super-admin/schools/:schoolId/admins
 * List all admin accounts (admin + bursar) for a specific school.
 */
exports.listSchoolAdmins = async (req, res) => {
  try {
    const { schoolId } = req.params;

    const result = await db.query(
      `SELECT id, username, full_name, phone_number, role, created_at
       FROM admins
       WHERE school_id = $1 AND role IN ('admin', 'bursar')
       ORDER BY created_at DESC`,
      [schoolId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('listSchoolAdmins:', err);
    res.status(500).json({ error: 'Failed to fetch admins' });
  }
};

/**
 * POST /api/super-admin/schools/:schoolId/admins
 * Create a new admin or bursar for a school.
 */
exports.createSchoolAdmin = async (req, res) => {
  const { schoolId } = req.params;
  const { username, password, full_name, phone_number, role = 'admin' } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  if (!['admin', 'bursar'].includes(role)) {
    return res.status(400).json({ error: "Role must be 'admin' or 'bursar'." });
  }

  try {
    // 1. Verify school exists
    const schoolCheck = await db.query('SELECT id, name FROM schools WHERE id = $1', [schoolId]);
    if (schoolCheck.rows.length === 0) {
      return res.status(404).json({ error: 'School not found.' });
    }

    // 2. Check username uniqueness within this school
    const existing = await db.query(
      'SELECT id FROM admins WHERE username = $1 AND school_id = $2',
      [username, schoolId]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Username already exists in this school.' });
    }

    // 3. Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Insert
    const result = await db.query(
      `INSERT INTO admins (username, password_hash, role, school_id, full_name, phone_number)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, username, full_name, phone_number, role, created_at`,
      [username, passwordHash, role, schoolId, full_name || username, phone_number || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createSchoolAdmin:', err);
    res.status(500).json({ error: 'Failed to create admin' });
  }
};

/**
 * PUT /api/super-admin/admins/:adminId
 * Update an admin (name, phone, role, and optionally password).
 */
exports.updateSchoolAdmin = async (req, res) => {
  const { adminId } = req.params;
  const { full_name, phone_number, role, password } = req.body;

  try {
    const fields = [];
    const values = [];
    let idx = 1;

    if (full_name !== undefined) { fields.push(`full_name = $${idx++}`); values.push(full_name); }
    if (phone_number !== undefined) { fields.push(`phone_number = $${idx++}`); values.push(phone_number); }
    if (role !== undefined) {
      if (!['admin', 'bursar'].includes(role)) {
        return res.status(400).json({ error: "Role must be 'admin' or 'bursar'." });
      }
      fields.push(`role = $${idx++}`);
      values.push(role);
    }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      fields.push(`password_hash = $${idx++}`);
      values.push(hash);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }

    values.push(adminId);

    const result = await db.query(
      `UPDATE admins SET ${fields.join(', ')}
       WHERE id = $${idx} AND role IN ('admin', 'bursar')
       RETURNING id, username, full_name, phone_number, role`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Admin not found.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('updateSchoolAdmin:', err);
    res.status(500).json({ error: 'Failed to update admin' });
  }
};

/**
 * DELETE /api/super-admin/admins/:adminId
 * Remove an admin account.
 */
exports.deleteSchoolAdmin = async (req, res) => {
  const { adminId } = req.params;

  try {
    // Only allow deleting admin/bursar, never super_admin
    const result = await db.query(
      `DELETE FROM admins
       WHERE id = $1 AND role IN ('admin', 'bursar')
       RETURNING id, username`,
      [adminId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Admin not found or cannot be deleted.' });
    }

    res.json({ message: 'Admin deleted successfully.', admin: result.rows[0] });
  } catch (err) {
    console.error('deleteSchoolAdmin:', err);
    res.status(500).json({ error: 'Failed to delete admin' });
  }
};