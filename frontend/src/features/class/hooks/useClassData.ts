// src/features/class/hooks/useClassData.ts
import { useState, useEffect } from 'react';
import { 
  fetchClassStatistics, 
  fetchClassStudents,
  fetchClassReport
} from '../api/classApi';
import type { ClassStatistics, Student } from '../types/classTypes';
import type { ClassReportResponse } from '../api/classApi';

interface UseClassDataResult {
  statistics: ClassStatistics[];
  students: Student[];
  performance: ClassReportResponse | null;
  loading: boolean;
  error: string | null;
  metadata?: any;
}

export const useClassData = (
  className: string,
  activeView: string,
  term?: string,
  academicYear?: string,
  evaluationType?: string
): UseClassDataResult => {
  const [statistics, setStatistics] = useState<ClassStatistics[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [performance, setPerformance] = useState<ClassReportResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any>(null);

  useEffect(() => {
    if (!className) {
      setStatistics([]);
      setStudents([]);
      setPerformance(null);
      setError(null);
      setMetadata(null);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        switch (activeView) {
          case 'statistics':
            const statsData = await fetchClassStatistics(className, term, academicYear);
            
            if (statsData && typeof statsData === 'object') {
              if (statsData.statistics && Array.isArray(statsData.statistics)) {
                setStatistics(statsData.statistics);
              } else if (statsData.data && Array.isArray(statsData.data)) {
                setStatistics(statsData.data);
              } else {
                setStatistics([]);
              }
              setMetadata(statsData.metadata || null);
            } else {
              setStatistics([]);
              setMetadata(null);
            }
            break;
          
          case 'students':
            const studentsData = await fetchClassStudents(className);
            setStudents(studentsData);
            break;
          
          case 'performance':
            if (!evaluationType) {
              setError('Evaluation type is required for performance view');
              break;
            }
            const performanceData = await fetchClassReport(className, evaluationType, term, academicYear);
            setPerformance(performanceData);
            setMetadata(performanceData.metadata || null);
            break;
          
          default:
            console.warn(`Unknown view type: ${activeView}`);
        }
      } catch (err: any) {
        const errorMessage = err.message || `Failed to load ${activeView} data`;
        setError(errorMessage);
        console.error('Error fetching class data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [className, activeView, term, academicYear, evaluationType]);

  return { statistics, students, performance, loading, error, metadata };
};