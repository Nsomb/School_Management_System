const express = require('express');
const router = express.Router();
const TeacherController = require("../controllers/teacherController");
const TeacherModel = require("../models/teacherModel");
const { verifyAdmin } = require("../middleware/auth");
const { verifyTeacher } = require("../middleware/auth");
const db = require("../config/db"); // Add this for database queries

// Public routes
router.post("/login", TeacherController.login);

// Teacher-specific routes
router.get("/my/assigned-subjects", verifyTeacher, async (req, res) => {
    try {
        const teacherId = req.teacher?.teacherId;

        if (!teacherId) {
            return res.status(401).json({ error: "Unauthorized: Teacher ID not found." });
        }

        const subjects = await TeacherModel.getAssignedSubjects(teacherId);
        res.status(200).json({ subjects });

    } catch (error) {
        console.error('Error fetching assigned subjects:', error);
        res.status(500).json({ error: "Server error occurred while fetching assigned subjects." });
    }
});

// ==================== NEW: Get teacher's assigned classes ====================
router.get("/my/classes", verifyTeacher, async (req, res) => {
    try {
        const teacherId = req.teacher?.teacherId;

        if (!teacherId) {
            return res.status(401).json({ error: "Unauthorized: Teacher ID not found." });
        }

        const result = await db.query(
            `SELECT DISTINCT c.id, c.class_name, c.class_level 
             FROM classes c
             JOIN teacher_assignments ta ON c.id = ta.class_id
             WHERE ta.teacher_id = $1
             ORDER BY c.class_name`,
            [teacherId]
        );

        res.status(200).json({ 
            classes: result.rows,
            teacherId: teacherId
        });

    } catch (error) {
        console.error('Error fetching teacher classes:', error);
        res.status(500).json({ error: "Server error occurred while fetching assigned classes." });
    }
});

// ==================== NEW: Get students by class for teacher ====================
router.get("/my/class/:classId/students", verifyTeacher, async (req, res) => {
    try {
        const teacherId = req.teacher?.teacherId;
        const { classId } = req.params;

        if (!teacherId) {
            return res.status(401).json({ error: "Unauthorized: Teacher ID not found." });
        }

        if (!classId) {
            return res.status(400).json({ error: "Class ID is required." });
        }

        // Verify teacher is assigned to this class
        const assignmentCheck = await db.query(
            `SELECT 1 FROM teacher_assignments 
             WHERE teacher_id = $1 AND class_id = $2`,
            [teacherId, classId]
        );

        if (assignmentCheck.rows.length === 0) {
            return res.status(403).json({ 
                error: "You are not authorized to view students in this class." 
            });
        }

        const result = await db.query(
            `SELECT id, full_name, roll_number 
             FROM students 
             WHERE class_id = $1 AND status = 'active'
             ORDER BY roll_number, full_name`,
            [classId]
        );

        res.status(200).json({ 
            students: result.rows,
            classId: classId
        });

    } catch (error) {
        console.error('Error fetching class students:', error);
        res.status(500).json({ error: "Server error occurred while fetching students." });
    }
});

// ==================== NEW: Mark attendance for teacher's class ====================
router.post("/my/class/attendance", verifyTeacher, async (req, res) => {
    try {
        const teacherId = req.teacher?.teacherId;
        const { classId, attendanceDate, records } = req.body;

        if (!teacherId) {
            return res.status(401).json({ error: "Unauthorized: Teacher ID not found." });
        }

        if (!classId || !attendanceDate || !records || !records.length) {
            return res.status(400).json({ error: "Missing required fields." });
        }

        // Verify teacher is assigned to this class
        const assignmentCheck = await db.query(
            `SELECT 1 FROM teacher_assignments 
             WHERE teacher_id = $1 AND class_id = $2`,
            [teacherId, classId]
        );

        if (assignmentCheck.rows.length === 0) {
            return res.status(403).json({ 
                error: "You are not authorized to mark attendance for this class." 
            });
        }

        // Get academic year and term
        const academicContext = await db.query(
            `SELECT * FROM academic_calendar 
             WHERE $1 BETWEEN start_date AND end_date 
             ORDER BY start_date DESC LIMIT 1`,
            [attendanceDate]
        );

        const academicYear = academicContext.rows[0]?.academic_year || '2025-2026';
        const term = academicContext.rows[0]?.current_term || 'Term 1';

        // Insert attendance records
        const insertedRecords = [];
        for (const record of records) {
            const result = await db.query(
                `INSERT INTO student_attendances 
                 (student_id, class_name, attendance_date, status, reason, marked_by, academic_year, term)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 ON CONFLICT (student_id, attendance_date)
                 DO UPDATE SET 
                   status = EXCLUDED.status,
                   reason = EXCLUDED.reason,
                   marked_by = EXCLUDED.marked_by,
                   updated_at = CURRENT_TIMESTAMP
                 RETURNING *`,
                [
                    record.studentId,
                    record.className || 'Unknown',
                    attendanceDate,
                    record.status,
                    record.reason || null,
                    teacherId.toString(),
                    academicYear,
                    term
                ]
            );
            insertedRecords.push(result.rows[0]);
        }

        res.status(200).json({
            message: `Attendance marked successfully for ${insertedRecords.length} students.`,
            count: insertedRecords.length,
            records: insertedRecords,
            markedBy: teacherId
        });

    } catch (error) {
        console.error('Error marking attendance:', error);
        res.status(500).json({ error: "Server error occurred while marking attendance." });
    }
});

router.get("/profile", verifyTeacher, async (req, res) => {
    try {
        const teacher = await TeacherModel.getById(req.teacher.teacherId);
        if (!teacher) {
            return res.status(404).json({ error: "Teacher profile not found." });
        }
        res.status(200).json(teacher);
    } catch (err) {
        console.error("Fetch teacher profile error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

router.put("/profile", verifyTeacher, TeacherController.updateProfile);

// Admin-only routes
router.post("/", verifyAdmin, TeacherController.create);
router.get("/", verifyAdmin, TeacherController.getAll);
router.delete("/:username", verifyAdmin, TeacherController.delete);
router.put("/:id", verifyAdmin, TeacherController.update);
router.post("/:id/assign-subjects", verifyAdmin, TeacherController.assignSubjectsToTeacher);
router.get("/:id/assigned-subjects", verifyAdmin, TeacherController.getTeacherAssignedSubjects);
router.get("/:id/password", verifyAdmin, TeacherController.getTeacherPassword);

module.exports = router;