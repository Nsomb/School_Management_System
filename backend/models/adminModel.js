const db = require('../config/db');

const AdminModel = {
  // Find admin by username (includes role)
  findByUsername: async (username) => {
    const result = await db.query(
      'SELECT id, username, password_hash, role FROM admins WHERE username = $1',
      [username]
    );
    return result.rows[0];
  },

  // Create a new admin (role defaults to 'admin')
  create: async ({ username, password_hash, role = 'admin' }) => {
    const result = await db.query(
      'INSERT INTO admins (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id',
      [username, password_hash, role]
    );
    return { id: result.rows[0].id };
  },

  // Get admin by ID
  findById: async (id) => {
    const result = await db.query(
      'SELECT id, username, role FROM admins WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }
};

module.exports = AdminModel;