// src/features/question/api/questionApi.ts
import apiClient from '../../../api/AuthService';
import type {
  Question,
  QuestionUploadData,
  QuestionFilterOptions,
  QuestionFilters,
} from '../types/question';

const API_BASE = '/api/questions';

// ─── UPLOAD (multipart/form-data) ────────────────────────
export const uploadQuestion = async (data: QuestionUploadData): Promise<Question> => {
  if (!data.file) throw new Error('No file provided');

  const formData = new FormData();
  formData.append('subject_id', data.subject_id);
  formData.append('questionPdf', data.file);

  // apiClient auto-detects FormData and sets the correct Content-Type with boundary
  const response = await apiClient.post(API_BASE, formData);
  return response.data;
};

// ─── FETCH MY QUESTIONS ──────────────────────────────────
export const fetchMyQuestions = async (): Promise<Question[]> => {
  const response = await apiClient.get(`${API_BASE}/my`);
  return response.data.questions || [];
};

// ─── DELETE ──────────────────────────────────────────────
export const deleteQuestion = async (id: string): Promise<void> => {
  await apiClient.delete(`${API_BASE}/${id}`);
};

// ─── FETCH ALL (admin) ───────────────────────────────────
export const fetchAllQuestions = async (filters?: QuestionFilters): Promise<Question[]> => {
  const params: any = {};
  if (filters?.subject_id) params.subject_id = filters.subject_id;
  if (filters?.status) params.status = filters.status;

  const response = await apiClient.get(API_BASE, { params });
  return response.data.questions || [];
};

// ─── UPDATE STATUS ───────────────────────────────────────
export const updateQuestionStatus = async (
  id: string,
  status: Question['status'],
  notes?: string
): Promise<Question> => {
  const response = await apiClient.put(`${API_BASE}/${id}/status`, { status, notes });
  return response.data.question;
};

// ─── DOWNLOAD (teacher — own questions) ──────────────────
export const downloadQuestionFile = async (id: string): Promise<void> => {
  const response = await apiClient.get(`${API_BASE}/download/${id}`, {
    responseType: 'blob',
  });

  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `question-${id}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// ─── DOWNLOAD (admin — any question in school) ───────────
export const downloadQuestionFileAdmin = async (id: string): Promise<void> => {
  const response = await apiClient.get(`${API_BASE}/admin/download/${id}`, {
    responseType: 'blob',
  });

  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `question-${id}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// ─── FILTER OPTIONS ──────────────────────────────────────
export const fetchQuestionFilterOptions = async (): Promise<QuestionFilterOptions> => {
  try {
    const subjectsRes = await apiClient.get('/api/subjects');
    let subjects = [];
    if (subjectsRes.data) {
      subjects = subjectsRes.data.subjects || subjectsRes.data || [];
    }

    return {
      classes: [],
      evaluations: [],
      subjects: Array.isArray(subjects) ? subjects : [],
    };
  } catch (error) {
    console.error('Error fetching filter options:', error);
    return { classes: [], evaluations: [], subjects: [] };
  }
};