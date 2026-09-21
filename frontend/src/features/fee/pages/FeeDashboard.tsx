import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  LinearProgress,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  Paid as PaidIcon,
  School as SchoolIcon,
  Receipt as ReceiptIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Today as TodayIcon,
  CalendarMonth as CalendarMonthIcon,
  FileDownload as FileDownloadIcon,
} from '@mui/icons-material';
import { SummaryCard } from '../components/SummaryCard';
import { RecentPayments } from '../components/RecentPayments';
import { FeeCollectionChart } from '../components/FeeCollectionChart';
import { useFeeApi } from '../hooks/useFeeApi';
import type { Payment, CollectionSummary, ClassSummary } from '../types/feeTypes';

interface ClassOption {
  id: number;
  name: string;
}

const FeeDashboard: React.FC = () => {
  const theme = useTheme();
  const {
    getDashboardStats,
    getCollectionSummary,
    getPayments,
    getAllClasses,
    getAllAcademicYears,
    exportCollectionSummary,
  } = useFeeApi();

  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<number | 'all'>('all');
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [academicYears, setAcademicYears] = useState<string[]>([]);

  const [stats, setStats] = useState({
    totalExpected: 0,
    totalCollected: 0,
    outstanding: 0,
    collectionPercentage: 0,
    studentsCleared: 0,
    studentsOwing: 0,
    todayCollected: 0,
    monthCollected: 0
  });

  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [collectionData, setCollectionData] = useState<CollectionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load dropdown options on mount
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [classesRes, yearsRes] = await Promise.all([
          getAllClasses(),
          getAllAcademicYears()
        ]);
        setClasses(classesRes.map((c: ClassSummary) => ({ id: c.id, name: c.name })));
        const years = yearsRes.map((y: string) => y);
        setAcademicYears(years);
        if (years.length > 0) setSelectedYear(years[0]);
      } catch (err) {
        console.error('Failed to load dropdown options:', err);
      }
    };
    fetchOptions();
  }, []);

  // Fetch dashboard data when filters change
  useEffect(() => {
    if (!selectedYear) return;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const classId = selectedClass === 'all' ? undefined : selectedClass;

        const [statsData, recent, collection] = await Promise.all([
          getDashboardStats(selectedYear, classId),
          getPayments(undefined, selectedYear),
          getCollectionSummary(selectedYear, classId)
        ]);

        setStats(statsData);
        setRecentPayments(recent.slice(0, 5));
        setCollectionData(collection);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedYear, selectedClass]);

  const handleExportDashboard = async () => {
    try {
      const classId = selectedClass === 'all' ? undefined : selectedClass;
      const blob = await exportCollectionSummary(selectedYear, classId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dashboard_data_${selectedYear}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      setError('Failed to export dashboard data.');
    }
  };

  const handleYearChange = (event: SelectChangeEvent<string>) => {
    setSelectedYear(event.target.value);
  };

  const handleClassChange = (event: SelectChangeEvent<number | 'all'>) => {
    setSelectedClass(event.target.value as number | 'all');
  };

  if (loading && !Object.values(stats).some(v => v > 0)) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: { xs: 2, sm: 3 }, backgroundColor: theme.palette.background.default, minHeight: '100vh' }}>
      <Box sx={{ maxWidth: '1800px', mx: 'auto', mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
            Fee Management Dashboard
          </Typography>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportDashboard}
            disabled={loading || collectionData.length === 0}
          >
            Export Data
          </Button>
        </Box>

        <Paper elevation={2} sx={{ p: 3, mb: 3, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Academic Year</InputLabel>
            <Select value={selectedYear} label="Academic Year" onChange={handleYearChange}>
              {academicYears.map((year) => (
                <MenuItem key={year} value={year}>{year}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Class</InputLabel>
            <Select value={selectedClass} label="Class" onChange={handleClassChange}>
              <MenuItem key="all" value="all">All Classes</MenuItem>
              {classes.map((cls) => (
                <MenuItem key={cls.id} value={cls.id}>{cls.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Paper>

        {error && (
          <Paper elevation={0} sx={{ p: 2, mb: 3, backgroundColor: theme.palette.error.light }}>
            <Typography color="error">{error}</Typography>
          </Paper>
        )}

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <SummaryCard
              title="Expected Fees"
              value={stats.totalExpected}
              icon={<SchoolIcon fontSize="large" />}
              color={theme.palette.info.main}
              loading={loading}
              isCurrency={true}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <SummaryCard
              title="Collected"
              value={stats.totalCollected}
              icon={<PaidIcon fontSize="large" />}
              color={theme.palette.success.main}
              loading={loading}
              isCurrency={true}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <SummaryCard
              title="Collection %"
              value={stats.collectionPercentage}
              icon={<TrendingUpIcon fontSize="large" />}
              color={theme.palette.primary.main}
              loading={loading}
              isCurrency={false}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <SummaryCard
              title="Outstanding"
              value={stats.outstanding}
              icon={<ReceiptIcon fontSize="large" />}
              color={theme.palette.error.main}
              loading={loading}
              isCurrency={true}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <SummaryCard
              title="Students Cleared"
              value={stats.studentsCleared}
              icon={<CheckCircleIcon fontSize="large" />}
              color={theme.palette.success.main}
              loading={loading}
              isCurrency={false}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <SummaryCard
              title="Students Owing"
              value={stats.studentsOwing}
              icon={<WarningIcon fontSize="large" />}
              color={theme.palette.warning.main}
              loading={loading}
              isCurrency={false}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <SummaryCard
              title="Today's Collections"
              value={stats.todayCollected}
              icon={<TodayIcon fontSize="large" />}
              color={theme.palette.secondary.main}
              loading={loading}
              isCurrency={true}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <SummaryCard
              title="This Month"
              value={stats.monthCollected}
              icon={<CalendarMonthIcon fontSize="large" />}
              color={theme.palette.info.main}
              loading={loading}
              isCurrency={true}
            />
          </Grid>

          <Grid item xs={12} md={8}>
            <Paper elevation={3} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', borderRadius: '12px' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 500 }}>
                Fee Collection by Class ({selectedYear})
              </Typography>
              <Box sx={{ flexGrow: 1 }}>
                <FeeCollectionChart
                  data={collectionData.map((item) => ({
                    month: item.class_name,
                    amount: item.total_paid
                  }))}
                  loading={loading}
                />
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper elevation={3} sx={{ p: 3, height: '100%', borderRadius: '12px' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 500 }}>
                Recent Payments
              </Typography>
              <RecentPayments payments={recentPayments} loading={loading} />
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default FeeDashboard;