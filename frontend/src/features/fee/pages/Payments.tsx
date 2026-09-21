import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Autocomplete,
  Button,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Snackbar,
  IconButton,
  Chip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { Close as CloseIcon, Download as DownloadIcon } from '@mui/icons-material';
import { useFeeApi } from '../hooks/useFeeApi';
import type { Student } from '../types/feeTypes';

const PaymentsPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const {
    getStudentsByClass,
    getAllClasses,
    getAllAcademicYears,
    getFeeStructures,
    recordPayment,
    downloadReceipt,
    getStudentDiscounts,
  } = useFeeApi();

  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | ''>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [components, setComponents] = useState<{ name: string; amount: number }[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<string>('');
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [studentDiscount, setStudentDiscount] = useState<any | null>(null);
  const [loadingDiscount, setLoadingDiscount] = useState(false);
  const [formData, setFormData] = useState({
    academic_year: '',
    amount_paid: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'Cash',
    notes: '',
    reference_number: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [receiptInfo, setReceiptInfo] = useState<{ paymentId: number; receiptNumber: string } | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  // Load classes and academic years
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [classesRes, yearsRes] = await Promise.all([getAllClasses(), getAllAcademicYears()]);
        setClasses(classesRes.map(c => ({ id: c.id, name: c.name })));
        setAcademicYears(yearsRes);
        if (yearsRes.length > 0) {
          setFormData(prev => ({ ...prev, academic_year: yearsRes[0] }));
        }
      } catch (err) {
        console.error('Failed to load options:', err);
      }
    };
    fetchOptions();
  }, []);

  // Load students and components when class/academic year changes
  useEffect(() => {
    if (!selectedClassId || !formData.academic_year) {
      setStudents([]);
      setSelectedStudent(null);
      setComponents([]);
      setStudentDiscount(null);
      return;
    }
    const fetchData = async () => {
      setLoadingStudents(true);
      try {
        const [studentsData, structuresData] = await Promise.all([
          getStudentsByClass(selectedClassId),
          getFeeStructures(selectedClassId, formData.academic_year)
        ]);
        setStudents(studentsData);
        if (structuresData && structuresData.length > 0) {
          const structure = structuresData[0];
          const comps = structure.components || [];
          setComponents(comps);
          if (comps.length > 0) {
            setSelectedComponent(comps[0].name);
          } else {
            setSelectedComponent('');
          }
        } else {
          setComponents([]);
          setSelectedComponent('');
        }
      } catch (err) {
        console.error('Failed to load data:', err);
        setStudents([]);
        setComponents([]);
      } finally {
        setLoadingStudents(false);
      }
    };
    fetchData();
  }, [selectedClassId, formData.academic_year]);

  // Fetch student discount when student is selected
  useEffect(() => {
    const fetchDiscount = async () => {
      if (!selectedStudent || !formData.academic_year) {
        setStudentDiscount(null);
        return;
      }
      setLoadingDiscount(true);
      try {
        const term = 'Annual';
        const discounts = await getStudentDiscounts(selectedStudent.id, formData.academic_year, term);
        if (discounts && discounts.length > 0) {
          setStudentDiscount(discounts[0]);
        } else {
          setStudentDiscount(null);
        }
      } catch (err) {
        console.error('Failed to fetch discounts:', err);
        setStudentDiscount(null);
      } finally {
        setLoadingDiscount(false);
      }
    };
    fetchDiscount();
  }, [selectedStudent, formData.academic_year]);

  // Filter students locally by search query
  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate total fee (sum of all components) or use component amount
  const getTotalFee = () => {
    if (selectedComponent && components.length > 0) {
      const comp = components.find(c => c.name === selectedComponent);
      return comp ? comp.amount : 0;
    }
    return components.reduce((sum, c) => sum + c.amount, 0);
  };

  const totalFee = getTotalFee();
  const discountValue = studentDiscount ? studentDiscount.discount_value || 0 : 0;
  const discountType = studentDiscount ? studentDiscount.discount_type || 'percentage' : 'percentage';
  const discountAmount = discountType === 'percentage'
    ? (totalFee * discountValue) / 100
    : discountValue;
  const netAmount = totalFee - discountAmount;

  const handleDownloadReceipt = async () => {
    if (!receiptInfo) return;
    setDownloading(true);
    try {
      const blob = await downloadReceipt(receiptInfo.paymentId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt_${receiptInfo.receiptNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setSnackbarMessage('Receipt downloaded successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (err) {
      setSnackbarMessage('Failed to download receipt. Please try again.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setDownloading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedStudent) {
      setError('Please select a student.');
      return;
    }
    if (!selectedClassId) {
      setError('Please select a class.');
      return;
    }
    if (!formData.academic_year) {
      setError('Please select an academic year.');
      return;
    }
    if (!formData.amount_paid || parseFloat(formData.amount_paid) <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);
    setReceiptInfo(null);

    try {
      const payload: any = {
        student_identifier: selectedStudent.name,
        class_name: classes.find(c => c.id === selectedClassId)?.name || '',
        academic_year: formData.academic_year,
        term: 'Annual',
        amount_paid: parseFloat(formData.amount_paid),
        payment_date: formData.payment_date,
        payment_method: formData.payment_method,
        notes: formData.notes || undefined,
        reference_number: formData.reference_number || undefined,
        component_name: selectedComponent || undefined,
      };
      const response = await recordPayment(payload);
      setSuccess(true);
      setReceiptInfo({
        paymentId: response.paymentId,
        receiptNumber: response.receiptNumber,
      });
      setSnackbarMessage(`Payment recorded successfully! Receipt #${response.receiptNumber}`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setSelectedStudent(null);
      setStudentDiscount(null);
      setFormData(prev => ({
        ...prev,
        amount_paid: '',
        notes: '',
        reference_number: '',
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Payment failed.';
      setSnackbarMessage(msg);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  return (
    <Box 
      sx={{ 
        width: '100%', 
        maxWidth: '100%', 
        boxSizing: 'border-box', 
        p: { xs: 1.5, sm: 3 },
        bgcolor: { xs: 'background.default', sm: 'transparent' }
      }}
    >
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, px: { xs: 0.5, sm: 0 } }}>
        Record Payment
      </Typography>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        action={
          <IconButton size="small" color="inherit" onClick={handleSnackbarClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
          action={
            snackbarSeverity === 'success' && receiptInfo ? (
              <Button
                color="inherit"
                size="small"
                startIcon={downloading ? <CircularProgress size={16} /> : <DownloadIcon />}
                onClick={handleDownloadReceipt}
                disabled={downloading}
              >
                {downloading ? 'Downloading...' : 'Download'}
              </Button>
            ) : null
          }
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {/* Main Container Paper: Full width, removes borders/shadows on mobile */}
      <Paper 
        elevation={isMobile ? 0 : 3} 
        sx={{ 
          p: { xs: 2, sm: 3 }, 
          width: '100%', 
          maxWidth: '100%', 
          boxSizing: 'border-box',
          bgcolor: isMobile ? 'transparent' : 'background.paper',
          border: isMobile ? 'none' : undefined
        }}
      >
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Class *</InputLabel>
              <Select
                value={selectedClassId}
                label="Class *"
                onChange={(e) => {
                  setSelectedClassId(e.target.value as number);
                  setSelectedStudent(null);
                  setStudentDiscount(null);
                }}
                required
              >
                {classes.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Academic Year *</InputLabel>
              <Select
                value={formData.academic_year}
                label="Academic Year *"
                onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                required
              >
                {academicYears.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Autocomplete
              options={filteredStudents}
              getOptionLabel={(option) => option.name}
              value={selectedStudent}
              onChange={(_, value) => {
                setSelectedStudent(value);
                setStudentDiscount(null);
              }}
              loading={loadingStudents}
              loadingText="Loading students..."
              noOptionsText={!selectedClassId ? "Select a class first" : "No students in this class"}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Student *"
                  size="small"
                  fullWidth
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={!selectedClassId}
                  helperText={!selectedClassId ? "Please select a class first" : "Type to filter students"}
                />
              )}
            />
          </Grid>

          {components.length > 0 && (
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Component (optional)</InputLabel>
                <Select
                  value={selectedComponent}
                  label="Component (optional)"
                  onChange={(e) => setSelectedComponent(e.target.value)}
                >
                  {components.map((c) => (
                    <MenuItem key={c.name} value={c.name}>
                      {c.name} (FCFA {c.amount.toFixed(0)})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}

          {/* Discount Information Display */}
          {selectedStudent && !loadingDiscount && studentDiscount && (
            <Grid item xs={12}>
              <Alert severity="info" icon={<Chip label="Discount" size="small" color="success" />}>
                <strong>Discount Applied:</strong> {studentDiscount.discount_name || 'Discount'} 
                ({studentDiscount.discount_type === 'percentage' ? `${studentDiscount.discount_value}%` : `FCFA ${studentDiscount.discount_value}`})
                <br />
                <strong>Original Fee:</strong> FCFA {totalFee.toFixed(0)} &nbsp;→&nbsp;
                <strong>Net Amount:</strong> FCFA {netAmount.toFixed(0)}
              </Alert>
            </Grid>
          )}

          {selectedStudent && loadingDiscount && (
            <Grid item xs={12}>
              <Box display="flex" alignItems="center" gap={1}>
                <CircularProgress size={18} />
                <Typography variant="body2" color="text.secondary">
                  Checking for discounts...
                </Typography>
              </Box>
            </Grid>
          )}

          <Grid item xs={12} sm={6}>
            <TextField
              label="Amount Paid (FCFA) *"
              type="number"
              size="small"
              fullWidth
              value={formData.amount_paid}
              onChange={(e) => setFormData({ ...formData, amount_paid: e.target.value })}
              required
              helperText={studentDiscount ? `Net amount due: FCFA ${netAmount.toFixed(0)}` : ''}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Payment Date *"
              type="date"
              size="small"
              fullWidth
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Payment Method *</InputLabel>
              <Select
                value={formData.payment_method}
                label="Payment Method *"
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                required
              >
                <MenuItem value="Cash">Cash</MenuItem>
                <MenuItem value="Mobile Money">Mobile Money</MenuItem>
                <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                <MenuItem value="Cheque">Cheque</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Reference Number (optional)"
              size="small"
              fullWidth
              value={formData.reference_number}
              onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
              helperText="e.g., M-Pesa code, bank transaction ID"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Notes (optional)"
              size="small"
              fullWidth
              multiline
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              helperText="Any additional information"
            />
          </Grid>

          <Grid item xs={12}>
            <Button 
              variant="contained" 
              onClick={handleSubmit} 
              disabled={loading}
              fullWidth={isMobile}
              size="large"
              sx={{ minWidth: 200 }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Record Payment'}
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default PaymentsPage;