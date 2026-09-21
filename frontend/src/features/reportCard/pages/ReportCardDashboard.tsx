// src/features/reportCard/pages/ReportCardDashboard.tsx
import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, CardHeader, Typography, FormControl, FormLabel,
  RadioGroup, FormControlLabel, Radio, MenuItem, Select, Button, Alert,
  CircularProgress, Grid, Paper, Container, Chip, LinearProgress, Dialog,
  DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText,
  IconButton, Tooltip,
} from '@mui/material';
import {
  Download, Refresh, Error as ErrorIcon, DeleteSweep, EmojiEvents,
} from '@mui/icons-material';
import { ReportCardService } from '../services/api';
import type { Student, ReportResponse } from '../types/types';

interface GenerationError {
  studentId: string;
  studentName: string;
  error: string;
}

const ReportCardDashboard: React.FC = () => {
  const [classes, setClasses] = useState<string[]>([]);
  const [terms, setTerms] = useState<string[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [reportType, setReportType] = useState<'single' | 'class'>('single');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [honourGenerating, setHonourGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [honourDownloading, setHonourDownloading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Store the FULL backend download path — not just the filename
  const [downloadPath, setDownloadPath] = useState<string | null>(null);
  const [honourDownloadPath, setHonourDownloadPath] = useState<string | null>(null);

  const [generationErrors, setGenerationErrors] = useState<GenerationError[]>([]);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [generationStats, setGenerationStats] = useState<{
    generatedCount?: number;
    errorCount?: number;
    totalSize?: string;
  } | null>(null);

  // ─── Fetch initial data ─────────────────────────────────
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setError('');
      try {
        const [classesData, termsData] = await Promise.all([
          ReportCardService.getClasses(),
          ReportCardService.getTerms(),
        ]);
        setClasses(classesData);
        setTerms(termsData);
      } catch (err) {
        setError('Failed to load initial data');
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  // ─── Fetch students on class change ─────────────────────
  useEffect(() => {
    const loadStudents = async () => {
      if (selectedClass && reportType === 'single') {
        setError('');
        try {
          const studentsData = await ReportCardService.getStudents(selectedClass);
          setStudents(studentsData);
          setSelectedStudent('');
        } catch (err) {
          setError('Failed to load students for this class');
          setStudents([]);
        }
      } else {
        setStudents([]);
        setSelectedStudent('');
      }
    };
    loadStudents();
  }, [selectedClass, reportType]);

  // ─── Auto-hide success after 3s ─────────────────────────
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // ─── Generate report ────────────────────────────────────
  const handleGenerate = async () => {
    if (!selectedClass || !selectedTerm) {
      setError('Please select both class and term');
      return;
    }
    if (reportType === 'single' && !selectedStudent) {
      setError('Please select a student');
      return;
    }

    setGenerating(true);
    setError('');
    setSuccess('');
    setDownloadPath(null);
    setGenerationErrors([]);
    setGenerationStats(null);

    try {
      const result: ReportResponse =
        reportType === 'single'
          ? await ReportCardService.generateStudentReport(
              selectedStudent,
              selectedClass,
              selectedTerm
            )
          : await ReportCardService.generateClassReport(selectedClass, selectedTerm);

      if (result.downloadPath) {
        // Store the FULL path returned by the backend
        setDownloadPath(result.downloadPath);

        let successMessage = result.message || 'Report generated successfully!';

        if (result.termAverage && result.rank) {
          successMessage += ` | Average: ${result.termAverage} | Rank: ${result.rank}`;
        }

        if (result.generatedCount !== undefined) {
          successMessage += ` | Generated: ${result.generatedCount}`;
          setGenerationStats({
            generatedCount: result.generatedCount,
            errorCount: result.errorCount,
            totalSize: result.totalSize,
          });
        }

        setSuccess(successMessage);

        if (result.errors && result.errors.length > 0) {
          setGenerationErrors(result.errors);
        }
      } else {
        setError(result.message || 'Failed to generate report');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  // ─── Generate honour roll ───────────────────────────────
  const handleGenerateHonour = async () => {
    if (!selectedClass || !selectedTerm || !selectedStudent) {
      setError('Please select class, term, and student');
      return;
    }

    setHonourGenerating(true);
    setError('');
    setSuccess('');
    setHonourDownloadPath(null);

    try {
      const result = await ReportCardService.generateHonourRoll(
        selectedStudent,
        selectedClass,
        selectedTerm
      );
      if (result.downloadPath) {
        setHonourDownloadPath(result.downloadPath);
        setSuccess('Honour Roll certificate generated successfully!');
      } else {
        setError(result.message || 'Failed to generate honour roll');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to generate honour roll');
    } finally {
      setHonourGenerating(false);
    }
  };

  // ─── Download ───────────────────────────────────────────
  const handleDownload = async (path: string, type: 'report' | 'honour') => {
    if (!path) return;

    if (type === 'report') setDownloading(true);
    else setHonourDownloading(true);

    try {
      const blob = await ReportCardService.downloadReport(path);
      const studentName = students.find((s) => s.id === selectedStudent)?.name || 'student';
      const baseName =
        type === 'report'
          ? `Report_${studentName}_${selectedClass}_Term${selectedTerm}`
          : `HonourRoll_${studentName}_Term${selectedTerm}`;
      const downloadFilename = `${baseName}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_');

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = downloadFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      if (type === 'report') {
        setDownloadPath(null);
        setSuccess('Report downloaded successfully!');
      } else {
        setHonourDownloadPath(null);
        setSuccess('Honour Roll certificate downloaded!');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to download file');
    } finally {
      if (type === 'report') setDownloading(false);
      else setHonourDownloading(false);
    }
  };

  // ─── Cleanup ────────────────────────────────────────────
  const handleCleanup = async () => {
    try {
      await ReportCardService.cleanupReports();
      setSuccess('Old reports cleaned up successfully!');
    } catch (err: any) {
      setError('Failed to cleanup reports');
    }
  };

  const resetForm = () => {
    setSelectedClass('');
    setSelectedTerm('');
    setSelectedStudent('');
    setDownloadPath(null);
    setHonourDownloadPath(null);
    setError('');
    setSuccess('');
    setGenerationErrors([]);
    setGenerationStats(null);
  };

  const canGenerate = selectedClass && selectedTerm && (reportType === 'class' || selectedStudent);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box textAlign="center" mb={4}>
        <Typography variant="h4" component="h1" gutterBottom color="primary" fontWeight="bold">
          Report Card Generator
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Generate academic reports for individual students or entire classes
        </Typography>
      </Box>

      <Card elevation={3} sx={{ borderRadius: 2, mb: 3 }}>
        <CardHeader
          title="Report Configuration"
          titleTypographyProps={{ variant: 'h6', fontWeight: 'bold' }}
          action={
            <Tooltip title="Cleanup old reports">
              <IconButton onClick={handleCleanup} color="warning" size="small">
                <DeleteSweep />
              </IconButton>
            </Tooltip>
          }
        />

        <CardContent>
          <FormControl component="fieldset" sx={{ mb: 3 }}>
            <FormLabel component="legend" sx={{ mb: 1, fontWeight: 'bold' }}>
              Report Type
            </FormLabel>
            <RadioGroup
              row
              value={reportType}
              onChange={(e) => setReportType(e.target.value as 'single' | 'class')}
            >
              <FormControlLabel value="single" control={<Radio />} label="Single Student Report" />
              <FormControlLabel value="class" control={<Radio />} label="Full Class Reports" />
            </RadioGroup>
          </FormControl>

          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <FormLabel sx={{ mb: 1, fontWeight: 'bold' }}>Class *</FormLabel>
                <Select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  disabled={loading}
                  displayEmpty
                >
                  <MenuItem value="">Select Class</MenuItem>
                  {classes.map((cls) => (
                    <MenuItem key={cls} value={cls}>{cls}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <FormLabel sx={{ mb: 1, fontWeight: 'bold' }}>Term *</FormLabel>
                <Select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  disabled={loading}
                  displayEmpty
                >
                  <MenuItem value="">Select Term</MenuItem>
                  {terms.map((term) => (
                    <MenuItem key={term} value={term}>Term {term}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {reportType === 'single' && (
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <FormLabel sx={{ mb: 1, fontWeight: 'bold' }}>Student *</FormLabel>
                  <Select
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    disabled={!selectedClass || students.length === 0}
                    displayEmpty
                  >
                    <MenuItem value="">Select Student</MenuItem>
                    {students.map((student) => (
                      <MenuItem key={student.id} value={student.id}>
                        {student.name}
                        {(student as any).rollNumber && ` (${(student as any).rollNumber})`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {selectedClass && students.length === 0 && !loading && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 1, display: 'block' }}
                  >
                    No students found in this class
                  </Typography>
                )}
              </Grid>
            )}
          </Grid>

          {(generating || honourGenerating) && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {generating
                  ? reportType === 'single'
                    ? 'Generating student report...'
                    : 'Generating class reports...'
                  : 'Generating Honour Roll certificate...'}
              </Typography>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert
              severity="success"
              sx={{ mt: 2 }}
              onClose={() => setSuccess('')}
              action={
                generationErrors.length > 0 && (
                  <Button color="inherit" size="small" onClick={() => setErrorDialogOpen(true)}>
                    View Errors
                  </Button>
                )
              }
            >
              {success}
            </Alert>
          )}

          {generationStats && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={1}>
                <Grid item>
                  <Chip
                    label={`Generated: ${generationStats.generatedCount}`}
                    color="success"
                    variant="outlined"
                    size="small"
                  />
                </Grid>
                {generationStats.errorCount && generationStats.errorCount > 0 && (
                  <Grid item>
                    <Chip
                      label={`Errors: ${generationStats.errorCount}`}
                      color="error"
                      variant="outlined"
                      size="small"
                    />
                  </Grid>
                )}
                {generationStats.totalSize && (
                  <Grid item>
                    <Chip
                      label={`Size: ${generationStats.totalSize}`}
                      color="info"
                      variant="outlined"
                      size="small"
                    />
                  </Grid>
                )}
              </Grid>
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 2, mt: 3, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              onClick={handleGenerate}
              disabled={generating || !canGenerate}
              startIcon={generating ? <CircularProgress size={16} /> : undefined}
              size="large"
            >
              {generating
                ? 'Generating...'
                : `Generate ${reportType === 'single' ? 'Student Report' : 'Class Reports'}`}
            </Button>

            {reportType === 'single' && (
              <Button
                variant="outlined"
                color="warning"
                onClick={handleGenerateHonour}
                disabled={honourGenerating || !canGenerate}
                startIcon={honourGenerating ? <CircularProgress size={16} /> : <EmojiEvents />}
                size="large"
              >
                {honourGenerating ? 'Generating...' : 'Honour Roll'}
              </Button>
            )}

            {downloadPath && (
              <Button
                variant="contained"
                color="success"
                onClick={() => handleDownload(downloadPath, 'report')}
                disabled={downloading}
                startIcon={downloading ? <CircularProgress size={16} /> : <Download />}
                size="large"
              >
                {downloading ? 'Downloading...' : `Download ${reportType === 'single' ? 'PDF' : 'ZIP'}`}
              </Button>
            )}

            {honourDownloadPath && (
              <Button
                variant="contained"
                color="warning"
                onClick={() => handleDownload(honourDownloadPath, 'honour')}
                disabled={honourDownloading}
                startIcon={honourDownloading ? <CircularProgress size={16} /> : <Download />}
                size="large"
                sx={{
                  backgroundColor: '#ffd700',
                  '&:hover': { backgroundColor: '#e6c200' },
                  color: '#333',
                }}
              >
                {honourDownloading ? 'Downloading...' : 'Download Honour Roll'}
              </Button>
            )}

            <Button variant="outlined" onClick={resetForm} startIcon={<Refresh />} size="large">
              Reset Form
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={4}>
          <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="primary">{classes.length}</Typography>
            <Typography variant="caption" color="text.secondary">Classes</Typography>
          </Paper>
        </Grid>
        <Grid item xs={4}>
          <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="success.main">{terms.length}</Typography>
            <Typography variant="caption" color="text.secondary">Terms</Typography>
          </Paper>
        </Grid>
        <Grid item xs={4}>
          <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="warning.main">{students.length}</Typography>
            <Typography variant="caption" color="text.secondary">Students</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Dialog
        open={errorDialogOpen}
        onClose={() => setErrorDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <ErrorIcon color="error" sx={{ mr: 1 }} />
            Generation Errors
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            The following errors occurred during report generation:
          </Typography>
          <List dense>
            {generationErrors.map((error, index) => (
              <ListItem key={index} divider>
                <ListItemText primary={error.studentName} secondary={error.error} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setErrorDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ReportCardDashboard;