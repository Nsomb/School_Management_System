export interface Teacher {
  id: number;
  username: string;
  full_name: string;
  phone_number?: string;
  email?: string;
  assignments: TeacherAssignment[];
  created_at?: string;
  encrypted_password?: string;
}

export interface Subject {
  id: number;
  name: string;
  coefficient: number;
  faculty_id?: number;
  specialty_id?: number;
}

export interface TeacherAssignment {
  id: number;
  teacher_id: number;
  subject_id: number;
  subject_name: string;
  class_id: number;
  class_name: string;
}

export interface AssignmentFormData {
  subject_id: number;
  class_id: number;
}

export interface Class {
  id: number;
  name: string;
  class_name: string;
   subject_count?: number;
}

export interface TeacherFormValues {
  username: string;
  full_name: string;
  phone_number?: string;
  password?: string;
  class_id?: number; // CHANGED: Backend expects class_id, not class_name
  subject_ids?: number[];
}

export interface CreateTeacherResponse {
  message: string;
  teacher: Teacher;
  plainPassword: string;
}

export interface PasswordResponse {
  password: string;
}