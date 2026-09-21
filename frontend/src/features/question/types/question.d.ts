// src/features/question/types/question.ts

export interface Question {
  id: string;
  teacher_id: string;
  subject_id: string;
  question_text: string;  // This stores the filename/path
  file_path?: string;     // Alias for question_text (for compatibility)
  submission_date: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Printed';
  notes?: string;
  subject_name?: string;
  teacher_name?: string;
}

export interface QuestionUploadData {
  subject_id: string;
  file: File | null;
}

export interface QuestionFilterOptions {
  classes: { id: string; name: string }[];
  evaluations: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
}

export interface QuestionFilters {
  subject_id?: string;
  status?: string;
}