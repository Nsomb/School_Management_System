// src/features/students/types/student.ts
export interface Student {
  id: string | number;
  name: string;
  class_id: string | number;
  class_name: string;
  date_of_birth: string;
  sex: string;
  faculty_id: string | number | null;
  faculty_name: string | null;
  specialty_id: string | number | null;
  specialty_name: string | null;
  guidance_phone_number: string | null;
}

// Backend createStudent expects: name, class_name, date_of_birth,
// faculty_id, specialty_id, sex, guidance_phone_number
// faculty_id / specialty_id are optional — Form 1 & 2 students in a
// comprehensive school haven't chosen a stream yet.
export interface StudentCreateData {
  name: string;
  class_name: string;
  date_of_birth: string;
  sex: string;
  faculty_id: string | number | null;
  specialty_id: string | number | null;
  guidance_phone_number?: string | null;
}

export interface StudentUpdateData {
  name?: string;
  class_name?: string;
  date_of_birth?: string;
  sex?: string;
  faculty_id?: string | number | null;
  specialty_id?: string | number | null;
  guidance_phone_number?: string | null;
}

export interface Faculty {
  id: string | number;
  name: string;
}

export interface Specialty {
  id: string | number;
  name: string;
  faculty_id: string | number;
}

export interface Class {
  id: string | number;
  name: string;
  class_name?: string;
  progression_order?: number;
  stream?: string;
}