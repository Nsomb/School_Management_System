// src/features/question/hooks/useQuestions.ts

import { useState, useCallback } from 'react';
import { uploadQuestion, fetchMyQuestions, deleteQuestion } from '../api/questionApi';
import type { QuestionUploadData } from '../types/question';

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
      setError(err instanceof Error ? err.message : 'Failed to upload question');
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
      setError(err instanceof Error ? err.message : 'Failed to fetch questions');
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
      setError(err instanceof Error ? err.message : 'Failed to delete question');
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