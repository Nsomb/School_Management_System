// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

// ─── Role groups ─────────────────────────────────────────────
const ADMIN_ROLES   = ['admin', 'bursar', 'super_admin'];
const STAFF_ROLES   = ['admin', 'bursar', 'teacher', 'super_admin'];
const BURSAR_ROLES  = ['bursar', 'super_admin'];

// ─── Helpers ─────────────────────────────────────────────────
const unauthorized = (res, message = 'Unauthorized: No token provided.') =>
  res.status(401).json({ error: message });

const forbidden = (res, message = 'Forbidden.') =>
  res.status(403).json({ error: message });

/**
 * Decode JWT and attach:
 *   req.user      — full user payload
 *   req.teacher   — same, with teacherId (if role = teacher)
 *   req.schoolId  — TOP-LEVEL access for controllers
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized(res, 'Unauthorized: No token provided.');
  }

  const token = authHeader.split(' ')[1];
  if (!token) return unauthorized(res, 'Unauthorized: No token provided.');

  if (!JWT_SECRET) {
    return res.status(500).json({ error: 'Server misconfiguration: JWT_SECRET not set.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const schoolId = decoded.schoolId ?? null;

    const userPayload = {
      id: decoded.userId || decoded.teacherId || decoded.id,
      username: decoded.username,
      full_name: decoded.full_name,
      role: decoded.role,
      schoolId,
      schoolName: decoded.schoolName ?? null,
    };

    req.user = userPayload;

    if (decoded.role === 'teacher') {
      req.teacher = {
        ...userPayload,
        teacherId: decoded.teacherId || decoded.userId || decoded.id,
      };
    }

    // ⚡ THE KEY LINE — every controller reads req.schoolId
    req.schoolId = schoolId;

    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return unauthorized(res, 'Unauthorized: Token expired. Please log in again.');
    }
    if (err.name === 'JsonWebTokenError') {
      return unauthorized(res, 'Unauthorized: Invalid token.');
    }
    return res.status(500).json({ error: 'Failed to authenticate token.' });
  }
}

function requireTenant(req, res, next) {
  if (!req.schoolId) {
    return forbidden(res, 'No school context. Super admins cannot access school-scoped data.');
  }
  next();
}

function verifySuperAdmin(req, res, next) {
  verifyToken(req, res, (err) => {
    if (err) return;
    if (req.user?.role !== 'super_admin') {
      return forbidden(res, 'Forbidden: Super admin access required.');
    }
    req.schoolId = null;
    next();
  });
}

function verifyAdmin(req, res, next) {
  verifyToken(req, res, (err) => {
    if (err) return;
    if (!ADMIN_ROLES.includes(req.user?.role)) {
      return forbidden(res, 'Forbidden: Admin access required.');
    }
    next();
  });
}

function verifyTeacher(req, res, next) {
  verifyToken(req, res, (err) => {
    if (err) return;
    if (req.user?.role !== 'teacher') {
      return forbidden(res, 'Forbidden: Teacher access required.');
    }
    if (!req.teacher) {
      req.teacher = { ...req.user, teacherId: req.user.id };
    }
    next();
  });
}

function verifyStaff(req, res, next) {
  verifyToken(req, res, (err) => {
    if (err) return;
    if (!STAFF_ROLES.includes(req.user?.role)) {
      return forbidden(res, 'Forbidden: Staff access required.');
    }
    next();
  });
}

/**
 * Bursar-only (used by feeRoutes.js).
 * Must be chained AFTER verifyAdmin — verifyAdmin sets req.user.
 */
function requireBursar(req, res, next) {
  if (!req.user || !BURSAR_ROLES.includes(req.user.role)) {
    return forbidden(res, 'Forbidden: Bursar access required.');
  }
  next();
}

module.exports = {
  verifyToken,
  requireTenant,
  verifyAdmin,
  verifyTeacher,
  verifyStaff,
  verifySuperAdmin,
  requireBursar,
};