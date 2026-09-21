import { useState, useCallback } from 'react';
import axios from 'axios';
import type {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError
} from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

// Get token from your existing auth system
const getAuthToken = () => {
  return localStorage.getItem('accessToken') || localStorage.getItem('token');
};

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const api: AxiosInstance = axios.create({
    baseURL: API_BASE,
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });

  // Add auth token to requests
  api.interceptors.request.use(
    (config) => {
      const token = getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Add response interceptor
  api.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError) => {
      if (error.response?.status === 401) {
        throw new Error('Authentication failed. Please login again.');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout - please try again');
      }
      throw error;
    }
  );

  const request = useCallback(
    async <T>(config: AxiosRequestConfig): Promise<T> => {
      setLoading(true);
      setError(null);
      try {
        const response: AxiosResponse<T> = await api(config);
        return response.data;
      } catch (err) {
        const axiosError = err as AxiosError<{ error?: string; message?: string }>;
        let errorMessage = 'An unexpected error occurred';
        
        if (axiosError.response) {
          errorMessage = axiosError.response.data?.error || 
                        axiosError.response.data?.message || 
                        `Server error: ${axiosError.response.status}`;
        } else if (axiosError.request) {
          errorMessage = 'Network error - please check your connection';
        } else {
          errorMessage = axiosError.message || 'Request configuration error';
        }
        
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [api]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    get: <T>(url: string, config?: AxiosRequestConfig) => request<T>({ ...config, method: 'get', url }),
    post: <T>(url: string, data?: any, config?: AxiosRequestConfig) =>
      request<T>({ ...config, method: 'post', url, data }),
    put: <T>(url: string, data?: any, config?: AxiosRequestConfig) =>
      request<T>({ ...config, method: 'put', url, data }),
    delete: <T>(url: string, config?: AxiosRequestConfig) =>
      request<T>({ ...config, method: 'delete', url }),
    loading,
    error,
    clearError,
  };
};