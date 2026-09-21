// src/features/class/api/classApi.ts
import apiClient from '../../../api/AuthService';
import type {
  DownloadOptions,
  ClassStatistics,
  Student,
  Metadata,
} from '../types/classTypes';
import {
  getCurrentAcademicYear,
  generateAcademicYears,
  type AcademicYear,
} from '../../../utils/academicYear';

// ─────────────────────────────────────────────────────────────
// CLASS RECORDS (CRUD)
// ─────────────────────────────────────────────────────────────

export interface ClassRecord {
  id: number;
  name: string;
  class_name: string;
  progression_order: number | null;
  stream: string | null;
}

export interface ClassPayload {
  class_name: string;
  progression_order: number | null;
  stream: string | null;
}

export const fetchAllClasses = async (): Promise<ClassRecord[]> => {
  const response = await apiClient.get('/api/classes');
  if (!Array.isArray(response.data)) return [];
  return response.data.map((c: any) => ({
    id: c.id,
    name: c.name || c.class_name || '',
    class_name: c.class_name || c.name || '',
    progression_order: c.progression_order ?? null,
    stream: c.stream ?? null,
  }));
};

export const createClass = async (payload: ClassPayload): Promise<ClassRecord> => {
  const response = await apiClient.post('/api/classes', payload);
  return response.data.class;
};

export const updateClass = async (
  id: number,
  payload: ClassPayload
): Promise<ClassRecord> => {
  const response = await apiClient.put(`/api/classes/${id}`, payload);
  return response.data.class;
};

export const deleteClass = async (id: number): Promise<void> => {
  await apiClient.delete(`/api/classes/${id}`);
};

// ─────────────────────────────────────────────────────────────
// ACADEMIC YEARS
// ─────────────────────────────────────────────────────────────

export const fetchCurrentAcademicYear = async (): Promise<string> => {
  try {
    const response = await apiClient.get('/api/academic-years/current');
    return response.data.academic_year;
  } catch {
    console.warn('Failed to fetch current academic year, using client-side calculation');
    return getCurrentAcademicYear();
  }
};

export const fetchAcademicYears = async (yearsBack: number = 5): Promise<AcademicYear[]> => {
  try {
    const response = await apiClient.get('/api/academic-years', {
      params: { years_back: yearsBack },
    });
    return Array.isArray(response.data) ? response.data : generateAcademicYears(yearsBack);
  } catch {
    console.warn('Failed to fetch academic years, using client-side generation');
    return generateAcademicYears(yearsBack);
  }
};

// ─────────────────────────────────────────────────────────────
// CLASS NAMES
// ─────────────────────────────────────────────────────────────

export const fetchDistinctClassNames = async (): Promise<string[]> => {
  try {
    const response = await apiClient.get('/api/classes');
    if (Array.isArray(response.data)) {
      return response.data
        .map((item: any) =>
          typeof item === 'string' ? item : item.name || item.class_name || ''
        )
        .filter(Boolean);
    }
    return [];
  } catch (primaryError) {
    try {
      const response = await apiClient.get('/api/class-lists/distinct-class-names');
      if (response.data?.classes && Array.isArray(response.data.classes)) {
        return response.data.classes;
      }
      if (Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    } catch {
      throw new Error('Failed to fetch class names');
    }
  }
};

// ─────────────────────────────────────────────────────────────
// CLASS STATISTICS
// ─────────────────────────────────────────────────────────────

interface FetchClassStatisticsResponse {
  statistics?: ClassStatistics[];
  data?: ClassStatistics[];
  metadata?: Metadata;
}

export const fetchClassStatistics = async (
  className: string,
  term?: string,
  academicYear?: string
): Promise<FetchClassStatisticsResponse> => {
  const params: any = { class_name: className };
  if (term) params.term = term;
  if (academicYear) params.academic_year = academicYear;

  const response = await apiClient.get('/api/class-statistics', { params });
  return response.data;
};

// ─────────────────────────────────────────────────────────────
// CLASS STUDENTS
// ─────────────────────────────────────────────────────────────

export const fetchClassStudents = async (className: string): Promise<Student[]> => {
  const response = await apiClient.get('/api/students', {
    params: { class_name: className },
  });

  if (Array.isArray(response.data)) return response.data;
  if (response.data?.students) return response.data.students;
  if (response.data?.data) return response.data.data;
  return [];
};

// ─────────────────────────────────────────────────────────────
// CLASS REPORTS
// ─────────────────────────────────────────────────────────────

export interface ClassReportData {
  student_id: string;
  student_name: string;
  marks: { [subject: string]: number | string };
}

export interface ClassReportResponse {
  students: ClassReportData[];
  subjects: Array<{ id: string; name: string; coefficient: number }>;
  metadata: {
    class_name: string;
    term: string;
    academic_year: string;
    evaluation_type: string;
    total_students: number;
    total_subjects: number;
    total_marks_found: number;
    relevant_marks: number;
  };
}

export const fetchClassReport = async (
  className: string,
  evaluationType: string,
  term?: string,
  academicYear?: string
): Promise<ClassReportResponse> => {
  const params: any = { className, evaluationType };
  if (term) params.term = term;
  if (academicYear) params.academicYear = academicYear;

  const response = await apiClient.get('/api/class-reports/data', { params });
  return response.data;
};

// ─────────────────────────────────────────────────────────────
// DOWNLOADS
// ─────────────────────────────────────────────────────────────

const triggerBlobDownload = (data: BlobPart, filename: string, mimeType: string) => {
  const blob = new Blob([data], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(link);
};

export const downloadClassStatisticsPDF = async (
  className: string,
  term?: string,
  academicYear?: string
): Promise<void> => {
  const requestBody: any = { class_name: className };
  if (term) requestBody.term = term;
  if (academicYear) requestBody.academic_year = academicYear;

  const response = await apiClient.post('/api/class-statistics/download', requestBody, {
    responseType: 'blob',
  });

  let filename = `Class-Statistics-${className}`;
  if (term) filename += `-${term}`;
  if (academicYear) filename += `-${academicYear.replace('/', '-')}`;
  filename += '.pdf';

  triggerBlobDownload(response.data, filename, 'application/pdf');
};

export const downloadClassMarksheetPDF = async (
  className: string,
  evaluationType: string,
  term?: string,
  academicYear?: string
): Promise<void> => {
  const params: any = { className, evaluationType };
  if (term) params.term = term;
  if (academicYear) params.academicYear = academicYear;

  const response = await apiClient.get('/api/class-reports/pdf', {
    responseType: 'blob',
    params,
  });

  let filename = `Class-Marksheet-${className}-${evaluationType}`;
  if (term) filename += `-${term}`;
  if (academicYear) filename += `-${academicYear.replace('/', '-')}`;
  filename += '.pdf';

  triggerBlobDownload(response.data, filename, 'application/pdf');
};

const downloadBlankMarkSheet = async (className: string): Promise<void> => {
  const response = await apiClient.get('/api/class-lists/blank-mark-sheet', {
    responseType: 'blob',
    params: { class_name: className },
  });
  const filename = `ClassList_${className.replace(/\s/g, '_')}.csv`;
  triggerBlobDownload(response.data, filename, 'text/csv');
};

export const downloadClassResource = async (options: DownloadOptions): Promise<void> => {
  if (options.type === 'statistics') {
    await downloadClassStatisticsPDF(options.className, options.term, options.academicYear);
  } else if (options.type === 'marksheet') {
    await downloadClassMarksheetPDF(
      options.className,
      options.evaluationType || 'EVA1',
      options.term,
      options.academicYear
    );
  } else if (options.type === 'blank') {
    await downloadBlankMarkSheet(options.className);
  } else {
    throw new Error('Download functionality not implemented');
  }
};

export const downloadClassListPDF = async (className: string): Promise<void> => {
  const response = await apiClient.get('/api/class-lists/pdf', {
    params: { class_name: className },
    responseType: 'blob',
  });
  const filename = `ClassList_${className.replace(/\s/g, '_')}.pdf`;
  triggerBlobDownload(response.data, filename, 'application/pdf');
};

// ─────────────────────────────────────────────────────────────
// AUTH HELPERS (kept for backward compatibility)
// ─────────────────────────────────────────────────────────────

export const isClassApiAuthenticated = (): boolean => {
  const token = localStorage.getItem('authToken');
  return !!(token && typeof token === 'string' && token.length > 50);
};

export const getCurrentAuthState = () => ({
  token: localStorage.getItem('authToken'),
  role: localStorage.getItem('role'),
  user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null,
  isAuthenticated: isClassApiAuthenticated(),
});