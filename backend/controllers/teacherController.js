// backend/controllers/teacherController.js
const TeacherModel = require("../models/teacherModel");
const TeacherAssignmentModel = require("../models/TeacherAssignmentModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

const TeacherController = {
  create: async (req, res) => {
    try {
      const { username, password, full_name, phone_number, class_id, subject_ids } = req.body;
      const schoolId = req.schoolId;

      // 🔍 Debug log — remove once stable
      console.log('[Teacher.create] req.schoolId =', schoolId, '| type =', typeof schoolId);
      console.log('[Teacher.create] body =', JSON.stringify(req.body));

      if (!username || !password || !full_name) {
        return res.status(400).json({ error: "Username, password, and full name are required." });
      }
      if (!Number.isInteger(schoolId) || schoolId <= 0) {
        console.error('[Teacher.create] Invalid schoolId on req:', schoolId);
        return res.status(400).json({ error: "Invalid school context." });
      }

      const existingTeacher = await TeacherModel.findByUsernameOrEmail(username, schoolId);
      if (existingTeacher) {
        return res.status(409).json({ error: "Teacher with that username already exists in this school." });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newTeacher = await TeacherModel.create({
        username,
        password_hash: hashedPassword,
        full_name,
        phone_number,
        plain_password: password,
        school_id: schoolId,
      });

      if (class_id && subject_ids && Array.isArray(subject_ids) && subject_ids.length > 0) {
        try {
          await TeacherAssignmentModel.bulkCreate({
            teacher_id: newTeacher.id,
            class_id,
            subject_ids,
            school_id: schoolId,
          });
        } catch (assignmentError) {
          console.error('Assignment creation failed:', assignmentError);
        }
      }

      res.status(201).json({
        message: "Teacher added successfully.",
        teacher: newTeacher,
        plainPassword: password,
      });
    } catch (err) {
      console.error("Add teacher error:", err);
      res.status(500).json({
        error: "Server error occurred while adding teacher.",
        details: err.message,
      });
    }
  },

  getAll: async (req, res) => {
    try {
      const teachers = await TeacherModel.getAll(req.schoolId);
      res.status(200).json(teachers);
    } catch (err) {
      console.error("Get teachers error:", err);
      res.status(500).json({ error: "Server error occurred while fetching teachers." });
    }
  },

  delete: async (req, res) => {
    try {
      const { username } = req.params;
      const success = await TeacherModel.deleteByUsername(username, req.schoolId);
      if (success) {
        res.status(200).json({ message: `Teacher ${username} deleted successfully.` });
      } else {
        res.status(404).json({ error: "Teacher not found." });
      }
    } catch (err) {
      console.error("Delete teacher error:", err);
      res.status(500).json({ error: "Server error occurred while deleting teacher." });
    }
  },

  update: async (req, res) => {
    try {
      const { id } = req.params;
      const { class_id, subject_ids, ...updateData } = req.body;
      const schoolId = req.schoolId;

      const hasUpdateData = Object.keys(updateData).length > 0 || class_id || (subject_ids && Array.isArray(subject_ids));
      if (!hasUpdateData) {
        return res.status(400).json({ message: "No update fields provided." });
      }

      if (updateData.password) {
        updateData.password_hash = await bcrypt.hash(updateData.password, 10);
        await TeacherModel.updateEncryptedPassword(id, updateData.password, schoolId);
        delete updateData.password;
      }

      let updatedTeacher = null;
      if (Object.keys(updateData).length > 0) {
        updatedTeacher = await TeacherModel.update(id, updateData, schoolId);
        if (!updatedTeacher) {
          return res.status(404).json({ error: "Teacher not found." });
        }
      }

      if (class_id && subject_ids && Array.isArray(subject_ids)) {
        try {
          await TeacherAssignmentModel.bulkCreate({
            teacher_id: id,
            class_id,
            subject_ids,
            school_id: schoolId,
          });
        } catch (assignmentError) {
          console.error('Assignment update failed:', assignmentError);
        }
        updatedTeacher = await TeacherModel.getById(id, schoolId);
      }

      res.status(200).json({
        message: `Teacher ${id} updated successfully.`,
        teacher: updatedTeacher || (await TeacherModel.getById(id, schoolId)),
      });
    } catch (err) {
      console.error("Update teacher error:", err);
      res.status(500).json({ error: "Server error occurred while updating teacher." });
    }
  },

  getTeacherPassword: async (req, res) => {
    try {
      const { id } = req.params;
      const password = await TeacherModel.getDecryptedPassword(id, req.schoolId);
      if (password) {
        res.json({ password });
      } else {
        res.status(404).json({ error: "Password not found" });
      }
    } catch (err) {
      console.error("Get teacher password error:", err);
      res.status(500).json({ error: "Failed to retrieve password" });
    }
  },

  assignSubjectsToTeacher: async (req, res) => {
    try {
      const { id: teacherId } = req.params;
      const { subject_ids, class_id } = req.body;
      const schoolId = req.schoolId;

      if (!Array.isArray(subject_ids) || subject_ids.length === 0 || !class_id) {
        return res.status(400).json({ error: "Class ID and a non-empty array of subject_ids are required." });
      }

      const teacher = await TeacherModel.getById(teacherId, schoolId);
      if (!teacher) {
        return res.status(404).json({ error: "Teacher not found." });
      }

      try {
        await TeacherAssignmentModel.bulkCreate({
          teacher_id: teacherId,
          class_id,
          subject_ids,
          school_id: schoolId,
        });
        res.status(200).json({ message: `Subjects assigned to teacher '${teacher.full_name}' successfully.` });
      } catch (assignmentError) {
        console.error('Assignment creation failed:', assignmentError);
        res.status(400).json({ error: "One or more subject IDs are invalid." });
      }
    } catch (err) {
      console.error("Assign subjects to teacher error:", err);
      res.status(500).json({ error: "Server error occurred while assigning subjects." });
    }
  },

  getTeacherAssignedSubjects: async (req, res) => {
    try {
      const { id: teacherId } = req.params;
      const subjects = await TeacherModel.getAssignedSubjects(teacherId, req.schoolId);
      res.status(200).json({ subjects });
    } catch (err) {
      console.error("Get assigned subjects error:", err);
      res.status(500).json({ error: "Server error occurred while fetching assigned subjects." });
    }
  },

  login: async (req, res) => {
    try {
      const { username, password, schoolId } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required." });
      }
      if (!schoolId) {
        return res.status(400).json({ error: "School selection is required." });
      }

      const schoolResult = await db.query(
        `SELECT id, name, is_active FROM schools WHERE id = $1`,
        [schoolId]
      );
      if (schoolResult.rows.length === 0) {
        return res.status(404).json({ error: "School not found." });
      }
      const school = schoolResult.rows[0];
      if (!school.is_active) {
        return res.status(403).json({ error: "This school account has been deactivated." });
      }

      const teacher = await TeacherModel.findByUsername(username, schoolId);
      if (!teacher) {
        return res.status(401).json({ error: "Invalid credentials." });
      }

      const isPasswordValid = await bcrypt.compare(password, teacher.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Invalid credentials." });
      }

      const token = jwt.sign(
        {
          teacherId: teacher.id,
          userId: teacher.id,
          username: teacher.username,
          full_name: teacher.full_name,
          role: 'teacher',
          schoolId: school.id,
          schoolName: school.name,
        },
        process.env.JWT_SECRET || "your_jwt_secret_key",
        { expiresIn: '24h' }
      );

      res.status(200).json({
        token,
        accessToken: token,
        userDetails: {
          id: teacher.id,
          username: teacher.username,
          full_name: teacher.full_name,
          phone_number: teacher.phone_number,
          role: 'teacher',
          schoolId: school.id,
          schoolName: school.name,
        },
      });
    } catch (err) {
      console.error("Teacher login error:", err);
      res.status(500).json({ error: "Server error during login." });
    }
  },

  updateProfile: async (req, res) => {
    try {
      const teacherIdToUpdate = req.teacher.teacherId;
      const schoolId = req.schoolId;
      const updateData = req.body;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No update fields provided." });
      }

      if (updateData.password) {
        updateData.password_hash = await bcrypt.hash(updateData.password, 10);
        await TeacherModel.updateEncryptedPassword(teacherIdToUpdate, updateData.password, schoolId);
        delete updateData.password;
      }

      const updatedTeacher = await TeacherModel.update(teacherIdToUpdate, updateData, schoolId);
      if (updatedTeacher) {
        res.status(200).json({ message: `Teacher profile updated successfully.`, teacher: updatedTeacher });
      } else {
        res.status(404).json({ error: "Teacher profile not found or no changes made." });
      }
    } catch (err) {
      console.error("Update teacher profile error:", err);
      res.status(500).json({ error: "Server error occurred while updating profile." });
    }
  },
};

module.exports = TeacherController;