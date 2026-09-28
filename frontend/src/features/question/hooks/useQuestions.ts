// src/features/question/hooks/useQuestions.ts

import { useState, useCallback } from 'react';
import { uploadQuestion, fetchMyQuestions, deleteQuestion } from '../api/questionApi';
import type { QuestionUploadData } from '../types/question';

// ─── Extract a friendly error message from any error object ───
const extractErrorMessage = (err: any): string => {
  // 1. Server returned a body with { error: "..." } or { message: "..." }
  if (err?.response?.data?.error) return err.response.data.error;
  if (err?.response?.data?.message) return err.response.data.message;

  // 2. Well-known HTTP status codes
  const status = err?.response?.status;
  if (status === 400) return 'Invalid request. Please check your input and try again.';
  if (status === 401) return 'Your session has expired. Please log in again.';
  if (status === 403) return 'You are not allowed to perform this action. Please make sure you are assigned to this subject.';
  if (status === 404) return 'The resource was not found.';
  if (status === 413) return 'The file is too large. Maximum size is 10MB.';
  if (status === 500) return 'Server error. Please try again in a moment.';

  // 3. Network error (no response received)
  if (err?.request && !err?.response) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return 'You appear to be offline. Please check your internet connection.';
    }
    return 'Unable to reach the server. Please check your connection and try again.';
  }

  // 4. Fallback
  if (err instanceof Error && err.message && err.message !== 'Network Error') {
    return err.message;
  }
  return 'Something went wrong. Please try again.';
};

export const useQuestions = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  const uploadQuestionHandler = useCallback(async (data: QuestionUploadData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await uploadQuestion(data);
      setSuccess('Question uploaded successfully!');
      return true;
    } catch (err) {
      setError(extractErrorMessage(err));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchMyQuestionsHandler = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchMyQuestions();
      return data || [];
    } catch (err) {
      setError(extractErrorMessage(err));
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteQuestionHandler = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await deleteQuestion(id);
      setSuccess('Question deleted successfully!');
      return true;
    } catch (err) {
      setError(extractErrorMessage(err));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    success,
    clearMessages,
    uploadQuestion: uploadQuestionHandler,
    fetchMyQuestions: fetchMyQuestionsHandler,
    deleteQuestion: deleteQuestionHandler,
  };
};