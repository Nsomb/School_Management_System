// src/features/teachers/components/TeacherList.tsx
import type { Teacher } from '../types/teacherTypes';
import { TeacherCard } from './TeacherCard';

interface TeacherListProps {
  teachers: Teacher[];
  onEdit: (teacher: Teacher) => void;
  onDelete: (username: string) => void;
  onAssignSubjects: (teacherId: number) => void;
  onDeleteAssignment: (assignmentId: number) => void;
  onGetPassword: (teacherId: number) => Promise<string>;
}

export const TeacherList = ({
  teachers,
  onEdit,
  onDelete,
  onAssignSubjects,
  onDeleteAssignment,
  onGetPassword,
}: TeacherListProps) => {
  if (!teachers.length) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>No teachers found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {teachers.map((teacher) => (
        <TeacherCard
          key={teacher.id}
          teacher={teacher}
          onEdit={() => onEdit(teacher)}
          onDelete={() => onDelete(teacher.username)}
          onAssignSubjects={() => onAssignSubjects(teacher.id)}
          onDeleteAssignment={onDeleteAssignment}
          onGetPassword={onGetPassword}
        />
      ))}
    </div>
  );
};