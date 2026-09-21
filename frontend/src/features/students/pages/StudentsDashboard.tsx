// src/features/students/pages/StudentsDashboard.tsx
import React, { useState, useEffect } from 'react';
import { PlusCircle, Eye, RefreshCw } from 'lucide-react';
import StudentForm from '../components/StudentForm';
import TransferModal from '../components/TransferModal';
import StudentActions from '../components/StudentActions';
import type { Faculty, Class } from '../types/student';
import { StudentService } from '../api/studentApi';

const StudentsDashboard: React.FC = () => {
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showViewStudents, setShowViewStudents] = useState(false);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchInitialData = async () => {
    setLoading(true);
    setError('');
    try {
      const [facultiesData, classesData] = await Promise.all([
        StudentService.getFaculties(),
        StudentService.getClasses(),
      ]);
      setFaculties(facultiesData || []);
      setClasses(classesData || []);
    } catch (err: any) {
      console.error('Error fetching initial data:', err);
      setError(err.message || 'Failed to load initial data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-blue-900 mb-2">Student Management</h1>
          <p className="text-blue-700">Manage students, transfers, and class assignments</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 border border-blue-200">
            <div className="flex items-center mb-4">
              <PlusCircle className="h-8 w-8 text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-blue-900">Add New Student</h2>
            </div>
            <p className="text-blue-700 mb-4">Register a new student in the system</p>
            <button
              onClick={() => setShowStudentForm(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
            >
              Add Student
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border border-blue-200">
            <div className="flex items-center mb-4">
              <RefreshCw className="h-8 w-8 text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-blue-900">Transfer Students</h2>
            </div>
            <p className="text-blue-700 mb-4">Transfer single student or entire class</p>
            <button
              onClick={() => setShowTransferModal(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
            >
              Transfer Students
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border border-blue-200">
            <div className="flex items-center mb-4">
              <Eye className="h-8 w-8 text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-blue-900">View & Manage</h2>
            </div>
            <p className="text-blue-700 mb-4">View, edit, and manage student records</p>
            <button
              onClick={() => setShowViewStudents(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
            >
              View Students
            </button>
          </div>
        </div>

        {showViewStudents && (
          <StudentActions
            faculties={faculties}
            classes={classes}
            onClose={() => setShowViewStudents(false)}
          />
        )}

        {showStudentForm && (
          <StudentForm
            faculties={faculties}
            classes={classes}
            onClose={() => setShowStudentForm(false)}
            onSuccess={() => {
              setShowStudentForm(false);
              setError('');
            }}
            onError={(errorMsg) => setError(errorMsg)}
          />
        )}

        {showTransferModal && (
          <TransferModal
            classes={classes}
            onClose={() => setShowTransferModal(false)}
            onSuccess={() => {
              setShowTransferModal(false);
              setError('');
            }}
            onError={(errorMsg) => setError(errorMsg)}
          />
        )}
      </div>
    </div>
  );
};

export default StudentsDashboard;