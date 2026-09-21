// backend/controllers/TeacherAssignmentController.js
const TeacherAssignmentModel = require('../models/TeacherAssignmentModel');
const db = require('../config/db');

const TeacherAssignmentController = {
  createAssignment: async (req, res) => {
    try {
      const { teacher_id, class_id, subject_ids } = req.body;
      const schoolId = req.schoolId;

      if (!teacher_id || !class_id || !Array.isArray(subject_ids) || subject_ids.length === 0) {
        return res.status(400).json({ error: "teacher_id, class_id, and a non-empty array of subject_ids are required." });
      }

      const newAssignments = await TeacherAssignmentModel.bulkCreate({
        teacher_id,
        class_id,
        subject_ids,
        school_id: schoolId,
      });

      res.status(201).json({ message: 'Assignments created successfully', newAssignments });
    } catch (error) {
      console.error('Error creating assignment:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  getAssignmentsForTeacher: async (req, res) => {
    try {
      const { teacher_id } = req.params;
      const assignments = await TeacherAssignmentModel.getByTeacherId(teacher_id, req.schoolId);
      res.status(200).json(assignments);
    } catch (error) {
      console.error('Error getting assignments for teacher:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  deleteAssignment: async (req, res) => {
    try {
      const { id } = req.params;
      const deletedAssignment = await TeacherAssignmentModel.delete(id, req.schoolId);
      if (!deletedAssignment) {
        return res.status(404).json({ message: 'Assignment not found' });
      }
      res.status(200).json({ message: 'Assignment deleted successfully', deletedAssignment });
    } catch (error) {
      console.error('Error deleting assignment:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  getDistinctClassNamesForAdmin: async (req, res) => {
    try {
      const result = await db.tenantQuery(
        `SELECT id, class_name as name FROM classes WHERE school_id = $1 ORDER BY class_name`,
        [req.schoolId],
        req.schoolId
      );
      res.status(200).json(result.rows);
    } catch (error) {
      console.error('Error fetching distinct class names:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
};

module.exports = TeacherAssignmentController;