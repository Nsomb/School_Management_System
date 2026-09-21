// src/features/teachers/api/assignmentApi.ts
import apiClient from '../../../api/AuthService';
import type { TeacherAssignment, AssignmentFormData } from '../types/teacherTypes';

const API_URL = '/api/teacher-assignments';

export const createAssignment = async (
  data: AssignmentFormData & { teacher_id: number }
): Promise<TeacherAssignment> => {
  const response = await apiClient.post(API_URL, data);
  return response.data;
};

export const getTeacherAssignments = async (
  teacherId: number
): Promise<TeacherAssignment[]> => {
  const response = await apiClient.get(`${API_URL}/${teacherId}`);
  // Backend returns a plain array
  return Array.isArray(response.data) ? response.data : [];
};

export const deleteAssignment = async (assignmentId: number): Promise<void> => {
  await apiClient.delete(`${API_URL}/${assignmentId}`);
};

export const getClassAssignments = async (
  className: string
): Promise<TeacherAssignment[]> => {
  const response = await apiClient.get(`${API_URL}/class/${encodeURIComponent(className)}`);
  return Array.isArray(response.data) ? response.data : [];
};