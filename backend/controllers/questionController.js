// backend/controllers/questionController.js
const QuestionModel = require("../models/questionModel");
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');

// Extract schoolId from whichever middleware ran
const getSchoolId = (req) => {
  const sid = req.schoolId || req.user?.schoolId || req.teacher?.schoolId;
  if (!sid) throw new Error('No school context available');
  return sid;
};

const QuestionController = {
  submitQuestion: async (req, res) => {
    try {
      const schoolId = getSchoolId(req);
      const { subject_id } = req.body;
      const teacher_id = req.teacher.teacherId;

      if (!req.file) {
        return res.status(400).json({ error: "No PDF file uploaded." });
      }
      if (!subject_id) {
        await fsp.unlink(req.file.path);
        return res.status(400).json({ error: "Subject ID is required." });
      }

      const isAssigned = await QuestionModel.isTeacherAssignedToSubject(teacher_id, subject_id, schoolId);
      if (!isAssigned) {
        await fsp.unlink(req.file.path);
        return res.status(403).json({ error: "You are not assigned to this subject." });
      }

      const file_path = req.file.path;
      const newQuestion = await QuestionModel.create({ teacher_id, subject_id, file_path }, schoolId);

      res.status(201).json({
        message: "Question submitted successfully!",
        question: newQuestion
      });
    } catch (err) {
      console.error("Submit question error:", err);
      if (req.file && fs.existsSync(req.file.path)) {
        await fsp.unlink(req.file.path).catch(console.error);
      }
      if (err.code === '23503') {
        return res.status(400).json({ error: "Invalid subject_id provided." });
      }
      res.status(500).json({ error: "Server error occurred while submitting question." });
    }
  },

  replaceQuestionFile: async (req, res) => {
    try {
      const schoolId = getSchoolId(req);
      const { id } = req.params;
      const teacher_id = req.teacher.teacherId;

      const question = await QuestionModel.findById(id, schoolId);
      if (!question) {
        if (req.file) await fsp.unlink(req.file.path);
        return res.status(404).json({ error: "Question not found." });
      }

      if (question.teacher_id !== teacher_id) {
        if (req.file) await fsp.unlink(req.file.path);
        return res.status(403).json({ error: "You can only update your own questions." });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No new PDF file uploaded." });
      }

      if (fs.existsSync(question.question_text)) {
        await fsp.unlink(question.question_text).catch(console.error);
      }

      const updatedQuestion = await QuestionModel.updateFilePath(id, req.file.path, schoolId);

      res.status(200).json({
        message: "Question file updated successfully!",
        question: updatedQuestion
      });
    } catch (err) {
      console.error("Replace question file error:", err);
      if (req.file && fs.existsSync(req.file.path)) {
        await fsp.unlink(req.file.path).catch(console.error);
      }
      res.status(500).json({ error: "Server error occurred while updating the question file." });
    }
  },

  viewMyQuestions: async (req, res) => {
    try {
      const schoolId = getSchoolId(req);
      const teacher_id = req.teacher.teacherId;
      const questions = await QuestionModel.getQuestionsByTeacher(teacher_id, schoolId);
      res.status(200).json({ questions });
    } catch (err) {
      console.error("View questions error:", err);
      res.status(500).json({ error: "Server error occurred while fetching questions." });
    }
  },

  getAllQuestions: async (req, res) => {
    try {
      const schoolId = getSchoolId(req);
      const { subject_id, status } = req.query;
      const questions = await QuestionModel.getAllWithFilters({ subject_id, status }, schoolId);
      res.status(200).json({ questions });
    } catch (err) {
      console.error("Get all questions error:", err);
      res.status(500).json({ error: "Server error occurred while fetching questions." });
    }
  },

  downloadMyQuestion: async (req, res) => {
    try {
      const schoolId = getSchoolId(req);
      const { id } = req.params;
      const teacher_id = req.teacher.teacherId;
      const question = await QuestionModel.findById(id, schoolId);

      if (!question) {
        return res.status(404).json({ error: "Question not found." });
      }
      if (question.teacher_id !== teacher_id) {
        return res.status(403).json({ error: "You can only download your own questions." });
      }

      const filePath = path.resolve(question.question_text);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "PDF file not found on server." });
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="question-${id}.pdf"`);

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (err) {
      console.error("Download question PDF error:", err);
      res.status(500).json({ error: "Server error occurred while fetching PDF." });
    }
  },

  downloadAnyQuestion: async (req, res) => {
    try {
      const schoolId = getSchoolId(req);
      const { id } = req.params;
      const question = await QuestionModel.findById(id, schoolId);

      if (!question) {
        return res.status(404).json({ error: "Question not found." });
      }

      const filePath = path.resolve(question.question_text);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "PDF file not found on server." });
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="question-${id}.pdf"`);

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (err) {
      console.error("Download question PDF error:", err);
      res.status(500).json({ error: "Server error occurred while fetching PDF." });
    }
  },

  deleteQuestion: async (req, res) => {
    try {
      const schoolId = getSchoolId(req);
      const { id } = req.params;
      const teacher_id = req.teacher.teacherId;

      const question = await QuestionModel.findById(id, schoolId);
      if (!question) {
        return res.status(404).json({ error: "Question not found." });
      }

      if (question.teacher_id !== teacher_id) {
        return res.status(403).json({ error: "You can only delete your own questions." });
      }

      if (fs.existsSync(question.question_text)) {
        await fsp.unlink(question.question_text).catch(console.error);
      }

      const deletedQuestion = await QuestionModel.delete(id, schoolId);
      if (!deletedQuestion) {
        return res.status(500).json({ error: "Failed to delete question from the database." });
      }

      res.status(200).json({ message: "Question deleted successfully." });
    } catch (err) {
      console.error("Delete question error:", err);
      res.status(500).json({ error: "Server error occurred while deleting question." });
    }
  },

  updateQuestionStatus: async (req, res) => {
    try {
      const schoolId = getSchoolId(req);
      const { id } = req.params;
      const { status, notes } = req.body;

      if (!status) {
        return res.status(400).json({ error: "Status is required." });
      }

      const validStatuses = ['Pending', 'Approved', 'Rejected', 'Printed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }

      const updatedQuestion = await QuestionModel.updateStatusAndNotes(id, status, notes, schoolId);

      if (!updatedQuestion) {
        return res.status(404).json({ error: "Question not found." });
      }

      res.status(200).json({
        message: "Question status updated!",
        question: updatedQuestion
      });
    } catch (err) {
      console.error("Update question status error:", err);
      res.status(500).json({ error: "Server error occurred while updating question status." });
    }
  }
};

module.exports = QuestionController;