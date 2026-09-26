// src/features/students/components/StudentActions.tsx
import React, { useState, useEffect } from 'react';
import { Edit3, Trash2, Save, X, Phone } from 'lucide-react';
import type { Student, Faculty, Class } from '../types/student';
import { StudentService } from '../api/studentApi';

interface StudentActionsProps {
  faculties: Faculty[];
  classes: Class[];
  onClose: () => void;
}

const StudentActions: React.FC<StudentActionsProps> = ({ faculties, classes, onClose }) => {
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [editingStudent, setEditingStudent] = useState<string | number | null>(null);
  const [editedData, setEditedData] = useState<Partial<Student>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (selectedClass) {
      fetchStudentsByClass(selectedClass);
    } else {
      setStudents([]);
    }
  }, [selectedClass]);

  const fetchStudentsByClass = async (className: string) => {
    try {
      const data = await StudentService.getStudents(className);
      setStudents(data);
      setError('');
    } catch (error: any) {
      console.error('Error fetching students:', error);
      setError(error.message || 'Failed to load students. Please try again.');
      setStudents([]);
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student.id);
    setEditedData({
      name: student.name,
      date_of_birth: student.date_of_birth,
      sex: student.sex,
      faculty_id: student.faculty_id,
      class_name: student.class_name,
      guidance_phone_number: student.guidance_phone_number || '',
    });
  };

  const handleSave = async (studentId: string | number) => {
    setLoading(true);
    setError('');

    try {
      await StudentService.updateStudent(studentId, editedData);
      setEditingStudent(null);
      setEditedData({});
      fetchStudentsByClass(selectedClass);
    } catch (error: any) {
      setError(error.message || 'Failed to update student');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (studentId: string | number, studentName: string) => {
    if (!confirm(`Are you sure you want to delete ${studentName}? This action cannot be undone.`)) {
      return;
    }

    try {
      await StudentService.deleteStudent(studentId);
      fetchStudentsByClass(selectedClass);
    } catch (error: any) {
      setError(error.message || 'Failed to delete student');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditedData((prev) => ({ ...prev, [name]: value }));
  };

  const formatPhoneNumber = (phone: string | null) => {
    if (!phone) return 'Not provided';

    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-blue-200 max-h-[90vh] md:max-h-none flex flex-col">
      <div className="flex items-center justify-between mb-4 sm:mb-6 shrink-0">
        <h2 className="text-lg sm:text-xl font-semibold text-blue-900">
          View &amp; Manage Students
        </h2>
        <button
          onClick={onClose}
          className="text-blue-600 hover:text-blue-800 transition duration-200 p-1"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 sm:px-4 sm:py-3 rounded mb-4 text-sm shrink-0">
          {error}
        </div>
      )}

      <div className="mb-4 sm:mb-6 shrink-0">
        <label className="block text-sm font-medium text-blue-900 mb-2">
          Select Class to View Students
        </label>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
        >
          <option value="">Select a Class</option>
          {classes.map((classItem) => (
            <option key={classItem.id} value={classItem.name}>
              {classItem.name}
            </option>
          ))}
        </select>
      </div>

      {selectedClass && (
        <div className="overflow-y-auto flex-1 min-h-0">
          {/* Mobile Cards */}
          <div className="block md:hidden space-y-4">
            {students.map((student) => (
              <div
                key={student.id}
                className="border border-blue-200 rounded-lg p-4 bg-blue-50/50 space-y-3"
              >
                <div>
                  <label className="text-xs font-semibold text-blue-900 uppercase">Name</label>
                  {editingStudent === student.id ? (
                    <input
                      type="text"
                      name="name"
                      value={editedData.name || student.name}
                      onChange={handleChange}
                      className="w-full mt-1 px-2 py-1 border border-blue-300 rounded text-sm bg-white"
                    />
                  ) : (
                    <p className="text-sm text-gray-800 font-medium">{student.name}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-blue-900 uppercase">DOB</label>
                    {editingStudent === student.id ? (
                      <input
                        type="date"
                        name="date_of_birth"
                        value={editedData.date_of_birth || student.date_of_birth || ''}
                        onChange={handleChange}
                        className="w-full mt-1 px-2 py-1 border border-blue-300 rounded text-sm bg-white"
                      />
                    ) : (
                      <p className="text-sm text-gray-800">{student.date_of_birth}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-blue-900 uppercase">Gender</label>
                    {editingStudent === student.id ? (
                      <select
                        name="sex"
                        value={editedData.sex || student.sex || ''}
                        onChange={handleChange}
                        className="w-full mt-1 px-2 py-1 border border-blue-300 rounded text-sm bg-white"
                      >
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                      </select>
                    ) : (
                      <p className="text-sm text-gray-800">
                        {student.sex === 'M' ? 'Male' : 'Female'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-blue-900 uppercase">Faculty</label>
                    {editingStudent === student.id ? (
                      <select
                        name="faculty_id"
                        value={editedData.faculty_id ?? student.faculty_id ?? ''}
                        onChange={handleChange}
                        className="w-full mt-1 px-2 py-1 border border-blue-300 rounded text-sm bg-white"
                      >
                        {faculties.map((faculty) => (
                          <option key={faculty.id} value={faculty.id}>
                            {faculty.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm text-gray-800">{student.faculty_name}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-blue-900 uppercase">Class</label>
                    {editingStudent === student.id ? (
                      <select
                        name="class_name"
                        value={editedData.class_name || student.class_name || ''}
                        onChange={handleChange}
                        className="w-full mt-1 px-2 py-1 border border-blue-300 rounded text-sm bg-white"
                      >
                        {classes.map((classItem) => (
                          <option key={classItem.id} value={classItem.name}>
                            {classItem.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm text-gray-800">{student.class_name}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-blue-900 uppercase">
                    Parent Tel
                  </label>
                  {editingStudent === student.id ? (
                    <div className="flex items-center mt-1">
                      <Phone className="h-4 w-4 text-blue-600 mr-1 shrink-0" />
                      <input
                        type="tel"
                        name="guidance_phone_number"
                        value={
                          editedData.guidance_phone_number ||
                          student.guidance_phone_number ||
                          ''
                        }
                        onChange={handleChange}
                        placeholder="Parent phone number"
                        className="w-full px-2 py-1 border border-blue-300 rounded text-sm bg-white"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center mt-1">
                      <Phone className="h-4 w-4 text-blue-600 mr-1 shrink-0" />
                      <span className="text-sm text-gray-800">
                        {formatPhoneNumber(student.guidance_phone_number)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-2 border-t border-blue-200">
                  {editingStudent === student.id ? (
                    <>
                      <button
                        onClick={() => handleSave(student.id)}
                        disabled={loading}
                        className="flex items-center text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 px-3 py-1.5 rounded transition duration-200"
                      >
                        <Save className="h-4 w-4 mr-1" /> Save
                      </button>
                      <button
                        onClick={() => setEditingStudent(null)}
                        className="flex items-center text-xs font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 px-3 py-1.5 rounded transition duration-200"
                      >
                        <X className="h-4 w-4 mr-1" /> Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleEdit(student)}
                        className="flex items-center text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded transition duration-200"
                      >
                        <Edit3 className="h-4 w-4 mr-1" /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(student.id, student.name)}
                        className="flex items-center text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded transition duration-200"
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-blue-100">
                  <th className="px-4 py-2 text-left text-blue-900">Name</th>
                  <th className="px-4 py-2 text-left text-blue-900">Date of Birth</th>
                  <th className="px-4 py-2 text-left text-blue-900">Gender</th>
                  <th className="px-4 py-2 text-left text-blue-900">Faculty</th>
                  <th className="px-4 py-2 text-left text-blue-900">Class</th>
                  <th className="px-4 py-2 text-left text-blue-900">Parent Tel</th>
                  <th className="px-4 py-2 text-left text-blue-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="border-b border-blue-200 hover:bg-blue-50">
                    <td className="px-4 py-2">
                      {editingStudent === student.id ? (
                        <input
                          type="text"
                          name="name"
                          value={editedData.name || student.name}
                          onChange={handleChange}
                          className="w-full px-2 py-1 border border-blue-300 rounded text-sm"
                        />
                      ) : (
                        student.name
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {editingStudent === student.id ? (
                        <input
                          type="date"
                          name="date_of_birth"
                          value={editedData.date_of_birth || student.date_of_birth || ''}
                          onChange={handleChange}
                          className="w-full px-2 py-1 border border-blue-300 rounded text-sm"
                        />
                      ) : (
                        student.date_of_birth
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {editingStudent === student.id ? (
                        <select
                          name="sex"
                          value={editedData.sex || student.sex || ''}
                          onChange={handleChange}
                          className="w-full px-2 py-1 border border-blue-300 rounded text-sm"
                        >
                          <option value="M">Male</option>
                          <option value="F">Female</option>
                        </select>
                      ) : student.sex === 'M' ? (
                        'Male'
                      ) : (
                        'Female'
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {editingStudent === student.id ? (
                        <select
                          name="faculty_id"
                          value={editedData.faculty_id ?? student.faculty_id ?? ''}
                          onChange={handleChange}
                          className="w-full px-2 py-1 border border-blue-300 rounded text-sm"
                        >
                          {faculties.map((faculty) => (
                            <option key={faculty.id} value={faculty.id}>
                              {faculty.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        student.faculty_name
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {editingStudent === student.id ? (
                        <select
                          name="class_name"
                          value={editedData.class_name || student.class_name || ''}
                          onChange={handleChange}
                          className="w-full px-2 py-1 border border-blue-300 rounded text-sm"
                        >
                          {classes.map((classItem) => (
                            <option key={classItem.id} value={classItem.name}>
                              {classItem.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        student.class_name
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {editingStudent === student.id ? (
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 text-blue-600 mr-1" />
                          <input
                            type="tel"
                            name="guidance_phone_number"
                            value={
                              editedData.guidance_phone_number ||
                              student.guidance_phone_number ||
                              ''
                            }
                            onChange={handleChange}
                            placeholder="Parent phone number"
                            className="w-full px-2 py-1 border border-blue-300 rounded text-sm"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 text-blue-600 mr-1" />
                          <span className="text-sm">
                            {formatPhoneNumber(student.guidance_phone_number)}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex space-x-2">
                        {editingStudent === student.id ? (
                          <>
                            <button
                              onClick={() => handleSave(student.id)}
                              disabled={loading}
                              className="text-green-600 hover:text-green-800 transition duration-200 p-1"
                              title="Save"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setEditingStudent(null)}
                              className="text-gray-600 hover:text-gray-800 transition duration-200 p-1"
                              title="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEdit(student)}
                              className="text-blue-600 hover:text-blue-800 transition duration-200 p-1"
                              title="Edit"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(student.id, student.name)}
                              className="text-red-600 hover:text-red-800 transition duration-200 p-1"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {students.length === 0 && (
            <div className="text-center py-8 text-blue-700">
              No students found in this class.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentActions;