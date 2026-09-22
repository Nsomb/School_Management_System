// backend/scripts/seedSuperAdmin.js
//
// Run once after first deploy:
//   node scripts/seedSuperAdmin.js
//
// Creates the platform super admin if none exists.
// Uses env vars: SUPER_ADMIN_USERNAME, SUPER_ADMIN_PASSWORD

require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('../config/db');

const USERNAME = process.env.SUPER_ADMIN_USERNAME || 'superadmin';
const PASSWORD = process.env.SUPER_ADMIN_PASSWORD;

async function main() {
  if (!PASSWORD) {
    console.error('❌ SUPER_ADMIN_PASSWORD env var is required.');
    console.error('   Set it in Render dashboard → Environment before running this.');
    process.exit(1);
  }

  try {
    // Check if a super admin already exists
    const existing = await db.query(
      `SELECT id, username FROM admins WHERE role = 'super_admin' AND school_id IS NULL LIMIT 1`
    );

    if (existing.rows.length > 0) {
      console.log(`ℹ️  Super admin already exists: ${existing.rows[0].username} (id=${existing.rows[0].id})`);
      console.log('   Nothing to do.');
      process.exit(0);
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(PASSWORD, 10);

    // Insert the super admin
    const result = await db.query(
      `INSERT INTO admins (username, password_hash, role, school_id, full_name)
       VALUES ($1, $2, 'super_admin', NULL, 'Platform Owner')
       RETURNING id, username, role`,
      [USERNAME, passwordHash]
    );

    console.log('✅ Super admin created:');
    console.log(`   ID:       ${result.rows[0].id}`);
    console.log(`   Username: ${result.rows[0].username}`);
    console.log(`   Role:     ${result.rows[0].role}`);
    console.log('');
    console.log('You can now log in at: /super-admin-login');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to seed super admin:', err);
    process.exit(1);
  }
}

main();