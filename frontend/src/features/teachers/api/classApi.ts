// src/features/teachers/api/classApi.ts
import apiClient from '../../../api/AuthService';
import type { Class } from '../types/teacherTypes';

export const getClasses = async (): Promise<Class[]> => {
  const response = await apiClient.get('/api/classes');
  if (!Array.isArray(response.data)) return [];

  return response.data.map((cls: any) => ({
    id: cls.id,
    name: cls.name || cls.class_name,
    class_name: cls.class_name || cls.name,
    progression_order: cls.progression_order,
    stream: cls.stream,
  }));
};

export const getClassesWithSubjectCounts = async (): Promise<Class[]> => {
  try {
    const response = await apiClient.get('/api/subject-classes/classes-with-subjects');
    if (Array.isArray(response.data?.classes)) {
      return response.data.classes.map((cls: any) => ({
        id: cls.id,
        name: cls.class_name,
        class_name: cls.class_name,
        subject_count: parseInt(cls.subject_count) || 0,
      }));
    }
    // Fallback
    return (await getClasses()).map((cls) => ({ ...cls, subject_count: 0 }));
  } catch {
    return (await getClasses()).map((cls) => ({ ...cls, subject_count: 0 }));
  }
};