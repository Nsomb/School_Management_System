// backend/controllers/StudentController.js
const StudentModel = require("../models/studentModel");
const ReportCardModel = require("../models/reportCardModel");
const ClassModel = require("../models/ClassModel");
const { calculateStudentAverage } = require("../utils/calculations");
const { isMarkRelevantForTermAndYear } = require("../utils/dateHelpers");

const StudentController = {
  _classIdByName: async (className, schoolId) => {
    const c = await ClassModel.getClassByName(className, schoolId);
    if (!c) throw new Error(`Class with name '${className}' not found.`);
    return c.id;
  },

  _classNameById: async (classId, schoolId) => {
    const c = await ClassModel.getClassById(classId, schoolId);
    if (!c) throw new Error(`Class with ID '${classId}' not found.`);
    return c.class_name;
  },

  // ─── CREATE ──────────────────────────────────────────────
  createStudent: async (req, res) => {
    try {
      const { name, class_name, date_of_birth, faculty_id, specialty_id, sex, guidance_phone_number } = req.body;

      // Faculty and Specialty are optional — Form 1/2 students often haven't
      // chosen a stream yet in a comprehensive school.
      if (!name || !class_name || !date_of_birth || !sex) {
        return res.status(400).json({ message: "Name, class, date of birth, and gender are required." });
      }

      let class_id;
      try {
        class_id = await StudentController._classIdByName(class_name, req.schoolId);
      } catch (error) {
        return res.status(400).json({ message: error.message });
      }

      const newStudent = await StudentModel.create(
        {
          name,
          class_id,
          date_of_birth,
          faculty_id: faculty_id || null,
          specialty_id: specialty_id || null,
          sex,
          guidance_phone_number: guidance_phone_number || null,
        },
        req.schoolId
      );
      res.status(201).json({ message: "Student created successfully.", student: newStudent });
    } catch (error) {
      console.error("Error creating student:", error);
      res.status(500).json({ message: "Failed to create student.", error: error.message });
    }
  },

  // ─── GET ALL ─────────────────────────────────────────────
  getAllStudents: async (req, res) => {
    try {
      const { class_name } = req.query;
      let students;

      if (class_name) {
        let class_id;
        try {
          class_id = await StudentController._classIdByName(class_name, req.schoolId);
        } catch (error) {
          return res.status(400).json({ message: error.message });
        }
        students = await StudentModel.getStudentsByClassId(class_id, req.schoolId);
      } else {
        students = await StudentModel.getAll(req.schoolId);
      }

      res.status(200).json({ students });
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(500).json({ message: "Failed to retrieve students.", error: error.message });
    }
  },

  // ─── GET BY ID ───────────────────────────────────────────
  getStudentById: async (req, res) => {
    try {
      const student = await StudentModel.getById(req.params.id, req.schoolId);
      if (!student) {
        return res.status(404).json({ message: `Student with ID '${req.params.id}' not found.` });
      }
      res.status(200).json({ student });
    } catch (error) {
      console.error("Error fetching student by ID:", error);
      res.status(500).json({ message: "Failed to retrieve student.", error: error.message });
    }
  },

  // ─── SEARCH BY NAME ──────────────────────────────────────
  searchStudentsByName: async (req, res) => {
    try {
      const { name } = req.query;
      if (!name) {
        return res.status(400).json({ message: "Name query parameter is required for search." });
      }

      const students = await StudentModel.getStudentsByName(name, req.schoolId);
      if (students.length === 0) {
        return res.status(404).json({ message: `No students found matching '${name}'.` });
      }
      res.status(200).json({ students });
    } catch (error) {
      console.error("Error searching students by name:", error);
      res.status(500).json({ message: "Failed to search students.", error: error.message });
    }
  },

  // ─── UPDATE ──────────────────────────────────────────────
  updateStudent: async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No update fields provided." });
      }

      if (updates.class_name) {
        try {
          updates.class_id = await StudentController._classIdByName(updates.class_name, req.schoolId);
          delete updates.class_name;
        } catch (error) {
          return res.status(400).json({ message: error.message });
        }
      }

      const updatedStudent = await StudentModel.update(id, updates, req.schoolId);
      if (!updatedStudent) {
        return res.status(404).json({ message: `Student with ID '${id}' not found for update.` });
      }
      res.status(200).json({ message: "Student updated successfully.", student: updatedStudent });
    } catch (error) {
      console.error("Error updating student:", error);
      res.status(500).json({ message: "Failed to update student.", error: error.message });
    }
  },

  // ─── DELETE ──────────────────────────────────────────────
  deleteStudent: async (req, res) => {
    try {
      const { id } = req.params;
      const deletedStudent = await StudentModel.delete(id, req.schoolId);
      if (!deletedStudent) {
        return res.status(404).json({ message: `Student with ID '${id}' not found for deletion.` });
      }
      res.status(200).json({
        message: `Student '${deletedStudent.name}' (ID: ${deletedStudent.id}) deleted successfully.`,
        student: deletedStudent,
      });
    } catch (error) {
      console.error("Error deleting student:", error);
      res.status(500).json({ message: "Failed to delete student.", error: error.message });
    }
  },

  // ─── TRANSFER (single) ───────────────────────────────────
  transferStudent: async (req, res) => {
    try {
      const { id } = req.params;
      const { new_class_name, new_specialty_id } = req.body;

      if (!new_class_name) {
        return res.status(400).json({ message: "New class name is required for transfer." });
      }

      let new_class_id;
      try {
        new_class_id = await StudentController._classIdByName(new_class_name, req.schoolId);
      } catch (error) {
        return res.status(400).json({ message: error.message });
      }

      const currentStudent = await StudentModel.getById(id, req.schoolId);
      if (!currentStudent) {
        return res.status(404).json({ message: `Student with ID '${id}' not found for transfer.` });
      }

      const specialtyIdToUse = new_specialty_id || currentStudent.specialty_id;

      const transferredStudent = await StudentModel.transfer(
        id, new_class_id, specialtyIdToUse, req.schoolId
      );
      if (!transferredStudent) {
        return res.status(404).json({ message: `Student with ID '${id}' not found for transfer.` });
      }
      res.status(200).json({
        message: `Student '${transferredStudent.name}' (ID: ${transferredStudent.id}) transferred successfully to class ${new_class_name}.`,
        student: transferredStudent,
      });
    } catch (error) {
      console.error("Error transferring student:", error);
      res.status(500).json({ message: "Failed to transfer student.", error: error.message });
    }
  },

  // ─── ADD SECONDARY SPECIALTY ─────────────────────────────
  addStudentSpecialty: async (req, res) => {
    try {
      const { id } = req.params;
      const { specialty_id } = req.body;
      if (!specialty_id) {
        return res.status(400).json({ message: "Specialty ID is required." });
      }

      const student = await StudentModel.getById(id, req.schoolId);
      if (!student) {
        return res.status(404).json({ message: `Student with ID '${id}' not found.` });
      }

      const record = await StudentModel.addSpecialty(id, specialty_id, req.schoolId);
      res.status(200).json({
        message: `Secondary specialty added successfully for '${student.name}'.`,
        record,
      });
    } catch (error) {
      console.error("Error adding student specialty:", error);
      res.status(500).json({ message: error.message || "Failed to add secondary specialty." });
    }
  },

  // ─── BULK TRANSFER ───────────────────────────────────────
  bulkTransferStudents: async (req, res) => {
    try {
      const { student_ids, new_class_name } = req.body;
      if (!Array.isArray(student_ids) || student_ids.length === 0 || !new_class_name) {
        return res.status(400).json({ message: "Student IDs array and new class name are required." });
      }

      let new_class_id;
      try {
        new_class_id = await StudentController._classIdByName(new_class_name, req.schoolId);
      } catch (error) {
        return res.status(400).json({ message: error.message });
      }

      const transferredStudents = await StudentModel.bulkTransfer(student_ids, new_class_id, req.schoolId);
      res.status(200).json({ message: "Students bulk transferred successfully.", students: transferredStudents });
    } catch (error) {
      console.error("Error bulk transferring students:", error);
      res.status(500).json({ message: "Failed to bulk transfer students.", error: error.message });
    }
  },

  // ─── TRANSFER CLASS ──────────────────────────────────────
  transferClass: async (req, res) => {
    try {
      const { old_class_name, new_class_name } = req.body;
      if (!old_class_name || !new_class_name) {
        return res.status(400).json({ message: "Old class name and new class name are required for class transfer." });
      }

      const transferredStudents = await StudentModel.transferClassToNewAcademicYear(
        old_class_name, new_class_name, req.schoolId
      );

      if (transferredStudents.length === 0) {
        return res.status(404).json({ message: `No students found in ${old_class_name} to transfer.`, students: [] });
      }
      res.status(200).json({
        message: `Class ${old_class_name} successfully transferred to ${new_class_name}.`,
        students: transferredStudents,
      });
    } catch (error) {
      console.error("Error transferring class:", error);
      res.status(500).json({ message: "Failed to transfer class.", error: error.message });
    }
  },

  // ─── PROMOTE (stream-aware) ──────────────────────────────
  promoteStudentBasedOnReportCard: async (req, res) => {
    try {
      const { id } = req.params;
      const currentAcademicYear = process.env.CURRENT_ACADEMIC_YEAR;
      if (!currentAcademicYear) {
        return res.status(500).json({ message: "System academic year is not configured." });
      }

      const student = await StudentModel.getById(id, req.schoolId);
      if (!student) {
        return res.status(404).json({ message: `Student with ID '${id}' not found.` });
      }

      const currentClass = await ClassModel.getClassById(student.class_id, req.schoolId);
      const nextClass = await ClassModel.getNextClassInProgression(currentClass, req.schoolId);

      if (!nextClass) {
        return res.status(200).json({
          message: `Student ${student.name} has graduated from ${student.class_name}. No further promotion.`,
        });
      }

      const allRawMarksInClass = await ReportCardModel.getAllStudentMarksForClassAndTerm(
        student.class_id, "3rd Term", currentAcademicYear, req.schoolId
      );

      const studentRelevantMarks = allRawMarksInClass.filter(mark =>
        mark.student_id == student.id &&
        isMarkRelevantForTermAndYear(mark.submission_date, "3rd Term", currentAcademicYear)
      );

      const subjectsForClass = await ReportCardModel.getAllSubjectsForClass(
        student.class_id, student.specialty_id, req.schoolId
      );

      if (studentRelevantMarks.length === 0 || subjectsForClass.length === 0) {
        return res.status(404).json({
          message: `No relevant 3rd Term marks or subjects found for student ${student.name} in ${currentAcademicYear}.`,
        });
      }

      const structuredStudentMarks = {};
      subjectsForClass.forEach(subject => {
        structuredStudentMarks[subject.id] = {
          subject_name: subject.name,
          coefficient: subject.coefficient,
          evaluations: {},
        };
      });

      studentRelevantMarks.forEach(mark => {
        if (structuredStudentMarks[mark.subject_id]) {
          structuredStudentMarks[mark.subject_id].evaluations[mark.evaluation_type] = mark.score;
        }
      });

      let totalWeightedAverage = 0;
      let totalCoefficient = 0;
      const evalTypes = ['5th Evaluation', '6th Evaluation'];

      Object.values(structuredStudentMarks).forEach(subjectData => {
        if (Object.keys(subjectData.evaluations).length > 0) {
          const avg = calculateStudentAverage(evalTypes, subjectData.evaluations, subjectData.coefficient);
          if (avg !== null) {
            totalWeightedAverage += avg * subjectData.coefficient;
            totalCoefficient += subjectData.coefficient;
          }
        }
      });

      if (totalCoefficient === 0) {
        return res.status(400).json({
          message: `Could not calculate overall average for ${student.name} in 3rd Term.`,
        });
      }

      const overall = totalWeightedAverage / totalCoefficient;

      if (overall >= 10) {
        const promoted = await StudentModel.transfer(
          student.id, nextClass.id, student.specialty_id, req.schoolId
        );
        return res.status(200).json({
          message: `Student ${promoted.name} promoted from ${currentClass.class_name} to ${nextClass.class_name} with an average of ${overall.toFixed(2)}.`,
          student: { ...promoted, class_name: nextClass.class_name },
          average: overall.toFixed(2),
        });
      } else {
        return res.status(200).json({
          message: `Student ${student.name} not promoted. 3rd Term average (${overall.toFixed(2)}) is below 10.`,
          student,
          average: overall.toFixed(2),
        });
      }
    } catch (error) {
      console.error("Error promoting student:", error);
      res.status(500).json({ message: "Failed to promote student.", error: error.message });
    }
  },
};

module.exports = StudentController;