// src/features/reportCard/components/StudentReportGenerator.tsx
import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, CardHeader, Typography, FormControl, InputLabel,
  Select, MenuItem, Button, Alert, CircularProgress, Grid, Paper, Stack,
} from '@mui/material';
import { Download, Refresh, Person, School, CalendarToday, GetApp } from '@mui/icons-material';
import { useReportCard } from '../hooks/useReportCard';
import { saveAs } from 'file-saver';

interface Student {
  id: string;
  name: string;
  roll_number?: string;
}

const StudentReportGenerator: React.FC = () => {
  const {
    isLoading,
    error,
    success,
    classes,
    terms,
    getStudents,
    generateStudentReport,
    downloadReport,
    clearError,
    clearSuccess,
    setError,
    setSuccess,
  } = useReportCard();

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');

  // Store the FULL backend download path
  const [downloadPath, setDownloadPath] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (selectedClass) {
      const fetchStudents = async () => {
        try {
          const studentData = await getStudents(selectedClass);
          setStudents(studentData || []);
          setSelectedStudent('');
          setDownloadPath(null);
          clearError();
        } catch {
          setStudents([]);
          setError('Failed to load students for this class');
        }
      };
      fetchStudents();
    } else {
      setStudents([]);
      setSelectedStudent('');
      setDownloadPath(null);
    }
  }, [selectedClass, getStudents, clearError, setError]);

  const handleGenerate = async () => {
    if (!selectedStudent || !selectedTerm || !selectedClass) {
      setError('Please select class, student, and term');
      return;
    }
    clearError();
    clearSuccess();
    setIsGenerating(true);

    try {
      const result = await generateStudentReport(selectedStudent, selectedClass, selectedTerm);
      if (result?.downloadPath) {
        setDownloadPath(result.downloadPath);
        setSuccess('Report generated successfully!');
      } else {
        setError('Failed to generate report – no download path returned');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!downloadPath) return;
    setIsDownloading(true);
    try {
      const blob = await downloadReport(downloadPath);
      if (blob) {
        const student = students.find((s) => s.id === selectedStudent);
        const safeName = student?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'student';
        const suffix = selectedTerm === '3' ? 'Term3_FinalYear' : `Term${selectedTerm}`;
        const fileName = `${suffix}_${safeName}_${selectedClass}_${new Date().getFullYear()}.pdf`;
        saveAs(blob, fileName);
        setDownloadPath(null);
        clearError();
      }
    } catch {
      setError('Failed to download file');
    } finally {
      setIsDownloading(false);
    }
  };

  const resetForm = () => {
    setSelectedClass('');
    setSelectedStudent('');
    setSelectedTerm('');
    setDownloadPath(null);
    clearError();
    clearSuccess();
  };

  const selectedStudentData = students.find((s) => s.id === selectedStudent);
  const canGenerate = selectedStudent && selectedTerm && selectedClass;

  return (
    <Card elevation={0} sx={{ borderRadius: 2 }}>
      <CardHeader
        title="Student Report Generator"
        subheader="Generate individual report cards"
        avatar={<School color="primary" />}
        titleTypographyProps={{ variant: 'h6' }}
      />
      <CardContent>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Class *</InputLabel>
              <Select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                disabled={isLoading}
                label="Class *"
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
              <InputLabel>Student *</InputLabel>
              <Select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                disabled={isLoading || !selectedClass || students.length === 0}
                label="Student *"
              >
                <MenuItem value="">Select Student</MenuItem>
                {students.map((student) => (
                  <MenuItem key={student.id} value={student.id}>
                    {student.name} {student.roll_number && `(${student.roll_number})`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Term *</InputLabel>
              <Select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                disabled={isLoading}
                label="Term *"
              >
                <MenuItem value="">Select Term</MenuItem>
                {terms.map((term) => (
                  <MenuItem key={term} value={term}>Term {term}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {selectedStudentData && (
          <Paper variant="outlined" sx={{ p: 2, mt: 2, bgcolor: 'info.light' }}>
            <Box display="flex" alignItems="center">
              <Person sx={{ mr: 1 }} />
              <Typography variant="body2">
                <strong>Selected Student:</strong> {selectedStudentData.name}
                {selectedStudentData.roll_number && ` | Roll Number: ${selectedStudentData.roll_number}`}
              </Typography>
            </Box>
          </Paper>
        )}

        {error && (
          <Alert severity="error" onClose={clearError} sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" onClose={clearSuccess} sx={{ mt: 2 }}>
            {success}
          </Alert>
        )}

        <Stack direction="row" spacing={2} sx={{ mt: 3, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            onClick={handleGenerate}
            disabled={isGenerating || !canGenerate}
            startIcon={isGenerating ? <CircularProgress size={16} /> : <CalendarToday />}
          >
            {isGenerating ? 'Generating...' : 'Generate Report'}
          </Button>

          {downloadPath && (
            <Button
              variant="contained"
              color="success"
              onClick={handleDownload}
              disabled={isDownloading}
              startIcon={isDownloading ? <CircularProgress size={16} /> : <GetApp />}
            >
              {isDownloading ? 'Downloading...' : 'Download PDF'}
            </Button>
          )}

          <Button variant="outlined" onClick={resetForm} startIcon={<Refresh />}>
            Reset
          </Button>
        </Stack>

        {selectedTerm === '3' && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
            <Typography variant="caption" display="block" color="text.secondary">
              <strong>Note:</strong> Selecting Term 3 will generate a combined report
              with both the Term 3 report and the Final Year report.
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default StudentReportGenerator;