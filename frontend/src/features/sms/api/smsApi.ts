// src/features/sms/api/smsApi.ts
import apiClient from '../../../api/AuthService';
import type {
  SmsRequest, SmsResponse, SmsLog, RecipientOption, SmsDelivery,
} from '../types/smsTypes';

const SMS_BASE = '/api/sms';

export const sendSms = async (data: SmsRequest): Promise<SmsResponse> => {
  const response = await apiClient.post(`${SMS_BASE}/send`, data);
  return response.data;
};

export const fetchSmsHistory = async (): Promise<SmsLog[]> => {
  const response = await apiClient.get(`${SMS_BASE}/history`);
  return Array.isArray(response.data) ? response.data : [];
};

export const fetchRecipientOptions = async (): Promise<{
  students: RecipientOption[];
  teachers: RecipientOption[];
}> => {
  const response = await apiClient.get(`${SMS_BASE}/recipients`);
  return {
    students: Array.isArray(response.data?.students) ? response.data.students : [],
    teachers: Array.isArray(response.data?.teachers) ? response.data.teachers : [],
  };
};

export const fetchDeliveries = async (smsLogId: number): Promise<SmsDelivery[]> => {
  const response = await apiClient.get(`${SMS_BASE}/deliveries/${smsLogId}`);
  return Array.isArray(response.data) ? response.data : [];
};