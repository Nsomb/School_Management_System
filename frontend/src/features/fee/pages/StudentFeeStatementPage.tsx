import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  CircularProgress,
  Alert,
  Chip,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Download } from '@mui/icons-material';
import { useFeeApi } from '../hooks/useFeeApi';
import type { Student, StudentFeeSummary } from '../types/feeTypes';

// ─── Safe numeric formatter ────────────────────────────────────────────────
// Postgres NUMERIC columns come back from the `pg` driver as strings.
// This helper accepts anything and always returns a formatted number string.
const safeToFixed = (value: any, decimals = 2): string => {
  if (value === null || value === undefined || value === '') return (0).toFixed(decimals);
  const num = Number(value);
  if (isNaN(num)) return (0).toFixed(decimals);
  return num.toFixed(decimals);
};

const StudentFeeStatementPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const {
    getStudentFeeSummary,
    downloadStudentStatement,
    searchStudents,
    getAllAcademicYears,
  } = useFeeApi();

  const [summary, setSummary] = useState<StudentFeeSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ─── Name search ─────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searching, setSearching] = useState(false);

  // ─── Academic Year ───────────────────────────────────────────────────────
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState('');

  // Load academic years
  useEffect(() => {
    const fetchYears = async () => {
      const years = await getAllAcademicYears();
      setAcademicYears(years);
      if (years.length > 0) setSelectedYear(years[0]);
    };
    fetchYears();
  }, [getAllAcademicYears]);

  // Search students by name (debounced)
  useEffect(() => {
    const fetchStudents = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      try {
        const results = await searchStudents(searchQuery);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    };
    const timer = setTimeout(fetchStudents, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchStudents]);

  const fetchSummary = async (studentId: number, year: string) => {
    try {
      setLoading(true);
      setFetchError(null);
      const data = await getStudentFeeSummary(studentId, year);
      setSummary(data);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load student fee summary');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!selectedStudent || !selectedYear) {
      setFetchError('Please select a student and academic year.');
      return;
    }
    await fetchSummary(selectedStudent.id, selectedYear);
  };

  const handleDownload = async () => {
    if (!summary || !summary.studentFound) return;
    try {
      setDownloading(true);
      const anySummary = summary as any;
      const yearFromRow =
        anySummary.feeStructures?.[0]?.academic_year ||
        anySummary.feeStructure?.academic_year ||
        selectedYear;
      const blob = await downloadStudentStatement(summary.studentDetails.id, yearFromRow);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fee_statement_${summary.studentDetails.student_name.replace(/\s/g, '_')}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to download statement');
    } finally {
      setDownloading(false);
    }
  };

  // ─── Compute the fee structure row BEFORE the return (avoids IIFE in JSX) ───
  const summaryAny = summary as any;
  const feeStructureRow =
    summaryAny?.feeStructures?.[0] || summaryAny?.feeStructure || null;

  if (loading && !summary) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: isMobile ? 1 : 3, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
        Student Fee Statement
      </Typography>

      {/* ─── Search Section ──────────────────────────────────────────── */}
      <Paper
        elevation={isMobile ? 0 : 3}
        sx={{
          p: isMobile ? 2 : 3,
          mb: 3,
          display: 'flex',
          gap: 2,
          alignItems: 'center',
          flexWrap: 'wrap',
          bgcolor: isMobile ? 'transparent' : 'background.paper',
          border: isMobile ? 'none' : undefined,
        }}
      >
        <Autocomplete
          options={searchResults}
          getOptionLabel={(option) => `${option.name} (${option.class_name})`}
          value={selectedStudent}
          onChange={(_, value) => setSelectedStudent(value)}
          onInputChange={(_, value) => setSearchQuery(value)}
          loading={searching}
          sx={{ flex: 1, minWidth: 200 }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Search Student (min 2 chars)"
              size="small"
              variant="outlined"
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {searching ? <CircularProgress size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
        />

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Academic Year</InputLabel>
          <Select
            value={selectedYear}
            label="Academic Year"
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            {academicYears.map((year) => (
              <MenuItem key={year} value={year}>
                {year}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="contained"
          onClick={handleSearch}
          disabled={!selectedStudent || !selectedYear}
        >
          View Statement
        </Button>
      </Paper>

      {fetchError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {fetchError}
        </Alert>
      )}

      {/* ─── Summary ──────────────────────────────────────────────── */}
      {summary && summary.studentFound ? (
        <Paper
          elevation={isMobile ? 0 : 3}
          sx={{
            p: isMobile ? 2 : 3,
            width: '100%',
            bgcolor: isMobile ? 'transparent' : 'background.paper',
            border: isMobile ? 'none' : undefined,
          }}
        >
          {/* Student Info */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 3,
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            <Box>
              <Typography variant="h5" sx={{ fontSize: isMobile ? '1.2rem' : '1.5rem' }}>
                {summary.studentDetails.student_name}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {summary.studentDetails.class_name}
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={downloading ? <CircularProgress size={20} /> : <Download />}
              onClick={handleDownload}
              disabled={downloading}
            >
              Download Statement
            </Button>
          </Box>

          {/* Fee Structure */}
          {feeStructureRow && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontSize: isMobile ? '1rem' : '1.25rem' }}>
                Fee Structure
              </Typography>
              <Typography variant="body2">
                {feeStructureRow.description || 'N/A'} | {feeStructureRow.academic_year} |{' '}
                {feeStructureRow.term}
              </Typography>
              <Typography variant="body2">
                Due Date:{' '}
                {feeStructureRow.due_date
                  ? new Date(feeStructureRow.due_date).toLocaleDateString()
                  : 'N/A'}
              </Typography>
              <TableContainer component={Paper} sx={{ mt: 2, overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Component</TableCell>
                      <TableCell align="right">Amount (FCFA)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {feeStructureRow.components?.map((comp: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>{comp.name || comp.component_name}</TableCell>
                        <TableCell align="right">{safeToFixed(comp.amount)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell>
                        <strong>Total Expected</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>
                          {safeToFixed(
                            feeStructureRow.total_expected_amount ??
                              (summary as any).totalExpected
                          )}
                        </strong>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Payment History */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontSize: isMobile ? '1rem' : '1.25rem' }}>
              Payment History
            </Typography>
            {summary.payments && summary.payments.length > 0 ? (
              <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Receipt #</TableCell>
                      <TableCell>Component</TableCell>
                      <TableCell>Method</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {summary.payments.map((p: any) => (
                      <TableRow key={p.payment_id || p.id}>
                        <TableCell>
                          {p.payment_date ? new Date(p.payment_date).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell>{p.receipt_number || '—'}</TableCell>
                        <TableCell>{p.component_name || '—'}</TableCell>
                        <TableCell>{p.payment_method || '—'}</TableCell>
                        <TableCell align="right">{safeToFixed(p.amount_paid)}</TableCell>
                        <TableCell>
                          <Chip
                            label={p.status || 'active'}
                            color={p.status === 'active' ? 'success' : 'error'}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={4}>
                        <strong>Total Paid</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>{safeToFixed(summary.totalPaid)}</strong>
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography variant="body2" color="textSecondary">
                No payments recorded.
              </Typography>
            )}
          </Box>

          {/* Outstanding Balance */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Paper
              elevation={3}
              sx={{
                p: 2,
                bgcolor: Number(summary.outstandingBalance) > 0 ? 'error.light' : 'success.light',
                width: isMobile ? '100%' : 'auto',
              }}
            >
              <Typography variant="h6" sx={{ fontSize: isMobile ? '1rem' : '1.25rem' }}>
                Outstanding Balance: FCFA{' '}
                {safeToFixed(Math.max(0, Number(summary.outstandingBalance) || 0))}
              </Typography>
            </Paper>
          </Box>
        </Paper>
      ) : summary && !summary.studentFound ? (
        <Alert severity="warning">Student not found.</Alert>
      ) : null}
    </Box>
  );
};

export default StudentFeeStatementPage;