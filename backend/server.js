// backend/server.js
const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ==================== GLOBAL ERROR HANDLERS ====================
process.on('uncaughtException', (err) => console.error('❌ UNCAUGHT:', err));
process.on('unhandledRejection', (reason) => console.error('❌ UNHANDLED:', reason));

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});

// ==================== STATIC FILES ====================
app.use('/reports', express.static(path.join(__dirname, 'uploads', 'reports')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
// ⚡ NEW: serve uploaded school logos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==================== HEALTH CHECK ====================
app.get('/', (req, res) => res.send('School Management Backend is Running'));

// ==================== SCHOOL ROUTES (PUBLIC + SUPER ADMIN) ====================
const schoolRoutes = require('./routes/schoolRoutes');
app.use('/api/schools', schoolRoutes);

// ==================== SUPER ADMIN ROUTES ====================
const superAdminRoutes = require('./routes/superAdminRoutes');
app.use('/api/super-admin', superAdminRoutes);

// ==================== EVALUATIONS ====================
app.get('/api/evaluations', (req, res) => {
  const evaluations = [
    { id: '1', name: '1st Evaluation' },
    { id: '2', name: '2nd Evaluation' },
    { id: '3', name: '3rd Evaluation' },
    { id: '4', name: '4th Evaluation' },
    { id: '5', name: '5th Evaluation' },
    { id: '6', name: '6th Evaluation' },
  ];
  res.json({ evaluations });
});

// ==================== EXISTING ROUTES ====================
const publicRoutes = require('./routes/publicRoutes');
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const markRoutes = require('./routes/markRoutes');
const questionRoutes = require('./routes/questionRoutes');
const reportCardRoutes = require('./routes/reportCardRoutes');
const subjectClassRoutes = require('./routes/subjectClassRoutes');
const classListRoutes = require('./routes/classListRoutes');
const classReportRoutes = require('./routes/classReportRoutes');
const timetableConfigRoutes = require('./routes/timetableConfigRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const smsRoutes = require('./routes/smsRoutes');
const feeRoutes = require('./routes/feeRoutes');
const teacherAssignmentRoutes = require('./routes/teacherAssignmentRoutes');
const academicYearRoutes = require('./routes/academicYearRoutes');
const adminIntegrationRoutes = require('./routes/adminIntegrationRoutes');
const facultyRoutes = require('./routes/facultyRoutes');
const specialtyRoutes = require('./routes/specialtyRoutes');
const classRoutes = require('./routes/classRoutes');
const classStatisticsRoutes = require('./routes/classStatisticsRoutes');

app.use('/api/admin', adminIntegrationRoutes);
app.use('/admin', authRoutes);

const apiRouter = express.Router();
apiRouter.use('/public', publicRoutes);
apiRouter.use('/students', studentRoutes);
apiRouter.use('/subjects', subjectRoutes);
apiRouter.use('/teachers', teacherRoutes);
apiRouter.use('/marks', markRoutes);
apiRouter.use('/questions', questionRoutes);
apiRouter.use('/report-cards', reportCardRoutes);
apiRouter.use('/subject-classes', subjectClassRoutes);
apiRouter.use('/class-lists', classListRoutes);
apiRouter.use('/class-reports', classReportRoutes);
apiRouter.use('/class-statistics', classStatisticsRoutes);
apiRouter.use('/timetable-config', timetableConfigRoutes);
apiRouter.use('/attendance', attendanceRoutes);
apiRouter.use('/sms', smsRoutes);
apiRouter.use('/fees', feeRoutes);
apiRouter.use('/teacher-assignments', teacherAssignmentRoutes);
apiRouter.use('/faculties', facultyRoutes);
apiRouter.use('/specialties', specialtyRoutes);
apiRouter.use('/classes', classRoutes);

app.use('/api/academic-years', academicYearRoutes);
app.use('/api', apiRouter);

// ==================== TEST ENDPOINT ====================
app.get('/api/ping', (req, res) => res.json({ message: 'pong', timestamp: new Date().toISOString() }));

// ==================== 404 ====================
app.use((req, res) => res.status(404).json({ error: 'Route not found', path: req.originalUrl }));

// ==================== ERROR HANDLER ====================
app.use((err, req, res, next) => {
  console.error('❌ Express Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// ==================== START ====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 DB: ${process.env.DB_NAME}`);
});

module.exports = app;