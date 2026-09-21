// src/features/classStatistics/hooks/useClassStatistics.ts
import { useState, useCallback } from 'react';
import { classStatisticsApi } from '../api/classStatisticsApi';
import type { StatisticsResponse, SubjectStat, StatisticsMetadata } from '../api/classStatisticsApi';
import { toast } from 'react-toastify';

export type { SubjectStat, StatisticsMetadata, StatisticsResponse };

export const useClassStatistics = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<SubjectStat[]>([]);
  const [metadata, setMetadata] = useState<StatisticsMetadata | null>(null);
  const [hasData, setHasData] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const loadTeacherSubjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await classStatisticsApi.getTeacherSubjects();
      setSubjects(data);
      return data;
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to load subjects';
      setError(msg);
      toast.error(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTeacherStatistics = useCallback(async (class_name: string, term?: string, academic_year?: string) => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔍 fetchTeacherStatistics called with:', { class_name, term, academic_year });
      
      const response = await classStatisticsApi.getTeacherStatistics(class_name, term, academic_year);
      
      console.log('📊 Response from API:', response);
      console.log('📊 Statistics count:', response.statistics?.length);
      console.log('📊 Has data:', response.metadata?.has_data);
      
      setStatistics(response.statistics || []);
      setMetadata(response.metadata);
      setHasData(response.metadata?.has_data || false);
      return response;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to fetch statistics';
      console.error('❌ Error fetching statistics:', errorMsg);
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAdminStatistics = useCallback(async (class_name: string, term: string, academic_year: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await classStatisticsApi.getAdminStatistics(class_name, term, academic_year);
      setStatistics(response.statistics || []);
      setMetadata(response.metadata);
      setHasData(response.metadata?.has_data || false);
      return response;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to fetch statistics';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const downloadTeacherPDF = useCallback(async (class_name: string, term: string, academic_year: string) => {
    setLoading(true);
    setError(null);
    try {
      const blob = await classStatisticsApi.downloadTeacherStatisticsPDF(class_name, term, academic_year);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Class-Statistics-${class_name}-${term}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF downloaded successfully');
      return true;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to download PDF';
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const downloadAdminPDF = useCallback(async (class_name: string, term: string, academic_year: string) => {
    setLoading(true);
    setError(null);
    try {
      const blob = await classStatisticsApi.downloadAdminStatisticsPDF(class_name, term, academic_year);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Class-Statistics-${class_name}-${term}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF downloaded successfully');
      return true;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to download PDF';
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    statistics,
    metadata,
    hasData,
    subjects,
    clearError,
    loadTeacherSubjects,
    fetchTeacherStatistics,
    fetchAdminStatistics,
    downloadTeacherPDF,
    downloadAdminPDF,
  };
};