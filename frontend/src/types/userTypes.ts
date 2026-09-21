// frontend/src/types/userTypes.ts
export interface User {
  id?: number;
  userName: string;
  userRole: 'admin' | 'teacher' | 'bursar' | 'super_admin';
  schoolId?: number | null;
  avatar?: string;
}