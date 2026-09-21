// controllers/TimetableConfigController.js
const TimetableConfigModel = require('../models/TimetableConfigModel');
const TeacherModel = require('../models/teacherModel');
const SubjectModel = require('../models/SubjectModel');
const ClassListModel = require('../models/ClassListModel'); // Assuming you have this model for class validation

const TimetableConfigController = {
    // --- Periods ---
    /**
     * Retrieves all configured periods.
     * @param {Object} req - Express request object.
     * @param {Object} res - Express response object.
     */
    getPeriods: async (req, res) => {
        try {
            const periods = await TimetableConfigModel.getAllPeriods();
            res.status(200).json(periods);
        } catch (error) {
            console.error("Error fetching periods:", error);
            res.status(500).json({ message: "Failed to fetch periods.", error: error.message });
        }
    },

    // --- Teacher Availabilities ---
    /**
     * Creates a new teacher availability record.
     * Expects teacher_name and day_of_week in the request body.
     * @param {Object} req - Express request object.
     * @param {Object} res - Express response object.
     */
    createTeacherAvailability: async (req, res) => {
        const { teacher_name, day_of_week } = req.body;
        if (!teacher_name || !day_of_week) {
            return res.status(400).json({ message: "Teacher Name and Day of Week are required." });
        }
        try {
            // Find teacher by name
            const teacher = await TeacherModel.getByName(teacher_name);
            if (!teacher) {
                return res.status(404).json({ message: `Teacher '${teacher_name}' not found.` });
            }
            const teacher_id = teacher.id; // Get the ID

            // Check if day_of_week is a valid value (Mon-Fri)
            const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
            if (!validDays.includes(day_of_week)) {
                return res.status(400).json({ message: "Invalid day of week. Must be one of: Monday, Tuesday, Wednesday, Thursday, Friday." });
            }

            const newAvailability = await TimetableConfigModel.createTeacherAvailability(teacher_id, day_of_week);
            res.status(201).json(newAvailability);
        } catch (error) {
            console.error("Error creating teacher availability:", error);
            if (error.code === '23505') { // PostgreSQL unique violation error code
                return res.status(409).json({ message: `Teacher '${teacher_name}' is already marked available on ${day_of_week}.` });
            }
            res.status(500).json({ message: "Failed to create teacher availability.", error: error.message });
        }
    },

    /**
     * Retrieves teacher availabilities for a specific teacher by their ID.
     * @param {Object} req - Express request object.
     * @param {Object} res - Express response object.
     */
    getTeacherAvailabilities: async (req, res) => {
        const { teacher_id } = req.params;
        try {
            const availabilities = await TimetableConfigModel.getTeacherAvailabilitiesByTeacher(teacher_id);
            if (availabilities.length === 0) {
                return res.status(404).json({ message: "No availability found for this teacher." });
            }
            res.status(200).json(availabilities);
        } catch (error) {
            console.error("Error fetching teacher availabilities:", error);
            res.status(500).json({ message: "Failed to fetch teacher availabilities.", error: error.message });
        }
    },

    /**
     * Deletes a teacher availability record by its ID.
     * @param {Object} req - Express request object.
     * @param {Object} res - Express response object.
     */
    deleteTeacherAvailability: async (req, res) => {
        const { id } = req.params;
        try {
            const deleted = await TimetableConfigModel.deleteTeacherAvailability(id);
            if (!deleted) {
                return res.status(404).json({ message: "Teacher availability record not found." });
            }
            res.status(200).json({ message: "Teacher availability deleted successfully." });
        } catch (error) {
            console.error("Error deleting teacher availability:", error);
            res.status(500).json({ message: "Failed to delete teacher availability.", error: error.message });
        }
    },

    // --- Teacher-Subject-Class Assignments ---
    /**
     * Creates a new teacher-subject-class assignment.
     * Expects teacher_name, subject_name, class_name, is_trade_subject, min_weekly_periods in body.
     * @param {Object} req - Express request object.
     * @param {Object} res - Express response object.
     */
    createTeacherSubjectClass: async (req, res) => {
        const { teacher_name, subject_name, class_name, is_trade_subject, min_weekly_periods } = req.body;
        if (!teacher_name || !subject_name || !class_name) {
            return res.status(400).json({ message: "Teacher Name, Subject Name, and Class Name are required." });
        }

        try {
            // Validate and convert names to IDs
            const teacher = await TeacherModel.getByName(teacher_name);
            if (!teacher) return res.status(404).json({ message: `Teacher '${teacher_name}' not found.` });
            const teacher_id = teacher.id;

            const subject = await SubjectModel.getByName(subject_name);
            if (!subject) return res.status(404).json({ message: `Subject '${subject_name}' not found.` });
            const subject_id = subject.id;

            // Validate class_name exists (as string)
            const distinctClassNames = await ClassListModel.getDistinctClassNames();
            if (!distinctClassNames.some(c => c.class_name.toLowerCase() === class_name.toLowerCase())) {
                return res.status(404).json({ message: `Class '${class_name}' not found or is invalid.` });
            }

            const newAssignment = await TimetableConfigModel.createTeacherSubjectClass(
                teacher_id,
                subject_id,
                class_name,
                is_trade_subject,
                min_weekly_periods
            );
            res.status(201).json(newAssignment);
        } catch (error) {
            console.error("Error creating teacher-subject-class assignment:", error);
            if (error.code === '23505') { // PostgreSQL unique violation error code
                return res.status(409).json({ message: `Assignment for subject '${subject_name}' in class '${class_name}' already exists. Only one teacher can be assigned per subject per class.` });
            }
            res.status(500).json({ message: "Failed to create teacher-subject-class assignment.", error: error.message });
        }
    },

    /**
     * Retrieves all teacher-subject-class assignments.
     * @param {Object} req - Express request object.
     * @param {Object} res - Express response object.
     */
    getAllTeacherSubjectClasses: async (req, res) => {
        try {
            const assignments = await TimetableConfigModel.getAllTeacherSubjectClasses();
            res.status(200).json(assignments);
        } catch (error) {
            console.error("Error fetching teacher-subject-class assignments:", error);
            res.status(500).json({ message: "Failed to fetch teacher-subject-class assignments.", error: error.message });
        }
    },

    /**
     * Retrieves a single teacher-subject-class assignment by its ID.
     * @param {Object} req - Express request object.
     * @param {Object} res - Express response object.
     */
    getTeacherSubjectClassById: async (req, res) => {
        const { id } = req.params;
        try {
            const assignment = await TimetableConfigModel.getTeacherSubjectClassById(id);
            if (!assignment) {
                return res.status(404).json({ message: "Teacher-subject-class assignment not found." });
            }
            res.status(200).json(assignment);
        } catch (error) {
            console.error("Error fetching teacher-subject-class assignment by ID:", error);
            res.status(500).json({ message: "Failed to fetch teacher-subject-class assignment.", error: error.message });
        }
    },

    /**
     * Updates an existing teacher-subject-class assignment.
     * Expects id in params, and teacher_name, subject_name, class_name, is_trade_subject, min_weekly_periods in body.
     * @param {Object} req - Express request object.
     * @param {Object} res - Express response object.
     */
    updateTeacherSubjectClass: async (req, res) => {
        const { id } = req.params;
        const { teacher_name, subject_name, class_name, is_trade_subject, min_weekly_periods } = req.body;
        if (!teacher_name || !subject_name || !class_name) {
            return res.status(400).json({ message: "Teacher Name, Subject Name, and Class Name are required." });
        }

        try {
            // Validate and convert names to IDs
            const teacher = await TeacherModel.getByName(teacher_name);
            if (!teacher) return res.status(404).json({ message: `Teacher '${teacher_name}' not found.` });
            const teacher_id = teacher.id;

            const subject = await SubjectModel.getByName(subject_name);
            if (!subject) return res.status(404).json({ message: `Subject '${subject_name}' not found.` });
            const subject_id = subject.id;

            const distinctClassNames = await ClassListModel.getDistinctClassNames();
            if (!distinctClassNames.some(c => c.class_name.toLowerCase() === class_name.toLowerCase())) {
                return res.status(404).json({ message: `Class '${class_name}' not found or is invalid.` });
            }

            const updatedAssignment = await TimetableConfigModel.updateTeacherSubjectClass(
                id, teacher_id, subject_id, class_name, is_trade_subject, min_weekly_periods
            );
            if (!updatedAssignment) {
                return res.status(404).json({ message: "Teacher-subject-class assignment not found." });
            }
            res.status(200).json(updatedAssignment);
        } catch (error) {
            console.error("Error updating teacher-subject-class assignment:", error);
            if (error.code === '23505') { // PostgreSQL unique violation error code
                return res.status(409).json({ message: `Assignment for subject '${subject_name}' in class '${class_name}' already exists for another record.` });
            }
            res.status(500).json({ message: "Failed to update teacher-subject-class assignment.", error: error.message });
        }
    },

    /**
     * Deletes a teacher-subject-class assignment by its ID.
     * @param {Object} req - Express request object.
     * @param {Object} res - Express response object.
     */
    deleteTeacherSubjectClass: async (req, res) => {
        const { id } = req.params;
        try {
            const deleted = await TimetableConfigModel.deleteTeacherSubjectClass(id); // Assuming this method exists in your model
            if (!deleted) {
                return res.status(404).json({ message: "Teacher-subject-class assignment not found." });
            }
            res.status(200).json({ message: "Teacher-subject-class assignment deleted successfully." });
        } catch (error) {
            console.error("Error deleting teacher-subject-class assignment:", error);
            res.status(500).json({ message: "Failed to delete teacher-subject-class assignment.", error: error.message });
        }
    }
};

module.exports = TimetableConfigController;