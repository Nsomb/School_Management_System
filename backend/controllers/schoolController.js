// backend/controllers/schoolController.js
const db = require('../config/db');
const { invalidateSchoolConfig } = require('../services/schoolConfigCache');

// ─────────────── PUBLIC ───────────────
exports.listPublicSchools = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, name_french, code, logo_url, primary_color, region, division
       FROM schools WHERE is_active = true ORDER BY name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('listPublicSchools:', err);
    res.status(500).json({ error: 'Could not load schools' });
  }
};

exports.getSchoolProfile = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM schools WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'School not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('getSchoolProfile:', err);
    res.status(500).json({ error: 'Failed to fetch school profile' });
  }
};

// ─────────────── SUPER ADMIN ───────────────
exports.getAllSchools = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM schools ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('getAllSchools:', err);
    res.status(500).json({ error: 'Failed to fetch schools' });
  }
};

exports.createSchool = async (req, res) => {
  const {
    name, name_french, code, motto, motto_french, ministry, ministry_french,
    region, region_french, division, division_french, logo_url, primary_color,
    phone, email, address,
  } = req.body;

  if (!name || !code) {
    return res.status(400).json({ error: 'Name and code are required' });
  }

  try {
    const result = await db.query(
      `INSERT INTO schools
        (name, name_french, code, motto, motto_french, ministry, ministry_french,
         region, region_french, division, division_french, logo_url, primary_color,
         phone, email, address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [name, name_french || null, code, motto || null, motto_french || null,
       ministry || null, ministry_french || null,
       region || null, region_french || null, division || null, division_french || null,
       logo_url || null, primary_color || '#1976d2',
       phone || null, email || null, address || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createSchool:', err);
    if (err.code === '23505') return res.status(400).json({ error: 'School code already exists' });
    res.status(500).json({ error: 'Failed to create school' });
  }
};

exports.updateSchool = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const allowedFields = [
    'name', 'name_french', 'code', 'motto', 'motto_french', 'ministry', 'ministry_french',
    'region', 'region_french', 'division', 'division_french', 'logo_url', 'primary_color',
    'phone', 'email', 'address', 'is_active',
  ];

  const keys = Object.keys(updates).filter((k) => allowedFields.includes(k));
  if (keys.length === 0) return res.status(400).json({ error: 'No valid fields to update' });

  const values = keys.map((k) => updates[k]);
  const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');

  try {
    const result = await db.query(
      `UPDATE schools SET ${setClause}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'School not found' });

    invalidateSchoolConfig(Number(id));
    res.json(result.rows[0]);
  } catch (err) {
    console.error('updateSchool:', err);
    if (err.code === '23505') return res.status(400).json({ error: 'School code already exists' });
    res.status(500).json({ error: 'Failed to update school' });
  }
};

// ⚡ NEW: Upload school logo
exports.uploadSchoolLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }
    // Frontend gets back a URL it can display and store in logo_url
    const publicPath = `/uploads/logos/${req.file.filename}`;
    res.json({
      message: 'Logo uploaded successfully.',
      logo_url: publicPath,
    });
  } catch (err) {
    console.error('uploadSchoolLogo:', err);
    res.status(500).json({ error: 'Failed to upload logo.' });
  }
};