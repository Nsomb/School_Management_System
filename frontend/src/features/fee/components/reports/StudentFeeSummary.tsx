import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Alert,
  Chip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { Download as DownloadIcon } from '@mui/icons-material';
import { useFeeApi } from '../../hooks/useFeeApi';
import type { Student } from '../../types/feeTypes';
import dayjs from 'dayjs';

const StudentFeeSummary: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const { getStudentFeeSummary, searchStudents, getAllAcademicYears, downloadStudentStatement } = useFeeApi();

  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [summary, setSummary] = useState<any>(null);

  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState('');

  const [fetching, setFetching] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  // Fetch initial academic years
  useEffect(() => {
    let isMounted = true;
    const fetchYears = async () => {
      try {
        const years = await getAllAcademicYears();
        if (isMounted) {
          setAcademicYears(years);
          if (years.length > 0) setSelectedYear(years[0]);
        }
      } catch (err) {
        console.error('Failed to load academic years:', err);
      }
    };
    fetchYears();
    return () => { isMounted = false; };
  }, [getAllAcademicYears]);

  // Fast Debounced Search (300ms)
  useEffect(() => {
    if (searchTerm.trim().length <= 2) {
      setStudents([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const data = await searchStudents(searchTerm);
        setStudents(data || []);
      } catch (err) {
        console.error('Student search failed:', err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, searchStudents]);

  // Fetch Summary Callback
  const fetchSummary = useCallback(async () => {
    if (!selectedStudent || !selectedYear) return;

    setFetching(true);
    setDownloadError(null);
    try {
      const data = await getStudentFeeSummary(selectedStudent.id, selectedYear);
      setSummary(data);
    } catch (err) {
      console.error('Failed to fetch student summary:', err);
    } finally {
      setFetching(false);
    }
  }, [selectedStudent, selectedYear, getStudentFeeSummary]);

  // Auto-fetch summary on selection change
  useEffect(() => {
    if (selectedStudent && selectedYear) {
      fetchSummary();
    }
  }, [selectedStudent, selectedYear, fetchSummary]);

  const handleDownloadStatement = async () => {
    if (!selectedStudent || !selectedYear) return;

    setDownloading(true);
    setDownloadError(null);
    try {
      const blob = await downloadStudentStatement(selectedStudent.id, selectedYear);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `statement_${selectedStudent.name.replace(/\s+/g, '_')}_${selectedYear}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to download statement.';
      setDownloadError(msg);
      console.error('Download error:', err);
    } finally {
      setDownloading(false);
    }
  };

  // Calculations
  const totalExpected = summary?.feeStructures
    ? summary.feeStructures.reduce((sum: number, fs: any) => sum + (Number(fs.total_expected_amount) || 0), 0)
    : 0;
  const totalPaid = summary?.totalPaid || 0;
  const balance = totalExpected - totalPaid;

  const formatDate = (dateStr: string) => (dateStr ? dayjs(dateStr).format('DD/MM/YYYY') : '-');

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight="bold" gutterBottom>
        Student Fee Summary
      </Typography>

      {/* Filter Controls */}
      <Paper elevation={0} sx={{ p: isMobile ? 2 : 3, mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={5}>
            <Autocomplete
              options={students}
              getOptionLabel={(option) => `${option.name} (${option.class_name || 'N/A'})`}
              value={selectedStudent}
              onChange={(_event, newValue) => setSelectedStudent(newValue)}
              onInputChange={(_event, newInputValue) => setSearchTerm(newInputValue)}
              isOptionEqualToValue={(option, val) => option.id === val.id}
              noOptionsText={searchTerm.length <= 2 ? 'Type at least 3 characters...' : 'No students found'}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search Student"
                  placeholder="Type name or ID..."
                  variant="outlined"
                  size="small"
                  fullWidth
                />
              )}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Academic Year</InputLabel>
              <Select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                label="Academic Year"
              >
                {academicYears.map((year) => (
                  <MenuItem key={year} value={year}>{year}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <Button
              variant="contained"
              onClick={fetchSummary}
              disabled={!selectedStudent || !selectedYear || fetching}
              fullWidth
              sx={{ height: '40px', borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
            >
              {fetching ? 'Refreshing...' : 'Refresh'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {fetching && <LinearProgress sx={{ borderRadius: 1, mb: 2 }} />}

      {downloadError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDownloadError(null)}>
          {downloadError}
        </Alert>
      )}

      {/* Main Student Card Container */}
      {summary && summary.studentFound && (
        <Paper elevation={0} sx={{ p: isMobile ? 2 : 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Box display="flex" flexDirection={isMobile ? 'column' : 'row'} justifyContent="space-between" alignItems={isMobile ? 'stretch' : 'center'} gap={2} mb={3}>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                {summary.studentDetails?.student_name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Class: {summary.studentDetails?.class_name || 'Unassigned'}
              </Typography>
            </Box>

            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadStatement}
              disabled={downloading || totalExpected === 0}
              fullWidth={isMobile}
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
            >
              {downloading ? 'Downloading...' : 'Download Statement'}
            </Button>
          </Box>

          {/* Fee Structures List */}
          <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1, mb: 3, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', display: 'block', mb: 1 }}>
              Fee Structures ({summary.feeStructures?.length || 0})
            </Typography>
            {summary.feeStructures && summary.feeStructures.length > 0 ? (
              summary.feeStructures.map((fs: any, idx: number) => (
                <Typography key={idx} variant="body2" sx={{ py: 0.25 }}>
                  • <strong>{fs.term}</strong>: {fs.description || 'General Fee'} — Expected:{' '}
                  <strong>{Number(fs.total_expected_amount || 0).toLocaleString()} FCFA</strong>
                </Typography>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                No fee structures configured for this year.
              </Typography>
            )}
          </Box>

          {/* Dashboard Summary Stats Cards */}
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={4}>
              <Paper elevation={0} sx={{ p: 2, textAlign: 'center', bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" display="block">Total Expected</Typography>
                <Typography variant="h6" fontWeight="bold">{totalExpected.toLocaleString()} FCFA</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={4}>
              <Paper elevation={0} sx={{ p: 2, textAlign: 'center', bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" display="block">Total Paid</Typography>
                <Typography variant="h6" fontWeight="bold" color="success.main">{totalPaid.toLocaleString()} FCFA</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={4}>
              <Paper elevation={0} sx={{ p: 2, textAlign: 'center', bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" display="block">Balance</Typography>
                <Typography variant="h6" fontWeight="bold" color={balance > 0 ? 'error.main' : 'success.main'}>
                  {balance.toLocaleString()} FCFA
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Payment History View */}
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
            Payment History
          </Typography>

          {summary.payments && summary.payments.length > 0 ? (
            isMobile ? (
              /* MOBILE CARDS VIEW */
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {summary.payments.map((payment: any) => (
                  <Box 
                    key={payment.payment_id} 
                    sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', pb: 0.5, mb: 1 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>DATE</Typography>
                      <Typography variant="caption" fontWeight={700}>{formatDate(payment.payment_date)}</Typography>
                    </Box>

                    <Grid container spacing={1} sx={{ fontSize: '0.75rem', mb: 1 }}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" display="block">Component:</Typography>
                        <Typography variant="body2" fontWeight={600}>{payment.component_name || 'General'}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" display="block">Receipt #:</Typography>
                        <Typography variant="body2" fontWeight={600}>{payment.receipt_number || '-'}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" display="block">Method:</Typography>
                        <Typography variant="body2" fontWeight={600}>{payment.payment_method || 'Cash'}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" display="block">Amount Paid:</Typography>
                        <Typography variant="body2" fontWeight={700} color="success.main">
                          {Number(payment.amount_paid).toLocaleString()} FCFA
                        </Typography>
                      </Grid>
                    </Grid>

                    <Box sx={{ pt: 1, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">Status</Typography>
                      <Chip
                        label={payment.status || 'Active'}
                        color={payment.status === 'cancelled' ? 'error' : 'success'}
                        size="small"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.65rem' }}
                      />
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              /* DESKTOP TABLE VIEW */
              <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                <Table size="small" sx={{ width: '100%' }}>
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Component</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Amount Paid</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Receipt #</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Method</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {summary.payments.map((payment: any) => (
                      <TableRow key={payment.payment_id} hover>
                        <TableCell>{formatDate(payment.payment_date)}</TableCell>
                        <TableCell>{payment.component_name || 'General'}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: 'success.main' }}>
                          {Number(payment.amount_paid).toLocaleString()} FCFA
                        </TableCell>
                        <TableCell>{payment.receipt_number || '-'}</TableCell>
                        <TableCell>{payment.payment_method || 'Cash'}</TableCell>
                        <TableCell>
                          <Chip
                            label={payment.status || 'Active'}
                            color={payment.status === 'cancelled' ? 'error' : 'success'}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            )
          ) : (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3, bgcolor: 'action.hover', borderRadius: 1 }}>
              No payments recorded for this academic year yet.
            </Typography>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default StudentFeeSummary;