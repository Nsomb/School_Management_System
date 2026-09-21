// src/features/question/components/QuestionList.tsx

import { useState, useEffect } from 'react';
import { useQuestions } from '../hooks/useQuestions';
import type { Question } from '../types/question';

interface QuestionListProps {
  refreshTrigger: boolean;
  onDeleteSuccess?: () => void;
}

export const QuestionList = ({ refreshTrigger, onDeleteSuccess }: QuestionListProps) => {
  const { fetchMyQuestions, deleteQuestion, isLoading, error, success, clearMessages } = useQuestions();
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    loadQuestions();
  }, [refreshTrigger]);

  useEffect(() => {
    if (success) {
      console.log(success);
      const timer = setTimeout(() => {
        clearMessages();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, clearMessages]);

  const loadQuestions = async () => {
    try {
      const data = await fetchMyQuestions();
      console.log('Questions loaded:', data);
      setQuestions(data || []);
    } catch (err) {
      console.error('Failed to load questions:', err);
      setQuestions([]);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteQuestion(id);
      setQuestions(questions.filter(q => q.id !== id));
      if (onDeleteSuccess) onDeleteSuccess();
    } catch (err) {
      console.error('Failed to delete question:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      case 'Printed':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  /**
   * Extract filename from full path
   * Example: "uploads/questions/question-123456789.pdf" -> "question-123456789.pdf"
   */
  const getFileName = (filePath: string) => {
    if (!filePath) return 'Unknown';
    // Handle both forward and backward slashes
    const parts = filePath.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1];
  };

  if (isLoading && questions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-4 text-gray-500">Loading your questions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-4 text-red-600">{error}</div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-8 text-gray-400">
          <p className="text-lg mb-2">📄 No questions uploaded yet</p>
          <p className="text-sm">Upload your first question paper using the form on the left.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {success && (
        <div className="text-center py-2 text-green-600 bg-green-50 font-medium">
          {success}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Subject
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                File
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {questions.map((question) => {
              // Get the file path from question_text or file_path
              const filePath = question.question_text || question.file_path || '';
              const fileName = getFileName(filePath);

              return (
                <tr key={question.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {question.subject_name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {fileName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(question.status)}`}>
                      {question.status || 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {question.submission_date 
                      ? new Date(question.submission_date).toLocaleDateString() 
                      : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleDelete(question.id)}
                      disabled={isLoading}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-3 bg-gray-50 border-t text-sm text-gray-500">
        Showing {questions.length} question{questions.length > 1 ? 's' : ''}
      </div>
    </div>
  );
};