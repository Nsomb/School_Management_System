import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
  IconButton,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Tooltip,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  Divider,
  Stack,
  TableHead
} from '@mui/material';
import {
  Download,
  Search,
  Block,
  Undo
} from '@mui/icons-material';
import { useFeeApi } from '../hooks/useFeeApi';
import type { Payment, Student, ClassSummary } from '../types/feeTypes';

const StudentPayments: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const {
    getStudentPayments,
    downloadReceipt,
    searchStudents,
    getAllClasses,
    voidPayment,
    reversePayment
  } = useFeeApi();

  const [student, setStudent] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | 'all'>('all');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Snackbar state
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Dialog state for void/reverse
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: 'void' | 'reverse' | null;
    paymentId: number | null;
    reason: string;
  }>({
    open: false,
    type: null,
    paymentId: null,
    reason: ''
  });

  // Load classes on mount
  useEffect(() => {
    let isMounted = true;
    const fetchClasses = async () => {
      try {
        const data = await getAllClasses();
        if (isMounted) setClasses(data);
      } catch (err) {
        console.error('Failed to load classes:', err);
      }
    };
    fetchClasses();
    return () => { isMounted = false; };
  }, [getAllClasses]);

  // Search students with 300ms Debounce & Type-Safe Class Filtering
  useEffect(() => {
    let isMounted = true;
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchStudents(searchQuery);

        const filtered = selectedClass === 'all'
          ? results
          : results.filter((s: any) => {
              // Convert both IDs to strings to handle type mismatches (e.g., number 3 vs string "3")
              const matchesId = s.class_id !== undefined && String(s.class_id) === String(selectedClass);

              // Fallback match using class name string
              const currentClassObj = classes.find((c) => c.id === selectedClass);
              const matchesName = currentClassObj && s.class_name === currentClassObj.name;

              return matchesId || matchesName;
            });

        if (isMounted) setSearchResults(filtered);
      } catch (err) {
        if (isMounted) setSearchResults([]);
      } finally {
        if (isMounted) setSearching(false);
      }
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchQuery, selectedClass, classes, searchStudents]);

  const handleSelectStudent = (selected: Student | null) => {
    setStudent(selected);
    if (!selected) setPayments([]);
  };

  const handleFetchPayments = useCallback(async () => {
    if (!student) {
      setError('Please select a student.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getStudentPayments(student.id);
      setPayments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments.');
    } finally {
      setLoading(false);
    }
  }, [student, getStudentPayments]);

  // Auto-fetch when student selection changes
  useEffect(() => {
    if (student) {
      handleFetchPayments();
    }
  }, [student, handleFetchPayments]);

  const handleDownload = async (paymentId: number, receiptNumber: string) => {
    setDownloading(paymentId);
    try {
      const blob = await downloadReceipt(paymentId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt_${receiptNumber}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to download receipt.', severity: 'error' });
    } finally {
      setDownloading(null);
    }
  };

  // ─── Void / Reverse Handlers ──────────────────────────────────────────────
  const handleVoid = (paymentId: number) => {
    setActionDialog({ open: true, type: 'void', paymentId, reason: '' });
  };

  const handleReverse = (paymentId: number) => {
    setActionDialog({ open: true, type: 'reverse', paymentId, reason: '' });
  };

  const handleActionConfirm = async () => {
    const { type, paymentId, reason } = actionDialog;
    if (!paymentId || !type) return;
    if (!reason.trim()) {
      setSnackbar({ open: true, message: 'Please provide a reason.', severity: 'error' });
      return;
    }

    setActionLoading(paymentId);
    try {
      if (type === 'void') {
        await voidPayment(paymentId, reason);
        setSnackbar({ open: true, message: `Payment #${paymentId} voided.`, severity: 'success' });
      } else {
        await reversePayment(paymentId, reason);
        setSnackbar({ open: true, message: `Payment #${paymentId} reversed.`, severity: 'success' });
      }
      await handleFetchPayments();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Action failed.',
        severity: 'error'
      });
    } finally {
      setActionLoading(null);
      setActionDialog({ open: false, type: null, paymentId: null, reason: '' });
    }
  };

  const handleActionCancel = () => {
    setActionDialog({ open: false, type: null, paymentId: null, reason: '' });
  };

  const formatAmount = (amount: any) => {
    const num = typeof amount === 'number' ? amount : parseFloat(amount);
    return isNaN(num) ? '0' : num.toFixed(0);
  };

  return (
    <Box sx={{ p: isMobile ? 1.5 : 3, width: '100%', boxSizing: 'border-box' }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
        Student Payments
      </Typography>

      {/* ─── Search Controls ─────────────────────────────────────────────────── */}
      <Paper
        elevation={isMobile ? 0 : 2}
        sx={{
          p: 2,
          mb: 3,
          display: 'flex',
          gap: 2,
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          bgcolor: isMobile ? 'transparent' : 'background.paper',
          border: isMobile ? 'none' : undefined
        }}
      >
        <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 160 }}>
          <InputLabel>Class</InputLabel>
          <Select
            value={selectedClass}
            label="Class"
            onChange={(e) => setSelectedClass(e.target.value as number | 'all')}
          >
            <MenuItem value="all">All Classes</MenuItem>
            {classes.map(cls => (
              <MenuItem key={cls.id} value={cls.id}>{cls.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Autocomplete
          options={searchResults}
          getOptionLabel={(option) => `${option.name} (${option.class_name})`}
          value={student}
          onChange={(_, value) => handleSelectStudent(value)}
          onInputChange={(_, value) => setSearchQuery(value)}
          loading={searching}
          sx={{ flex: 1 }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Search Student (min 2 chars)"
              variant="outlined"
              size="small"
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {searching ? <CircularProgress size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                )
              }}
            />
          )}
        />

        <Button
          variant="contained"
          onClick={handleFetchPayments}
          disabled={!student || loading}
          startIcon={<Search />}
          fullWidth={isMobile}
        >
          View Payments
        </Button>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* ─── Payments Display Section ──────────────────────────────────────── */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : payments.length > 0 ? (
        isMobile ? (
          /* Mobile Card Layout */
          <Stack spacing={2}>
            {payments.map((p) => (
              <Card key={p.id} variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {p.receipt_number}
                    </Typography>
                    <Chip
                      label={p.status || 'active'}
                      color={p.status === 'active' ? 'success' : p.status === 'void' ? 'warning' : 'error'}
                      size="small"
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary">
                    {p.component_name || 'General Payment'}
                  </Typography>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', my: 1 }}>
                    <Typography variant="body2">
                      Date: {new Date(p.payment_date).toLocaleDateString()}
                    </Typography>
                    <Typography variant="subtitle1" fontWeight="bold" color="primary.main">
                      FCFA {formatAmount(p.amount_paid)}
                    </Typography>
                  </Box>

                  <Typography variant="caption" color="text.secondary" display="block">
                    Method: {p.payment_method} {p.reference_number ? `| Ref: ${p.reference_number}` : ''}
                  </Typography>

                  {p.status === 'active' && (
                    <>
                      <Divider sx={{ my: 1.5 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                        <Button
                          size="small"
                          startIcon={<Download fontSize="small" />}
                          onClick={() => handleDownload(p.id, p.receipt_number)}
                          disabled={downloading === p.id}
                        >
                          Receipt
                        </Button>
                        <Button
                          size="small"
                          color="warning"
                          startIcon={<Block fontSize="small" />}
                          onClick={() => handleVoid(p.id)}
                          disabled={actionLoading === p.id}
                        >
                          Void
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          startIcon={<Undo fontSize="small" />}
                          onClick={() => handleReverse(p.id)}
                          disabled={actionLoading === p.id}
                        >
                          Reverse
                        </Button>
                      </Box>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </Stack>
        ) : (
          /* Desktop Table Layout */
          <TableContainer component={Paper}>
            <Table size="medium">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Receipt #</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Component</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Amount (FCFA)</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Method</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Reference</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{new Date(p.payment_date).toLocaleDateString()}</TableCell>
                    <TableCell>{p.receipt_number}</TableCell>
                    <TableCell>{p.component_name || '—'}</TableCell>
                    <TableCell align="right">{formatAmount(p.amount_paid)}</TableCell>
                    <TableCell>{p.payment_method}</TableCell>
                    <TableCell>{p.reference_number || '—'}</TableCell>
                    <TableCell>
                      <Chip
                        label={p.status || 'active'}
                        color={p.status === 'active' ? 'success' : p.status === 'void' ? 'warning' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      {p.status === 'active' && (
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                          <Tooltip title="Download Receipt">
                            <IconButton
                              size="small"
                              onClick={() => handleDownload(p.id, p.receipt_number)}
                              disabled={downloading === p.id}
                              color="primary"
                            >
                              <Download fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Void Payment">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => handleVoid(p.id)}
                              disabled={actionLoading === p.id}
                            >
                              <Block fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Reverse Payment">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleReverse(p.id)}
                              disabled={actionLoading === p.id}
                            >
                              <Undo fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )
      ) : student ? (
        <Typography color="text.secondary">No payments found for this student.</Typography>
      ) : (
        <Typography color="text.secondary">Select a student to view payments.</Typography>
      )}

      {/* ─── Confirmation Dialog ────────────────────────────────────────────── */}
      <Dialog open={actionDialog.open} onClose={handleActionCancel} maxWidth="sm" fullWidth>
        <DialogTitle>
          {actionDialog.type === 'void' ? 'Void Payment' : 'Reverse Payment'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" gutterBottom sx={{ mt: 1 }}>
            {actionDialog.type === 'void'
              ? 'Voiding a payment will mark it as invalid. This action cannot be undone.'
              : 'Reversing a payment will create a negative payment entry. This action cannot be undone.'}
          </Typography>
          <TextField
            label="Reason *"
            fullWidth
            multiline
            rows={2}
            margin="dense"
            value={actionDialog.reason}
            onChange={(e) =>
              setActionDialog((prev) => ({ ...prev, reason: e.target.value }))
            }
            placeholder="e.g., Incorrect amount, Duplicate payment, etc."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleActionCancel}>Cancel</Button>
          <Button
            variant="contained"
            color={actionDialog.type === 'void' ? 'warning' : 'error'}
            onClick={handleActionConfirm}
            disabled={actionLoading !== null}
          >
            {actionLoading ? <CircularProgress size={20} /> : `Confirm ${actionDialog.type === 'void' ? 'Void' : 'Reverse'}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Feedback Snackbar ─────────────────────────────────────────────── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default StudentPayments;