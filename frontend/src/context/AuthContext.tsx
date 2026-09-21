// frontend/src/context/AuthContext.tsx
import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
  login as authLogin,
  logout as authLogout,
  initializeAuth,
  isAuthenticated,
  type UserDetails,
  type LoginResponse,
} from '../api/AuthService';
import apiClient from '../api/AuthService';

export interface SchoolProfile {
  id: number;
  name: string;
  name_french?: string;
  motto?: string;
  motto_french?: string;
  ministry?: string;
  ministry_french?: string;
  region?: string;
  region_french?: string;
  division?: string;
  division_french?: string;
  logo_url?: string;
  primary_color?: string;
  phone?: string;
  email?: string;
  address?: string;
}

interface AuthContextType {
  user: UserDetails | null;
  token: string | null;
  role: UserDetails['role'] | null;
  schoolId: number | null;
  schoolProfile: SchoolProfile | null;
  isLoading: boolean;
  login: (credentials: any, role: 'admin' | 'teacher' | 'super_admin') => Promise<void>;
  logout: () => void;
  isAuthenticated: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<UserDetails['role'] | null>(null);
  const [user, setUser] = useState<UserDetails | null>(null);
  const [schoolId, setSchoolId] = useState<number | null>(null);
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const { token: t, role: r, user: u } = initializeAuth();
      if (t && r && u) {
        setToken(t); setRole(r); setUser(u);
        if (u.schoolId) {
          setSchoolId(u.schoolId);
          try {
            const res = await apiClient.get(`/api/schools/${u.schoolId}/profile`);
            setSchoolProfile(res.data);
          } catch { /* ignore */ }
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const handleLogin = async (credentials: any, loginRole: 'admin' | 'teacher' | 'super_admin') => {
    try {
      setIsLoading(true);
      const response: LoginResponse = await authLogin(credentials, loginRole);
      setToken(response.accessToken);
      setRole(response.userDetails.role);
      setUser(response.userDetails);

      if (response.userDetails.schoolId) {
        setSchoolId(response.userDetails.schoolId);
        try {
          const res = await apiClient.get(`/api/schools/${response.userDetails.schoolId}/profile`);
          setSchoolProfile(res.data);
        } catch { /* ignore */ }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    authLogout();
    setToken(null); setRole(null); setUser(null);
    setSchoolId(null); setSchoolProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user, token, role, schoolId, schoolProfile, isLoading,
        login: handleLogin, logout: handleLogout,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};