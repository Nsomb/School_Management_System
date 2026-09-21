// src/features/question/hooks/useAdminQuestions.ts

import { useState, useEffect, useCallback } from 'react';
import { fetchAllQuestions } from '../api/questionApi';
import type { Question, QuestionFilters } from '../types/question';

export const useAdminQuestions = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (filters?: QuestionFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAllQuestions(filters);
      setQuestions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch questions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    questions,
    isLoading,
    error,
    refetch,
  };
};