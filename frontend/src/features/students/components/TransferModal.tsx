// src/features/students/components/TransferModal.tsx
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Class, Student } from '../types/student';
import { StudentService } from '../api/studentApi';

interface TransferModalProps {
  classes: Class[];
  onClose: () => void;
  onSuccess: () => void;
  onError: (error: string) => void;
}

interface FormData {
  transferType: 'single' | 'class';
  studentId: string;
  oldClass: string;
  newClass: string;
}

const TransferModal: React.FC<TransferModalProps> = ({
  classes,
  onClose,
  onSuccess,
  onError,
}) => {
  const [formData, setFormData] = useState<FormData>({
    transferType: 'single',
    studentId: '',
    oldClass: '',
    newClass: '',
  });
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (formData.oldClass && formData.transferType === 'single') {
      fetchStudentsByClass(formData.oldClass);
    } else {
      setStudents([]);
      setFormData((prev) => ({ ...prev, studentId: '' }));
    }
  }, [formData.oldClass, formData.transferType]);

  const fetchStudentsByClass = async (className: string) => {
    try {
      const data = await StudentService.getStudents(className);
      setStudents(data);
      setLocalError('');
    } catch (error: any) {
      console.error('Error fetching students:', error);
      setLocalError('Failed to load students. Please try again.');
      setStudents([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLocalError('');

    try {
      if (formData.transferType === 'single') {
        if (!formData.studentId) throw new Error('Please select a student to transfer');

        await StudentService.transferStudent(formData.studentId, {
          new_class_name: formData.newClass,
        });
      } else {
        await StudentService.transferClass({
          old_class_name: formData.oldClass,
          new_class_name: formData.newClass,
        });
      }

      onSuccess();
    } catch (error: any) {
      const msg = error.message || 'Transfer failed';
      setLocalError(msg);
      onError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setLocalError('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-blue-200">
          <h2 className="text-xl font-semibold text-blue-900">Transfer Students</h2>
          <button
            onClick={onClose}
            className="text-blue-600 hover:text-blue-800 transition duration-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {localError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {localError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-blue-900 mb-1">
              Transfer Type *
            </label>
            <select
              name="transferType"
              value={formData.transferType}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="single">Single Student</option>
              <option value="class">Entire Class</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-900 mb-1">
              Current Class *
            </label>
            <select
              name="oldClass"
              value={formData.oldClass}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Current Class</option>
              {classes.map((classItem) => (
                <option key={classItem.id} value={classItem.name}>
                  {classItem.name}
                </option>
              ))}
            </select>
          </div>

          {formData.transferType === 'single' && formData.oldClass && (
            <div>
              <label className="block text-sm font-medium text-blue-900 mb-1">
                Select Student *
              </label>
              <select
                name="studentId"
                value={formData.studentId}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Student</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name}
                  </option>
                ))}
              </select>
              {students.length === 0 && (
                <p className="text-sm text-blue-600 mt-1">No students found in this class</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-blue-900 mb-1">
              New Class *
            </label>
            <select
              name="newClass"
              value={formData.newClass}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select New Class</option>
              {classes.map((classItem) => (
                <option key={classItem.id} value={classItem.name}>
                  {classItem.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded-md transition duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-200 disabled:opacity-50"
            >
              {loading ? 'Transferring...' : 'Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransferModal;