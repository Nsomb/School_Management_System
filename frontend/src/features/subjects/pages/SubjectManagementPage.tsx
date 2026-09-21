import { useState } from 'react';
import {
  Button,
  Box,
  Paper,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Typography,
  useMediaQuery,
  useTheme,
  Snackbar,
  Alert,
} from '@mui/material';
import { Add as AddIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { SubjectForm } from '../components/SubjectForm';
import { SubjectList } from '../components/SubjectList';
import { useSubjects } from '../hooks/useSubjects';
import type { Subject, SubjectCreateData } from '../types/subjectTypes';

const SubjectManagementPage = () => {
  const {
    subjects,
    faculties,
    loading,
    error,
    createSubject,
    updateSubject,
    removeSubject,
    refetch,
  } = useSubjects();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [openForm, setOpenForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // ------- FORM SUBMIT (create OR update) -------
  const handleSubmit = async (subjectData: SubjectCreateData) => {
    try {
      setSubmissionError(null);
      if (editingSubject) {
        await updateSubject(editingSubject.id, subjectData);
        setSnackbar({
          open: true,
          message: 'Subject updated successfully!',
          severity: 'success',
        });
      } else {
        await createSubject(subjectData);
        setSnackbar({
          open: true,
          message: 'Subject added successfully!',
          severity: 'success',
        });
      }
      setOpenForm(false);
      setEditingSubject(null);
      refetch();
    } catch (err) {
      console.error('Failed to save subject', err);
      const msg = err instanceof Error ? err.message : 'An unknown error occurred.';
      setSubmissionError(msg);
      setSnackbar({
        open: true,
        message: `Failed to save subject: ${msg}`,
        severity: 'error',
      });
    }
  };

  // ------- DELETE -------
  const handleDeleteSubject = async () => {
    if (!confirmDelete) return;
    try {
      await removeSubject(confirmDelete);
      setConfirmDelete(null);
      refetch();
      setSnackbar({
        open: true,
        message: 'Subject deleted successfully!',
        severity: 'success',
      });
    } catch (err) {
      console.error('Failed to delete subject', err);
      const msg = err instanceof Error ? err.message : 'An unknown error occurred.';
      setSnackbar({
        open: true,
        message: `Failed to delete subject: ${msg}`,
        severity: 'error',
      });
    }
  };

  const handleCloseSnackbar = () =>
    setSnackbar((prev) => ({ ...prev, open: false }));

  const handleOpenCreateForm = () => {
    setEditingSubject(null);
    setSubmissionError(null);
    setOpenForm(true);
  };

  const handleOpenEditForm = (subject: Subject) => {
    setEditingSubject(subject);
    setSubmissionError(null);
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setEditingSubject(null);
    setSubmissionError(null);
  };

  // ------- LOADING -------
  if (loading && !subjects.length && !openForm) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  // ------- ERROR -------
  if (error && !openForm) {
    return (
      <Box py={4}>
        <Typography color="error" align="center">
          {error}
        </Typography>
      </Box>
    );
  }

  // ------- FORM VIEW -------
  if (openForm) {
    return (
      <Box py={isSmallMobile ? 2 : 4} px={isSmallMobile ? 1 : 0}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleCloseForm}
          sx={{ mb: 2 }}
          size={isMobile ? 'small' : 'medium'}
        >
          Back to Subject List
        </Button>

        <Paper elevation={3} sx={{ p: isSmallMobile ? 2 : 3 }}>
          <Typography variant={isSmallMobile ? 'h6' : 'h5'} gutterBottom>
            {editingSubject ? 'Edit Subject' : 'Add New Subject'}
          </Typography>

          {submissionError && (
            <Box mb={2}>
              <Alert severity="error">{submissionError}</Alert>
            </Box>
          )}

          <SubjectForm
            faculties={faculties}
            onSubmit={handleSubmit}
            onCancel={handleCloseForm}
            initialData={editingSubject || undefined}
            isEditing={!!editingSubject}
          />
        </Paper>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    );
  }

  // ------- LIST VIEW -------
  return (
    <Box py={isSmallMobile ? 2 : 4} px={isSmallMobile ? 1 : 0}>
      <Box
        display="flex"
        flexDirection={isMobile ? 'column' : 'row'}
        justifyContent="space-between"
        alignItems={isMobile ? 'flex-start' : 'center'}
        gap={isMobile ? 2 : 0}
        mb={4}
      >
        <Typography variant={isSmallMobile ? 'h5' : 'h4'}>
          Subject Management
        </Typography>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreateForm}
          fullWidth={isMobile}
          sx={isMobile ? { maxWidth: '200px' } : {}}
        >
          Add Subject
        </Button>
      </Box>

      <SubjectList
        subjects={subjects}
        loading={loading}
        error={error}
        onEdit={handleOpenEditForm}
        onDelete={(id) => setConfirmDelete(id)}
      />

      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        fullScreen={isSmallMobile}
      >
        <DialogTitle>Delete Subject</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this subject? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteSubject} color="error" autoFocus>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SubjectManagementPage;