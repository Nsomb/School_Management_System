// src/features/class/pages/ClassPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SelectChangeEvent } from '@mui/material';
import {
  Box, Grid, Card, CardContent, Alert, Typography, CircularProgress,
  Button, Paper, FormControl, InputLabel, Select, MenuItem, Chip, Stack,
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SettingsIcon from '@mui/icons-material/Settings';
import SchoolIcon from '@mui/icons-material/School';

import { ClassStatistics } from '../components/ClassStatistics';
import { ClassStudents } from '../components/ClassStudents';
import { ClassPerformance } from '../components/ClassPerformance';
import {
  fetchDistinctClassNames,
  fetchCurrentAcademicYear,
  fetchAcademicYears,
} from '../api/classApi';

export function ClassPage() {
  const navigate = useNavigate();
  const [classNames, setClassNames] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedView, setSelectedView] = useState<string>('');
  const [selectionForm, setSelectionForm] = useState({
    className: '',
    term: '',
    academicYear: '',
  });
  const [showResults, setShowResults] = useState(false);
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [terms, setTerms] = useState<string[]>([]);

  const goToManageClasses = () => navigate('/admin/classes/manage');

  const fetchClassNames = async () => {
    setLoading(true);
    setError(null);
    try {
      const names = await fetchDistinctClassNames();
      setClassNames(names);
    } catch (err: any) {
      console.error('Failed to fetch classes:', err);
      setError(err.message || 'Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassNames();
  }, []);

  useEffect(() => {
    async function loadAcademicContext() {
      try {
        const currentYear = await fetchCurrentAcademicYear();
        setSelectionForm((prev) => ({ ...prev, academicYear: currentYear || '' }));
        setTerms(['Term 1', 'Term 2', 'Term 3', 'Year-End']);
      } catch {
        setTerms(['Term 1', 'Term 2', 'Term 3']);
      }
    }
    async function loadAcademicYears() {
      try {
        const years = await fetchAcademicYears(5);
        const yearStrings = years
          .map((y: any) => (typeof y === 'string' ? y : y.year || y.value || ''))
          .filter(Boolean);
        setAcademicYears(yearStrings);
      } catch {
        setAcademicYears([]);
      }
    }
    loadAcademicContext();
    loadAcademicYears();
  }, []);

  useEffect(() => {
    if (classNames.length > 0 && !selectionForm.className) {
      setSelectionForm((prev) => ({ ...prev, className: classNames[0] }));
    }
  }, [classNames, selectionForm.className]);

  useEffect(() => {
    if (selectedView && selectionForm.className) {
      setShowResults(true);
    }
  }, [selectedView, selectionForm.className]);

  const handleFormChange = (field: string, value: string) => {
    setSelectionForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleViewSelection = (view: string) => {
    setSelectedView(view);
    setShowResults(false);
  };

  const handleBackToOptions = () => {
    setSelectedView('');
    setShowResults(false);
  };

  // ─── Loading ─────────────────────────────────────────────
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress size={48} />
        <Typography variant="h6" sx={{ ml: 2, fontSize: { xs: '0.95rem', sm: '1.25rem' } }}>
          Loading Classes...
        </Typography>
      </Box>
    );
  }

  // ─── Error ───────────────────────────────────────────────
  if (error) {
    return (
      <Box my={2} px={1}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={fetchClassNames}>
              Retry
            </Button>
          }
        >
          Error: {error}
        </Alert>
      </Box>
    );
  }

  // ─── Empty state ─────────────────────────────────────────
  if (classNames.length === 0) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Paper
          elevation={0}
          sx={{
            maxWidth: 560,
            mx: 'auto',
            mt: 4,
            p: { xs: 3, sm: 5 },
            textAlign: 'center',
            border: '1px dashed',
            borderColor: 'grey.300',
            borderRadius: 3,
          }}
        >
          <SchoolIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography variant="h5" fontWeight={700} gutterBottom>
            No classes yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Classes are required before you can manage students, marks, attendance, or
            generate report cards. Create your first class to get started.
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<SettingsIcon />}
            onClick={goToManageClasses}
            sx={{ textTransform: 'none', fontWeight: 600, px: 3 }}
          >
            Manage Classes
          </Button>
        </Paper>
      </Box>
    );
  }

  // ─── Dashboard Navigation Options ────────────────────────
  if (!selectedView) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        {/* Header — no Manage Classes button here anymore */}
        <Box sx={{ mb: { xs: 2, sm: 3.5 } }}>
          <Typography
            variant="h4"
            sx={{ fontSize: { xs: '1.5rem', sm: '2rem', md: '2.25rem' }, mb: 0.5 }}
          >
            Class Management
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              icon={<SchoolIcon />}
              label={`${classNames.length} ${classNames.length === 1 ? 'class' : 'classes'} configured`}
              size="small"
              color="primary"
              variant="outlined"
            />
          </Stack>
        </Box>

        <Grid container spacing={{ xs: 1.5, sm: 2 }} justifyContent="center">
          {/* ── Class Statistics ── */}
          <Grid item xs={12} sm={6} md={3}>
            <Card
              onClick={() => handleViewSelection('statistics')}
              sx={{
                cursor: 'pointer',
                height: '100%',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 },
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: { xs: 2.5, sm: 3 }, px: 1.5 }}>
                <AssessmentIcon
                  sx={{ fontSize: { xs: 36, sm: 44 }, mb: 1, color: 'primary.main' }}
                />
                <Typography
                  variant="h6"
                  sx={{ fontSize: { xs: '0.95rem', sm: '1.05rem' }, fontWeight: 600 }}
                >
                  Class Statistics
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', lineHeight: 1.35 }}
                >
                  Subject-level averages and performance
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* ── Class List ── */}
          <Grid item xs={12} sm={6} md={3}>
            <Card
              onClick={() => handleViewSelection('students')}
              sx={{
                cursor: 'pointer',
                height: '100%',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 },
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: { xs: 2.5, sm: 3 }, px: 1.5 }}>
                <PeopleIcon
                  sx={{ fontSize: { xs: 36, sm: 44 }, mb: 1, color: 'primary.main' }}
                />
                <Typography
                  variant="h6"
                  sx={{ fontSize: { xs: '0.95rem', sm: '1.05rem' }, fontWeight: 600 }}
                >
                  Class List
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', lineHeight: 1.35 }}
                >
                  View enrolled students and export lists
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* ── Performance ── */}
          <Grid item xs={12} sm={6} md={3}>
            <Card
              onClick={() => handleViewSelection('performance')}
              sx={{
                cursor: 'pointer',
                height: '100%',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 },
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: { xs: 2.5, sm: 3 }, px: 1.5 }}>
                <TrendingUpIcon
                  sx={{ fontSize: { xs: 36, sm: 44 }, mb: 1, color: 'primary.main' }}
                />
                <Typography
                  variant="h6"
                  sx={{ fontSize: { xs: '0.95rem', sm: '1.05rem' }, fontWeight: 600 }}
                >
                  Performance
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', lineHeight: 1.35 }}
                >
                  Per-student marks and evaluation breakdown
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* ── Manage Classes (styled identically to the other three) ── */}
          <Grid item xs={12} sm={6} md={3}>
            <Card
              onClick={goToManageClasses}
              sx={{
                cursor: 'pointer',
                height: '100%',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 },
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: { xs: 2.5, sm: 3 }, px: 1.5 }}>
                <SettingsIcon
                  sx={{ fontSize: { xs: 36, sm: 44 }, mb: 1, color: 'primary.main' }}
                />
                <Typography
                  variant="h6"
                  sx={{ fontSize: { xs: '0.95rem', sm: '1.05rem' }, fontWeight: 600 }}
                >
                  Manage Classes
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', lineHeight: 1.35 }}
                >
                  Create, edit, and configure classes
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  }

  // ─── Active View ─────────────────────────────────────────
  return (
    <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
      <Box
        sx={{
          mb: { xs: 2, sm: 3 },
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 1.5,
        }}
      >
        <Box>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ArrowBackIcon />}
            onClick={handleBackToOptions}
            sx={{ mb: 1 }}
          >
            Back to Options
          </Button>
          <Typography
            variant="h5"
            sx={{ fontSize: { xs: '1.25rem', sm: '1.75rem' }, fontWeight: 600 }}
          >
            {selectedView === 'statistics' && 'Class Statistics'}
            {selectedView === 'students' && 'Class List'}
            {selectedView === 'performance' && 'Student Performance'}
          </Typography>
        </Box>

        {/* Quick access to Manage Classes from an active view */}
        <Button
          variant="outlined"
          size="small"
          startIcon={<SettingsIcon />}
          onClick={goToManageClasses}
          sx={{ textTransform: 'none', alignSelf: { xs: 'stretch', sm: 'auto' } }}
        >
          Manage Classes
        </Button>
      </Box>

      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: { xs: 2, sm: 3 } }} variant="outlined">
        <Grid container spacing={{ xs: 2, sm: 2.5 }}>
          <Grid item xs={12} sm={selectedView === 'students' ? 12 : 4}>
            <FormControl fullWidth required size="small">
              <InputLabel>Select Class</InputLabel>
              <Select
                value={selectionForm.className}
                label="Select Class"
                onChange={(e: SelectChangeEvent) =>
                  handleFormChange('className', e.target.value)
                }
              >
                {classNames.map((className: string) => (
                  <MenuItem key={className} value={className}>
                    {className}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {(selectedView === 'statistics' || selectedView === 'performance') && (
            <>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Academic Year</InputLabel>
                  <Select
                    value={selectionForm.academicYear}
                    label="Academic Year"
                    onChange={(e: SelectChangeEvent) =>
                      handleFormChange('academicYear', e.target.value)
                    }
                  >
                    {academicYears.map((year: string) => (
                      <MenuItem key={year} value={year}>
                        {year}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Term</InputLabel>
                  <Select
                    value={selectionForm.term}
                    label="Term"
                    onChange={(e: SelectChangeEvent) =>
                      handleFormChange('term', e.target.value)
                    }
                  >
                    {terms.map((term: string) => (
                      <MenuItem key={term} value={term}>
                        {term}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </>
          )}
        </Grid>
      </Paper>

      {showResults && (
        <Paper sx={{ p: { xs: 1.5, sm: 3 }, overflowX: 'auto' }} variant="outlined">
          {selectedView === 'statistics' && (
            <ClassStatistics
              className={selectionForm.className}
              term={selectionForm.term}
              academicYear={selectionForm.academicYear}
            />
          )}
          {selectedView === 'students' && (
            <ClassStudents className={selectionForm.className} />
          )}
          {selectedView === 'performance' && (
            <ClassPerformance
              className={selectionForm.className}
              term={selectionForm.term}
              academicYear={selectionForm.academicYear}
            />
          )}
        </Paper>
      )}
    </Box>
  );
}

export default ClassPage;
