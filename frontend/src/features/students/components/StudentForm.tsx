// src/features/students/components/StudentForm.tsx
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Faculty, Specialty, Class } from '../types/student';
import { StudentService } from '../api/studentApi';

interface StudentFormProps {
  faculties: Faculty[];
  classes: Class[];
  onClose: () => void;
  onSuccess: () => void;
  onError: (error: string) => void;
}

interface FormData {
  name: string;
  class_name: string;
  date_of_birth: string;
  faculty_id: string;
  specialty_id: string;
  sex: string;
  guidance_phone_number: string;
}

const StudentForm: React.FC<StudentFormProps> = ({
  faculties,
  classes,
  onClose,
  onSuccess,
  onError,
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    class_name: '',
    date_of_birth: '',
    faculty_id: '',
    specialty_id: '',
    sex: '',
    guidance_phone_number: '',
  });
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (formData.faculty_id) {
      fetchSpecialties(formData.faculty_id);
    } else {
      setSpecialties([]);
      setFormData((prev) => ({ ...prev, specialty_id: '' }));
    }
  }, [formData.faculty_id]);

  const fetchSpecialties = async (facultyId: string) => {
    try {
      const data = await StudentService.getSpecialtiesByFaculty(facultyId);
      setSpecialties(data);
    } catch (error) {
      console.error('Error fetching specialties:', error);
      setSpecialties([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLocalError('');

    try {
      await StudentService.createStudent({
        name: formData.name,
        class_name: formData.class_name,
        date_of_birth: formData.date_of_birth,
        sex: formData.sex,
        // Faculty/Specialty are optional (e.g. Form 1 & 2 students haven't chosen yet)
        faculty_id: formData.faculty_id || null,
        specialty_id: formData.specialty_id || null,
        guidance_phone_number: formData.guidance_phone_number || null,
      });
      onSuccess();
    } catch (error: any) {
      const msg = error.message || 'Failed to create student';
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
        <div className="flex items-center justify-between p-4 border-b border-blue-200">
          <h2 className="text-lg font-semibold text-blue-900">Add New Student</h2>
          <button
            onClick={onClose}
            className="text-blue-600 hover:text-blue-800 transition duration-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {localError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm">
              {localError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-blue-900 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-1.5 border border-blue-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
              placeholder="Enter student's full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-900 mb-1">
              Date of Birth *
            </label>
            <input
              type="date"
              name="date_of_birth"
              value={formData.date_of_birth}
              onChange={handleChange}
              required
              className="w-full px-3 py-1.5 border border-blue-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-900 mb-1">
              Gender *
            </label>
            <select
              name="sex"
              value={formData.sex}
              onChange={handleChange}
              required
              className="w-full px-3 py-1.5 border border-blue-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
            >
              <option value="">Select Gender</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </div>

          {/* ── Faculty (optional) ── */}
          <div>
            <label className="block text-sm font-medium text-blue-900 mb-1">
              Faculty <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <select
              name="faculty_id"
              value={formData.faculty_id}
              onChange={handleChange}
              className="w-full px-3 py-1.5 border border-blue-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
            >
              <option value="">Not yet assigned (e.g. Form 1 & 2)</option>
              {faculties.map((faculty) => (
                <option key={faculty.id} value={faculty.id}>
                  {faculty.name}
                </option>
              ))}
            </select>
          </div>

          {/* ── Specialty (optional) ── */}
          <div>
            <label className="block text-sm font-medium text-blue-900 mb-1">
              Specialty <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <select
              name="specialty_id"
              value={formData.specialty_id}
              onChange={handleChange}
              disabled={!formData.faculty_id}
              className="w-full px-3 py-1.5 border border-blue-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm disabled:opacity-50"
            >
              <option value="">
                {formData.faculty_id ? 'Not yet assigned' : 'Select faculty first'}
              </option>
              {specialties.map((specialty) => (
                <option key={specialty.id} value={specialty.id}>
                  {specialty.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-900 mb-1">
              Class *
            </label>
            <select
              name="class_name"
              value={formData.class_name}
              onChange={handleChange}
              required
              className="w-full px-3 py-1.5 border border-blue-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
            >
              <option value="">Select Class</option>
              {classes.map((classItem) => (
                <option key={classItem.id} value={classItem.name}>
                  {classItem.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-900 mb-1">
              Guidance Phone Number
            </label>
            <input
              type="tel"
              name="guidance_phone_number"
              value={formData.guidance_phone_number}
              onChange={handleChange}
              className="w-full px-3 py-1.5 border border-blue-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
              placeholder="Optional phone number"
              maxLength={20}
            />
          </div>

          <div className="flex space-x-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-1.5 px-3 rounded-md transition duration-200 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-1.5 px-3 rounded-md transition duration-200 disabled:opacity-50 text-sm"
            >
              {loading ? 'Creating...' : 'Create Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentForm;