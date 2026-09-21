const Joi = require('joi');

const ALLOWED_STATUSES = ['Present', 'Absent', 'Excused', 'Late'];

const studentAttendanceSchema = Joi.object({
  studentId: Joi.number().integer().positive().required(),
  status: Joi.string().valid(...ALLOWED_STATUSES).required(),
  reason: Joi.string().allow(null, '').max(500)
});

const studentBulkAttendanceSchema = Joi.object({
  className: Joi.string().trim().min(2).max(100).required(),
  attendanceDate: Joi.date().iso().required(),
  markedBy: Joi.string().trim().min(1).max(100).required(),
  records: Joi.array().items(studentAttendanceSchema).min(1).required()
});

const teacherAttendanceSchema = Joi.object({
  teacherId: Joi.number().integer().positive().required(),
  status: Joi.string().valid(...ALLOWED_STATUSES).required(),
  reason: Joi.string().allow(null, '').max(500)
});

const teacherBulkAttendanceSchema = Joi.object({
  attendanceDate: Joi.date().iso().required(),
  markedBy: Joi.string().trim().min(1).max(100).required(),
  records: Joi.array().items(teacherAttendanceSchema).min(1).required()
});

const monthlySummarySchema = Joi.object({
  month: Joi.number().integer().min(1).max(12).required(),
  year: Joi.number().integer().min(2000).max(3000).required()
});

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const expectedDaysSchema = Joi.object({
  teacherId: Joi.number().integer().positive().required(),
  dayOfWeek: Joi.string().valid(...DAY_NAMES).required(),
  isFullDayExpected: Joi.boolean().required(),
  expectedHalfDayType: Joi.when('isFullDayExpected', {
    is: false,
    then: Joi.string().valid('Morning', 'Afternoon').required(),
    otherwise: Joi.string().allow(null, '')
  })
});

const bulkExpectedDaysSchema = Joi.object({
  teacherId: Joi.number().integer().positive().required(),
  expectedDays: Joi.array().items(
    Joi.object({
      dayOfWeek: Joi.string().valid(...DAY_NAMES).required(),
      isFullDayExpected: Joi.boolean().required(),
      expectedHalfDayType: Joi.when('isFullDayExpected', {
        is: false,
        then: Joi.string().valid('Morning', 'Afternoon').required(),
        otherwise: Joi.string().allow(null, '')
      })
    })
  ).min(1).max(7).required()
});

module.exports = {
  ALLOWED_STATUSES,
  studentAttendanceSchema,
  studentBulkAttendanceSchema,
  teacherAttendanceSchema,
  teacherBulkAttendanceSchema,
  monthlySummarySchema,
  expectedDaysSchema,
  bulkExpectedDaysSchema
};