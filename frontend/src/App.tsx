// frontend/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import type { User } from './types/userTypes';

// ─── PUBLIC PAGES ───────────────────────────────────────────────
import SchoolSelectionPage from './pages/SchoolSelectionPage';
import LoginPage from './pages/LoginPage';
import SuperAdminLoginPage from './pages/SuperAdminLoginPage';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import UnauthorizedPage from './pages/UnauthorizedPage';

// ─── DASHBOARD PAGES ────────────────────────────────────────────
import AdminDashboardPage from './pages/AdminDashboard';
import TeacherDashboardPage from './pages/TeacherDashboard';

// ─── ACADEMIC SETUP (NEW) ──────────────────────────────────────
import AcademicSetupPage from './features/academic/pages/AcademicSetupPage';

// ─── STUDENTS ───────────────────────────────────────────────────
import StudentsDashboard from './features/students/pages/StudentsDashboard';

// ─── TEACHERS ───────────────────────────────────────────────────
import TeachersDashboard from './features/teachers/pages/TeachersDashboard';

// ─── SUBJECTS ───────────────────────────────────────────────────
import SubjectManagementPage from './features/subjects/pages/SubjectManagementPage';

// ─── CLASSES ────────────────────────────────────────────────────
import { ClassPage } from './features/class/pages/ClassPage';
import ClassManagementPage from './features/class/pages/ClassManagementPage';

// ─── CLASS STATISTICS ───────────────────────────────────────────
import TeacherClassStatistics from './features/classStatistics/pages/TeacherClassStatistics';
import AdminClassStatistics from './features/classStatistics/pages/AdminClassStatistics';

// ─── ATTENDANCE ─────────────────────────────────────────────────
import { AttendanceDashboard } from './features/attendance/pages/AttendanceDashboard';
import AdminStudentAttendance from './features/attendance/pages/AdminStudentAttendance';
import AdminTeacherAttendance from './features/attendance/pages/AdminTeacherAttendance';
import TeacherWorkSchedulePage from './features/attendance/pages/TeacherWorkSchedulePage';
import ReportsPage from './features/attendance/pages/ReportsPage';
import { TeacherAttendancePage } from './features/attendance/pages/TeacherAttendancePage';

// ─── FEES ───────────────────────────────────────────────────────
import FeeDashboard from './features/fee/pages/FeeDashboard';
import FeeStructures from './features/fee/pages/FeeStructures';
import Payments from './features/fee/pages/Payments';
import Reports from './features/fee/pages/Reports';
import StudentFeeStatementPage from './features/fee/pages/StudentFeeStatementPage';
import AuditLogs from './features/fee/pages/AuditLogs';
import DiscountTypes from './features/fee/pages/DiscountTypes';
import AdvancedReports from './features/fee/pages/AdvancedReports';
import StudentPayments from './features/fee/pages/StudentPayments';
import ReceiptVerification from './features/fee/pages/ReceiptVerification';

// ─── REPORT CARD ────────────────────────────────────────────────
import ReportCardDashboard from './features/reportCard/pages/ReportCardDashboard';
import ReportCardView from './features/reportCard/pages/ReportCardView';

// ─── SMS ────────────────────────────────────────────────────────
import SmsDashboard from './features/sms/pages/SmsDashboard';
import SmsHistoryPage from './features/sms/pages/SmsHistoryPage';

// ─── MARKS ──────────────────────────────────────────────────────
import { MarksPage } from './features/marks';

// ─── QUESTIONS ──────────────────────────────────────────────────
import TeacherQuestionPage from './features/question/pages/TeacherQuestionPage';
import AdminQuestionPage from './features/question/pages/AdminQuestionPage';

// ─── LAYOUT / GUARDS ────────────────────────────────────────────
import ProtectedRoute from './components/common/ProtectedRoute';
import DashboardLayout from './components/common/DashboardLayout';

const mockAdminUser: User = {
  userName: 'Admin',
  userRole: 'admin',
  avatar: '/default-avatar.png',
};

const mockTeacherUser: User = {
  userName: 'Teacher',
  userRole: 'teacher',
  avatar: '/default-avatar.png',
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Routes>
            {/* ═══════════ PUBLIC ROUTES ═══════════ */}
            <Route path="/select-school" element={<SchoolSelectionPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/super-admin-login" element={<SuperAdminLoginPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route path="/verify-receipt" element={<ReceiptVerification />} />

            {/* ═══════════ SUPER ADMIN ═══════════ */}
            <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
              <Route path="/super-admin" element={<SuperAdminDashboard />} />
            </Route>

            {/* ═══════════ ADMIN + BURSAR ═══════════ */}
            <Route element={<ProtectedRoute allowedRoles={['admin', 'bursar']} />}>
              <Route path="/admin" element={<DashboardLayout user={mockAdminUser} />}>
                {/* Dashboard */}
                <Route index element={<AdminDashboardPage />} />

                {/* Academic Setup — faculties + specialties */}
                <Route path="academic-setup" element={<AcademicSetupPage />} />

                {/* Core modules */}
                <Route path="students" element={<StudentsDashboard />} />
                <Route path="teachers" element={<TeachersDashboard />} />
                <Route path="subjects" element={<SubjectManagementPage />} />

                {/* Classes — analytics + CRUD */}
                <Route path="classes" element={<ClassPage />} />
                <Route path="classes/manage" element={<ClassManagementPage />} />

                {/* Attendance */}
                <Route path="attendance" element={<AttendanceDashboard />}>
                  <Route index element={<Navigate to="students" replace />} />
                  <Route path="students" element={<AdminStudentAttendance />} />
                  <Route path="teachers" element={<AdminTeacherAttendance />} />
                  <Route path="work-schedule" element={<TeacherWorkSchedulePage />} />
                  <Route path="reports" element={<ReportsPage />} />
                </Route>

                {/* Fees */}
                <Route path="fees" element={<FeeDashboard />} />
                <Route path="fees/structures" element={<FeeStructures />} />
                <Route path="fees/payments" element={<Payments />} />
                <Route path="fees/reports" element={<Reports />} />
                <Route path="fees/student-statement" element={<StudentFeeStatementPage />} />
                <Route path="fees/audit-logs" element={<AuditLogs />} />
                <Route path="fees/discounts" element={<DiscountTypes />} />
                <Route path="fees/advanced-reports" element={<AdvancedReports />} />
                <Route path="fees/student-payments" element={<StudentPayments />} />

                {/* Report Cards */}
                <Route path="report-card" element={<ReportCardDashboard />}>
                  <Route index element={<ReportCardView />} />
                </Route>

                {/* SMS */}
                <Route path="sms" element={<SmsDashboard />}>
                  <Route index element={<SmsHistoryPage />} />
                  <Route path="history" element={<SmsHistoryPage />} />
                </Route>

                {/* Questions */}
                <Route path="questions" element={<AdminQuestionPage />} />

                {/* Class Statistics (admin view) */}
                <Route path="class-statistics" element={<AdminClassStatistics />} />
              </Route>
            </Route>

            {/* ═══════════ TEACHER ═══════════ */}
            <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
              <Route path="/teacher" element={<DashboardLayout user={mockTeacherUser} />}>
                <Route index element={<TeacherDashboardPage />} />
                <Route path="marks" element={<MarksPage />} />
                <Route path="attendance" element={<TeacherAttendancePage />} />
                <Route path="questions" element={<TeacherQuestionPage />} />
                <Route path="statistics" element={<TeacherClassStatistics />} />
              </Route>
            </Route>

            {/* ═══════════ FALLBACK ═══════════ */}
            <Route path="/" element={<Navigate to="/select-school" replace />} />
            <Route path="*" element={<Navigate to="/select-school" replace />} />
          </Routes>
        </LocalizationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;