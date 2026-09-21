import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { useFeeApi } from '../../hooks/useFeeApi';
import type { ClassFeeSummary as ClassFeeSummaryType, ClassSummary, FeeStructure, FeeComponent } from '../../types/feeTypes';

const ClassFeeSummary: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { getClassFeeSummary, getAllClasses, getAllAcademicYears, getFeeStructures } = useFeeApi();

  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassSummary | null>(null);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedFeeStructure, setSelectedFeeStructure] = useState<FeeStructure | null>(null);
  const [components, setComponents] = useState<FeeComponent[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<string>('all');
  const [summary, setSummary] = useState<ClassFeeSummaryType | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch initial classes and academic years
  useEffect(() => {
    let isMounted = true;
    const fetchInitialData = async () => {
      try {
        const [classesData, yearsData] = await Promise.all([
          getAllClasses(),
          getAllAcademicYears()
        ]);
        if (isMounted) {
          setClasses(classesData || []);
          setAcademicYears(yearsData || []);
          if (yearsData && yearsData.length > 0) {
            setSelectedYear(yearsData[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    };
    fetchInitialData();
    return () => { isMounted = false; };
  }, [getAllClasses, getAllAcademicYears]);

  // Fetch Fee Structures when Class or Year changes
  useEffect(() => {
    let isMounted = true;
    const fetchFeeStructures = async () => {
      if (selectedClass && selectedYear) {
        try {
          const structures = await getFeeStructures(selectedClass.id, selectedYear);
          if (isMounted) {
            setFeeStructures(structures || []);
            if (structures && structures.length > 0) {
              setSelectedFeeStructure(structures[0]);
            } else {
              setSelectedFeeStructure(null);
            }
          }
        } catch (err) {
          console.error('Failed to load fee structures:', err);
        }
      }
    };
    fetchFeeStructures();
    return () => { isMounted = false; };
  }, [selectedClass, selectedYear, getFeeStructures]);

  // Update available components when selected Fee Structure changes
  useEffect(() => {
    if (selectedFeeStructure && selectedFeeStructure.components) {
      setComponents(selectedFeeStructure.components);
      setSelectedComponent('all');
    } else {
      setComponents([]);
      setSelectedComponent('all');
    }
  }, [selectedFeeStructure]);

  // Main Fetch Summary Function
  const fetchSummary = useCallback(async (compOverride?: string) => {
    if (!selectedClass || !selectedYear || !selectedFeeStructure) return;

    setLoading(true);
    try {
      const activeComponent = compOverride !== undefined ? compOverride : selectedComponent;
      const data = await getClassFeeSummary(
        selectedClass.id,
        selectedYear,
        selectedFeeStructure.id,
        activeComponent === 'all' ? undefined : activeComponent
      );
      setSummary(data);
    } catch (err) {
      console.error('Failed to fetch class summary:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedClass, selectedYear, selectedFeeStructure, selectedComponent, getClassFeeSummary]);

  // Refetch summary automatically when component selection changes
  const handleComponentChange = (componentName: string) => {
    setSelectedComponent(componentName);
    if (summary && selectedClass && selectedYear && selectedFeeStructure) {
      fetchSummary(componentName);
    }
  };

  const classTotals = useMemo(() => {
    if (!summary) return { totalExpected: 0, totalPaid: 0, studentCount: 0, percentage: 0 };
    const studentCount = summary.students?.length || 0;
    const perStudentFee = summary.feeStructure?.total_expected_amount || 0;
    const totalExpected = perStudentFee * studentCount;
    const totalPaid = summary.students?.reduce((sum, s) => sum + (s.total_paid || 0), 0) || 0;
    const percentage = totalExpected > 0 ? (totalPaid / totalExpected) * 100 : 0;
    return { totalExpected, totalPaid, studentCount, percentage };
  }, [summary]);

  const filterForm = (
    <Grid container spacing={2} mb={3}>
      <Grid item xs={12} sm={6} md={3}>
        <FormControl fullWidth size="small">
          <InputLabel>Class</InputLabel>
          <Select
            value={selectedClass?.id || ''}
            onChange={(e) => {
              const classId = e.target.value as number;
              const cls = classes.find(c => c.id === classId) || null;
              setSelectedClass(cls);
            }}
            label="Class"
          >
            {classes.map((cls) => (
              <MenuItem key={cls.id} value={cls.id}>{cls.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <FormControl fullWidth size="small">
          <InputLabel>Academic Year</InputLabel>
          <Select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value as string)}
            label="Academic Year"
          >
            {academicYears.map((year) => (
              <MenuItem key={year} value={year}>{year}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <FormControl fullWidth size="small">
          <InputLabel>Fee Structure</InputLabel>
          <Select
            value={selectedFeeStructure?.id || ''}
            onChange={(e) => {
              const structureId = e.target.value as number;
              const structure = feeStructures.find(f => f.id === structureId) || null;
              setSelectedFeeStructure(structure);
            }}
            label="Fee Structure"
            disabled={!selectedClass || !selectedYear}
          >
            {feeStructures.map((structure) => (
              <MenuItem key={structure.id} value={structure.id}>
                {structure.term} - {(structure.total_amount || 0).toLocaleString()} FCFA
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Button
          variant="contained"
          onClick={() => fetchSummary()}
          disabled={!selectedClass || !selectedYear || !selectedFeeStructure || loading}
          fullWidth
          sx={{ height: '40px', borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
        >
          {loading ? 'Loading...' : summary ? 'Refresh' : 'Get Summary'}
        </Button>
      </Grid>

      <Grid item xs={12} md={6}>
        <FormControl fullWidth size="small">
          <InputLabel>Component</InputLabel>
          <Select
            value={selectedComponent}
            onChange={(e) => handleComponentChange(e.target.value as string)}
            label="Component"
            disabled={!selectedFeeStructure || components.length === 0}
          >
            <MenuItem value="all">All Components</MenuItem>
            {components.map((comp) => (
              <MenuItem key={comp.name} value={comp.name}>
                {comp.name} ({(comp.amount || 0).toLocaleString()} FCFA)
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
    </Grid>
  );

  if (!summary) {
    return (
      <Box sx={{ width: '100%' }}>
        <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight="bold" gutterBottom>
          Class Fee Summary
        </Typography>
        {filterForm}
        {loading && <LinearProgress sx={{ borderRadius: 1 }} />}
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight="bold" gutterBottom>
        Class Fee Summary
      </Typography>

      {filterForm}

      {loading && <LinearProgress sx={{ borderRadius: 1, mb: 2 }} />}

      <Paper
        elevation={0}
        sx={{ p: isMobile ? 2 : 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
      >
        <Box mb={2}>
          <Typography variant="subtitle1" fontWeight="bold">
            Class: {summary.classDetails?.class_name || selectedClass?.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Fee Structure: {summary.feeStructure?.term}
            {selectedComponent !== 'all' ? ` – Component: ${selectedComponent}` : ''}
            {summary.feeStructure?.due_date ? ` (Due: ${summary.feeStructure.due_date})` : ''}
          </Typography>
        </Box>

        {/* Dashboard Metrics Cards */}
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={4}>
            <Paper elevation={0} sx={{ p: 2, textAlign: 'center', bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary" display="block">Total Students</Typography>
              <Typography variant="h6" fontWeight="bold" color="primary.main">{classTotals.studentCount}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={4}>
            <Paper elevation={0} sx={{ p: 2, textAlign: 'center', bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary" display="block">Total Expected</Typography>
              <Typography variant="h6" fontWeight="bold">{classTotals.totalExpected.toLocaleString()} FCFA</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={4}>
            <Paper elevation={0} sx={{ p: 2, textAlign: 'center', bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary" display="block">Total Paid</Typography>
              <Typography variant="h6" fontWeight="bold" color="success.main">{classTotals.totalPaid.toLocaleString()} FCFA</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1, textAlign: { xs: 'center', sm: 'left' } }}>
                Payment Progress ({classTotals.percentage.toFixed(1)}%)
              </Typography>
              <Box display="flex" alignItems="center" gap={2}>
                <Box width="100%">
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(classTotals.percentage, 100)}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
          Student Balances {selectedComponent !== 'all' ? `(for ${selectedComponent})` : ''}
        </Typography>

        {/* MOBILE CARD VIEW */}
        {isMobile ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {summary.students?.map((student) => (
              <Box
                key={student.student_id}
                sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider', pb: 1, mb: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>Student</Typography>
                  <Typography variant="body2" fontWeight="bold">{student.student_name}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">Paid:</Typography>
                  <Typography variant="body2" fontWeight={600} color="success.main">
                    {(student.total_paid || 0).toLocaleString()} FCFA
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" color="text.secondary">Balance:</Typography>
                  <Typography variant="body2" fontWeight="bold" color={student.outstanding_balance > 0 ? 'error.main' : 'success.main'}>
                    {(student.outstanding_balance || 0).toLocaleString()} FCFA
                  </Typography>
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
                  <TableCell sx={{ fontWeight: 600 }}>Student</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Paid</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Balance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {summary.students?.map((student) => (
                  <TableRow key={student.student_id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{student.student_name}</TableCell>
                    <TableCell align="right" sx={{ color: 'success.main', fontWeight: 500 }}>
                      {(student.total_paid || 0).toLocaleString()} FCFA
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color: student.outstanding_balance > 0 ? 'error.main' : 'success.main',
                        fontWeight: student.outstanding_balance > 0 ? 'bold' : 'normal'
                      }}
                    >
                      {(student.outstanding_balance || 0).toLocaleString()} FCFA
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        )}
      </Paper>
    </Box>
  );
};

export default ClassFeeSummary;