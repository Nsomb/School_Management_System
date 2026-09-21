// src/features/class/types/classTypes.ts
export interface ClassStatistics {
  subject_id: string;
  subject_name: string;
  class_average_mark: string;
  performance_percentage: string;
  is_below_10_percent: boolean;
  students_evaluated_count: number;
  total_students_in_class?: number;
}

export interface Metadata {
  class_name: string;
  term: string;
  academic_year: string;
  total_students: number;
  total_subjects: number;
  total_marks_found: number;
  relevant_marks: number;
  has_data: boolean;
}

export interface Student {
  id: string;
  name: string;
  student_name: string;
  sex: string;
  date_of_birth: string;
  class_name: string;
}

export interface ClassPerformance {
  student_id: string;
  student_name: string;
  subject_id: string;
  subject_name: string;
  evaluation_type: string;
  score: number;
  coefficient: number;
  submission_date: string;
}

export type DownloadType = 'marksheet' | 'blank' | 'statistics';

export interface DownloadOptions {
  type: DownloadType;
  className: string;
  evaluationType?: string;
  term?: string;
  academicYear?: string;
}

export type ViewType = 'statistics' | 'students' | 'performance';

// Add the response type for fetchClassStatistics
export interface FetchClassStatisticsResponse {
  message?: string;
  statistics?: ClassStatistics[];
  data?: ClassStatistics[];
  metadata?: Metadata;
}