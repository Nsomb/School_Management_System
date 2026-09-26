// src/features/question/components/QuestionUploadForm.tsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useQuestions } from '../hooks/useQuestions';
import type { QuestionUploadData } from '../types/question';

interface OptionItem {
  id: string;
  name: string;
}

interface QuestionUploadFormProps {
  subjects?: OptionItem[];
  classes?: OptionItem[];
  evaluations?: OptionItem[];
  onSuccess?: () => void;
}

export const QuestionUploadForm = ({
  subjects = [],
  classes = [],
  evaluations = [],
  onSuccess,
}: QuestionUploadFormProps) => {
  // classes and evaluations are accepted for API compatibility with parent pages
  // but not yet used in this form. Prefix with underscore to avoid "unused" warnings.
  void classes;
  void evaluations;

  const { uploadQuestion, isLoading, error, success, clearMessages } = useQuestions();
  const [formData, setFormData] = useState<QuestionUploadData>({
    subject_id: '',
    file: null,
  });

  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    if (success && onSuccess) {
      onSuccess();
    }
  }, [success, onSuccess]);

  const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    clearMessages();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      if (file.type !== 'application/pdf' && !file.name.match(/\.pdf$/i)) {
        setFileError('Only PDF files are allowed');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setFileError('File size should not exceed 10MB');
        return;
      }

      setFileError(null);
      setFormData((prev) => ({ ...prev, file }));
      clearMessages();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.file) {
      setFileError('Please select a file to upload');
      return;
    }

    if (!formData.subject_id) {
      toast.error('Please select a subject');
      return;
    }

    try {
      await uploadQuestion(formData);
      toast.success('Question uploaded successfully!');
      setFormData({ subject_id: '', file: null });
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err) {
      console.error('Upload error:', err);
    }
  };

  const safeSubjects = Array.isArray(subjects) ? subjects : [];

  return (
    <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Upload Question Paper</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md text-sm">{success}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label htmlFor="subject_id" className="block text-sm font-medium text-gray-700 mb-1">
              Subject
            </label>
            <select
              id="subject_id"
              name="subject_id"
              value={formData.subject_id}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select Subject</option>
              {safeSubjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Question File (PDF only)
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
              <div className="space-y-1 text-center">
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
                  >
                    <span>Upload a PDF file</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      onChange={handleFileChange}
                      accept=".pdf"
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PDF up to 10MB</p>
              </div>
            </div>
            {formData.file && (
              <p className="mt-2 text-sm text-gray-600">Selected file: {formData.file.name}</p>
            )}
            {fileError && <p className="mt-2 text-sm text-red-600">{fileError}</p>}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Uploading...' : 'Upload Question'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};