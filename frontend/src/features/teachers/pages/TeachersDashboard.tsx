// src/features/teachers/pages/TeachersDashboard.tsx

import { useState, useEffect } from 'react';
import { useTeachers } from '../hooks/useTeachers';
import { TeacherList } from '../components/TeacherList';
import { AssignSubjectsModal } from '../components/AssignSubjectsModal';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import { TeacherForm } from '../components/TeacherForm';
import { createTeacher, updateTeacher, getTeacherPassword, type PasswordResponse } from '../api/teacherApi';
import { deleteAssignment } from '../api/assignmentApi';
import type { Teacher } from '../types/teacherTypes';
import { toast } from 'react-toastify';

export const TeachersDashboard = () => {
  const { teachers, loading, error, refetch, deleteTeacher } = useTeachers();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isAddingTeacher, setIsAddingTeacher] = useState(false);
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handle timeout cleanup for success messages
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (successMessage) {
      timeoutId = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [successMessage]);

  const handleAssignSubjects = (teacherId: number) => {
    const teacher = teachers.find(t => t.id === teacherId);
    setCurrentTeacher(teacher || null);
    setShowAssignModal(true);
  };

  const handleDeleteClick = (username: string) => {
    setTeacherToDelete(username);
    setShowDeleteModal(true);
  };

  const handleEditClick = (teacher: Teacher) => {
    setCurrentTeacher(teacher);
    setIsAddingTeacher(true);
  };

  const handleGetPassword = async (teacherId: number): Promise<string> => {
    try {
      const response: PasswordResponse = await getTeacherPassword(teacherId);
      return response.password;
    } catch (error) {
      console.error('Password retrieval error:', error);
      toast.error('Failed to retrieve password');
      throw new Error('Failed to retrieve password');
    }
  };

  const handleDeleteConfirm = async () => {
    if (teacherToDelete) {
      setIsSubmitting(true);
      try {
        await deleteTeacher(teacherToDelete);
        toast.success('Teacher deleted successfully!');
        setSuccessMessage('Teacher deleted successfully!');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete teacher.';
        toast.error(errorMessage);
        setSuccessMessage(errorMessage);
      } finally {
        setIsSubmitting(false);
        setShowDeleteModal(false);
        setTeacherToDelete(null);
        refetch();
      }
    }
  };

  const handleDeleteAssignment = async (assignmentId: number) => {
    setIsSubmitting(true);
    try {
      await deleteAssignment(assignmentId);
      toast.success('Assignment deleted successfully!');
      setSuccessMessage('Assignment deleted successfully!');
      refetch();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete assignment.';
      toast.error(errorMessage);
      setSuccessMessage(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = async (data: any) => {
    setIsSubmitting(true);
    setSuccessMessage(null);
    try {
      console.log('Form submission data:', data);
      
      // Prepare data – only send fields that exist
      const processedData: any = {};
      
      if (data.username) processedData.username = data.username;
      if (data.full_name) processedData.full_name = data.full_name;
      if (data.phone_number) processedData.phone_number = data.phone_number;
      if (data.password) processedData.password = data.password;
      if (data.class_id) processedData.class_id = Number(data.class_id);
      if (data.subject_ids && data.subject_ids.length > 0) {
        processedData.subject_ids = data.subject_ids.map((id: any) => Number(id));
      }

      // If editing and no fields changed, the form would have already thrown an error
      // But we still handle it gracefully
      if (Object.keys(processedData).length === 0) {
        throw new Error('No changes to save');
      }

      if (currentTeacher?.id) {
        // Editing existing teacher
        await updateTeacher(currentTeacher.id, processedData);
        toast.success('Teacher updated successfully!');
        setSuccessMessage('Teacher updated successfully!');
      } else {
        // Adding new teacher – ensure all required fields are present
        if (!processedData.username || !processedData.full_name || !processedData.password || !processedData.class_id) {
          throw new Error('Missing required fields for new teacher');
        }
        const response = await createTeacher(processedData);
        toast.success(`Teacher added successfully! Password: ${response.plainPassword}`);
        setSuccessMessage(`Teacher added successfully! Password: ${response.plainPassword}`);
      }
      refetch();
      setIsAddingTeacher(false);
      setCurrentTeacher(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Operation failed. Please try again.';
      toast.error(errorMessage);
      setSuccessMessage(errorMessage);
      console.error('Form submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
  
  if (error) return (
    <div className="p-4 text-red-600 bg-red-50 rounded-lg">
      Error: {error}
    </div>
  );

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">👨‍🏫 Teacher Management</h1>
        <div className="mt-3 md:mt-0">
          <button
            onClick={() => {
              setIsAddingTeacher(true);
              setCurrentTeacher(null);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            + Add New Teacher
          </button>
        </div>
      </div>
      
      {successMessage && (
        <div className={`${successMessage.includes('Error') || successMessage.includes('Failed') ? 'bg-red-100 border-red-400 text-red-700' : 'bg-green-100 border-green-400 text-green-700'} border px-4 py-3 rounded relative mb-4`} role="alert">
          <span className="block sm:inline">{successMessage}</span>
          <button 
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setSuccessMessage(null)}
          >
            <span className="text-xl">&times;</span>
          </button>
        </div>
      )}

      {isAddingTeacher ? (
        <>
          <h2 className="text-xl font-semibold mb-4">{currentTeacher ? 'Edit Teacher' : 'Add New Teacher'}</h2>
          <TeacherForm
            defaultValues={currentTeacher || {}}
            onSubmit={handleFormSubmit}
            loading={isSubmitting}
            isEditing={!!currentTeacher}  // <-- ✅ Pass the flag
          />
          <button
            onClick={() => {
              setIsAddingTeacher(false);
              setCurrentTeacher(null);
            }}
            className="mt-4 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </>
      ) : (
        <TeacherList
          teachers={teachers}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
          onAssignSubjects={handleAssignSubjects}
          onDeleteAssignment={handleDeleteAssignment}
          onGetPassword={handleGetPassword}
        />
      )}

      {showAssignModal && currentTeacher && (
        <AssignSubjectsModal
          teacherId={currentTeacher.id}
          currentAssignments={currentTeacher.assignments || []}
          onClose={() => setShowAssignModal(false)}
          onSuccess={() => {
            setSuccessMessage('Subjects assigned successfully!');
            toast.success('Subjects assigned successfully!');
            refetch();
          }}
        />
      )}

      {showDeleteModal && (
        <DeleteConfirmationModal
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteModal(false)}
          itemName="teacher"
        />
      )}
    </div>
  );
};

export default TeachersDashboard;
