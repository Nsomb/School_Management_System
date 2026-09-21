// src/features/class/utils/classUtils.ts
export const formatClassName = (name: string): string => {
  return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export const getCurrentAcademicYear = (): string => {
  const currentYear = new Date().getFullYear();
  return `${currentYear}-${currentYear + 1}`;
};