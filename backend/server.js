// backend/server.js
const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ==================== GLOBAL ERROR HANDLERS ====================
process.on('uncaughtException', (err) => console.error('❌ UNCAUGHT:', err));
process.on('unhandledRejection', (reason) => console.error('❌ UNHANDLED:', reason));

// ==================== TRUST PROXY ====================
app.set('trust proxy', 1);

// ==================== CORS ====================
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
  : true;

app.use(cors({ origin: allowedOrigins, credentials: true }));

// ==================== BODY PARSERS ====================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==================== SANITIZE REQUEST BODY ====================
// 🔑 Converts "" → null, "1" → 1 for integer keys, etc.
// This is the defensive layer that prevents type errors before
// they reach Postgres. Runs on EVERY request.
app.use(require('./middleware/sanitizeRequestBody'));

// ==================== REQUEST LOGGING ====================
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});

// ==================== STATIC FILES ====================
app.use('/reports', express.static(path.join(__dirname, 'uploads', 'reports')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==================== HEALTH CHECK ====================
app.get('/', (req, res) =>
  res.json({
    status: 'ok',
    service: 'School Management Backend',
    timestamp: new Date().toISOString(),
  })
);

// ==================== DEBUG: WHO AM I ====================
// Hit this endpoint from the frontend while logged in to see what
// the backend extracts from your JWT.
const { verifyToken } = require('./middleware/auth');
app.get('/api/debug/whoami', verifyToken, (req, res) => {
  res.json({
    user: req.user,
    schoolId: req.schoolId,
    schoolIdType: typeof req.schoolId,
    schoolIdIsInteger: Number.isInteger(req.schoolId),
  });
});

// ==================== SCHOOL ROUTES ====================
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
app.get('/api/ping', (req, res) =>
  res.json({ message: 'pong', timestamp: new Date().toISOString() })
);

// ==================== 404 ====================
app.use((req, res) =>
  res.status(404).json({ error: 'Route not found', path: req.originalUrl })
);

// ==================== ERROR HANDLER ====================
app.use((err, req, res, next) => {
  console.error('❌ Express Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// ==================== START ====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 DB: ${process.env.DB_NAME || 'via DATABASE_URL'}`);
});

module.exports = app;