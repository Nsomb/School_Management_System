// src/features/attendance/api/attendanceApi.ts
import apiClient from '../../../api/AuthService';
import type {
  StudentAttendanceFormData,
  TeacherAttendanceFormData,
  AttendanceFilters,
  BulkExpectedDaysData,
  LockAttendanceData,
} from '../types/attendanceTypes';

const ATT = '/api/attendance';

const handleApiError = (error: any): never => {
  if (error.response?.data?.error) throw new Error(error.response.data.error);
  if (error.response?.data?.message) throw new Error(error.response.data.message);
  if (error.request) throw new Error('Network error - please check your connection');
  throw new Error('Request configuration error');
};

export const attendanceApi = {
  // ─── CLASSES & STUDENTS ─────────────────────────────────
  getClasses: async (): Promise<string[]> => {
    try {
      const response = await apiClient.get('/api/report-cards/classes');
      if (Array.isArray(response.data)) return response.data;
      return [];
    } catch (error) {
      console.error('Error fetching classes via report-cards:', error);
      try {
        const fallback = await apiClient.get('/api/class-lists/distinct-class-names');
        if (Array.isArray(fallback.data)) return fallback.data;
        if (Array.isArray(fallback.data?.classNames)) return fallback.data.classNames;
        return [];
      } catch (fallbackError) {
        console.error('Fallback class fetch also failed:', fallbackError);
        return [];
      }
    }
  },

  getStudentsByClass: async (className: string) => {
    try {
      const response = await apiClient.get('/api/report-cards/students', {
        params: { class_name: className },
      });
      if (Array.isArray(response.data)) return { students: response.data };
      if (response.data?.students) return response.data;
      return { students: [] };
    } catch (error) {
      console.error('Error fetching students via report-cards:', error);
      try {
        const response = await apiClient.get(
          `/api/attendance/students/class/${encodeURIComponent(className)}`
        );
        return response.data;
      } catch (fallbackError) {
        console.error('Fallback student fetch also failed:', fallbackError);
        return { students: [] };
      }
    }
  },

  // ─── ACADEMIC CONTEXT ───────────────────────────────────
  getCurrentAcademicContext: async () => {
    try {
      const response = await apiClient.get('/api/academic-years/current');
      return response.data;
    } catch {
      return null;
    }
  },

  getTerms: async (): Promise<{ value: string; label: string }[]> => {
    try {
      const response = await apiClient.get('/api/academic-years/calendar/all');
      const calendar = response.data?.calendar || [];
      const uniqueTerms = Array.from(new Set(calendar.map((row: any) => row.term))) as string[];
      if (uniqueTerms.length === 0) throw new Error('empty calendar');
      return uniqueTerms.map((t) => ({ value: t, label: t }));
    } catch {
      return [
        { value: 'First Term', label: 'First Term' },
        { value: 'Second Term', label: 'Second Term' },
        { value: 'Third Term', label: 'Third Term' },
      ];
    }
  },

  getAcademicYears: async (): Promise<string[]> => {
    try {
      const response = await apiClient.get('/api/academic-years/calendar/all');
      const calendar = response.data?.calendar || [];
      const uniqueYears = Array.from(new Set(calendar.map((row: any) => row.academic_year))) as string[];
      if (uniqueYears.length === 0) throw new Error('empty calendar');
      return uniqueYears;
    } catch {
      return ['2024-2025', '2025-2026', '2026-2027'];
    }
  },

  // ─── DASHBOARD ──────────────────────────────────────────
  getDashboardStats: async (dateFrom?: string, dateTo?: string) => {
    try {
      const response = await apiClient.get(`${ATT}/dashboard`, { params: { dateFrom, dateTo } });
      return response.data;
    } catch (error) { handleApiError(error); }
  },

  // ─── STUDENT ATTENDANCE ─────────────────────────────────
  markStudentAttendance: async (data: StudentAttendanceFormData) => {
    try {
      const response = await apiClient.post(`${ATT}/students`, data);
      return response.data;
    } catch (error) { handleApiError(error); }
  },

  getStudentAttendances: async (filters: AttendanceFilters) => {
    try {
      const response = await apiClient.get(`${ATT}/students`, { params: filters });
      return response.data;
    } catch (error) { handleApiError(error); }
  },

  markClassAttendance: async (data: {
    className: string;
    attendanceDate: string;
    records: Array<{ studentId: number; status: 'Present' | 'Absent' | 'Excused' | 'Late'; reason?: string }>;
  }) => {
    try {
      const response = await apiClient.post(`${ATT}/students/class/mark`, data);
      return response.data;
    } catch (error) { handleApiError(error); }
  },

  deleteStudentAttendance: async (id: string) => {
    try {
      const response = await apiClient.delete(`${ATT}/students/${id}`);
      return response.data;
    } catch (error) { handleApiError(error); }
  },

  lockStudentAttendance: async (data: LockAttendanceData) => {
    try {
      const response = await apiClient.post(`${ATT}/students/lock`, data);
      return response.data;
    } catch (error) { handleApiError(error); }
  },

  unlockStudentAttendance: async (data: LockAttendanceData) => {
    try {
      const response = await apiClient.post(`${ATT}/students/unlock`, data);
      return response.data;
    } catch (error) { handleApiError(error); }
  },

  // ─── TEACHER-SCOPED STUDENT ATTENDANCE ──────────────────
  getTeacherStudentsByClass: async (className: string) => {
    try {
      const response = await apiClient.get(
        `${ATT}/teacher/students/class/${encodeURIComponent(className)}`
      );
      return response.data;
    } catch (error) { handleApiError(error); }
  },

  markTeacherClassAttendance: async (data: {
    className: string;
    attendanceDate: string;
    records: Array<{ studentId: number; status: 'Present' | 'Absent' | 'Excused' | 'Late'; reason?: string }>;
  }) => {
    try {
      const response = await apiClient.post(`${ATT}/teacher/students/class/mark`, data);
      return response.data;
    } catch (error) { handleApiError(error); }
  },

  getTeacherStudentAttendances: async (filters: AttendanceFilters) => {
    try {
      const response = await apiClient.get(`${ATT}/teacher/students`, { params: filters });
      return response.data;
    } catch (error) { handleApiError(error); }
  },

  // ─── TEACHER ATTENDANCE (ADMIN) ─────────────────────────
  getAllTeachersForAttendance: async () => {
    try {
      const response = await apiClient.get(`${ATT}/teachers/list`);
      return response.data;
    } catch (error) { handleApiError(error); }
  },

  getTeachersForDate: async (date: string) => {
    try {
      const response = await apiClient.get(`${ATT}/teachers/schedule`, { params: { date } });
      return response.data;
    } catch (error) { handleApiError(error); }
  },

  markTeacherAttendance: async (data: TeacherAttendanceFormData) => {
    try {
      const response = await apiClient.post(`${ATT}/teachers`, data);
      return response.data;
    } catch (error) { handleApiError(error); }
  },

  markTeachersAttendance: async (data: {
    attendanceDate: string;
    records: Array<{ teacherId: number; status: 'Present' | 'Absent' | 'Excused' | 'Late'; reason?: string }>;
  }) => {
    try {
      const response = await apiClient.post(`${ATT}/teachers/bulk`, data);
      return response.data;
    } catch (error) { handleApiError(error); }
  },

  getTeacherAttendances: async (filters: AttendanceFilters) => {
    try {
      const response = await apiClient.get(`${ATT}/teachers`, { params: filters });
      return response.data;
    } catch (error) { handleApiError(error); }
  },

  deleteTeacherAttendance: async (id: string) => {
    try {
      const response = await apiClient.delete(`${ATT}/teachers/${id}`);
      return response.data;
    } catch (error) { handleApiError(error); }
  },

  lockTeacherAttendance: async (data: { attendanceDate: string }) => {
    try {
      const response = await apiClient.post(`${ATT}/teachers/lock`, data);
      return response.data;
    } catch (error) { handleApiError(error); }
  },

  unlockTeacherAttendance: async (data: { attendanceDate: string }) => {
    try {
      const response = await apiClient.post(`${ATT}/teachers/unlock`, data);
      return response.data;
    } catch (error) { handleApiError(error); }
  },

  // ─── EXPECTED DAYS ──────────────────────────────────────
  setExpectedDay: async (data: {
    teacherId: number;
    dayOfWeek: string;
    isFullDayExpected: boolean;
    expectedHalfDayType?: 'Morning' | 'Afternoon';
  }) => {
    try {
      const response = await apiClient.post(`${ATT}/expected-days`, data);
      return response.data;
    } catch (error) { handleApiError(error); }
  },

  setBulkExpectedDays: async (data: BulkExpectedDaysData) => {
    try {
      const response = await apiClient.post(`${ATT}/expected-days/bulk`, data);
      return response.data;
    } catch (error) { handleApiError(error); }
  },

  getExpectedDaysByTeacher: async (teacherId: string) => {
    try {
      const response = await apiClient.get(`${ATT}/expected-days/teacher/${teacherId}`);
      return response.data;
    } catch (error) { handleApiError(error); }
  },

  getAllTeachersWithExpectedDays: async () => {
    try {
      const response = await apiClient.get(`${ATT}/expected-days/all`);
      return response.data;
    } catch (error) { handleApiError(error); }
  },

  getExpectedDaysSummary: async () => {
    try {
      const response = await apiClient.get(`${ATT}/expected-days/summary`);
      return response.data;
    } catch (error) { handleApiError(error); }
  },

  deleteExpectedDay: async (id: string) => {
    try {
      const response = await apiClient.delete(`${ATT}/expected-days/${id}`);
      return response.data;
    } catch (error) { handleApiError(error); }
  },

  setTeacherExpectedDay: async (data: {
    teacherId: number;
    dayOfWeek: string;
    isFullDayExpected: boolean;
    expectedHalfDayType?: 'Morning' | 'Afternoon';
  }) => {
    try {
      const response = await apiClient.post(`${ATT}/teacher/my-expected-days`, data);
      return response.data;
    } catch (error) { handleApiError(error); }
  },

  setTeacherBulkExpectedDays: async (data: BulkExpectedDaysData) => {
    try {
      const response = await apiClient.post(`${ATT}/teacher/my-expected-days/bulk`, data);
      return response.data;
    } catch (error) { handleApiError(error); }
  },

  getTeacherExpectedDays: async (teacherId: string) => {
    try {
      const response = await apiClient.get(`${ATT}/teacher/my-expected-days/${teacherId}`);
      return response.data;
    } catch (error) { handleApiError(error); }
  },

  // ─── REPORTS ────────────────────────────────────────────
  getMonthlyStudentSummary: async (month: number, year: number) => {
    try {
      const response = await apiClient.get(`${ATT}/students/summary`, { params: { month, year } });
      return response.data;
    } catch (error) { handleApiError(error); }
  },

  getMonthlyTeacherSummary: async (month: number, year: number) => {
    try {
      const response = await apiClient.get(`${ATT}/teachers/summary`, { params: { month, year } });
      return response.data;
    } catch (error) { handleApiError(error); }
  },

  getStudentAbsenceReport: async () => {
    try {
      const response = await apiClient.get(`${ATT}/reports/students-absent`);
      return response.data;
    } catch (error) { handleApiError(error); }
  },

  getTeacherAbsenceReport: async () => {
    try {
      const response = await apiClient.get(`${ATT}/reports/teachers-absent`);
      return response.data;
    } catch (error) { handleApiError(error); }
  },

  getDetailedTeacherAbsenceSummary: async () => {
    try {
      const response = await apiClient.get(`${ATT}/reports/teachers-summary`);
      return response.data;
    } catch (error) { handleApiError(error); }
  },

  exportReportPdf: async (params: {
    reportType: 'class' | 'student' | 'teacher';
    className?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    try {
      const response = await apiClient.get(`${ATT}/reports/export/pdf`, {
        params,
        responseType: 'blob',
      });
      return response.data;
    } catch (error) { handleApiError(error); }
  },

  getTeacherClassReports: async () => {
    try {
      const response = await apiClient.get(`${ATT}/teacher/reports/my-classes`);
      return response.data;
    } catch (error) { handleApiError(error); }
  },

  // ─── ARCHIVE ────────────────────────────────────────────
  archiveAttendanceRecords: async (academic_year: string) => {
    try {
      const response = await apiClient.post(`${ATT}/archive-year/${academic_year}`);
      return response.data;
    } catch (error) { handleApiError(error); }
  },

  getArchiveLogs: async () => {
    try {
      const response = await apiClient.get(`${ATT}/archive/logs`);
      return response.data;
    } catch (error) { handleApiError(error); }
  },

  restoreArchiveBatch: async (archive_batch_id: string) => {
    try {
      const response = await apiClient.post(`${ATT}/archive/restore/${archive_batch_id}`);
      return response.data;
    } catch (error) { handleApiError(error); }
  },

  purgeArchiveBatch: async (archive_batch_id: string) => {
    try {
      const response = await apiClient.delete(`${ATT}/archive/${archive_batch_id}`);
      return response.data;
    } catch (error) { handleApiError(error); }
  },

  purgeArchivesOlderThan: async (olderThan: string) => {
    try {
      const response = await apiClient.post(`${ATT}/archive/purge/older-than`, { olderThan });
      return response.data;
    } catch (error) { handleApiError(error); }
  },

  getCurrentAcademicYearStats: async () => {
    try {
      const response = await apiClient.get(`${ATT}/current-stats`);
      return response.data;
    } catch (error) { handleApiError(error); }
  },

  getAttendanceStatsByAcademicYear: async (academic_year: string) => {
    try {
      const response = await apiClient.get(`${ATT}/stats/${academic_year}`);
      return response.data;
    } catch (error) { handleApiError(error); }
  },
};