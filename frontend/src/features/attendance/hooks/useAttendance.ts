import { useState, useEffect, useCallback } from 'react';
import { attendanceApi } from '../api/attendanceApi';
import type {
  StudentAttendance,
  TeacherAttendance,
  TeacherExpectedDay,
  AttendanceFilters,
  AcademicContext,
  MonthlySummary,
  ArchiveLog,
  ArchiveOperationResult,
  DashboardStats,
  Student,
  Teacher,
  BulkExpectedDaysData,
  StudentAttendanceFormData,
} from '../types/attendanceTypes';
import { useAuth } from '../../../context/AuthContext';

export const useAttendance = () => {
  const { user, role } = useAuth();
  const isTeacher = role === 'teacher';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [academicContext, setAcademicContext] = useState<AcademicContext | null>(null);

  const [studentAttendances, setStudentAttendances] = useState<StudentAttendance[]>([]);
  const [teacherAttendances, setTeacherAttendances] = useState<TeacherAttendance[]>([]);
  const [expectedDays, setExpectedDays] = useState<TeacherExpectedDay[]>([]);
  const [studentMonthlySummary, setStudentMonthlySummary] = useState<MonthlySummary[]>([]);
  const [teacherMonthlySummary, setTeacherMonthlySummary] = useState<MonthlySummary[]>([]);
  const [archiveLogs, setArchiveLogs] = useState<ArchiveLog[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [teachersList, setTeachersList] = useState<Teacher[]>([]);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [fetchingClasses, setFetchingClasses] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchAcademicContext = async (): Promise<AcademicContext | null> => {
    setLoading(true);
    clearError();
    try {
      const context = await attendanceApi.getCurrentAcademicContext();
      setAcademicContext(context);
      return context;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch academic context');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async (): Promise<string[]> => {
    setFetchingClasses(true);
    clearError();
    try {
      const classes = await attendanceApi.getClasses();
      setAvailableClasses(classes);
      return classes;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to fetch classes';
      setError(errorMsg);
      setAvailableClasses([]);
      throw err;
    } finally {
      setFetchingClasses(false);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await fetchClasses();
        await fetchAcademicContext();
        setInitialLoadComplete(true);
      } catch (err) {
        console.error('useAttendance: Failed to load initial data:', err);
      }
    };
    loadInitialData();
  }, []);

  const fetchDashboardStats = async (dateFrom?: string, dateTo?: string) => {
    setLoading(true);
    clearError();
    try {
      const data = await attendanceApi.getDashboardStats(dateFrom, dateTo);
      if (data?.stats) setDashboardStats(data.stats);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  // ========== STUDENT METHODS ==========

  const getStudentsByClass = async (className: string): Promise<Student[]> => {
    setLoading(true);
    clearError();
    try {
      let data;
      if (isTeacher) {
        data = await attendanceApi.getTeacherStudentsByClass(className);
      } else {
        data = await attendanceApi.getStudentsByClass(className);
      }
      if (Array.isArray(data)) return data;
      if (data?.students) return data.students;
      if (data?.data) return data.data;
      return [];
    } catch (err: any) {
      setError(err.message || 'Failed to fetch students for class');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentAttendances = async (filters: AttendanceFilters) => {
    setLoading(true);
    clearError();
    try {
      let data;
      if (isTeacher) {
        data = await attendanceApi.getTeacherStudentAttendances(filters);
      } else {
        data = await attendanceApi.getStudentAttendances(filters);
      }
      const records = data?.records || data?.attendances || data?.data || [];
      setStudentAttendances(records);
      setPagination(data?.pagination || null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch student attendance records');
    } finally {
      setLoading(false);
    }
  };

  const markClassAttendance = async (data: {
    className: string;
    attendanceDate: string;
    records: Array<{
      studentId: number;
      status: 'Present' | 'Absent' | 'Excused' | 'Late';
      reason?: string;
    }>;
  }) => {
    setLoading(true);
    clearError();
    try {
      let result;
      if (isTeacher) {
        // Remove markedBy – backend injects it
        const { markedBy, ...cleanData } = data as any;
        result = await attendanceApi.markTeacherClassAttendance(cleanData);
      } else {
        // For admin, we still send markedBy (backed expects it for student attendance)
        result = await attendanceApi.markClassAttendance(data);
      }
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to mark class attendance');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const markStudentAttendance = async (data: StudentAttendanceFormData) => {
    setLoading(true);
    clearError();
    try {
      const result = await attendanceApi.markStudentAttendance(data);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to mark student attendance');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteStudentAttendance = async (id: string) => {
    if (isTeacher) {
      setError('Teachers cannot delete attendance records');
      throw new Error('Teachers cannot delete attendance records');
    }
    setLoading(true);
    clearError();
    try {
      const result = await attendanceApi.deleteStudentAttendance(id);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to delete student attendance');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ========== TEACHER METHODS - ADMIN ONLY ==========

  const fetchTeachersForAttendance = async (): Promise<Teacher[]> => {
    if (isTeacher) {
      setError('Teachers cannot access this feature');
      throw new Error('Teachers cannot access this feature');
    }
    setLoading(true);
    clearError();
    try {
      const data = await attendanceApi.getAllTeachersForAttendance();
      const teachers = data.teachers || data.data || [];
      setTeachersList(teachers);
      return teachers;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch teachers list');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const fetchTeacherAttendances = async (filters: AttendanceFilters) => {
    if (isTeacher) {
      setError('Teachers cannot access this feature');
      throw new Error('Teachers cannot access this feature');
    }
    setLoading(true);
    clearError();
    try {
      const data = await attendanceApi.getTeacherAttendances(filters);
      const records = data?.records || data?.attendances || data?.data || [];
      setTeacherAttendances(records);
      setPagination(data?.pagination || null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch teacher attendance records');
    } finally {
      setLoading(false);
    }
  };

  const deleteTeacherAttendance = async (id: string) => {
    if (isTeacher) {
      setError('Teachers cannot delete attendance records');
      throw new Error('Teachers cannot delete attendance records');
    }
    setLoading(true);
    clearError();
    try {
      const result = await attendanceApi.deleteTeacherAttendance(id);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to delete teacher attendance');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ========== EXPECTED DAYS ==========

  const fetchExpectedDays = async (teacherId?: string): Promise<TeacherExpectedDay[]> => {
    setLoading(true);
    clearError();
    try {
      let data;
      if (isTeacher && teacherId) {
        data = await attendanceApi.getTeacherExpectedDays(teacherId);
      } else if (teacherId) {
        data = await attendanceApi.getExpectedDaysByTeacher(teacherId);
      } else {
        data = await attendanceApi.getAllTeachersWithExpectedDays();
      }
      const days = data?.expectedDays || data?.teachers || data?.data || [];
      setExpectedDays(days);
      return days;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch expected days');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const fetchExpectedDaysByTeacher = async (teacherId: string): Promise<TeacherExpectedDay[]> => {
    return fetchExpectedDays(teacherId);
  };

  const fetchAllTeachersWithExpectedDays = async (): Promise<TeacherExpectedDay[]> => {
    if (isTeacher) {
      setError('Teachers cannot access all teachers expected days');
      throw new Error('Teachers cannot access all teachers expected days');
    }
    return fetchExpectedDays();
  };

  const setTeacherExpectedDay = async (data: {
    teacherId: string | number;
    dayOfWeek: string;  // now string
    isFullDayExpected: boolean;
    expectedHalfDayType?: 'Morning' | 'Afternoon';
  }) => {
    setLoading(true);
    clearError();
    try {
      const apiData = {
        ...data,
        teacherId: typeof data.teacherId === 'string' ? Number(data.teacherId) : data.teacherId,
      };
      let result;
      if (isTeacher) {
        result = await attendanceApi.setTeacherExpectedDay(apiData);
      } else {
        result = await attendanceApi.setExpectedDay(apiData);
      }
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to set expected day');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const setBulkExpectedDays = async (data: BulkExpectedDaysData) => {
    setLoading(true);
    clearError();
    try {
      let result;
      if (isTeacher) {
        result = await attendanceApi.setTeacherBulkExpectedDays(data);
      } else {
        result = await attendanceApi.setBulkExpectedDays(data);
      }
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to set bulk expected days');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteTeacherExpectedDay = async (id: string) => {
    if (isTeacher) {
      setError('Teachers cannot delete expected days');
      throw new Error('Teachers cannot delete expected days');
    }
    setLoading(true);
    clearError();
    try {
      const result = await attendanceApi.deleteExpectedDay(id);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to delete expected day');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const fetchExpectedDaysSummary = async () => {
    if (isTeacher) {
      setError('Teachers cannot access this feature');
      throw new Error('Teachers cannot access this feature');
    }
    setLoading(true);
    clearError();
    try {
      const data = await attendanceApi.getExpectedDaysSummary();
      return data.summary || data.data || [];
    } catch (err: any) {
      setError(err.message || 'Failed to fetch expected days summary');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ========== MONTHLY SUMMARY ==========

  const fetchStudentMonthlySummary = async (month: number, year: number) => {
    setLoading(true);
    clearError();
    try {
      const data = await attendanceApi.getMonthlyStudentSummary(month, year);
      setStudentMonthlySummary(data.summary || data.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch student monthly summary');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeacherMonthlySummary = async (month: number, year: number) => {
    if (isTeacher) {
      setError('Teachers cannot access teacher monthly summary');
      throw new Error('Teachers cannot access teacher monthly summary');
    }
    setLoading(true);
    clearError();
    try {
      const data = await attendanceApi.getMonthlyTeacherSummary(month, year);
      setTeacherMonthlySummary(data.summary || data.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch teacher monthly summary');
    } finally {
      setLoading(false);
    }
  };

  // ========== ARCHIVE ==========

  const fetchArchiveLogs = async () => {
    if (isTeacher) {
      setError('Teachers cannot access archive logs');
      throw new Error('Teachers cannot access archive logs');
    }
    setLoading(true);
    clearError();
    try {
      const data = await attendanceApi.getArchiveLogs();
      setArchiveLogs(data.logs || data.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch archive logs');
    } finally {
      setLoading(false);
    }
  };

  const archiveRecords = async (academic_year: string): Promise<ArchiveOperationResult> => {
    if (isTeacher) {
      setError('Teachers cannot archive records');
      throw new Error('Teachers cannot archive records');
    }
    setLoading(true);
    clearError();
    try {
      const data = await attendanceApi.archiveAttendanceRecords(academic_year);
      return data.result || data;
    } catch (err: any) {
      setError(err.message || 'Failed to archive records');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const restoreArchive = async (archive_batch_id: string): Promise<ArchiveOperationResult> => {
    if (isTeacher) {
      setError('Teachers cannot restore archives');
      throw new Error('Teachers cannot restore archives');
    }
    setLoading(true);
    clearError();
    try {
      const data = await attendanceApi.restoreArchiveBatch(archive_batch_id);
      return data.result || data;
    } catch (err: any) {
      setError(err.message || 'Failed to restore archive');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const purgeArchive = async (archive_batch_id: string): Promise<ArchiveOperationResult> => {
    if (isTeacher) {
      setError('Teachers cannot purge archives');
      throw new Error('Teachers cannot purge archives');
    }
    setLoading(true);
    clearError();
    try {
      const data = await attendanceApi.purgeArchiveBatch(archive_batch_id);
      return data.result || data;
    } catch (err: any) {
      setError(err.message || 'Failed to purge archive');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const purgeArchivesOlderThan = async (olderThan: string): Promise<ArchiveOperationResult> => {
    if (isTeacher) {
      setError('Teachers cannot purge archives');
      throw new Error('Teachers cannot purge archives');
    }
    setLoading(true);
    clearError();
    try {
      const data = await attendanceApi.purgeArchivesOlderThan(olderThan);
      return data.result || data;
    } catch (err: any) {
      setError(err.message || 'Failed to purge old archives');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    academicContext,
    studentAttendances,
    teacherAttendances,
    expectedDays,
    studentMonthlySummary,
    teacherMonthlySummary,
    archiveLogs,
    dashboardStats,
    teachersList,
    availableClasses,
    fetchingClasses,
    pagination,
    initialLoadComplete,
    isTeacher,

    fetchClasses,
    getStudentsByClass,
    fetchStudentAttendances,
    markClassAttendance,
    markStudentAttendance,
    deleteStudentAttendance,

    fetchTeachersForAttendance,
    fetchTeacherAttendances,
    deleteTeacherAttendance,

    fetchExpectedDays,
    fetchExpectedDaysByTeacher,
    fetchAllTeachersWithExpectedDays,
    setTeacherExpectedDay,
    setBulkExpectedDays,
    deleteTeacherExpectedDay,
    fetchExpectedDaysSummary,

    fetchStudentMonthlySummary,
    fetchTeacherMonthlySummary,

    fetchArchiveLogs,
    archiveRecords,
    restoreArchive,
    purgeArchive,
    purgeArchivesOlderThan,

    fetchDashboardStats,
    clearError,
    fetchAcademicContext,

    getStudentAbsenceReport: attendanceApi.getStudentAbsenceReport,
    getTeacherAbsenceReport: attendanceApi.getTeacherAbsenceReport,
    getDetailedTeacherAbsenceSummary: attendanceApi.getDetailedTeacherAbsenceSummary,
    getCurrentAcademicYearStats: attendanceApi.getCurrentAcademicYearStats,
    getAttendanceStatsByAcademicYear: attendanceApi.getAttendanceStatsByAcademicYear,
    getTeacherClassReports: attendanceApi.getTeacherClassReports,
  };
};

export default useAttendance;