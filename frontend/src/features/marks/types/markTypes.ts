export interface Mark {
  id?: number;
  student_name: string;
  student_id: number;
  subject_id: number;
  subject_name: string;
  class_id: number;
  teacher_id: number;
  evaluation_type: string;
  score: number;
  created_at?: string;
  updated_at?: string;
}

export interface Student {
  id: number;
  full_name: string;
  class_id: number;
  class_name?: string;
  registration_number?: string;
}

export interface Subject {
  id: number;
  name: string;
  classes: Class[];
}

export interface Class {
  id: number;
  name: string;
}

export interface MarkFormData {
  subject_id: number;
  class_id: number;
  evaluation_type: string;
  competency: string;
  marks: Array<{
    student_id: number;
    score: number;
  }>;
}

export interface ExistingMarksResponse {
  success: boolean;
  competency: string | null;
  marks: Array<{
    student_id: number;
    student_name: string;
    registration_number: string;
    score: number | null;
    mark_id: number | null;
  }>;
  total_students: number;
  existing_count: number;
}

export interface TermMarksResponse {
  success: boolean;
  marks: Array<{
    student_id: number;
    student_name: string;
    evaluation1_score: number | null;
    evaluation2_score: number | null;
  }>;
  total_students: number;
}