// src/features/question/pages/TeacherQuestionPage.tsx

import React, { useState, useEffect } from 'react';
import { QuestionUploadForm } from '../components/QuestionUploadForm';
import { QuestionList } from '../components/QuestionList';
import { fetchQuestionFilterOptions } from '../api/questionApi';
import type { QuestionFilterOptions } from '../types/question';

export const TeacherQuestionPage = () => {
  const [filterOptions, setFilterOptions] = useState<QuestionFilterOptions>({
    classes: [],
    evaluations: [],
    subjects: [],
  });
  const [refreshTrigger, setRefreshTrigger] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    try {
      const options = await fetchQuestionFilterOptions();
      setFilterOptions({
        classes: Array.isArray(options.classes) ? options.classes : [],
        evaluations: Array.isArray(options.evaluations) ? options.evaluations : [],
        subjects: Array.isArray(options.subjects) ? options.subjects : [],
      });
    } catch (error) {
      console.error('Error loading filter options:', error);
      setError('Failed to load filter options');
      setFilterOptions({
        classes: [],
        evaluations: [],
        subjects: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = () => {
    setRefreshTrigger(!refreshTrigger);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-600">
        <p>{error}</p>
        <button 
          onClick={loadFilterOptions}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📄 Question Papers</h1>
        <p className="text-gray-500 text-sm mt-1">Upload and manage your question papers</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <QuestionUploadForm
            subjects={filterOptions.subjects}
            onSuccess={handleUploadSuccess}
          />
        </div>
        <div className="lg:col-span-2">
          <QuestionList refreshTrigger={refreshTrigger} onDeleteSuccess={handleUploadSuccess} />
        </div>
      </div>
    </div>
  );
};

export default TeacherQuestionPage;