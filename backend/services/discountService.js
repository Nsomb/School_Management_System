// backend/services/discountService.js
const db = require('../config/db');

function applyDiscount(totalAmount, discountValue, discountType) {
  if (discountType === 'percentage') return totalAmount - (totalAmount * discountValue / 100);
  if (discountType === 'fixed') return Math.max(0, totalAmount - discountValue);
  return totalAmount;
}

async function getAllDiscountTypes(schoolId) {
  const result = await db.tenantQuery(
    `SELECT id, name, type, value, description, created_at
     FROM discount_types WHERE school_id = $1 ORDER BY name`,
    [schoolId], schoolId
  );
  return result.rows;
}

async function createDiscountType(data, schoolId) {
  const { name, type, value, description } = data;
  const result = await db.tenantQuery(
    `INSERT INTO discount_types (name, type, value, description, school_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [name, type, value, description, schoolId], schoolId
  );
  return result.rows[0].id;
}

async function updateDiscountType(id, data, schoolId) {
  const { name, type, value, description } = data;
  const result = await db.tenantQuery(
    `UPDATE discount_types SET name=$1, type=$2, value=$3, description=$4
     WHERE id=$5 AND school_id=$6 RETURNING id`,
    [name, type, value, description, id, schoolId], schoolId
  );
  return result.rowCount > 0;
}

async function deleteDiscountType(id, schoolId) {
  const result = await db.tenantQuery(
    `DELETE FROM discount_types WHERE id=$1 AND school_id=$2 RETURNING id`,
    [id, schoolId], schoolId
  );
  return result.rowCount > 0;
}

async function assignStudentDiscount(data, schoolId) {
  const { studentId, discountTypeId, academicYear, term, approvedBy, notes } = data;
  const existing = await db.tenantQuery(
    `SELECT id FROM student_discounts
     WHERE student_id=$1 AND discount_type_id=$2 AND academic_year=$3 AND term=$4 AND school_id=$5`,
    [studentId, discountTypeId, academicYear, term, schoolId], schoolId
  );
  if (existing.rows.length > 0) {
    throw new Error('This discount is already assigned to this student for the given year/term.');
  }
  const result = await db.tenantQuery(
    `INSERT INTO student_discounts
      (student_id, discount_type_id, academic_year, term, approved_by, notes, school_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [studentId, discountTypeId, academicYear, term, approvedBy, notes, schoolId], schoolId
  );
  return result.rows[0].id;
}

async function removeStudentDiscount(studentDiscountId, schoolId) {
  const result = await db.tenantQuery(
    `DELETE FROM student_discounts WHERE id=$1 AND school_id=$2 RETURNING id`,
    [studentDiscountId, schoolId], schoolId
  );
  return result.rowCount > 0;
}

async function getStudentDiscounts(studentId, academicYear, term, schoolId) {
  const result = await db.tenantQuery(
    `SELECT
      sd.id AS student_discount_id, sd.academic_year, sd.term, sd.notes, sd.approved_at,
      a.username AS approved_by_username,
      dt.id AS discount_type_id, dt.name AS discount_name,
      dt.type AS discount_type, dt.value AS discount_value,
      dt.description AS discount_description
    FROM student_discounts sd
    JOIN discount_types dt ON sd.discount_type_id = dt.id
    LEFT JOIN admins a ON sd.approved_by = a.id
    WHERE sd.student_id=$1 AND sd.academic_year=$2 AND sd.term=$3 AND sd.school_id=$4`,
    [studentId, academicYear, term, schoolId], schoolId
  );
  return result.rows;
}

async function getAllStudentDiscounts(filters = {}, schoolId) {
  let query = `
    SELECT
      sd.id AS student_discount_id, s.name AS student_name, c.class_name,
      sd.academic_year, sd.term,
      dt.name AS discount_name, dt.type AS discount_type, dt.value AS discount_value,
      sd.notes, sd.approved_at, a.username AS approved_by_username
    FROM student_discounts sd
    JOIN students s ON sd.student_id = s.id
    JOIN classes c ON s.class_id = c.id
    JOIN discount_types dt ON sd.discount_type_id = dt.id
    LEFT JOIN admins a ON sd.approved_by = a.id
    WHERE sd.school_id = $1
  `;
  const params = [schoolId];
  let idx = 2;

  if (filters.studentId)      { query += ` AND sd.student_id=$${idx++}`;      params.push(filters.studentId); }
  if (filters.academicYear)   { query += ` AND sd.academic_year=$${idx++}`;   params.push(filters.academicYear); }
  if (filters.term)           { query += ` AND sd.term=$${idx++}`;            params.push(filters.term); }
  if (filters.discountTypeId) { query += ` AND sd.discount_type_id=$${idx++}`;params.push(filters.discountTypeId); }

  query += ' ORDER BY s.name, sd.academic_year, sd.term';
  const result = await db.tenantQuery(query, params, schoolId);
  return result.rows;
}

async function getEffectiveDiscount(studentId, academicYear, term, totalFee, schoolId) {
  const discounts = await getStudentDiscounts(studentId, academicYear, term, schoolId);
  let totalDiscountAmount = 0;
  const discountDetails = [];

  for (const disc of discounts) {
    let amount = 0;
    if (disc.discount_type === 'percentage') amount = (disc.discount_value / 100) * totalFee;
    else amount = disc.discount_value;
    totalDiscountAmount += amount;
    discountDetails.push({
      id: disc.student_discount_id,
      name: disc.discount_name,
      type: disc.discount_type,
      value: disc.discount_value,
      amount,
    });
  }

  const netAmount = Math.max(0, totalFee - totalDiscountAmount);
  return { totalDiscount: totalDiscountAmount, netAmount, appliedDiscounts: discountDetails };
}

module.exports = {
  applyDiscount,
  getAllDiscountTypes,
  createDiscountType,
  updateDiscountType,
  deleteDiscountType,
  assignStudentDiscount,
  removeStudentDiscount,
  getStudentDiscounts,
  getAllStudentDiscounts,
  getEffectiveDiscount,
};