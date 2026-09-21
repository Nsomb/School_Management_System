// src/features/question/pages/AdminQuestionPage.tsx
import React, { useState, useEffect } from 'react';
import { useAdminQuestions } from '../hooks/useAdminQuestions';
import { updateQuestionStatus, downloadQuestionFileAdmin, fetchQuestionFilterOptions } from '../api/questionApi';
import type { Question, QuestionFilters, QuestionFilterOptions } from '../types/question';
import { toast } from 'react-toastify';

export const AdminQuestionPage = () => {
  const { questions, isLoading, error, refetch } = useAdminQuestions();
  const [filters, setFilters] = useState<QuestionFilters>({});
  const [filterOptions, setFilterOptions] = useState<QuestionFilterOptions>({
    classes: [],
    evaluations: [],
    subjects: [],
  });
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    try {
      const options = await fetchQuestionFilterOptions();
      setFilterOptions(options);
    } catch (error) {
      console.error('Error loading filter options:', error);
    } finally {
      setLoadingOptions(false);
    }
  };

  const handleStatusChange = async (question: Question, newStatus: Question['status']) => {
    const notes = window.prompt('Enter notes for this status update (optional):');
    try {
      await updateQuestionStatus(question.id, newStatus, notes || undefined);
      toast.success(`Question status updated to ${newStatus}`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleDownload = async (questionId: string) => {
    setDownloading(questionId);
    try {
      await downloadQuestionFileAdmin(questionId);
      toast.success('PDF downloaded successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to download');
    } finally {
      setDownloading(null);
    }
  };

  const applyFilters = () => {
    refetch(filters);
  };

  const clearFilters = () => {
    setFilters({});
    refetch({});
  };

  const getStatusBadge = (status: string) => {
    const colors: { [key: string]: string } = {
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Approved': 'bg-green-100 text-green-800',
      'Rejected': 'bg-red-100 text-red-800',
      'Printed': 'bg-purple-100 text-purple-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getFileName = (filePath: string) => {
    if (!filePath) return 'N/A';
    const parts = filePath.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1];
  };

  if (isLoading || loadingOptions) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Question Papers Management</h1>
        <p className="text-gray-500 text-sm mt-1">Review and manage all submitted question papers</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <select
              value={filters.subject_id || ''}
              onChange={(e) => setFilters({ ...filters, subject_id: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All Subjects</option>
              {filterOptions.subjects.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Printed">Printed</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={applyFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
            >
              Apply Filters
            </button>
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {questions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center text-gray-500">
          No questions found matching the selected filters.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">File</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teacher</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {questions.map((q) => {
                  const filePath = q.question_text || q.file_path || '';
                  const fileName = getFileName(filePath);
                  const isDownloading = downloading === q.id;
                  
                  return (
                    <tr key={q.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {q.subject_name || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {fileName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {q.teacher_name || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {q.submission_date ? new Date(q.submission_date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(q.status)}`}>
                          {q.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => handleDownload(q.id)}
                            disabled={isDownloading}
                            className={`text-blue-600 hover:text-blue-800 text-sm ${isDownloading ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {isDownloading ? 'Downloading...' : 'Download'}
                          </button>
                          <select
                            value={q.status}
                            onChange={(e) => handleStatusChange(q, e.target.value as Question['status'])}
                            className="border rounded px-2 py-1 text-sm"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                            <option value="Printed">Printed</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-gray-50 border-t text-sm text-gray-500">
            Showing {questions.length} question{questions.length > 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminQuestionPage;