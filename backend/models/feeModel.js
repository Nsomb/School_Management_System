// backend/models/feeModel.js
const db = require('../config/db');
const { generateReceipt } = require('../services/receiptService');
const discountService = require('../services/discountService');

// ============================================================================
// PAYMENT CREATION
// ============================================================================

async function createPayment(paymentData, schoolId) {
  const requiredFields = ['student_id', 'fee_structure_id', 'amount_paid', 'payment_date', 'payment_method'];
  const missing = requiredFields.filter(f => !paymentData[f]);
  if (missing.length) throw new Error(`Missing required fields: ${missing.join(', ')}`);

  let client;
  try {
    client = await db.getConnection();
    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true)', ['app.current_school_id', String(schoolId)]);

    const tempReceiptNumber = `TEMP-${Date.now()}`;

    const insertQuery = `
      INSERT INTO payments (
        student_id, fee_structure_id, amount_paid,
        payment_date, payment_method, recorded_by_admin_id,
        notes, reference_number, status, student_discount_id, receipt_number,
        component_name, school_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9, $10, $11, $12)
      RETURNING id;
    `;
    const result = await client.query(insertQuery, [
      paymentData.student_id,
      paymentData.fee_structure_id,
      paymentData.amount_paid,
      paymentData.payment_date,
      paymentData.payment_method,
      paymentData.recorded_by_admin_id || null,
      paymentData.notes || null,
      paymentData.reference_number || null,
      paymentData.student_discount_id || null,
      tempReceiptNumber,
      paymentData.component_name || null,
      schoolId,
    ]);
    const paymentId = result.rows[0].id;

    const yearTermQuery = `SELECT academic_year, term FROM fees_structure WHERE id = $1 AND school_id = $2`;
    const yearTermResult = await client.query(yearTermQuery, [paymentData.fee_structure_id, schoolId]);
    if (!yearTermResult.rows[0]) throw new Error('Fee structure not found.');
    const { academic_year, term } = yearTermResult.rows[0];
    const year = academic_year.split(/[-\/]/)[0];
    const receiptNumber = `RCP-${year}-${String(paymentId).padStart(5, '0')}`;

    await client.query(`UPDATE payments SET receipt_number = $1 WHERE id = $2`, [receiptNumber, paymentId]);

    const detailsQuery = `
      SELECT
        p.*,
        s.name AS student_name,
        c.class_name,
        fs.academic_year,
        fs.term,
        fs.description AS fee_description,
        (SELECT SUM(fc.amount) FROM fees_components fc WHERE fc.fees_structure_id = fs.id) AS total_fee_amount_expected,
        (SELECT SUM(fc.amount) FROM fees_components fc WHERE fc.fees_structure_id = fs.id)
          - COALESCE((SELECT SUM(p2.amount_paid) FROM payments p2
                      WHERE p2.student_id = s.id AND p2.fee_structure_id = fs.id AND p2.status = 'active'), 0) AS outstanding_balance,
        a.username AS recorded_by_admin_username,
        (SELECT JSON_AGG(JSON_BUILD_OBJECT('name', fc.component_name, 'amount', fc.amount))
         FROM fees_components fc WHERE fc.fees_structure_id = fs.id) AS components
      FROM payments p
      JOIN students s ON p.student_id = s.id
      JOIN classes c ON s.class_id = c.id
      JOIN fees_structure fs ON p.fee_structure_id = fs.id
      LEFT JOIN admins a ON p.recorded_by_admin_id = a.id
      WHERE p.id = $1;
    `;
    const detailResult = await client.query(detailsQuery, [paymentId]);
    const paymentDetails = detailResult.rows[0];
    if (!paymentDetails) throw new Error('Failed to fetch payment details for receipt.');

    paymentDetails.school_id = schoolId;
    const relativePath = await generateReceipt(paymentDetails, receiptNumber, client);

    await client.query(`UPDATE payments SET receipt_path = $1 WHERE id = $2`, [relativePath, paymentId]);

    await client.query('COMMIT');
    return { paymentId, receiptNumber, receiptPath: relativePath };
  } catch (error) {
    await client?.query('ROLLBACK');
    console.error('createPayment transaction failed:', error);
    throw error;
  } finally {
    client?.release();
  }
}

// ============================================================================
// VOID / REVERSE
// ============================================================================

async function voidPayment(paymentId, adminId, reason, schoolId) {
  if (!paymentId || !adminId) throw new Error('Payment ID and admin ID are required.');
  if (!reason) throw new Error('Void reason is required.');
  const client = await db.getConnection();
  try {
    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true)', ['app.current_school_id', String(schoolId)]);

    const check = await client.query(
      'SELECT status FROM payments WHERE id = $1 AND school_id = $2',
      [paymentId, schoolId]
    );
    if (!check.rows[0]) throw new Error('Payment not found.');
    if (check.rows[0].status !== 'active') throw new Error('Payment is already voided or reversed.');

    const result = await client.query(
      `UPDATE payments SET status='void', voided_by=$1, void_reason=$2, voided_at=NOW()
       WHERE id=$3 AND school_id=$4 RETURNING id`,
      [adminId, reason, paymentId, schoolId]
    );
    await client.query('COMMIT');
    return { voided: true, paymentId: result.rows[0].id };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function reversePayment(paymentId, adminId, reason, schoolId) {
  if (!paymentId || !adminId) throw new Error('Payment ID and admin ID are required.');
  if (!reason) throw new Error('Reversal reason is required.');
  const client = await db.getConnection();
  try {
    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true)', ['app.current_school_id', String(schoolId)]);

    const check = await client.query(
      `SELECT id, student_id, fee_structure_id, amount_paid, receipt_number, status
       FROM payments WHERE id = $1 AND school_id = $2`,
      [paymentId, schoolId]
    );
    if (!check.rows[0]) throw new Error('Payment not found.');
    const original = check.rows[0];
    if (original.status !== 'active') throw new Error(`Cannot reverse a payment with status '${original.status}'.`);

    const now = new Date();
    const reversalReceiptNumber = `REV-${original.receipt_number}`;

    const insertQuery = `
      INSERT INTO payments (
        student_id, fee_structure_id, amount_paid,
        payment_date, receipt_number, payment_method,
        recorded_by_admin_id, notes, reference_number, status,
        reversed_payment_id, reversal_reason, reversed_at, school_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'reversed', $10, $11, $12, $13)
      RETURNING id;
    `;
    const result = await client.query(insertQuery, [
      original.student_id, original.fee_structure_id, -original.amount_paid,
      now, reversalReceiptNumber, original.payment_method,
      adminId, `Reversal of payment #${original.id}: ${reason}`, null,
      paymentId, reason, now, schoolId,
    ]);
    const reversalId = result.rows[0].id;

    await client.query(
      `UPDATE payments SET status='reversed', reversed_payment_id=$1 WHERE id=$2 AND school_id=$3`,
      [reversalId, paymentId, schoolId]
    );

    const detailsQuery = `
      SELECT p.*, s.name AS student_name, c.class_name, fs.academic_year, fs.term,
        fs.description AS fee_description,
        (SELECT SUM(fc.amount) FROM fees_components fc WHERE fc.fees_structure_id = fs.id) AS total_fee_amount_expected,
        (SELECT SUM(fc.amount) FROM fees_components fc WHERE fc.fees_structure_id = fs.id)
          - COALESCE((SELECT SUM(p2.amount_paid) FROM payments p2
                      WHERE p2.student_id = s.id AND p2.fee_structure_id = fs.id AND p2.status='active'), 0) AS outstanding_balance,
        a.username AS recorded_by_admin_username,
        (SELECT JSON_AGG(JSON_BUILD_OBJECT('name', fc.component_name, 'amount', fc.amount))
         FROM fees_components fc WHERE fc.fees_structure_id = fs.id) AS components
      FROM payments p
      JOIN students s ON p.student_id = s.id
      JOIN classes c ON s.class_id = c.id
      JOIN fees_structure fs ON p.fee_structure_id = fs.id
      LEFT JOIN admins a ON p.recorded_by_admin_id = a.id
      WHERE p.id = $1;
    `;
    const detailResult = await client.query(detailsQuery, [reversalId]);
    const paymentDetails = detailResult.rows[0];
    if (!paymentDetails) throw new Error('Failed to fetch reversal details for receipt.');

    paymentDetails.school_id = schoolId;
    const relativePath = await generateReceipt(paymentDetails, reversalReceiptNumber, client);
    await client.query(`UPDATE payments SET receipt_path=$1 WHERE id=$2`, [relativePath, reversalId]);

    await client.query('COMMIT');
    return { reversalId, originalId: paymentId, receiptPath: relativePath };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('reversePayment transaction failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// ============================================================================
// GET PAYMENTS
// ============================================================================

async function getPayments(filters = {}, schoolId) {
  let query = `
    SELECT
      p.id, p.amount_paid, p.payment_date, p.receipt_number, p.payment_method,
      p.notes, p.receipt_path, p.reference_number, p.status, p.void_reason,
      p.voided_at, p.reversed_payment_id, p.reversal_reason, p.reversed_at,
      p.student_discount_id, p.component_name,
      s.id AS student_id, s.name AS student_name,
      c.class_name,
      fs.id AS fees_structure_id, fs.academic_year, fs.term AS fee_term,
      fs.description AS fee_description,
      (SELECT SUM(fc.amount) FROM fees_components fc WHERE fc.fees_structure_id = fs.id) AS total_fee_amount_expected,
      a.username AS recorded_by_admin_username
    FROM payments p
    JOIN students s ON p.student_id = s.id
    JOIN classes c ON s.class_id = c.id
    JOIN fees_structure fs ON p.fee_structure_id = fs.id
    LEFT JOIN admins a ON p.recorded_by_admin_id = a.id
    WHERE p.school_id = $1
  `;
  const params = [schoolId];
  let idx = 2;
  if (filters.studentId) { query += ` AND p.student_id = $${idx++}`; params.push(filters.studentId); }
  if (filters.academicYear) { query += ` AND fs.academic_year = $${idx++}`; params.push(filters.academicYear); }
  query += ` ORDER BY p.payment_date DESC;`;
  const result = await db.tenantQuery(query, params, schoolId);
  return result.rows;
}

async function getStudentPayments(studentId, schoolId) {
  const query = `
    SELECT p.id, p.receipt_number, p.amount_paid, p.payment_date,
      p.payment_method, p.reference_number, p.component_name, p.status,
      p.receipt_path, a.username AS recorded_by
    FROM payments p
    LEFT JOIN admins a ON p.recorded_by_admin_id = a.id
    WHERE p.student_id = $1 AND p.status = 'active' AND p.school_id = $2
    ORDER BY p.payment_date DESC;
  `;
  const result = await db.tenantQuery(query, [studentId, schoolId], schoolId);
  return result.rows;
}

async function getPaymentDetailsById(paymentId, schoolId) {
  if (!paymentId) throw new Error('Payment ID is required');
  const query = `
    SELECT
      p.id, p.amount_paid, p.payment_date, p.receipt_number, p.payment_method,
      p.notes, p.receipt_path, p.reference_number, p.status, p.void_reason,
      p.voided_at, p.reversed_payment_id, p.reversal_reason, p.reversed_at,
      p.student_discount_id, p.component_name,
      s.id AS student_id, s.name AS student_name,
      c.class_name,
      fs.id AS fees_structure_id, fs.academic_year, fs.term AS fee_term,
      fs.description AS fee_description,
      (SELECT SUM(fc.amount) FROM fees_components fc WHERE fc.fees_structure_id = fs.id) AS total_fee_amount_expected,
      (SELECT SUM(fc.amount) FROM fees_components fc WHERE fc.fees_structure_id = fs.id)
        - COALESCE((SELECT SUM(p_inner.amount_paid) FROM payments p_inner
                    WHERE p_inner.student_id = s.id AND p_inner.fee_structure_id = fs.id AND p_inner.status='active'), 0) AS outstanding_balance,
      a.username AS recorded_by_admin_username,
      (SELECT JSON_AGG(JSON_BUILD_OBJECT('name', fc.component_name, 'amount', fc.amount))
       FROM fees_components fc WHERE fc.fees_structure_id = fs.id) AS components
    FROM payments p
    JOIN students s ON p.student_id = s.id
    JOIN classes c ON s.class_id = c.id
    JOIN fees_structure fs ON p.fee_structure_id = fs.id
    LEFT JOIN admins a ON p.recorded_by_admin_id = a.id
    WHERE p.id = $1 AND p.school_id = $2;
  `;
  const result = await db.tenantQuery(query, [paymentId, schoolId], schoolId);
  return result.rows[0] || null;
}

// ============================================================================
// DASHBOARD STATS
// ============================================================================

async function getDashboardStats(academicYear, classId, schoolId) {
  if (!academicYear) throw new Error('Academic year is required.');

  const classFilterExpected = classId ? `AND fsc.class_id = $3` : '';
  const expectedParams = classId ? [academicYear, schoolId, classId] : [academicYear, schoolId];

  const expectedQuery = `
    SELECT SUM(COALESCE(fs.total_expected, 0)) AS total_expected
    FROM (
      SELECT fs.id,
             (SELECT SUM(fc.amount) FROM fees_components fc WHERE fc.fees_structure_id = fs.id) AS total_expected
      FROM fees_structure fs
      JOIN fees_structure_classes fsc ON fs.id = fsc.fee_structure_id
      WHERE fs.academic_year = $1 AND fs.school_id = $2 ${classFilterExpected}
      GROUP BY fs.id
    ) fs
  `;
  const expectedResult = await db.tenantQuery(expectedQuery, expectedParams, schoolId);
  const totalExpected = parseFloat(expectedResult.rows[0]?.total_expected) || 0;

  const collectedQuery = `
    SELECT SUM(p.amount_paid) AS total_collected
    FROM payments p
    JOIN fees_structure fs ON p.fee_structure_id = fs.id
    JOIN fees_structure_classes fsc ON fs.id = fsc.fee_structure_id
    WHERE fs.academic_year = $1 AND fs.school_id = $2 AND p.status = 'active' ${classFilterExpected}
  `;
  const collectedResult = await db.tenantQuery(collectedQuery, expectedParams, schoolId);
  const totalCollected = parseFloat(collectedResult.rows[0]?.total_collected) || 0;

  const outstanding = totalExpected - totalCollected;
  const collectionPercentage = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

  const clearedQuery = `
    SELECT COUNT(DISTINCT s.id) AS cleared
    FROM students s
    WHERE s.school_id = $2
    AND EXISTS (
      SELECT 1 FROM fees_structure_classes fsc
      JOIN fees_structure fs ON fsc.fee_structure_id = fs.id
      WHERE fsc.class_id = s.class_id AND fs.academic_year = $1 AND fs.school_id = $2
    )
    AND NOT EXISTS (
      SELECT 1
      FROM fees_structure_classes fsc
      JOIN fees_structure fs ON fsc.fee_structure_id = fs.id
      WHERE fsc.class_id = s.class_id AND fs.academic_year = $1 AND fs.school_id = $2
      AND (SELECT SUM(fc.amount) FROM fees_components fc WHERE fc.fees_structure_id = fs.id)
          > COALESCE((SELECT SUM(p.amount_paid) FROM payments p
                      WHERE p.student_id = s.id AND p.fee_structure_id = fs.id AND p.status='active'), 0)
    )
    ${classId ? `AND s.class_id = $3` : ''}
  `;
  const clearedResult = await db.tenantQuery(clearedQuery, expectedParams, schoolId);
  const clearedCount = parseInt(clearedResult.rows[0]?.cleared) || 0;

  const owingQuery = `
    SELECT COUNT(DISTINCT s.id) AS owing
    FROM students s
    WHERE s.school_id = $2
    AND EXISTS (
      SELECT 1 FROM fees_structure_classes fsc
      JOIN fees_structure fs ON fsc.fee_structure_id = fs.id
      WHERE fsc.class_id = s.class_id AND fs.academic_year = $1 AND fs.school_id = $2
      AND (SELECT SUM(fc.amount) FROM fees_components fc WHERE fc.fees_structure_id = fs.id)
          > COALESCE((SELECT SUM(p.amount_paid) FROM payments p
                      WHERE p.student_id = s.id AND p.fee_structure_id = fs.id AND p.status='active'), 0)
    )
    ${classId ? `AND s.class_id = $3` : ''}
  `;
  const owingResult = await db.tenantQuery(owingQuery, expectedParams, schoolId);
  const owingCount = parseInt(owingResult.rows[0]?.owing) || 0;

  const today = new Date().toISOString().split('T')[0];
  const todayResult = await db.tenantQuery(
    `SELECT COALESCE(SUM(amount_paid), 0) AS today_collected FROM payments
     WHERE DATE(payment_date)=$1 AND status='active' AND school_id=$2`,
    [today, schoolId], schoolId
  );
  const todayCollected = parseFloat(todayResult.rows[0]?.today_collected) || 0;

  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().split('T')[0];
  const monthResult = await db.tenantQuery(
    `SELECT COALESCE(SUM(amount_paid), 0) AS month_collected FROM payments
     WHERE payment_date >= $1 AND status='active' AND school_id=$2`,
    [monthStartStr, schoolId], schoolId
  );
  const monthCollected = parseFloat(monthResult.rows[0]?.month_collected) || 0;

  return {
    totalExpected, totalCollected, outstanding, collectionPercentage,
    clearedCount, owingCount, todayCollected, monthCollected,
  };
}

// ============================================================================
// COLLECTION SUMMARY
// ============================================================================

async function getTotalFeesCollectedByClassAndYear(academicYear, classId, schoolId) {
  let query = `
    SELECT
      c.class_name,
      $1 AS academic_year,
      COALESCE((
        SELECT SUM(fc.amount)
        FROM fees_structure_classes fsc
        JOIN fees_structure fs ON fsc.fee_structure_id = fs.id
        LEFT JOIN fees_components fc ON fc.fees_structure_id = fs.id
        WHERE fsc.class_id = c.id AND fs.academic_year = $1 AND fs.school_id = $2
      ), 0) AS total_expected,
      COALESCE((
        SELECT SUM(p.amount_paid)
        FROM payments p
        JOIN fees_structure fs ON p.fee_structure_id = fs.id
        JOIN fees_structure_classes fsc ON fs.id = fsc.fee_structure_id
        WHERE fsc.class_id = c.id AND fs.academic_year = $1 AND p.status = 'active' AND fs.school_id = $2
      ), 0) AS total_paid,
      0 AS percentage_paid
    FROM classes c
    WHERE c.school_id = $2
  `;
  const params = [academicYear, schoolId];
  let idx = 3;
  if (classId) { query += ` AND c.id = $${idx++}`; params.push(classId); }
  query += ` ORDER BY c.class_name;`;
  const result = await db.tenantQuery(query, params, schoolId);

  return result.rows.map(row => {
    const expected = parseFloat(row.total_expected) || 0;
    const paid = parseFloat(row.total_paid) || 0;
    return {
      ...row,
      total_expected: expected,
      total_paid: paid,
      percentage_paid: expected > 0 ? (paid / expected) * 100 : 0,
    };
  });
}

async function getOutstandingBalancesSchoolWide(academicYear, classId, schoolId) {
  const expectedQuery = `
    SELECT fsc.class_id, SUM(fc.amount) AS total_expected
    FROM fees_structure_classes fsc
    JOIN fees_structure fs ON fsc.fee_structure_id = fs.id
    JOIN fees_components fc ON fc.fees_structure_id = fs.id
    WHERE fs.academic_year = $1 AND fs.school_id = $2
    GROUP BY fsc.class_id
  `;
  const expectedResult = await db.tenantQuery(expectedQuery, [academicYear, schoolId], schoolId);
  const expectedMap = {};
  expectedResult.rows.forEach(row => { expectedMap[row.class_id] = parseFloat(row.total_expected) || 0; });

  const paidQuery = `
    SELECT p.student_id, SUM(p.amount_paid) AS total_paid
    FROM payments p
    JOIN fees_structure fs ON p.fee_structure_id = fs.id
    WHERE fs.academic_year = $1 AND p.status = 'active' AND fs.school_id = $2
    GROUP BY p.student_id
  `;
  const paidResult = await db.tenantQuery(paidQuery, [academicYear, schoolId], schoolId);
  const paidMap = {};
  paidResult.rows.forEach(row => { paidMap[row.student_id] = parseFloat(row.total_paid) || 0; });

  let studentQuery = `
    SELECT s.id, s.name, c.id AS class_id, c.class_name
    FROM students s
    JOIN classes c ON s.class_id = c.id
    WHERE s.school_id = $1
  `;
  const params = [schoolId];
  if (classId) { studentQuery += ` AND c.id = $2`; params.push(classId); }
  studentQuery += ` ORDER BY c.class_name, s.name`;
  const studentResult = await db.tenantQuery(studentQuery, params, schoolId);

  return studentResult.rows.map(row => {
    const expected = expectedMap[row.class_id] || 0;
    const paid = paidMap[row.id] || 0;
    return {
      student_id: row.id,
      student_name: row.name,
      class_name: row.class_name,
      total_expected: expected,
      total_paid: paid,
      balance: expected - paid,
    };
  });
}

async function getPaymentsByDateRange(startDate, endDate, classId, schoolId) {
  let query = `
    SELECT p.id, p.amount_paid, p.payment_date, p.receipt_number, p.payment_method,
           p.status, s.name AS student_name, c.class_name, fs.academic_year,
           a.username AS recorded_by_admin_username
    FROM payments p
    JOIN students s ON p.student_id = s.id
    JOIN classes c ON s.class_id = c.id
    JOIN fees_structure fs ON p.fee_structure_id = fs.id
    LEFT JOIN admins a ON p.recorded_by_admin_id = a.id
    WHERE p.payment_date BETWEEN $1 AND $2 AND p.status = 'active' AND p.school_id = $3
  `;
  const params = [startDate, endDate, schoolId];
  let idx = 4;
  if (classId) { query += ` AND c.id = $${idx++}`; params.push(classId); }
  query += ` ORDER BY p.payment_date DESC;`;
  const result = await db.tenantQuery(query, params, schoolId);
  return result.rows;
}

// ============================================================================
// STUDENT FEE SUMMARY
// ============================================================================

async function getStudentFeeSummaryData(studentId, academicYear, schoolId) {
  const studentQuery = `
    SELECT s.id, s.name AS student_name, c.class_name, s.class_id
    FROM students s
    JOIN classes c ON s.class_id = c.id
    WHERE s.id = $1 AND s.school_id = $2;
  `;
  const studentResult = await db.tenantQuery(studentQuery, [studentId, schoolId], schoolId);
  if (studentResult.rows.length === 0) return { studentFound: false };
  const student = studentResult.rows[0];

  const structureQuery = `
    SELECT fs.id, fs.academic_year, fs.term, fs.description, fs.due_date,
           (SELECT SUM(fc.amount) FROM fees_components fc WHERE fc.fees_structure_id = fs.id) AS total_expected_amount
    FROM fees_structure fs
    JOIN fees_structure_classes fsc ON fs.id = fsc.fee_structure_id
    WHERE fsc.class_id = $1 AND fs.academic_year = $2 AND fs.school_id = $3
    ORDER BY fs.term;
  `;
  const structureResult = await db.tenantQuery(structureQuery, [student.class_id, academicYear, schoolId], schoolId);

  const paymentsQuery = `
    SELECT p.id AS payment_id, p.amount_paid, p.payment_date, p.receipt_number,
           p.payment_method, p.status, p.component_name,
           a.username AS recorded_by_admin_username
    FROM payments p
    LEFT JOIN admins a ON p.recorded_by_admin_id = a.id
    WHERE p.student_id = $1
      AND p.fee_structure_id IN (
        SELECT fs.id FROM fees_structure fs
        JOIN fees_structure_classes fsc ON fs.id = fsc.fee_structure_id
        WHERE fsc.class_id = $2 AND fs.academic_year = $3 AND fs.school_id = $4
      )
      AND p.status = 'active'
    ORDER BY p.payment_date DESC;
  `;
  const paymentsResult = await db.tenantQuery(
    paymentsQuery,
    [studentId, student.class_id, academicYear, schoolId],
    schoolId
  );
  const payments = paymentsResult.rows;

  const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0);
  const totalExpected = structureResult.rows.reduce((sum, s) => sum + parseFloat(s.total_expected_amount || 0), 0);
  const outstandingBalance = totalExpected - totalPaid;

  const discounts = await discountService.getStudentDiscounts(
    studentId, academicYear, structureResult.rows[0]?.term || '', schoolId
  );

  return {
    studentFound: true,
    studentDetails: student,
    feeStructures: structureResult.rows,
    payments,
    totalPaid,
    totalExpected,
    outstandingBalance,
    discounts,
  };
}

async function getClassFeeSummaryData(classId, academicYear, feesStructureId, componentName, schoolId) {
  const classQuery = `SELECT id, class_name FROM classes WHERE id = $1 AND school_id = $2;`;
  const classResult = await db.tenantQuery(classQuery, [classId, schoolId], schoolId);
  if (classResult.rows.length === 0) throw new Error('Class not found');
  const classDetails = classResult.rows[0];

  const structureQuery = `
    SELECT fs.id, fs.description, fs.due_date, fs.academic_year, fs.term,
           (SELECT JSON_AGG(JSON_BUILD_OBJECT('name', fc.component_name, 'amount', fc.amount))
            FROM fees_components fc WHERE fc.fees_structure_id = fs.id) AS components
    FROM fees_structure fs
    WHERE fs.id = $1 AND fs.school_id = $2;
  `;
  const structureResult = await db.tenantQuery(structureQuery, [feesStructureId, schoolId], schoolId);
  if (structureResult.rows.length === 0) throw new Error('Fee structure not found');
  const feeStructure = structureResult.rows[0];
  const components = feeStructure.components || [];

  let componentAmount = 0;
  if (componentName && componentName !== 'all') {
    const comp = components.find(c => c.name === componentName);
    if (!comp) throw new Error(`Component '${componentName}' not found in this fee structure.`);
    componentAmount = parseFloat(comp.amount) || 0;
  } else {
    componentAmount = components.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
  }

  const studentsQuery = `SELECT s.id, s.name AS student_name FROM students
                         WHERE s.class_id = $1 AND s.school_id = $2 ORDER BY s.name;`;
  const studentsResult = await db.tenantQuery(studentsQuery, [classId, schoolId], schoolId);
  const students = studentsResult.rows;

  let paymentsQuery = `
    SELECT p.student_id, COALESCE(SUM(p.amount_paid), 0) AS total_paid
    FROM payments p
    WHERE p.fee_structure_id = $1
      AND p.student_id = ANY($2::int[])
      AND p.status = 'active'
      AND p.school_id = $3
  `;
  const params = [feesStructureId, students.map(s => s.id), schoolId];
  let idx = 4;
  if (componentName && componentName !== 'all') {
    paymentsQuery += ` AND p.component_name = $${idx++}`;
    params.push(componentName);
  }
  paymentsQuery += ` GROUP BY p.student_id;`;
  const paymentsResult = await db.tenantQuery(paymentsQuery, params, schoolId);
  const paymentMap = {};
  paymentsResult.rows.forEach(row => { paymentMap[row.student_id] = parseFloat(row.total_paid) || 0; });

  const studentSummaries = students.map(student => {
    const totalPaid = paymentMap[student.id] || 0;
    const totalExpected = componentAmount;
    const outstanding = totalExpected - totalPaid;
    return {
      student_id: student.id,
      student_name: student.student_name,
      total_paid: totalPaid,
      total_expected: totalExpected,
      outstanding_balance: outstanding,
    };
  });

  return {
    classDetails,
    feeStructure: { ...feeStructure, total_expected_amount: componentAmount },
    students: studentSummaries,
  };
}

// ============================================================================
// DISCOUNT HELPERS
// ============================================================================

async function getTotalFeeForStructure(feesStructureId, schoolId) {
  const result = await db.tenantQuery(
    `SELECT SUM(amount) AS total FROM fees_components
     WHERE fees_structure_id = $1 AND school_id = $2`,
    [feesStructureId, schoolId], schoolId
  );
  return parseFloat(result.rows[0]?.total) || 0;
}

async function getTotalPaidForStudent(studentId, feesStructureId, schoolId) {
  const result = await db.tenantQuery(
    `SELECT COALESCE(SUM(amount_paid), 0) AS total FROM payments
     WHERE student_id = $1 AND fee_structure_id = $2 AND status = 'active' AND school_id = $3`,
    [studentId, feesStructureId, schoolId], schoolId
  );
  return parseFloat(result.rows[0]?.total) || 0;
}

async function getComponentPaymentSummary(studentId, feesStructureId, schoolId) {
  const result = await db.tenantQuery(
    `SELECT COALESCE(component_name, 'General') AS component_name, SUM(amount_paid) AS total_paid
     FROM payments
     WHERE student_id = $1 AND fee_structure_id = $2 AND status = 'active' AND school_id = $3
     GROUP BY component_name`,
    [studentId, feesStructureId, schoolId], schoolId
  );
  return result.rows;
}

async function getStudentDiscounts(studentId, academicYear, term, schoolId) {
  return discountService.getStudentDiscounts(studentId, academicYear, term, schoolId);
}

async function getEffectiveDiscount(studentId, academicYear, term, totalFee, schoolId) {
  return discountService.getEffectiveDiscount(studentId, academicYear, term, totalFee, schoolId);
}

// ============================================================================
// FEE STRUCTURE CRUD
// ============================================================================

async function createFeeStructureWithComponents(classIds, academicYear, term, description, dueDate, components, schoolId) {
  if (!Array.isArray(classIds) || classIds.length === 0) {
    throw new Error('At least one class is required.');
  }
  const client = await db.getConnection();
  try {
    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true)', ['app.current_school_id', String(schoolId)]);

    const primaryClassId = classIds[0];

    const insertStructureQuery = `
      INSERT INTO fees_structure (class_id, academic_year, term, description, due_date, school_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id;
    `;
    const structureResult = await client.query(insertStructureQuery, [
      primaryClassId, academicYear, term, description, dueDate, schoolId,
    ]);
    const structureId = structureResult.rows[0].id;

    for (const cId of classIds) {
      await client.query(
        `INSERT INTO fees_structure_classes (fee_structure_id, class_id, school_id) VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [structureId, cId, schoolId]
      );
    }

    for (const comp of components) {
      await client.query(
        `INSERT INTO fees_components (fees_structure_id, component_name, amount, school_id)
         VALUES ($1, $2, $3, $4)`,
        [structureId, comp.name, comp.amount, schoolId]
      );
    }

    await client.query('COMMIT');
    return structureId;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function updateFeeStructureAndComponentsById(feesStructureId, description, dueDate, components, classIds, schoolId) {
  const client = await db.getConnection();
  try {
    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true)', ['app.current_school_id', String(schoolId)]);

    const updateStructureQuery = `UPDATE fees_structure SET description=$1, due_date=$2
                                  WHERE id=$3 AND school_id=$4;`;
    const result = await client.query(updateStructureQuery, [description, dueDate, feesStructureId, schoolId]);
    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return 0;
    }

    if (Array.isArray(classIds)) {
      await client.query(`DELETE FROM fees_structure_classes WHERE fee_structure_id = $1 AND school_id = $2`, [feesStructureId, schoolId]);
      for (const cId of classIds) {
        await client.query(
          `INSERT INTO fees_structure_classes (fee_structure_id, class_id, school_id)
           VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [feesStructureId, cId, schoolId]
        );
      }
      if (classIds.length > 0) {
        await client.query(`UPDATE fees_structure SET class_id = $1 WHERE id = $2 AND school_id = $3`,
          [classIds[0], feesStructureId, schoolId]);
      }
    }

    await client.query(`DELETE FROM fees_components WHERE fees_structure_id = $1 AND school_id = $2`,
      [feesStructureId, schoolId]);
    for (const comp of components) {
      await client.query(
        `INSERT INTO fees_components (fees_structure_id, component_name, amount, school_id)
         VALUES ($1, $2, $3, $4)`,
        [feesStructureId, comp.name, comp.amount, schoolId]
      );
    }

    await client.query('COMMIT');
    return result.rowCount;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function deleteFeeStructureById(feesStructureId, schoolId) {
  const client = await db.getConnection();
  try {
    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true)', ['app.current_school_id', String(schoolId)]);

    await client.query(`DELETE FROM fees_structure_classes WHERE fee_structure_id = $1 AND school_id = $2`,
      [feesStructureId, schoolId]);
    await client.query(`DELETE FROM fees_components WHERE fees_structure_id = $1 AND school_id = $2`,
      [feesStructureId, schoolId]);
    const result = await client.query(`DELETE FROM fees_structure WHERE id = $1 AND school_id = $2`,
      [feesStructureId, schoolId]);

    await client.query('COMMIT');
    return result.rowCount;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ============================================================================
// READ FEE STRUCTURES
// ============================================================================

async function getAllFeeStructuresWithClassNames(classId, academicYear, schoolId) {
  let query = `
    SELECT
      fs.id, fs.academic_year, fs.term, fs.description, fs.due_date,
      COALESCE(
        (SELECT JSON_AGG(JSON_BUILD_OBJECT('id', c.id, 'name', c.class_name) ORDER BY c.class_name)
         FROM fees_structure_classes fsc
         JOIN classes c ON fsc.class_id = c.id
         WHERE fsc.fee_structure_id = fs.id),
        '[]'::json
      ) AS classes
    FROM fees_structure fs
    WHERE fs.school_id = $1
  `;
  const params = [schoolId];
  let idx = 2;
  if (classId) {
    query += ` AND EXISTS (SELECT 1 FROM fees_structure_classes fsc WHERE fsc.fee_structure_id = fs.id AND fsc.class_id = $${idx++})`;
    params.push(classId);
  }
  if (academicYear) {
    query += ` AND fs.academic_year = $${idx++}`;
    params.push(academicYear);
  }
  query += ` ORDER BY fs.academic_year DESC, fs.id DESC;`;
  const result = await db.tenantQuery(query, params, schoolId);
  return result.rows;
}

async function findStudentsByName(nameQuery, schoolId) {
  if (!nameQuery) return [];
  const result = await db.tenantQuery(
    `SELECT s.id, s.name, c.class_name
     FROM students s JOIN classes c ON s.class_id = c.id
     WHERE s.name ILIKE $1 AND s.school_id = $2
     ORDER BY s.name ASC LIMIT 10`,
    [`%${nameQuery.trim()}%`, schoolId], schoolId
  );
  return result.rows;
}

async function getAllClassNames(schoolId) {
  const result = await db.tenantQuery(
    `SELECT DISTINCT class_name FROM classes WHERE school_id = $1 ORDER BY class_name ASC;`,
    [schoolId], schoolId
  );
  return result.rows.map(r => r.class_name);
}

async function findClassIdByName(className, schoolId) {
  const result = await db.tenantQuery(
    `SELECT id FROM classes WHERE class_name = $1 AND school_id = $2;`,
    [className, schoolId], schoolId
  );
  return result.rows[0]?.id || null;
}

async function findFeeStructure(classId, academicYear, term, schoolId) {
  const result = await db.tenantQuery(
    `SELECT fs.id, fs.academic_year
     FROM fees_structure fs
     JOIN fees_structure_classes fsc ON fs.id = fsc.fee_structure_id
     WHERE fsc.class_id = $1 AND fs.academic_year = $2 AND fs.term = $3 AND fs.school_id = $4
     LIMIT 1`,
    [classId, academicYear, term, schoolId], schoolId
  );
  return result.rows[0] || null;
}

async function findFeeStructureByIdWithComponents(feesStructureId, schoolId) {
  const result = await db.tenantQuery(
    `SELECT fs.id, fs.description, fs.due_date, fs.academic_year, fs.term,
            COALESCE(
              JSON_AGG(JSON_BUILD_OBJECT('name', fc.component_name, 'amount', fc.amount) ORDER BY fc.id)
              FILTER (WHERE fc.id IS NOT NULL),
              '[]'::json
            ) AS components,
            COALESCE(
              (SELECT JSON_AGG(JSON_BUILD_OBJECT('id', c.id, 'name', c.class_name) ORDER BY c.class_name)
               FROM fees_structure_classes fsc
               JOIN classes c ON fsc.class_id = c.id
               WHERE fsc.fee_structure_id = fs.id),
              '[]'::json
            ) AS classes
     FROM fees_structure fs
     LEFT JOIN fees_components fc ON fs.id = fc.fees_structure_id
     WHERE fs.id = $1 AND fs.school_id = $2
     GROUP BY fs.id, fs.description, fs.due_date, fs.academic_year, fs.term;`,
    [feesStructureId, schoolId], schoolId
  );
  return result.rows[0] || null;
}

// ============================================================================
// ADVANCED REPORTS
// ============================================================================

async function _computeExpectedByClass(academicYear, classId, componentName, schoolId) {
  let structureQuery = `
    SELECT fs.id, fsc.class_id
    FROM fees_structure fs
    JOIN fees_structure_classes fsc ON fs.id = fsc.fee_structure_id
    WHERE fs.academic_year = $1 AND fs.school_id = $2
  `;
  const params = [academicYear, schoolId];
  let idx = 3;
  if (classId) { structureQuery += ` AND fsc.class_id = $${idx++}`; params.push(classId); }
  const structures = await db.tenantQuery(structureQuery, params, schoolId);
  if (structures.rows.length === 0) return { expectedByClass: {}, classIds: [] };

  const structureIds = structures.rows.map(s => s.id);
  const classIds = [...new Set(structures.rows.map(s => s.class_id))];

  const compQuery = `
    SELECT fc.fees_structure_id, fc.component_name, fc.amount
    FROM fees_components fc WHERE fc.fees_structure_id = ANY($1::int[])
  `;
  const compResult = await db.tenantQuery(compQuery, [structureIds], schoolId);
  const componentsByStructure = {};
  compResult.rows.forEach(row => {
    if (!componentsByStructure[row.fees_structure_id]) componentsByStructure[row.fees_structure_id] = [];
    componentsByStructure[row.fees_structure_id].push(row);
  });

  const expectedByClass = {};
  for (const structId of structureIds) {
    const comps = componentsByStructure[structId] || [];
    let expected = 0;
    if (componentName && componentName !== 'all') {
      const comp = comps.find(c => c.component_name === componentName);
      expected = comp ? parseFloat(comp.amount) : 0;
    } else {
      expected = comps.reduce((sum, c) => sum + parseFloat(c.amount), 0);
    }
    const struct = structures.rows.find(s => s.id === structId);
    if (struct) {
      expectedByClass[struct.class_id] = (expectedByClass[struct.class_id] || 0) + expected;
    }
  }

  return { expectedByClass, classIds };
}

async function _computePaidByStudent(academicYear, classIds, componentName, schoolId) {
  const studentQuery = `
    SELECT s.id, s.name AS student_name, c.class_name, c.id AS class_id
    FROM students s
    JOIN classes c ON s.class_id = c.id
    WHERE c.id = ANY($1::int[]) AND s.school_id = $2
  `;
  const students = await db.tenantQuery(studentQuery, [classIds, schoolId], schoolId);
  if (students.rows.length === 0) return { students: [], paidMap: {} };

  let paidQuery = `
    SELECT p.student_id, SUM(p.amount_paid) AS total_paid
    FROM payments p
    JOIN fees_structure fs ON p.fee_structure_id = fs.id
    WHERE fs.academic_year = $1
      AND p.student_id = ANY($2::int[])
      AND p.status = 'active'
      AND p.school_id = $3
  `;
  const paidParams = [academicYear, students.rows.map(s => s.id), schoolId];
  let paidIdx = 4;
  if (componentName && componentName !== 'all') {
    paidQuery += ` AND p.component_name = $${paidIdx++}`;
    paidParams.push(componentName);
  }
  paidQuery += ` GROUP BY p.student_id`;
  const paidResult = await db.tenantQuery(paidQuery, paidParams, schoolId);
  const paidMap = {};
  paidResult.rows.forEach(row => { paidMap[row.student_id] = parseFloat(row.total_paid) || 0; });

  return { students: students.rows, paidMap };
}

async function getDebtorsList(academicYear, classId, componentName, schoolId) {
  const { expectedByClass, classIds } = await _computeExpectedByClass(academicYear, classId, componentName, schoolId);
  if (classIds.length === 0) return [];
  const { students, paidMap } = await _computePaidByStudent(academicYear, classIds, componentName, schoolId);

  return students
    .map(student => {
      const expected = expectedByClass[student.class_id] || 0;
      const paid = paidMap[student.id] || 0;
      return {
        student_id: student.id,
        student_name: student.student_name,
        class_name: student.class_name,
        total_expected: expected,
        total_paid: paid,
        outstanding_balance: expected - paid,
      };
    })
    .filter(row => row.outstanding_balance > 0);
}

async function getClearedList(academicYear, classId, componentName, schoolId) {
  const { expectedByClass, classIds } = await _computeExpectedByClass(academicYear, classId, componentName, schoolId);
  if (classIds.length === 0) return [];
  const { students, paidMap } = await _computePaidByStudent(academicYear, classIds, componentName, schoolId);

  return students
    .map(student => {
      const expected = expectedByClass[student.class_id] || 0;
      const paid = paidMap[student.id] || 0;
      return {
        student_id: student.id,
        student_name: student.student_name,
        class_name: student.class_name,
        total_expected: expected,
        total_paid: paid,
        outstanding_balance: expected - paid,
      };
    })
    .filter(row => row.outstanding_balance === 0);
}

async function getDailyCollections(date, classId, schoolId) {
  let query = `
    SELECT p.id, p.amount_paid, p.payment_date, p.receipt_number, p.payment_method,
           s.name AS student_name, c.class_name, a.username AS recorded_by
    FROM payments p
    JOIN students s ON p.student_id = s.id
    JOIN classes c ON s.class_id = c.id
    LEFT JOIN admins a ON p.recorded_by_admin_id = a.id
    WHERE DATE(p.payment_date) = $1 AND p.status = 'active' AND p.school_id = $2
  `;
  const params = [date, schoolId];
  let idx = 3;
  if (classId) { query += ` AND c.id = $${idx++}`; params.push(classId); }
  query += ` ORDER BY p.payment_date DESC;`;
  const result = await db.tenantQuery(query, params, schoolId);
  const total = result.rows.reduce((sum, row) => sum + parseFloat(row.amount_paid || 0), 0);
  return { payments: result.rows, total };
}

async function getMonthlyCollections(yearMonth, classId, schoolId) {
  let query = `
    SELECT DATE_TRUNC('day', p.payment_date) AS date,
           COUNT(p.id) AS payment_count,
           COALESCE(SUM(p.amount_paid), 0) AS total_collected
    FROM payments p
    JOIN students s ON p.student_id = s.id
    JOIN classes c ON s.class_id = c.id
    WHERE TO_CHAR(p.payment_date, 'YYYY-MM') = $1 AND p.status = 'active' AND p.school_id = $2
  `;
  const params = [yearMonth, schoolId];
  let idx = 3;
  if (classId) { query += ` AND c.id = $${idx++}`; params.push(classId); }
  query += ` GROUP BY date ORDER BY date;`;
  const result = await db.tenantQuery(query, params, schoolId);
  return result.rows;
}

async function getAllClassesWithId(schoolId) {
  const result = await db.tenantQuery(
    `SELECT id, class_name AS name FROM classes WHERE school_id = $1 ORDER BY class_name ASC;`,
    [schoolId], schoolId
  );
  return result.rows;
}

async function getAllFeeStructuresWithComponents(classId, academicYear, schoolId) {
  let query = `
    SELECT
      fs.id, fs.academic_year, fs.term, fs.description, fs.due_date,
      COALESCE(
        (SELECT JSON_AGG(JSON_BUILD_OBJECT('name', fc.component_name, 'amount', fc.amount) ORDER BY fc.id)
         FROM fees_components fc WHERE fc.fees_structure_id = fs.id),
        '[]'::json
      ) AS components,
      (SELECT SUM(fc.amount) FROM fees_components fc WHERE fc.fees_structure_id = fs.id) AS total_amount,
      COALESCE(
        (SELECT JSON_AGG(JSON_BUILD_OBJECT('id', c.id, 'name', c.class_name) ORDER BY c.class_name)
         FROM fees_structure_classes fsc
         JOIN classes c ON fsc.class_id = c.id
         WHERE fsc.fee_structure_id = fs.id),
        '[]'::json
      ) AS classes
    FROM fees_structure fs
    WHERE fs.school_id = $1
  `;
  const params = [schoolId];
  let idx = 2;
  if (classId) {
    query += ` AND EXISTS (SELECT 1 FROM fees_structure_classes fsc WHERE fsc.fee_structure_id = fs.id AND fsc.class_id = $${idx++})`;
    params.push(classId);
  }
  if (academicYear) {
    query += ` AND fs.academic_year = $${idx++}`;
    params.push(academicYear);
  }
  query += ` ORDER BY fs.academic_year DESC, fs.id DESC;`;
  const result = await db.tenantQuery(query, params, schoolId);

  return result.rows.map(row => ({
    ...row,
    class_id: row.classes?.[0]?.id || null,
    class_name: row.classes?.[0]?.name || null,
  }));
}

async function getStudentsByClass(classId, schoolId) {
  if (!classId) return [];
  const result = await db.tenantQuery(
    `SELECT s.id, s.name, c.class_name
     FROM students s JOIN classes c ON s.class_id = c.id
     WHERE s.class_id = $1 AND s.school_id = $2 ORDER BY s.name ASC;`,
    [classId, schoolId], schoolId
  );
  return result.rows;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  createPayment, voidPayment, reversePayment,
  getPayments, getPaymentDetailsById, getPaymentsByDateRange,
  getStudentPayments,
  getDashboardStats, getTotalFeesCollectedByClassAndYear, getOutstandingBalancesSchoolWide,
  getStudentFeeSummaryData, getClassFeeSummaryData,
  getTotalFeeForStructure, getTotalPaidForStudent, getComponentPaymentSummary,
  getStudentDiscounts, getEffectiveDiscount,
  createFeeStructureWithComponents, updateFeeStructureAndComponentsById, deleteFeeStructureById,
  getAllFeeStructuresWithClassNames, findFeeStructureByIdWithComponents,
  getAllFeeStructuresWithComponents,
  findStudentsByName, getAllClassNames, findClassIdByName, findFeeStructure,
  getDebtorsList, getClearedList, getDailyCollections, getMonthlyCollections,
  getAllClassesWithId, getStudentsByClass,
};