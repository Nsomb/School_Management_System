// backend/controllers/authController.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const db = require("../config/db");

const JWT_SECRET = process.env.JWT_SECRET || "a_super_strong_random_secret_key_for_dev";

const AuthController = {
  // ─────────────────────────────────────────────────────────
  // UNIFIED LOGIN — handles admin, bursar, teacher, super_admin
  // ─────────────────────────────────────────────────────────
  login: async (req, res) => {
    try {
      const { username, password, schoolId } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required." });
      }

      let user = null;
      let role = null;
      let school = null;

      // ─── CASE 1: SUPER ADMIN (schoolId is null/undefined) ───
      if (schoolId === null || schoolId === undefined) {
        const result = await db.query(
          `SELECT id, username, password_hash, role, full_name, phone_number
           FROM admins
           WHERE username = $1 AND school_id IS NULL AND role = 'super_admin'
           LIMIT 1`,
          [username]
        );

        if (result.rows.length === 0) {
          return res.status(401).json({ error: "Invalid credentials." });
        }

        user = result.rows[0];
        role = 'super_admin';
        // No school for super admin
      }

      // ─── CASE 2: SCHOOL USER (schoolId provided) ───
      else {
        // 2a. Verify the school exists and is active
        const schoolResult = await db.query(
          `SELECT id, name, is_active FROM schools WHERE id = $1`,
          [schoolId]
        );

        if (schoolResult.rows.length === 0) {
          return res.status(404).json({ error: "School not found." });
        }

        school = schoolResult.rows[0];

        if (!school.is_active) {
          return res.status(403).json({ error: "This school account has been deactivated." });
        }

        // 2b. Try admin (includes admin + bursar roles)
        const adminResult = await db.query(
          `SELECT id, username, password_hash, role, full_name, phone_number
           FROM admins
           WHERE username = $1 AND school_id = $2
           LIMIT 1`,
          [username, schoolId]
        );

        if (adminResult.rows.length > 0) {
          user = adminResult.rows[0];
          role = user.role; // 'admin' or 'bursar'
        } else {
          // 2c. Try teacher
          const teacherResult = await db.query(
            `SELECT id, username, password_hash, full_name, phone_number
             FROM teachers
             WHERE username = $1 AND school_id = $2
             LIMIT 1`,
            [username, schoolId]
          );

          if (teacherResult.rows.length > 0) {
            user = teacherResult.rows[0];
            role = 'teacher';
          }
        }
      }

      if (!user) {
        return res.status(401).json({ error: "Invalid credentials." });
      }

      // ─── Verify password ───
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        return res.status(401).json({ error: "Invalid credentials." });
      }

      // ─── Sign JWT with schoolId and schoolName ───
      const tokenPayload = {
        userId: user.id,
        username: user.username,
        full_name: user.full_name || user.username,
        role,
        schoolId: school ? school.id : null,
        schoolName: school ? school.name : null,
      };

      const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "1d" });

      console.log(`✅ Login success: ${username} (${role}) — school: ${school?.name || 'PLATFORM'}`);

      // ─── Return response matching frontend AuthService.ts expectations ───
      res.json({
        accessToken: token,
        userDetails: {
          id: user.id,
          username: user.username,
          full_name: user.full_name || user.username,
          phone_number: user.phone_number,
          role,
          schoolId: school ? school.id : null,
          schoolName: school ? school.name : undefined,
        },
      });

    } catch (error) {
      console.error("❌ Login error:", error);
      res.status(500).json({ error: "An internal server error occurred during login." });
    }
  },

  // ─────────────────────────────────────────────────────────
  // ADMIN REGISTRATION — now requires super_admin to create
  // school admins, and must specify a schoolId.
  // ─────────────────────────────────────────────────────────
  register: async (req, res) => {
    try {
      const { username, password, schoolId, role = 'admin', full_name } = req.body;

      if (!username || !password || !schoolId) {
        return res.status(400).json({ error: "Username, password, and schoolId are required." });
      }

      if (!['admin', 'bursar'].includes(role)) {
        return res.status(400).json({ error: "Role must be 'admin' or 'bursar'." });
      }

      // Verify school exists
      const schoolCheck = await db.query(`SELECT id FROM schools WHERE id = $1`, [schoolId]);
      if (schoolCheck.rows.length === 0) {
        return res.status(404).json({ error: "School not found." });
      }

      // Check username uniqueness within the school
      const existing = await db.query(
        `SELECT id FROM admins WHERE username = $1 AND school_id = $2`,
        [username, schoolId]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: "Username already exists in this school." });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await db.query(
        `INSERT INTO admins (username, password_hash, role, school_id, full_name)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, username, role, school_id, full_name`,
        [username, hashedPassword, role, schoolId, full_name || username]
      );

      res.status(201).json({
        message: "Admin registered successfully!",
        admin: result.rows[0],
      });

    } catch (error) {
      console.error("❌ Registration error:", error);
      res.status(500).json({ error: "An internal server error occurred during registration." });
    }
  },
};

module.exports = AuthController;