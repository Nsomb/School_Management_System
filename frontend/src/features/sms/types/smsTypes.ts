// src/features/sms/types/smsTypes.ts

export type MessageChannel = 'auto' | 'sms' | 'whatsapp';
export type DeliveryChannel = 'sms' | 'whatsapp' | 'mixed';

export interface SmsRequest {
  message: string;
  recipientType: 'parents' | 'teachers' | 'both';
  targetStudentIds?: number[];
  targetTeacherIds?: number[];
  channel?: MessageChannel;
}

export interface SmsResponse {
  message: string;
  smsLogId: number;
  whatsappCount: number;
  smsCount: number;
  failedCount: number;
  status: 'sent' | 'failed' | 'partial_success';
  channel: DeliveryChannel;
}

export interface SmsLog {
  id: number;
  message_content: string;
  recipient_type: 'parents' | 'teachers' | 'both';
  recipient_count: number;
  status: 'sent' | 'failed' | 'partial_success' | 'pending';
  channel: DeliveryChannel;
  whatsapp_count: number;
  sms_count: number;
  failed_count: number;
  created_at: string;
  sender_username?: string;
}

export interface RecipientOption {
  id: number;
  name: string;
}

export interface SmsDelivery {
  id: number;
  sms_log_id: number;
  recipient_type: 'parent' | 'teacher';
  recipient_id: number;
  phone_number: string;
  channel: 'sms' | 'whatsapp';
  status: 'sent' | 'failed';
  provider_message_id?: string;
  error_message?: string;
  created_at: string;
}