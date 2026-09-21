// src/features/subjects/types/subjectTypes.ts

export interface Faculty {
  id: number;
  name: string;
}

export interface Specialty {
  id: number;
  name: string;
  faculty_id: number;
  faculty_name?: string;
}

export interface Subject {
  id: string | number;
  name: string;
  coefficient: number;
  faculty_id?: number | null;
  faculty_ids?: number[];
  specialty_id?: number | null;
  specialty_ids?: number[];
  specialty_names?: string[];
  classes?: string[];
  for_all?: boolean;
  faculty_name?: string;
  specialty_name?: string;
  faculties?: { id: number; name: string }[];
  faculty?: Faculty;
  specialty?: Specialty;
}

export interface SubjectCreateData {
  name: string;
  coefficient: number;
  faculty_ids: number[];
  specialty_ids: number[];
  classes: string[];
}

export interface SubjectFormData {
  name: string;
  coefficient: number;
  faculty_ids: string[];
  specialty_ids: string[];
  classes: string[];
}

export interface SubjectFormProps {
  faculties: Faculty[];
  onSubmit: (data: SubjectCreateData) => Promise<any>;
  onCancel?: () => void;
  initialData?: Subject | null;
  isEditing?: boolean;
}

export interface UseSubjectsReturn {
  subjects: Subject[];
  faculties: Faculty[];
  specialties: Specialty[];
  loading: boolean;
  error: string | null;
  createSubject: (data: SubjectCreateData) => Promise<Subject>;
  updateSubject: (id: string, data: SubjectCreateData) => Promise<Subject>;
  removeSubject: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
  fetchSpecialties: (facultyId: string) => Promise<void>;
}

export interface ApiResponse<T> {
  data?: T;
  specialties?: T[];
  error?: string;
  message?: string;
}