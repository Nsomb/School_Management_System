// src/utils/academicYear.ts
export interface AcademicYear {
  value: string;
  label: string;
  isCurrent: boolean;
}

export const getCurrentAcademicYear = (): string => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  
  // Academic year typically starts in September (month 9)
  if (currentMonth >= 9) {
    return `${currentYear}/${currentYear + 1}`;
  } else {
    return `${currentYear - 1}/${currentYear}`;
  }
};

export const generateAcademicYears = (yearsBack: number = 5): AcademicYear[] => {
  const currentAcademicYear = getCurrentAcademicYear();
  const [startYear] = currentAcademicYear.split('/').map(Number);
  
  const academicYears: AcademicYear[] = [];
  
  for (let i = yearsBack; i >= 0; i--) {
    const yearStart = startYear - i;
    const yearEnd = yearStart + 1;
    const value = `${yearStart}/${yearEnd}`;
    
    academicYears.push({
      value,
      label: value,
      isCurrent: value === currentAcademicYear
    });
  }
  
  return academicYears;
};

export const isAcademicYearActive = (academicYear: string): boolean => {
  const currentAcademicYear = getCurrentAcademicYear();
  return academicYear === currentAcademicYear;
};