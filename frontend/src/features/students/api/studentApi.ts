// src/features/students/api/studentApi.ts
import apiClient from '../../../api/AuthService';
import type {
  Student,
  StudentCreateData,
  StudentUpdateData,
  Faculty,
  Specialty,
  Class,
} from '../types/student';

export const StudentService = {
  async getStudents(className?: string): Promise<Student[]> {
    const params = className ? { class_name: className } : {};
    const response = await apiClient.get('/api/students', { params });

    if (response.data?.students) return response.data.students;
    if (Array.isArray(response.data)) return response.data;
    return [];
  },

  async createStudent(studentData: StudentCreateData): Promise<Student> {
    const response = await apiClient.post('/api/students', studentData);
    return response.data.student || response.data;
  },

  async updateStudent(
    id: string | number,
    studentData: StudentUpdateData
  ): Promise<Student> {
    const response = await apiClient.put(`/api/students/${id}`, studentData);
    return response.data.student || response.data;
  },

  async deleteStudent(id: string | number): Promise<void> {
    await apiClient.delete(`/api/students/${id}`);
  },

  async transferStudent(
    studentId: string | number,
    transferData: { new_class_name: string; new_specialty_id?: string | number }
  ): Promise<Student> {
    const response = await apiClient.put(
      `/api/students/transfer/${studentId}`,
      transferData
    );
    return response.data.student || response.data;
  },

  async transferClass(transferData: {
    old_class_name: string;
    new_class_name: string;
  }): Promise<Student[]> {
    const response = await apiClient.post('/api/students/transfer-class', transferData);
    return response.data.students || response.data;
  },

  async getFaculties(): Promise<Faculty[]> {
    const response = await apiClient.get('/api/faculties');
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.data?.faculties)) return response.data.faculties;
    return [];
  },

  async getClasses(): Promise<Class[]> {
    const response = await apiClient.get('/api/classes');
    if (!Array.isArray(response.data)) return [];
    return response.data.map((c: any) => ({
      id: c.id,
      name: c.name || c.class_name || '',
      class_name: c.class_name || c.name || '',
      progression_order: c.progression_order,
      stream: c.stream,
    }));
  },

  async getSpecialtiesByFaculty(
    facultyId: string | number
  ): Promise<Specialty[]> {
    const response = await apiClient.get(`/api/specialties/faculty/${facultyId}`);
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.data?.specialties)) return response.data.specialties;
    if (Array.isArray(response.data?.data)) return response.data.data;
    return [];
  },
};