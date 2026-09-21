// src/features/reportCard/services/api.ts
import apiClient from '../../../api/AuthService';
import type {
  Student,
  ReportResponse,
  MarksOverview,
  ClassStatus,
  MarksStatus,
} from '../types/types';

// ─────────────────────────────────────────────────────────────
// REPORT CARD SERVICE
// ─────────────────────────────────────────────────────────────

export const ReportCardService = {
  async getClasses(): Promise<string[]> {
    try {
      const response = await apiClient.get('/api/report-cards/classes');
      return response.data;
    } catch (error) {
      console.error('Error fetching classes:', error);
      return [];
    }
  },

  async getStudents(className: string): Promise<Student[]> {
    try {
      const response = await apiClient.get('/api/report-cards/students', {
        params: { class_name: className },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching students:', error);
      return [];
    }
  },

  async getTerms(): Promise<string[]> {
    try {
      const response = await apiClient.get('/api/report-cards/terms');
      return response.data;
    } catch (error) {
      console.error('Error fetching terms:', error);
      return ['1', '2', '3'];
    }
  },

  async generateStudentReport(
    studentId: string,
    className: string,
    term: string
  ): Promise<ReportResponse> {
    try {
      const response = await apiClient.post('/api/report-cards/generate', {
        student_id: studentId,
        class_name: className,
        term,
      });
      return response.data;
    } catch (error: any) {
      console.error('Error generating student report:', error);
      throw new Error(error.response?.data?.error || 'Failed to generate student report');
    }
  },

  async generateClassReport(
    className: string,
    term: string
  ): Promise<ReportResponse> {
    try {
      const response = await apiClient.post('/api/report-cards/generate-class', {
        class_name: className,
        term,
      });
      return response.data;
    } catch (error: any) {
      console.error('Error generating class report:', error);
      throw new Error(error.response?.data?.error || 'Failed to generate class report');
    }
  },

  async generateFinalYearReport(
    studentId: string,
    className: string
  ): Promise<ReportResponse> {
    try {
      const response = await apiClient.post('/api/report-cards/generate-final', {
        student_id: studentId,
        class_name: className,
      });
      return response.data;
    } catch (error: any) {
      console.error('Error generating final year report:', error);
      throw new Error(error.response?.data?.error || 'Failed to generate final year report');
    }
  },

  async generateHonourRoll(
    studentId: string,
    className: string,
    term: string
  ): Promise<ReportResponse> {
    try {
      const response = await apiClient.post('/api/report-cards/generate-honour', {
        student_id: studentId,
        class_name: className,
        term,
      });
      return response.data;
    } catch (error: any) {
      console.error('Error generating honour roll certificate:', error);
      throw new Error(error.response?.data?.error || 'Failed to generate honour roll certificate');
    }
  },

  async generateBatchHonourRoll(
    className: string,
    term: string
  ): Promise<ReportResponse> {
    try {
      const response = await apiClient.post('/api/report-cards/generate-honour-batch', {
        class_name: className,
        term,
      });
      return response.data;
    } catch (error: any) {
      console.error('Error generating batch honour roll:', error);
      throw new Error(error.response?.data?.error || 'Failed to generate batch honour roll');
    }
  },

  /**
   * Download a report by its full backend path.
   * Pass the exact `downloadPath` returned by any generate* method —
   * something like "/api/report-cards/download/school_5/Form1_John.pdf"
   */
  async downloadReport(downloadPath: string): Promise<Blob> {
    try {
      // Accept either a full path (/api/report-cards/...) or a legacy
      // filename only. If it's a bare filename, assume the current school
      // folder based on the authenticated user.
      const path = downloadPath.startsWith('/')
        ? downloadPath
        : this._buildDownloadPath(downloadPath);

      const response = await apiClient.get(path, { responseType: 'blob' });
      return response.data;
    } catch (error: any) {
      console.error('Error downloading report:', error);
      throw new Error(error.response?.data?.error || 'Failed to download report');
    }
  },

  _buildDownloadPath(filename: string): string {
    const userStr = localStorage.getItem('user');
    let schoolId: number | null = null;
    try {
      const user = userStr ? JSON.parse(userStr) : null;
      schoolId = user?.schoolId ?? null;
    } catch {
      schoolId = null;
    }
    if (!schoolId) {
      throw new Error('No school context — please log in again.');
    }
    return `/api/report-cards/download/school_${schoolId}/${filename}`;
  },

  async cleanupReports(): Promise<{ message: string; deletedCount?: number }> {
    try {
      const response = await apiClient.delete('/api/report-cards/cleanup');
      return response.data;
    } catch (error: any) {
      console.error('Error cleaning up reports:', error);
      throw new Error(error.response?.data?.error || 'Failed to cleanup reports');
    }
  },

  async getAcademicYears(): Promise<string[]> {
    try {
      const response = await apiClient.get('/api/report-cards/academic-years');
      return response.data;
    } catch (error) {
      console.error('Error fetching academic years:', error);
      const currentYear = new Date().getFullYear();
      return [`${currentYear}-${currentYear + 1}`];
    }
  },

  async getStudentDetails(studentId: string): Promise<any> {
    try {
      const response = await apiClient.get(`/api/report-cards/student/${studentId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching student details:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch student details');
    }
  },
};

// ─────────────────────────────────────────────────────────────
// ADMIN INTEGRATION SERVICE
// ─────────────────────────────────────────────────────────────

export const AdminService = {
  async getMarksOverview(class_name: string, term: string): Promise<MarksOverview> {
    try {
      const response = await apiClient.get('/api/admin/marks-overview', {
        params: { class_name, term },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching marks overview:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch marks overview');
    }
  },

  async getMarksStatus(class_name: string, term: string): Promise<MarksStatus> {
    try {
      const response = await apiClient.get('/api/admin/reports/marks-status', {
        params: { class_name, term },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching marks status:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch marks status');
    }
  },

  async getClassesStatus(term: string): Promise<{ classes: ClassStatus[] }> {
    try {
      const response = await apiClient.get('/api/admin/classes-status', {
        params: { term },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching classes status:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch classes status');
    }
  },

  async getSystemStats(): Promise<{
    totalClasses: number;
    totalStudents: number;
    totalReportsGenerated: number;
    storageUsage: string;
  }> {
    try {
      const response = await apiClient.get('/api/admin/system-stats');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching system stats:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch system statistics');
    }
  },

  async forceGenerateReport(
    studentId: string,
    className: string,
    term: string
  ): Promise<ReportResponse> {
    try {
      const response = await apiClient.post('/api/admin/force-generate-report', {
        student_id: studentId,
        class_name: className,
        term,
      });
      return response.data;
    } catch (error: any) {
      console.error('Error force generating report:', error);
      throw new Error(error.response?.data?.error || 'Failed to force generate report');
    }
  },
};

// ─────────────────────────────────────────────────────────────
// TEACHER SERVICE
// ─────────────────────────────────────────────────────────────

export const TeacherService = {
  async getTeacherClasses(teacherId: string): Promise<string[]> {
    try {
      const response = await apiClient.get(`/api/teacher/${teacherId}/classes`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching teacher classes:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch teacher classes');
    }
  },

  async getClassMarks(
    teacherId: string,
    className: string,
    term: string
  ): Promise<any> {
    try {
      const response = await apiClient.get(`/api/teacher/${teacherId}/class-marks`, {
        params: { class_name: className, term },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching class marks:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch class marks');
    }
  },
};

// ─────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────

export const ApiUtils = {
  extractFilename(downloadPath: string): string {
    return downloadPath.split('/').pop() || 'report';
  },

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  generateSafeFilename(baseName: string, extension: string): string {
    return `${baseName.replace(/[^a-zA-Z0-9._-]/g, '_')}.${extension}`;
  },

  isSuccessResponse(response: any): boolean {
    return response && (response.success === true || response.downloadPath);
  },
};

export default apiClient;