// frontend/src/features/academic/services/academicService.ts
import apiClient from '../../../api/AuthService';

export interface Faculty {
  id: number;
  name: string;
  specialty_count?: number;
  created_at?: string;
}

export interface Specialty {
  id: number;
  name: string;
  faculty_id: number;
  faculty_name?: string;
}

// ─── FACULTIES ──────────────────────────────────────────
export const fetchFaculties = async (): Promise<Faculty[]> => {
  const response = await apiClient.get('/api/faculties');
  return Array.isArray(response.data) ? response.data : [];
};

export const createFaculty = async (name: string): Promise<Faculty> => {
  const response = await apiClient.post('/api/faculties', { name });
  return response.data;
};

export const updateFaculty = async (id: number, name: string): Promise<Faculty> => {
  const response = await apiClient.put(`/api/faculties/${id}`, { name });
  return response.data;
};

export const deleteFaculty = async (id: number): Promise<void> => {
  await apiClient.delete(`/api/faculties/${id}`);
};

// ─── SPECIALTIES ────────────────────────────────────────
export const fetchSpecialtiesByFaculty = async (facultyId: number): Promise<Specialty[]> => {
  const response = await apiClient.get(`/api/specialties/faculty/${facultyId}`);
  const data = response.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.specialties)) return data.specialties;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

// ⚡ Fetch specialties for MULTIPLE faculties in one request
export const fetchSpecialtiesByFaculties = async (facultyIds: number[]): Promise<Specialty[]> => {
  if (!facultyIds || facultyIds.length === 0) return [];
  const idsParam = facultyIds.join(',');
  const response = await apiClient.get('/api/specialties/by-faculties', {
    params: { facultyIds: idsParam },
  });
  const data = response.data;
  if (Array.isArray(data?.specialties)) return data.specialties;
  if (Array.isArray(data)) return data;
  return [];
};

export const createSpecialty = async (name: string, facultyId: number): Promise<Specialty> => {
  const response = await apiClient.post('/api/specialties', { name, faculty_id: facultyId });
  return response.data.specialty || response.data;
};

export const updateSpecialty = async (id: number, name: string, facultyId: number): Promise<Specialty> => {
  const response = await apiClient.put(`/api/specialties/${id}`, { name, faculty_id: facultyId });
  return response.data.specialty || response.data;
};

export const deleteSpecialty = async (id: number): Promise<void> => {
  await apiClient.delete(`/api/specialties/${id}`);
};