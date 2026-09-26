// frontend/src/api/AuthService.ts
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export interface UserDetails {
  id: number;
  username: string;
  full_name: string;
  phone_number?: string;
  role: 'admin' | 'teacher' | 'bursar' | 'super_admin';
  schoolId: number | null;
  schoolName?: string;
}

export interface LoginResponse {
  accessToken: string;
  userDetails: UserDetails;
}

const decodeJWT = (token: string): any => {
  try {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    return JSON.parse(json);
  } catch { return null; }
};

const isTokenExpired = (token: string): boolean => {
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) return true;
  return decoded.exp < Math.floor(Date.now() / 1000);
};

const apiClient = axios.create({ baseURL: API_BASE_URL, timeout: 15000 });

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token && !isTokenExpired(token)) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }
  return config;
});

// Endpoints where a 401 means "wrong credentials", not "your session expired".
// The global auto-logout/redirect below must NOT fire for these — there is
// no session to log out of yet, the user is still on the login form.
const LOGIN_ENDPOINTS = ['/admin/login', '/api/teachers/login'];

apiClient.interceptors.response.use(
  (r) => r,
  (error) => {
    const requestUrl: string = error.config?.url || '';
    const isLoginRequest = LOGIN_ENDPOINTS.some((endpoint) => requestUrl.includes(endpoint));

    if (error.response?.status === 401 && !isLoginRequest) {
      logout();
    }
    return Promise.reject(error);
  }
);

export const login = async (
  credentials: { username: string; password: string; schoolId: number | null },
  role: 'admin' | 'teacher' | 'super_admin'
): Promise<LoginResponse> => {
  try {
    let endpoint = '/admin/login';
    if (role === 'teacher') endpoint = '/api/teachers/login';
    if (role === 'super_admin') endpoint = '/admin/login'; // same endpoint, backend differentiates

    const response = await apiClient.post(endpoint, credentials);

    let accessToken: string;
    if (typeof response.data === 'string') accessToken = response.data;
    else accessToken = response.data.accessToken || response.data.token;

    if (!accessToken) throw new Error('No token received');

    const decoded = decodeJWT(accessToken);
    if (!decoded) throw new Error('Invalid token');

    const userDetails: UserDetails = {
      id: decoded.userId || decoded.id || 0,
      username: decoded.username || credentials.username,
      full_name: decoded.full_name || decoded.name || credentials.username,
      role: decoded.role || role,
      schoolId: decoded.schoolId ?? null,
      schoolName: decoded.schoolName || undefined,
    };

    storeAuthData(accessToken, userDetails.role, userDetails);
    return { accessToken, userDetails };
  } catch (error: any) {
    clearAuthData();
    const msg = error.response?.data?.error || error.response?.data?.message || error.message || 'Login failed';
    throw new Error(msg);
  }
};

export const logout = (): void => {
  clearAuthData();
  if (typeof window !== 'undefined') window.location.href = '/select-school';
};

export const initializeAuth = () => {
  const token = localStorage.getItem('authToken');
  const role = localStorage.getItem('role') as UserDetails['role'] | null;
  const userStr = localStorage.getItem('user');

  if (token && isTokenExpired(token)) {
    clearAuthData();
    return { token: null, role: null, user: null };
  }

  let user: UserDetails | null = null;
  try { user = userStr ? JSON.parse(userStr) : null; } catch { clearAuthData(); }
  return { token, role, user };
};

export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem('authToken');
  return !!(token && !isTokenExpired(token));
};

export const getAuthToken = (): string | null => {
  const token = localStorage.getItem('authToken');
  return token && !isTokenExpired(token) ? token : null;
};

const storeAuthData = (accessToken: string, role: string, userDetails: UserDetails): void => {
  localStorage.setItem('authToken', accessToken);
  localStorage.setItem('role', role);
  localStorage.setItem('user', JSON.stringify(userDetails));
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
};

const clearAuthData = (): void => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('role');
  localStorage.removeItem('user');
  delete apiClient.defaults.headers.common['Authorization'];
};

export default apiClient;