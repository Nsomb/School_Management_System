// src/features/teachers/api/subjectApi.ts
import apiClient from '../../../api/AuthService';
import type { Subject as TeacherSubject, Class as TeacherClass } from '../types/teacherTypes';

interface ApiSubject {
  id?: number;
  subject_id?: number;
  name?: string;
  subject_name?: string;
  coefficient?: number;
  faculty_id?: number;
  specialty_id?: number;
}

const SUBJECT_CLASS_API = '/api/subject-classes';
const CLASSES_API = '/api/classes';

export const getSubjectsByClassId = async (classId: number): Promise<TeacherSubject[]> => {
  const response = await apiClient.get(`${SUBJECT_CLASS_API}/class/${classId}/subjects`);
  const apiSubjects: ApiSubject[] = Array.isArray(response.data?.subjects)
    ? response.data.subjects
    : [];

  return apiSubjects.map((s) => ({
    id: s.subject_id || s.id || 0,
    name: s.subject_name || s.name || 'Unknown Subject',
    coefficient: s.coefficient || 0,
    faculty_id: s.faculty_id,
    specialty_id: s.specialty_id,
  }));
};

export const getSubjectsForClass = async (className: string): Promise<TeacherSubject[]> => {
  if (!className.trim()) return [];

  const response = await apiClient.get(
    `${SUBJECT_CLASS_API}/admin/subjects-for/${encodeURIComponent(className.trim())}`
  );

  const data = response.data;
  const apiSubjects: ApiSubject[] =
    Array.isArray(data?.subjects) ? data.subjects :
    Array.isArray(data) ? data :
    Array.isArray(data?.data) ? data.data : [];

  return apiSubjects.map((s) => ({
    id: s.subject_id || s.id || 0,
    name: s.subject_name || s.name || 'Unknown Subject',
    coefficient: s.coefficient || 0,
    faculty_id: s.faculty_id,
    specialty_id: s.specialty_id,
  }));
};

export const getClasses = async (): Promise<TeacherClass[]> => {
  const response = await apiClient.get(CLASSES_API);
  const apiClasses = Array.isArray(response.data) ? response.data : [];

  return apiClasses.map((c: any) => ({
    id: c.id,
    name: c.class_name || c.name || 'Unknown Class',
    class_name: c.class_name || c.name || 'Unknown Class',
  }));
};

export const getDistinctClassNames = async (): Promise<string[]> => {
  const response = await apiClient.get(`${SUBJECT_CLASS_API}/distinct-class-names`);
  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response.data?.classNames)) return response.data.classNames;
  return [];
};

export const getClassNameById = async (classId: number): Promise<string> => {
  try {
    const classes = await getClasses();
    const found = classes.find((c) => c.id === classId);
    return found?.class_name || found?.name || '';
  } catch {
    return '';
  }
};