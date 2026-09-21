// src/features/reportCard/components/ClassReportGenerator.tsx
import React, { useState } from 'react';
import {
  Box, Card, CardContent, CardHeader, Typography, FormControl, InputLabel,
  Select, MenuItem, Button, Alert, CircularProgress, Grid, Chip, Divider,
  Stack, Paper, LinearProgress,
} from '@mui/material';
import {
  Download, Refresh, School, Group, EmojiEvents, GetApp,
} from '@mui/icons-material';
import { useReportCard } from '../hooks/useReportCard';
import { saveAs } from 'file-saver';

const ClassReportGenerator: React.FC = () => {
  const {
    isLoading,
    error,
    success,
    classes,
    terms,
    generateClassReport,
    generateBatchHonourRoll,
    downloadReport,
    clearError,
    clearSuccess,
    setError,
    setSuccess,
  } = useReportCard();

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');

  // Store FULL download paths, not filenames
  const [downloadPath, setDownloadPath] = useState<string | null>(null);
  const [batchHonourPath, setBatchHonourPath] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isBatchHonourGenerating, setIsBatchHonourGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);
  const [generationStats, setGenerationStats] = useState<{
    generatedCount?: number;
    errorCount?: number;
    totalSize?: string;
  } | null>(null);

  const handleGenerateClass = async () => {
    if (!selectedClass || !selectedTerm) {
      setError('Please select both class and term');
      return;
    }
    clearError();
    clearSuccess();
    setIsGenerating(true);
    setDownloadPath(null);
    setGenerationStats(null);

    try {
      const result = await generateClassReport(selectedClass, selectedTerm);
      if (result && result.downloadPath) {
        setDownloadPath(result.downloadPath);
        if (result.generatedCount !== undefined) {
          setGenerationStats({
            generatedCount: result.generatedCount,
            errorCount: result.errorCount,
            totalSize: result.totalSize,
          });
        }
        if (result.message) setSuccess(result.message);
      } else {
        setError('Failed to generate class reports');
      }
    } catch (err: any) {
      setError(err.message || 'Error generating class reports');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBatchHonour = async () => {
    if (!selectedClass || !selectedTerm) {
      setError('Please select class and term');
      return;
    }
    clearError();
    clearSuccess();
    setIsBatchHonourGenerating(true);
    setBatchHonourPath(null);

    try {
      const result = await generateBatchHonourRoll(selectedClass, selectedTerm);
      if (result && result.downloadPath) {
        setBatchHonourPath(result.downloadPath);
        setSuccess(`Batch Honour Roll generated: ${result.generatedCount} students`);
      } else {
        setError(result?.message || 'Failed to generate batch honour roll');
      }
    } catch (err: any) {
      setError(err.message || 'Error generating batch honour roll');
    } finally {
      setIsBatchHonourGenerating(false);
    }
  };

  const handleDownload = async (path: string, type: 'class' | 'honour') => {
    if (!path) return;
    const setDownloading = type === 'class' ? setIsDownloading : setIsBatchDownloading;
    setDownloading(true);

    try {
      const blob = await downloadReport(path);
      if (blob) {
        const extension = type === 'class' ? 'pdf' : 'zip';
        const baseName =
          type === 'class'
            ? `ClassReports_${selectedClass}_${selectedTerm}${
                selectedTerm === '3' ? '_Term3_FinalYear' : ''
              }`
            : `HonourRoll_${selectedClass}_${selectedTerm}`;
        const fileName = `${baseName}.${extension}`.replace(/[^a-zA-Z0-9._-]/g, '_');
        saveAs(blob, fileName);
        if (type === 'class') setDownloadPath(null);
        else setBatchHonourPath(null);
        clearError();
      }
    } catch {
      setError('Failed to download file');
    } finally {
      setDownloading(false);
    }
  };

  const resetForm = () => {
    setSelectedClass('');
    setSelectedTerm('');
    setDownloadPath(null);
    setBatchHonourPath(null);
    setGenerationStats(null);
    clearError();
    clearSuccess();
  };

  return (
    <Card elevation={0} sx={{ borderRadius: 2 }}>
      <CardHeader
        title="Class Reports Generator"
        subheader="Generate reports for all students in a class, or create batch Honour Roll certificates"
        avatar={<Group color="primary" />}
        titleTypographyProps={{ variant: 'h6' }}
      />
      <CardContent>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
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

          <Grid item xs={12} md={6}>
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

        {selectedClass && (
          <Paper variant="outlined" sx={{ p: 2, mt: 2, bgcolor: 'info.light' }}>
            <Box display="flex" alignItems="center">
              <School sx={{ mr: 1 }} />
              <Typography variant="body2">
                <strong>Selected Class:</strong> {selectedClass}
                {selectedTerm === '3' && ' (Term 3 + Final Year)'}
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

        {(isGenerating || isBatchHonourGenerating) && <LinearProgress sx={{ mt: 2 }} />}

        {generationStats && (
          <Box sx={{ mt: 2 }}>
            <Stack direction="row" spacing={1}>
              <Chip label={`Generated: ${generationStats.generatedCount}`} color="success" />
              {generationStats.errorCount && generationStats.errorCount > 0 && (
                <Chip label={`Errors: ${generationStats.errorCount}`} color="error" />
              )}
              {generationStats.totalSize && (
                <Chip label={`Size: ${generationStats.totalSize}`} color="info" />
              )}
            </Stack>
          </Box>
        )}

        <Stack direction="row" spacing={2} sx={{ mt: 3, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            onClick={handleGenerateClass}
            disabled={isGenerating || !selectedClass || !selectedTerm}
            startIcon={isGenerating ? <CircularProgress size={16} /> : <Download />}
          >
            {isGenerating
              ? 'Generating...'
              : selectedTerm === '3'
              ? 'Generate Term 3 + Final Year'
              : 'Generate Class Reports'}
          </Button>

          <Button
            variant="outlined"
            color="warning"
            onClick={handleBatchHonour}
            disabled={isBatchHonourGenerating || !selectedClass || !selectedTerm}
            startIcon={
              isBatchHonourGenerating ? <CircularProgress size={16} /> : <EmojiEvents />
            }
          >
            {isBatchHonourGenerating ? 'Generating...' : 'Batch Honour Roll'}
          </Button>

          {downloadPath && (
            <Button
              variant="contained"
              color="success"
              onClick={() => handleDownload(downloadPath, 'class')}
              disabled={isDownloading}
              startIcon={isDownloading ? <CircularProgress size={16} /> : <GetApp />}
            >
              {isDownloading ? 'Downloading...' : 'Download PDF'}
            </Button>
          )}

          {batchHonourPath && (
            <Button
              variant="contained"
              color="warning"
              onClick={() => handleDownload(batchHonourPath, 'honour')}
              disabled={isBatchDownloading}
              startIcon={isBatchDownloading ? <CircularProgress size={16} /> : <GetApp />}
              sx={{ bgcolor: '#ffd700', '&:hover': { bgcolor: '#e6c200' }, color: '#333' }}
            >
              {isBatchDownloading ? 'Downloading...' : 'Download Honour Roll ZIP'}
            </Button>
          )}

          <Button variant="outlined" onClick={resetForm} startIcon={<Refresh />}>
            Reset
          </Button>
        </Stack>

        <Divider sx={{ my: 3 }} />

        <Box>
          <Typography variant="subtitle2" gutterBottom>
            <EmojiEvents
              sx={{ verticalAlign: 'middle', color: 'warning.main', mr: 1 }}
            />
            Batch Honour Roll
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Generate Honour Roll certificates for <strong>all students with average ≥ 15</strong>{' '}
            in the selected class and term.
          </Typography>
        </Box>

        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="caption" display="block" color="text.secondary">
            <strong>Instructions:</strong> Select class → term → click "Generate Class Reports".
            For Term 3, the final year report will be automatically included.
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ClassReportGenerator;