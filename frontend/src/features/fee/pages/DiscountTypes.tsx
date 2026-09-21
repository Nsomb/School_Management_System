import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Chip,
  Alert,
  Tabs,
  Tab,
  Autocomplete,
  Grid,
  CircularProgress,
  Snackbar,
  useTheme,
  useMediaQuery,
  Divider
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  PersonAdd,
  PersonRemove
} from '@mui/icons-material';
import { useFeeApi } from '../hooks/useFeeApi';
import type { DiscountType, Student, StudentDiscount, ClassSummary } from '../types/feeTypes';

interface TabPanelProps {
  children: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index} style={{ paddingTop: 16 }}>
      {value === index && children}
    </div>
  );
}

const DiscountTypes: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const {
    getDiscountTypes,
    createDiscountType,
    updateDiscountType,
    deleteDiscountType,
    assignStudentDiscount,
    removeStudentDiscount,
    getStudentDiscounts,
    searchStudents,
    getAllClasses,
    getAllAcademicYears
  } = useFeeApi();

  const [activeTab, setActiveTab] = useState(0);

  // ─── State: Discount Types ──────────────────────────────────────────────
  const [types, setTypes] = useState<DiscountType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState<DiscountType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'percentage',
    value: '',
    description: ''
  });

  // ─── State: Student Assignments ──────────────────────────────────────────
  const [, setClasses] = useState<ClassSummary[]>([]);
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('Annual');
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedDiscountType, setSelectedDiscountType] = useState<number | ''>('');
  const [assignments, setAssignments] = useState<StudentDiscount[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // ─── Load Discount Types ──────────────────────────────────────────────────
  const fetchTypes = async () => {
    setLoading(true);
    try {
      const data = await getDiscountTypes();
      setTypes(data);
      setError(null);
    } catch (err) {
      setError('Failed to load discount types.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  // ─── Load dropdowns for assignments ──────────────────────────────────────
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [cls, years] = await Promise.all([
          getAllClasses(),
          getAllAcademicYears()
        ]);
        setClasses(cls);
        setAcademicYears(years);
        if (years.length > 0) setSelectedYear(years[0]);
      } catch (err) {
        console.error('Failed to load options:', err);
      }
    };
    fetchOptions();
  }, []);

  // ─── Search students ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchStudents = async () => {
      if (searchQuery.length < 2) {
        setStudents([]);
        return;
      }
      try {
        const results = await searchStudents(searchQuery);
        setStudents(results);
      } catch (err) {
        setStudents([]);
      }
    };
    const timeout = setTimeout(fetchStudents, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // ─── Load assignments when student changes ──────────────────────────────
  useEffect(() => {
    const fetchAssignments = async () => {
      if (!selectedStudent || !selectedYear) {
        setAssignments([]);
        return;
      }
      setLoadingAssignments(true);
      try {
        const data = await getStudentDiscounts(selectedStudent.id, selectedYear, selectedTerm);
        setAssignments(data);
      } catch (err) {
        setAssignments([]);
      } finally {
        setLoadingAssignments(false);
      }
    };
    fetchAssignments();
  }, [selectedStudent, selectedYear, selectedTerm]);

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleOpen = (type?: DiscountType) => {
    if (type) {
      setEditing(type);
      setFormData({
        name: type.name,
        type: type.type,
        value: String(type.value),
        description: type.description || ''
      });
    } else {
      setEditing(null);
      setFormData({ name: '', type: 'percentage', value: '', description: '' });
    }
    setOpenDialog(true);
  };

  const handleClose = () => setOpenDialog(false);

  const handleSaveType = async () => {
    try {
      const data = {
        name: formData.name,
        type: formData.type as 'percentage' | 'fixed',
        value: parseFloat(formData.value),
        description: formData.description
      };
      if (editing) {
        await updateDiscountType(editing.id, data);
      } else {
        await createDiscountType(data);
      }
      await fetchTypes();
      handleClose();
      setSnackbar({ open: true, message: 'Discount type saved.', severity: 'success' });
    } catch (err) {
      setError('Failed to save discount type.');
      setSnackbar({ open: true, message: 'Failed to save discount type.', severity: 'error' });
    }
  };

  const handleDeleteType = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this discount type?')) {
      try {
        await deleteDiscountType(id);
        await fetchTypes();
        setSnackbar({ open: true, message: 'Discount type deleted.', severity: 'success' });
      } catch (err) {
        setSnackbar({ open: true, message: 'Failed to delete discount type.', severity: 'error' });
      }
    }
  };

  const handleAssignDiscount = async () => {
    if (!selectedStudent || !selectedDiscountType || !selectedYear) return;

    setAssigning(true);
    try {
      await assignStudentDiscount({
        studentId: selectedStudent.id,
        discountTypeId: selectedDiscountType,
        academicYear: selectedYear,
        term: selectedTerm,
        notes: ''
      });
      const data = await getStudentDiscounts(selectedStudent.id, selectedYear, selectedTerm);
      setAssignments(data);
      setSelectedDiscountType('');
      setSnackbar({ open: true, message: 'Discount assigned successfully.', severity: 'success' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to assign discount.';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveAssignment = async (id: number) => {
    if (!window.confirm('Remove this discount from the student?')) return;
    setRemoving(id);
    try {
      await removeStudentDiscount(id);
      const data = await getStudentDiscounts(selectedStudent!.id, selectedYear, selectedTerm);
      setAssignments(data);
      setSnackbar({ open: true, message: 'Discount removed.', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to remove discount.', severity: 'error' });
    } finally {
      setRemoving(null);
    }
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 3 }, bgcolor: { xs: 'background.default', sm: 'transparent' } }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, px: { xs: 1, sm: 0 } }}>
        Discounts
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Main Wrapper: Disables Paper elevation & borders on mobile */}
      <Paper 
        elevation={isMobile ? 0 : 3} 
        sx={{ 
          p: { xs: 1, sm: 3 },
          bgcolor: isMobile ? 'transparent' : 'background.paper',
          border: isMobile ? 'none' : undefined
        }}
      >
        <Tabs 
          value={activeTab} 
          onChange={(_, v) => setActiveTab(v)} 
          variant={isMobile ? "fullWidth" : "standard"}
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Discount Types" />
          <Tab label="Student Assignments" />
        </Tabs>

        {/* ================================================================ */}
        {/* TAB 1: DISCOUNT TYPES */}
        {/* ================================================================ */}
        <TabPanel value={activeTab} index={0}>
          <Box display="flex" justifyContent="flex-end" mb={2}>
            <Button 
              variant="contained" 
              startIcon={<Add />} 
              onClick={() => handleOpen()}
              fullWidth={isMobile}
              size="large"
            >
              New Discount
            </Button>
          </Box>

          {isMobile ? (
            /* Flat Mobile Cards (No nested inner elevation) */
            <Box display="flex" flexDirection="column" gap={1.5}>
              {types.map((type) => (
                <Box 
                  key={type.id}
                  sx={{ 
                    bgcolor: 'background.paper', 
                    borderRadius: 2, 
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {type.name}
                    </Typography>
                    <Chip
                      label={type.type}
                      color={type.type === 'percentage' ? 'primary' : 'secondary'}
                      size="small"
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary">
                    <strong>Value: </strong>
                    {type.type === 'percentage' ? `${type.value}%` : `FCFA ${type.value.toFixed(2)}`}
                  </Typography>

                  {type.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {type.description}
                    </Typography>
                  )}

                  <Divider sx={{ my: 1.5 }} />

                  <Box display="flex" justifyContent="flex-end" gap={1}>
                    <Button size="small" startIcon={<Edit />} onClick={() => handleOpen(type)}>
                      Edit
                    </Button>
                    <Button size="small" color="error" startIcon={<Delete />} onClick={() => handleDeleteType(type.id)}>
                      Delete
                    </Button>
                  </Box>
                </Box>
              ))}
              {types.length === 0 && !loading && (
                <Typography align="center" color="text.secondary" sx={{ py: 3 }}>
                  No discount types found.
                </Typography>
              )}
            </Box>
          ) : (
            /* Desktop Table View */
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Value</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {types.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell>{type.name}</TableCell>
                      <TableCell>
                        <Chip
                          label={type.type}
                          color={type.type === 'percentage' ? 'primary' : 'secondary'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {type.type === 'percentage' ? `${type.value}%` : `FCFA ${type.value.toFixed(2)}`}
                      </TableCell>
                      <TableCell>{type.description || '-'}</TableCell>
                      <TableCell align="right">
                        <IconButton onClick={() => handleOpen(type)}><Edit /></IconButton>
                        <IconButton onClick={() => handleDeleteType(type.id)}><Delete /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {types.length === 0 && !loading && (
                    <TableRow><TableCell colSpan={5} align="center">No discount types found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Dialog Form */}
          <Dialog 
            open={openDialog} 
            onClose={handleClose} 
            maxWidth="sm" 
            fullWidth
            fullScreen={isMobile}
          >
            <DialogTitle>{editing ? 'Edit Discount Type' : 'Create Discount Type'}</DialogTitle>
            <DialogContent>
              <TextField
                label="Name" fullWidth margin="dense" required
                value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <FormControl fullWidth margin="dense">
                <InputLabel>Type</InputLabel>
                <Select
                  value={formData.type} label="Type"
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <MenuItem value="percentage">Percentage</MenuItem>
                  <MenuItem value="fixed">Fixed Amount</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Value" fullWidth margin="dense" required
                type="number" value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                helperText={formData.type === 'percentage' ? 'e.g., 10 for 10%' : 'e.g., 5000 for FCFA 5,000'}
              />
              <TextField
                label="Description" fullWidth margin="dense" multiline rows={2}
                value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={handleClose}>Cancel</Button>
              <Button variant="contained" onClick={handleSaveType}>Save</Button>
            </DialogActions>
          </Dialog>
        </TabPanel>

        {/* ================================================================ */}
        {/* TAB 2: STUDENT ASSIGNMENTS */}
        {/* ================================================================ */}
        <TabPanel value={activeTab} index={1}>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} md={5}>
              <Autocomplete
                options={students}
                getOptionLabel={(opt) => `${opt.name} (${opt.class_name})`}
                value={selectedStudent}
                onChange={(_, val) => setSelectedStudent(val)}
                onInputChange={(_, val) => setSearchQuery(val)}
                renderInput={(params) => (
                  <TextField {...params} label="Search Student (min 2 chars)" fullWidth size="small" />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Academic Year</InputLabel>
                <Select
                  value={selectedYear}
                  label="Academic Year"
                  onChange={(e) => setSelectedYear(e.target.value)}
                >
                  {academicYears.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Term</InputLabel>
                <Select
                  value={selectedTerm}
                  label="Term"
                  onChange={(e) => setSelectedTerm(e.target.value)}
                >
                  <MenuItem value="Term 1">Term 1</MenuItem>
                  <MenuItem value="Term 2">Term 2</MenuItem>
                  <MenuItem value="Term 3">Term 3</MenuItem>
                  <MenuItem value="Annual">Annual</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Discount</InputLabel>
                <Select
                  value={selectedDiscountType}
                  label="Discount"
                  onChange={(e) => setSelectedDiscountType(e.target.value as number)}
                  disabled={!selectedStudent}
                >
                  <MenuItem value="">Select discount...</MenuItem>
                  {types.map(t => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.name} ({t.type === 'percentage' ? `${t.value}%` : `FCFA ${t.value}`})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Button
                variant="contained"
                startIcon={<PersonAdd />}
                onClick={handleAssignDiscount}
                disabled={!selectedStudent || !selectedDiscountType || assigning}
                fullWidth={isMobile}
              >
                {assigning ? <CircularProgress size={20} /> : 'Assign Discount'}
              </Button>
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
            Current Assignments
            {selectedStudent && ` for ${selectedStudent.name}`}
          </Typography>

          {loadingAssignments ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : assignments.length > 0 ? (
            isMobile ? (
              <Box display="flex" flexDirection="column" gap={1.5}>
                {assignments.map((a) => (
                  <Box 
                    key={a.id}
                    sx={{ 
                      bgcolor: 'background.paper', 
                      borderRadius: 2, 
                      p: 2,
                      border: '1px solid',
                      borderColor: 'divider'
                    }}
                  >
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="subtitle1" fontWeight={600}>{a.student_name}</Typography>
                      <Chip
                        label={a.discount_type}
                        size="small"
                        color={a.discount_type === 'percentage' ? 'primary' : 'secondary'}
                      />
                    </Box>

                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" display="block">Class</Typography>
                        <Typography variant="body2">{a.class_name}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" display="block">Discount</Typography>
                        <Typography variant="body2">{a.discount_name}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" display="block">Value</Typography>
                        <Typography variant="body2">
                          {a.discount_type === 'percentage' ? `${a.discount_value}%` : `FCFA ${a.discount_value}`}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" display="block">Term</Typography>
                        <Typography variant="body2">{a.academic_year} ({a.term})</Typography>
                      </Grid>
                    </Grid>

                    <Divider sx={{ my: 1.5 }} />

                    <Box display="flex" justifyContent="flex-end">
                      <Button
                        color="error"
                        size="small"
                        startIcon={removing === a.id ? <CircularProgress size={16} /> : <PersonRemove />}
                        onClick={() => handleRemoveAssignment(a.id)}
                        disabled={removing === a.id}
                      >
                        Remove
                      </Button>
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Student</TableCell>
                      <TableCell>Class</TableCell>
                      <TableCell>Discount</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Value</TableCell>
                      <TableCell>Academic Year</TableCell>
                      <TableCell>Term</TableCell>
                      <TableCell align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {assignments.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>{a.student_name}</TableCell>
                        <TableCell>{a.class_name}</TableCell>
                        <TableCell>{a.discount_name}</TableCell>
                        <TableCell>
                          <Chip
                            label={a.discount_type}
                            size="small"
                            color={a.discount_type === 'percentage' ? 'primary' : 'secondary'}
                          />
                        </TableCell>
                        <TableCell>
                          {a.discount_type === 'percentage' ? `${a.discount_value}%` : `FCFA ${a.discount_value}`}
                        </TableCell>
                        <TableCell>{a.academic_year}</TableCell>
                        <TableCell>{a.term}</TableCell>
                        <TableCell align="right">
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleRemoveAssignment(a.id)}
                            disabled={removing === a.id}
                          >
                            {removing === a.id ? <CircularProgress size={16} /> : <PersonRemove />}
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )
          ) : (
            <Typography color="textSecondary">
              {selectedStudent ? 'No discounts assigned to this student.' : 'Select a student to view assignments.'}
            </Typography>
          )}
        </TabPanel>
      </Paper>

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

export default DiscountTypes;