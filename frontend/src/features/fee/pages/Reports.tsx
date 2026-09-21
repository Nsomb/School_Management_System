import React, { useState, useEffect, useRef, lazy, Suspense, useCallback } from 'react';
import { useFeeApi } from '../hooks/useFeeApi';
import {
  Button,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import type {
  CollectionSummary as CollectionSummaryType,
  OutstandingBalance,
  ClassSummary
} from '../types/feeTypes';

// Lazy load report components
const CollectionSummary = lazy(() => import('../components/reports/CollectionSummary'));
const OutstandingBalances = lazy(() => import('../components/reports/OutstandingBalances'));
const PaymentsByDate = lazy(() => import('../components/reports/PaymentsByDate'));
const StudentFeeSummary = lazy(() => import('../components/reports/StudentFeeSummary'));
const ClassFeeSummary = lazy(() => import('../components/reports/ClassFeeSummary'));

interface TabPanelProps {
  children: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`report-tabpanel-${index}`}
      aria-labelledby={`report-tab-${index}`}
      className="w-full py-2 sm:py-4 px-0"
    >
      {value === index && children}
    </div>
  );
}

const ReportsPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [activeTab, setActiveTab] = useState(0);
  const {
    getCollectionSummary,
    getOutstandingBalances,
    getAllAcademicYears,
    getAllClasses,
    getCurrentAcademicYear,
    exportCollectionSummary,
    exportOutstandingBalances,
    exportPaymentsByDate,
    loading: apiLoading
  } = useFeeApi();

  // State
  const [collectionData, setCollectionData] = useState<CollectionSummaryType[]>([]);
  const [outstandingData, setOutstandingData] = useState<OutstandingBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [exportError, setExportError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [hasInitialData, setHasInitialData] = useState(false);

  // Refs to prevent loops
  const fetchedRef = useRef(false);
  const dataFetchedRef = useRef(false);
  const lastFetchedKey = useRef<string>('');

  // Memoized loadData with last-fetched-key guard
  const loadData = useCallback(async () => {
    if (!selectedYear) return;
    const key = `${selectedYear}-${selectedClass}`;
    if (dataFetchedRef.current && lastFetchedKey.current === key) {
      return; // already fetched with same params
    }
    dataFetchedRef.current = true;
    lastFetchedKey.current = key;

    setIsLoading(true);
    setApiError(null);
    try {
      const [collection, outstanding] = await Promise.all([
        getCollectionSummary(selectedYear, selectedClass || undefined),
        getOutstandingBalances(selectedYear, selectedClass || undefined)
      ]);
      setCollectionData(collection || []);
      setOutstandingData(outstanding || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load report data';
      setApiError(msg);
      console.error('Load data error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear, selectedClass, getCollectionSummary, getOutstandingBalances]);

  // Load academic years, classes, and current year – then auto-select
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const fetchInitial = async () => {
      try {
        const [years, cls, currentYear] = await Promise.all([
          getAllAcademicYears(),
          getAllClasses(),
          getCurrentAcademicYear()
        ]);

        setAcademicYears(years || []);
        setClasses(cls || []);

        if (years && years.length > 0) {
          const defaultYear = currentYear && years.includes(currentYear) ? currentYear : years[0];
          setSelectedYear(defaultYear);
        }

        setHasInitialData(true);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load initial data';
        setApiError(msg);
        console.error('Initial load error:', err);
      }
    };
    fetchInitial();
  }, [getAllAcademicYears, getAllClasses, getCurrentAcademicYear]);

  // Trigger load when filters change, after initial data ready
  useEffect(() => {
    if (!hasInitialData) return;
    dataFetchedRef.current = false;
    loadData();
  }, [selectedYear, selectedClass, hasInitialData, loadData]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleRefresh = () => {
    dataFetchedRef.current = false;
    setApiError(null);
    loadData();
  };

  // Export handlers
  const handleExportCollection = async () => {
    try {
      setExportError(null);
      const blob = await exportCollectionSummary(selectedYear);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `collection_summary_${selectedYear}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setExportError('Failed to export collection summary');
      console.error(err);
    }
  };

  const handleExportOutstanding = async () => {
    try {
      setExportError(null);
      const blob = await exportOutstandingBalances(selectedYear);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `outstanding_balances_${selectedYear}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setExportError('Failed to export outstanding balances');
      console.error(err);
    }
  };

  const handleExportPaymentsByDate = async (startDate: string, endDate: string) => {
    try {
      setExportError(null);
      const blob = await exportPaymentsByDate(startDate, endDate);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payments_${startDate}_to_${endDate}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setExportError('Failed to export payments by date');
      console.error(err);
    }
  };

  const tabs = [
    { label: 'Collection Summary', component: <CollectionSummary data={collectionData} onExport={handleExportCollection} /> },
    { label: 'Outstanding Balances', component: <OutstandingBalances data={outstandingData} onExport={handleExportOutstanding} /> },
    { label: 'Payments by Date', component: <PaymentsByDate onExport={handleExportPaymentsByDate} /> },
    { label: 'Student Summary', component: <StudentFeeSummary /> },
    { label: 'Class Summary', component: <ClassFeeSummary /> }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-6 py-2 sm:py-6 box-border">
      {/* Header & filters container */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-4 bg-white p-3 sm:p-5 rounded-lg sm:rounded-xl border-0 sm:border border-gray-100 shadow-none sm:shadow-sm">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 tracking-tight">Fee Reports</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">Generate, view, and export detailed fee summaries</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full md:w-auto">
          <FormControl size="small" className="w-full sm:w-40">
            <InputLabel>Academic Year</InputLabel>
            <Select
              value={selectedYear}
              label="Academic Year"
              onChange={(e) => {
                setSelectedYear(e.target.value);
                dataFetchedRef.current = false;
              }}
              disabled={apiLoading || isLoading}
            >
              {academicYears.map((year) => (
                <MenuItem key={year} value={year}>{year}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" className="w-full sm:w-44">
            <InputLabel>Class</InputLabel>
            <Select
              value={selectedClass ?? ''}
              label="Class"
              onChange={(e) => {
                const val = e.target.value;
                setSelectedClass(val === '' ? null : Number(val));
              }}
              disabled={apiLoading || isLoading}
            >
              <MenuItem value="">All Classes</MenuItem>
              {classes.map((cls) => (
                <MenuItem key={cls.id} value={cls.id}>{cls.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="contained"
            color="primary"
            startIcon={
              <RefreshIcon className={(apiLoading || isLoading) ? 'animate-spin' : ''} />
            }
            onClick={handleRefresh}
            disabled={apiLoading || isLoading}
            className="w-full sm:w-auto h-[40px] px-5 text-sm font-semibold shadow-none hover:shadow-md transition-all duration-200"
            sx={{
              textTransform: 'none',
              borderRadius: '8px'
            }}
          >
            Refresh
          </Button>
        </div>
      </div>

      {apiError && (
        <Alert severity="error" className="mb-4 rounded-lg" onClose={() => setApiError(null)}>
          {apiError}
        </Alert>
      )}
      {exportError && (
        <Alert severity="error" className="mb-4 rounded-lg" onClose={() => setExportError(null)}>
          {exportError}
        </Alert>
      )}

      {/* Modern, horizontal scrollable tab strip */}
      <div className="border-b border-gray-200 overflow-x-auto no-scrollbar scroll-smooth">
        <div className="flex space-x-1 sm:space-x-4 min-w-max pb-1">
          {tabs.map((tab, index) => (
            <button
              key={index}
              onClick={(e) => handleTabChange(e, index)}
              className={`py-2.5 sm:py-3 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors duration-150 ${
                activeTab === index
                  ? 'border-blue-600 text-blue-600 font-semibold'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Panels */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <CircularProgress size={36} />
        </div>
      ) : (
        tabs.map((tab, index) => (
          <TabPanel key={index} value={activeTab} index={index}>
            <Suspense fallback={
              <div className="flex justify-center items-center h-48">
                <CircularProgress size={32} />
              </div>
            }>
              {tab.component}
            </Suspense>
          </TabPanel>
        ))
      )}
    </div>
  );
};

export default ReportsPage;