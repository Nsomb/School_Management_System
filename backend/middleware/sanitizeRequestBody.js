// backend/middleware/sanitizeRequestBody.js
//
// Runs globally after express.json(). Recursively walks req.body and:
//   - Converts "" → null for any key ending in _id or named id/schoolId/etc.
//   - Coerces "1" → 1 for integer keys
//   - Trims strings and converts "" → null
//
// This is "defense in depth" — it guarantees the DB never receives
// an empty string where an integer is expected.

const INT_KEYS = new Set([
  'id', 'school_id', 'schoolId', 'class_id', 'classId',
  'subject_id', 'subjectId', 'teacher_id', 'teacherId',
  'student_id', 'studentId', 'user_id', 'userId',
  'admin_id', 'adminId', 'fee_structure_id', 'feeStructureId',
  'payment_id', 'paymentId', 'term_id', 'termId',
  'faculty_id', 'facultyId', 'specialty_id', 'specialtyId',
  'evaluation_id', 'evaluationId', 'discount_type_id', 'discountTypeId',
  'student_discount_id', 'studentDiscountId',
]);

const INT_ARRAY_KEYS = new Set([
  'subject_ids', 'subjectIds', 'class_ids', 'classIds',
  'student_ids', 'studentIds', 'teacher_ids', 'teacherIds',
]);

function coerceInt(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isInteger(v) ? v : null;
  const n = Number(String(v).trim());
  return Number.isInteger(n) ? n : null;
}

function sanitize(obj) {
  if (Array.isArray(obj)) return obj.map(sanitize);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];

      if (INT_ARRAY_KEYS.has(key)) {
        out[key] = Array.isArray(val)
          ? val.map(coerceInt).filter((v) => v !== null)
          : [];
        continue;
      }

      if (INT_KEYS.has(key)) {
        out[key] = coerceInt(val);
        continue;
      }

      if (val && typeof val === 'object') {
        out[key] = sanitize(val);
        continue;
      }

      if (typeof val === 'string') {
        const trimmed = val.trim();
        out[key] = trimmed === '' ? null : trimmed;
        continue;
      }

      out[key] = val;
    }
    return out;
  }
  return obj;
}

module.exports = function sanitizeRequestBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitize(req.body);
  }
  next();
};