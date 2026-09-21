// src/features/teachers/api/teacherApi.ts
import apiClient from '../../../api/AuthService';
import type { Teacher } from '../types/teacherTypes';

const API_URL = '/api/teachers';

export interface PasswordResponse {
  password: string;
}

export interface CreateTeacherResponse {
  message: string;
  teacher: Teacher;
  plainPassword: string;
}

export const getTeachers = async (): Promise<Teacher[]> => {
  const response = await apiClient.get(API_URL);
  if (response.data?.teachers) return response.data.teachers;
  if (Array.isArray(response.data)) return response.data;
  return response.data;
};

export const createTeacher = async (teacherData: any): Promise<CreateTeacherResponse> => {
  const formattedData = {
    username: teacherData.username,
    full_name: teacherData.full_name,
    phone_number: teacherData.phone_number || null,
    password: teacherData.password,
    class_id: teacherData.class_id,
    subject_ids: teacherData.subject_ids,
  };
  const response = await apiClient.post(API_URL, formattedData);
  return response.data;
};

export const updateTeacher = async (id: number, teacherData: Partial<Teacher>): Promise<Teacher> => {
  const response = await apiClient.put(`${API_URL}/${id}`, teacherData);
  return response.data.teacher || response.data;
};

export const deleteTeacher = async (username: string): Promise<void> => {
  await apiClient.delete(`${API_URL}/${username}`);
};

export const assignSubjects = async (
  teacherId: number,
  subjectIds: number[],
  classId: number
): Promise<void> => {
  await apiClient.post(`${API_URL}/${teacherId}/assign-subjects`, {
    subject_ids: subjectIds,
    class_id: classId,
  });
};

export const getAssignedSubjects = async (teacherId: number): Promise<any[]> => {
  const response = await apiClient.get(`${API_URL}/${teacherId}/assigned-subjects`);
  return response.data.subjects || response.data;
};

export const getTeacherPassword = async (teacherId: number): Promise<PasswordResponse> => {
  const response = await apiClient.get(`${API_URL}/${teacherId}/password`);
  return response.data;
};

export const loginTeacher = async (
  username: string,
  password: string,
  schoolId: number
): Promise<{ token: string }> => {
  const response = await apiClient.post(`${API_URL}/login`, { username, password, schoolId });
  return response.data;
};

export const getTeacherProfile = async (): Promise<Teacher> => {
  const response = await apiClient.get(`${API_URL}/profile`);
  return response.data;
};

export const updateTeacherProfile = async (updateData: Partial<Teacher>): Promise<Teacher> => {
  const response = await apiClient.put(`${API_URL}/profile`, updateData);
  return response.data.teacher || response.data;
};