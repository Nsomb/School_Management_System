// types/types.ts

// Student related types
export interface Student {
  id: string;
  name: string;
  rollNumber?: string;
  class?: string;
  specialty?: string;
  faculty?: string;
  gender?: string;
  dateOfBirth?: string;
}

export interface StudentDetails extends Student {
  specialty_name?: string;
  faculty_name?: string;
  class_name?: string;
  full_name?: string;
  date_of_birth?: string;
}

// Report Generation Types
export interface ReportResponse {
  success: boolean;
  downloadPath: string;
  message?: string;
  error?: string;
  generatedCount?: number;
  errorCount?: number;
  totalSize?: string;
  fileSize?: string;
  studentName?: string;
  termAverage?: string;
  rank?: number;
  errors?: Array<{
    studentId: string;
    studentName: string;
    error: string;
  }>;
}

export interface ReportGenerationStats {
  generatedCount: number;
  errorCount: number;
  totalSize: string;
  successRate: number;
}

export interface ReportData {
  header: {
    schoolName: string;
    term: string;
    academicYear: string;
  };
  studentInfo: {
    name: string;
    dob: string;
    class: string;
    specialty: string;
    faculty: string;
    gender: string;
  };
  subjects: Array<{
    subject_name: string;
    coefficient: number;
    eval1: number | string;
    eval2: number | string;
    average: string;
    total: string;
    remark: string;
  }>;
  summary: {
    totalCoeff: number;
    totalScore: string;
    termAverage: string;
    classAverage: string;
    rank: number;
    decision: string;
  };
}

// Marks and Evaluation Types
export interface MarksOverview {
  class: string;
  term: string;
  evaluationTypes: string[];
  students: Array<{
    studentId: string;
    studentName: string;
    hasMarks: boolean;
    marksCount: number;
    readyForReport: boolean;
    average?: number;
    rank?: number;
  }>;
  summary: {
    totalStudents: number;
    studentsWithMarks: number;
    studentsReadyForReport: number;
    completeness: string;
    reportReady: string;
    classAverage?: number;
  };
}

export interface ClassStatus {
  className: string;
  totalStudents: number;
  studentsWithMarks: number;
  completeness: string;
  status: 'Complete' | 'Partial' | 'No Marks' | 'Error';
  termAverage?: number;
  generationStatus?: 'Not Generated' | 'Partial' | 'Complete';
}

export interface MarksStatus {
  class: string;
  term: string;
  readiness: string;
  hasSomeMarks: string;
  percentage: string;
  canGenerate: boolean;
  recommended: boolean;
  details: Array<{
    student: string;
    ready: boolean;
    hasSomeMarks: boolean;
    marksCount: number;
    studentId: string;
    missingEvaluations?: string[];
  }>;
}

export interface Subject {
  id: string;
  name: string;
  coefficient: number;
  specialty_id?: string;
}

export interface Mark {
  student_id: string;
  subject_id: string;
  subject_name: string;
  coefficient: number;
  evaluation_type: string;
  score: number;
  submission_date: string;
  student_full_name?: string;
}

// Academic Calendar Types
export interface TermDates {
  start_date: string;
  end_date: string;
  term: string;
  academic_year: string;
}

export interface AcademicYear {
  year: string;
  terms: string[];
  current: boolean;
}

// System and Admin Types
export interface SystemStats {
  totalClasses: number;
  totalStudents: number;
  totalReportsGenerated: number;
  storageUsage: string;
  activeTerms: string[];
  lastCleanup: string;
}

export interface CleanupResult {
  message: string;
  deletedCount: number;
  freedSpace: string;
}

export interface GenerationError {
  studentId: string;
  studentName: string;
  error: string;
  timestamp: string;
  details?: any;
}

// Teacher Specific Types
export interface TeacherClass {
  className: string;
  subject: string;
  studentCount: number;
  marksEntered: number;
  completeness: number;
}

export interface TeacherMarksEntry {
  studentId: string;
  studentName: string;
  marks: Array<{
    evaluationType: string;
    score?: number;
    subject: string;
    subjectId: string;
  }>;
}

// UI State Types
export interface ReportGenerationState {
  isGenerating: boolean;
  isDownloading: boolean;
  progress: number;
  currentStudent?: string;
  totalStudents?: number;
  errors: GenerationError[];
  warnings: string[];
}

export interface FilterOptions {
  class: string;
  term: string;
  student?: string;
  reportType: 'single' | 'class';
  academicYear?: string;
  includeRankings: boolean;
  includeAverages: boolean;
}

// API Response Wrappers
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// File Download Types
export interface DownloadInfo {
  filename: string;
  blob: Blob;
  size: number;
  type: string;
  url: string;
}

// Evaluation Configuration Types
export interface EvaluationConfig {
  termEvaluationMapping: {
    [term: string]: string[];
  };
  normalizeEvaluationType: (type: string) => string;
  evaluationWeights: {
    [evaluationType: string]: number;
  };
}

// Export all types for convenience
export type {
  Student as StudentType,
  ReportResponse as ReportResponseType,
  MarksOverview as MarksOverviewType,
  ClassStatus as ClassStatusType,
  MarksStatus as MarksStatusType,
};