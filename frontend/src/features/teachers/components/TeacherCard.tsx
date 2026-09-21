import type { Teacher } from '../types/teacherTypes';
import { Edit, Trash2, BookOpen, Users, Book, Eye, EyeOff, Key, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface TeacherCardProps {
  teacher: Teacher;
  onEdit: () => void;
  onDelete: () => void;
  onAssignSubjects: () => void;
  onDeleteAssignment: (assignmentId: number) => void;
  onGetPassword: (teacherId: number) => Promise<string>;
}

export const TeacherCard = ({
  teacher,
  onEdit,
  onDelete,
  onAssignSubjects,
  onDeleteAssignment,
  onGetPassword,
}: TeacherCardProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [subjectsExpanded, setSubjectsExpanded] = useState(false);

  const assignments = teacher.assignments || [];
  const assignmentCount = assignments.length;

  const handleShowPassword = async () => {
    if (password) {
      setShowPassword(!showPassword);
      return;
    }

    setLoadingPassword(true);
    try {
      const retrievedPassword = await onGetPassword(teacher.id);
      setPassword(retrievedPassword);
      setShowPassword(true);
    } catch (error) {
      console.error('Failed to get password:', error);
    } finally {
      setLoadingPassword(false);
    }
  };

  return (
    <div className="border rounded-lg shadow-sm hover:shadow-md transition-shadow relative flex flex-col bg-white">
      {/* ===== Header: Edit / Delete icons (top-right) ===== */}
      <div className="absolute top-3 right-3 flex space-x-1.5 z-10">
        <button
          onClick={onEdit}
          className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50 transition-colors"
          title="Edit teacher"
        >
          <Edit size={16} />
        </button>
        <button
          onClick={onDelete}
          className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
          title="Delete teacher"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* ===== Body ===== */}
      <div className="p-4 pb-3">
        {/* Name + username */}
        <h3 className="font-bold text-lg pr-16 truncate" title={teacher.full_name}>
          {teacher.full_name}
        </h3>
        <p className="text-gray-600 text-sm truncate" title={`@${teacher.username}`}>
          @{teacher.username}
        </p>

        {/* Password toggle */}
        <div className="mt-3">
          <button
            onClick={handleShowPassword}
            disabled={loadingPassword}
            className="flex items-center space-x-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 text-sm"
          >
            {loadingPassword ? (
              <Key size={16} className="animate-pulse" />
            ) : showPassword ? (
              <EyeOff size={16} />
            ) : (
              <Eye size={16} />
            )}
            <span>
              {loadingPassword
                ? 'Loading...'
                : showPassword
                ? 'Hide Password'
                : 'Show Password'}
            </span>
          </button>

          {showPassword && password && (
            <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-md p-2">
              <div className="flex items-center space-x-2 text-sm">
                <Key size={16} className="text-yellow-600 flex-shrink-0" />
                <span className="font-medium text-yellow-800">Password:</span>
                <span className="font-mono text-yellow-900 bg-yellow-100 px-2 py-1 rounded truncate">
                  {password}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Assign button */}
        <div className="mt-3">
          <button
            onClick={onAssignSubjects}
            className="w-full flex items-center justify-center space-x-1 px-3 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 text-sm font-medium transition-colors"
          >
            <BookOpen size={14} />
            <span>Assign Subjects</span>
          </button>
        </div>
      </div>

      {/* ===== Subjects caret toggle (thin strip) ===== */}
      <div className="border-t border-gray-100">
        <button
          onClick={() => setSubjectsExpanded((v) => !v)}
          className="w-full flex items-center justify-center gap-2 py-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
          aria-expanded={subjectsExpanded}
          aria-label={subjectsExpanded ? 'Hide subjects' : 'Show subjects'}
          title={
            assignmentCount > 0
              ? `${assignmentCount} subject${assignmentCount > 1 ? 's' : ''} assigned — click to view`
              : 'No subjects assigned'
          }
        >
          {subjectsExpanded ? (
            <ChevronUp size={14} />
          ) : (
            <ChevronDown size={14} />
          )}
          {assignmentCount > 0 && (
            <span className="text-[10px] font-semibold px-1.5 py-px rounded-full bg-gray-100 text-gray-600">
              {assignmentCount}
            </span>
          )}
        </button>

        {/* Subjects list — only when expanded */}
        {subjectsExpanded && (
          <div className="px-3 pb-3 pt-1 bg-gray-50/60">
            {assignmentCount === 0 ? (
              <div className="text-xs text-yellow-600 py-2 text-center italic">
                No subjects/classes assigned yet
              </div>
            ) : (
              <div className="space-y-1">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex justify-between items-center p-1.5 bg-white rounded border border-gray-100 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-1 text-gray-700 truncate">
                        <Book size={13} className="text-green-500 flex-shrink-0" />
                        <span className="truncate">{assignment.subject_name}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-gray-500 text-xs ml-5 truncate">
                        <Users size={12} className="text-blue-500 flex-shrink-0" />
                        <span className="truncate">{assignment.class_name}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onDeleteAssignment(assignment.id)}
                      className="text-red-500 hover:text-red-700 p-1 flex-shrink-0 ml-1 rounded hover:bg-red-50 transition-colors"
                      title="Remove assignment"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};