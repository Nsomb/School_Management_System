import type { Subject, SubjectCreateData } from '../types/subjectTypes';

export const validateSubjectData = (data: SubjectCreateData) => {
  const errors: { [key: string]: string } = {};

  if (!data.name || data.name.trim().length < 2) {
    errors.name = 'Subject name must be at least 2 characters';
  }

  const coefficient = Number(data.coefficient);
  if (isNaN(coefficient) || coefficient < 1 || coefficient > 10) {
    errors.coefficient = 'Coefficient must be a number between 1 and 10';
  }

  if (!data.faculty_id) {
    errors.faculty_id = 'Faculty is required';
  }

  if (!data.specialty_id) {
    errors.specialty_id = 'Specialty is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const formatSubjectForDisplay = (subject: Subject) => {
  return {
    ...subject,
    faculty_name: subject.faculty?.name || 'N/A',
    specialty_name: subject.specialty?.name || 'N/A'
  };
};

export const filterSubjectsByClass = (subjects: Subject[], className: string) => {
  if (!className) return subjects;
  return subjects.filter(subject =>
    subject.classes?.some(c => c.toLowerCase() === className.toLowerCase())
  );
};
