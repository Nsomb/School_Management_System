import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Teacher } from '../types/teacherTypes';
import { useClasses } from '../hooks/useClasses';
import { useSubjects } from '../hooks/useSubjects';

// All fields are optional so editing can be partial
interface TeacherFormValues {
  username?: string;
  full_name?: string;
  phone_number?: string;
  password?: string;
  class_id?: number;
  subject_ids?: number[];
}

interface TeacherFormProps {
  onSubmit: (data: TeacherFormValues) => Promise<void>;
  defaultValues?: Partial<TeacherFormValues>;
  loading?: boolean;
  isEditing?: boolean;
}

export const TeacherForm = ({ 
  onSubmit, 
  defaultValues = {}, 
  loading = false,
  isEditing = false 
}: TeacherFormProps) => {
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>(defaultValues.subject_ids || []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<TeacherFormValues>({
    defaultValues: {
      username: defaultValues.username || '',
      full_name: defaultValues.full_name || '',
      phone_number: defaultValues.phone_number || '',
      password: '',
      class_id: defaultValues.class_id || undefined,
    },
  });

  const selectedClassId = watch('class_id');

  const { classes, loading: classesLoading } = useClasses(true);
  const classesWithSubjects = classes.filter((cls) => (cls.subject_count || 0) > 0);

  const {
    subjects,
    loading: subjectsLoading,
    error: subjectsError,
  } = useSubjects(selectedClassId || null);

  // Reset selected subjects when class changes (only for new teacher)
  useEffect(() => {
    if (!isEditing) {
      setSelectedSubjects([]);
    }
  }, [selectedClassId, isEditing]);

  const handleSubjectChange = (subjectId: number) => {
    setSelectedSubjects(prev =>
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const onSubmitHandler = async (data: TeacherFormValues) => {
    setFormError(null);

    try {
      // Validation
      if (!isEditing) {
        // New teacher: all required
        if (!data.username?.trim()) throw new Error('Username is required');
        if (!data.full_name?.trim()) throw new Error('Full name is required');
        if (!data.password) throw new Error('Password is required');
        if (data.password && data.password.length < 5) {
          throw new Error('Password must be at least 5 characters');
        }
        if (!data.class_id) throw new Error('Please select a class');
        if (selectedSubjects.length === 0) throw new Error('Please select at least one subject');
      } else {
        // Editing: only validate password if provided
        if (data.password && data.password.length < 5) {
          throw new Error('Password must be at least 5 characters');
        }
        // If no fields changed, warn
        const hasChanges = data.username?.trim() || data.full_name?.trim() || 
                           data.phone_number?.trim() || data.password || 
                           data.class_id || selectedSubjects.length > 0;
        if (!hasChanges) {
          throw new Error('No changes to save');
        }
      }

      // Prepare submit data – include only fields that have values
      const submitData: TeacherFormValues = {};
      if (data.username?.trim()) submitData.username = data.username.trim();
      if (data.full_name?.trim()) submitData.full_name = data.full_name.trim();
      if (data.phone_number?.trim()) submitData.phone_number = data.phone_number.trim();
      if (data.password) submitData.password = data.password;
      if (data.class_id) submitData.class_id = Number(data.class_id);
      if (selectedSubjects.length > 0) submitData.subject_ids = selectedSubjects;

      await onSubmit(submitData);
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An unexpected error occurred';
      setFormError(error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmitHandler)} className="space-y-6 max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {isEditing ? 'Update Teacher' : 'Add New Teacher'}
      </h2>

      {formError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">{formError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Username {!isEditing && '*'}
          </label>
          <input
            {...register('username')}
            disabled={isEditing}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            placeholder={isEditing ? 'Username cannot be changed' : 'Enter username'}
          />
          {errors.username && <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Full Name {!isEditing && '*'}
          </label>
          <input
            {...register('full_name')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            placeholder="Enter full name"
          />
          {errors.full_name && <p className="mt-1 text-sm text-red-600">{errors.full_name.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
          <input
            {...register('phone_number')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            placeholder="Enter phone number"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Password {!isEditing ? '*' : '(leave blank to keep current)'}
          </label>
          <input
            type="password"
            {...register('password')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            placeholder={isEditing ? 'Leave blank to keep current' : 'Enter password'}
          />
          {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Class {!isEditing && '*'}
          </label>
          <select
            {...register('class_id', { valueAsNumber: true })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            disabled={classesLoading}
          >
            <option value="">Select a class...</option>
            {classesWithSubjects.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} ({cls.subject_count} subjects)
              </option>
            ))}
          </select>
          {errors.class_id && <p className="mt-1 text-sm text-red-600">{errors.class_id.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subjects {!isEditing && '*'}
          </label>
          <div className="mt-1 max-h-48 overflow-y-auto border border-gray-300 rounded-md p-3 bg-gray-50">
            {!selectedClassId ? (
              <p className="text-sm text-gray-500 text-center py-4">Please select a class first</p>
            ) : subjectsLoading ? (
              <p className="text-sm text-gray-500 text-center py-4">Loading subjects...</p>
            ) : subjectsError ? (
              <p className="text-sm text-red-500 text-center py-4">Failed to load subjects</p>
            ) : subjects.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No subjects available for this class</p>
            ) : (
              <div className="space-y-2">
                {subjects.map((subject) => (
                  <label key={subject.id} className="flex items-center space-x-3 p-2 hover:bg-white rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSubjects.includes(subject.id)}
                      onChange={() => handleSubjectChange(subject.id)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{subject.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          {selectedClassId && subjects.length > 0 && (
            <p className="mt-2 text-sm text-gray-600">
              {selectedSubjects.length} of {subjects.length} subjects selected
            </p>
          )}
          {!isEditing && selectedSubjects.length === 0 && selectedClassId && subjects.length > 0 && (
            <p className="mt-1 text-sm text-red-600">Please select at least one subject</p>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={() => {
            reset();
            setSelectedSubjects(defaultValues.subject_ids || []);
            setFormError(null);
          }}
          className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Reset
        </button>
        <button
          type="submit"
          disabled={loading || classesLoading || subjectsLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 font-medium"
        >
          {loading ? 'Processing...' : isEditing ? 'Update Teacher' : 'Add Teacher'}
        </button>
      </div>
    </form>
  );
};