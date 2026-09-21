// src/features/sms/hooks/useSmsApi.ts
import { useCallback, useState } from 'react';
import axios, { AxiosError } from 'axios';
import type { SmsRequest, SmsResponse, SmsLog } from '../types/smsTypes';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_TIMEOUT = 10000;

interface ApiErrorResponse {
  error?: string;
  message?: string;
}

export const useSmsApi = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ⭐ useCallback with empty deps → stable identity for the hook's lifetime
  const sendSms = useCallback(async (smsData: SmsRequest): Promise<SmsResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post<SmsResponse>(
        `${API_BASE_URL}/sms/send`,
        smsData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
          timeout: API_TIMEOUT,
        }
      );
      return response.data;
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      let errorMessage = 'Failed to send SMS';

      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.response) {
        const responseData = error.response.data;
        if (error.response.status === 400) {
          errorMessage = responseData?.error || 'Invalid request data';
        } else if (error.response.status === 401) {
          errorMessage = 'Unauthorized - Please login again';
        } else if (error.response.status === 403) {
          errorMessage = 'Forbidden - Admin access required';
        } else if (error.response.status === 404) {
          errorMessage = responseData?.message || 'No recipients found';
        } else {
          errorMessage = responseData?.error || 'Server error occurred';
        }
      } else if (error.request) {
        errorMessage = 'No response received from server. Please check your connection.';
      }

      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSmsHistory = useCallback(async (): Promise<SmsLog[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.get<SmsLog[]>(
        `${API_BASE_URL}/sms/history`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
          timeout: API_TIMEOUT,
        }
      );
      return response.data;
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      let errorMessage = 'Failed to fetch SMS history';

      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.response) {
        errorMessage = error.response.data?.error || 'Failed to fetch SMS history';
      } else if (error.request) {
        errorMessage = 'No response received from server. Please check your connection.';
      }

      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { sendSms, fetchSmsHistory, isLoading, error };
};