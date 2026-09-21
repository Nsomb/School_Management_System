import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Card,
  CardContent,
  CardActions,
  Divider,
  Stack,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useFeeApi } from '../hooks/useFeeApi';
import FeeStructureForm from '../components/FeeStructureForm';
import type { FeeStructure } from '../types/feeTypes';

const FeeStructuresPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const {
    getAllFeeStructures,
    deleteFeeStructure,
    loading: apiLoading,
  } = useFeeApi();

  // Data
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // UI
  const [showForm, setShowForm] = useState(false);
  const [editingStructure, setEditingStructure] = useState<FeeStructure | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  // ---- fetch ----
  const fetchStructures = useCallback(async () => {
    setPageLoading(true);
    setPageError(null);
    try {
      const data = await getAllFeeStructures();
      setStructures(Array.isArray(data) ? data : []);
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Failed to load fee structures');
      setStructures([]);
    } finally {
      setPageLoading(false);
    }
  }, [getAllFeeStructures]);

  useEffect(() => {
    fetchStructures();
  }, [fetchStructures]);

  // ---- actions ----
  const handleCreateNew = () => {
    setEditingStructure(null);
    setShowForm(true);
  };

  const handleEdit = (structure: FeeStructure) => {
    setEditingStructure(structure);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingStructure(null);
    setSnackbar({
      open: true,
      message: editingStructure
        ? 'Fee structure updated successfully!'
        : 'Fee structure created successfully!',
      severity: 'success',
    });
    fetchStructures();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingStructure(null);
  };

  const handleDeleteClick = (id: number) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    setDeleting(true);
    try {
      await deleteFeeStructure(deletingId);
      setDeleteDialogOpen(false);
      setSnackbar({ open: true, message: 'Fee structure deleted successfully!', severity: 'success' });
      fetchStructures();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to delete fee structure',
        severity: 'error',
      });
    } finally {
      setDeleting(false);
      setDeletingId(null);
    }
  };

  const handleCloseSnackbar = () => setSnackbar((prev) => ({ ...prev, open: false }));

  // ---- render ----
  return (
    <Box sx={{ p: isMobile ? 2 : 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box
        display="flex"
        flexDirection={isMobile ? 'column' : 'row'}
        justifyContent="space-between"
        alignItems={isMobile ? 'stretch' : 'center'}
        gap={2}
        mb={3}
      >
        <Box>
          <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight: 600 }}>
            Fee Structures
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage the fees applied to each class and academic year.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateNew}
          fullWidth={isMobile}
          sx={isMobile ? {} : { minWidth: 180 }}
        >
          New Structure
        </Button>
      </Box>

      {/* Error banner */}
      {pageError && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={fetchStructures}>
              Retry
            </Button>
          }
          sx={{ mb: 2 }}
        >
          {pageError}
        </Alert>
      )}

      {/* Loading */}
      {pageLoading && (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      )}

      {/* Empty */}
      {!pageLoading && !pageError && structures.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No fee structures found.</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Click "New Structure" to create your first fee structure.
          </Typography>
        </Paper>
      )}

      {/* Mobile cards */}
      {!pageLoading && !pageError && structures.length > 0 && isMobile && (
        <Stack spacing={2}>
          {structures.map((structure) => {
            const totalAmount =
              structure.components?.reduce((sum, item) => sum + item.amount, 0) || 0;
            return (
              <Card key={structure.id} variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ pb: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Box>
                      <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                        {structure.class_name || `Class ID: ${structure.class_id}`}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Academic Year: {structure.academic_year}
                      </Typography>
                    </Box>
                    <Chip
                      label={`FCFA ${totalAmount.toLocaleString()}`}
                      color="primary"
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                    Fee Components
                  </Typography>
                  <Stack spacing={0.5} mt={0.5}>
                    {structure.components?.map((comp, idx) => (
                      <Box key={idx} display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2">{comp.name}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          FCFA {comp.amount.toLocaleString()}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
                <Divider />
                <CardActions sx={{ justifyContent: 'flex-end', px: 2, py: 1 }}>
                  <IconButton size="small" color="primary" onClick={() => handleEdit(structure)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDeleteClick(structure.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </CardActions>
              </Card>
            );
          })}
        </Stack>
      )}

      {/* Desktop table */}
      {!pageLoading && !pageError && structures.length > 0 && !isMobile && (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 600 }}>Class</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Academic Year</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Components</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Total Amount</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {structures.map((structure) => {
                const totalAmount =
                  structure.components?.reduce((sum, item) => sum + item.amount, 0) || 0;
                return (
                  <TableRow key={structure.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>
                      {structure.class_name || `Class ID: ${structure.class_id}`}
                    </TableCell>
                    <TableCell>{structure.academic_year}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {structure.components?.map((comp, idx) => (
                          <Chip
                            key={idx}
                            label={`${comp.name}: FCFA ${comp.amount}`}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      FCFA {totalAmount.toLocaleString()}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton size="small" color="primary" onClick={() => handleEdit(structure)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteClick(structure.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create / Edit form */}
      {showForm && (
        <FeeStructureForm
          initialData={editingStructure ?? undefined}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      )}

      {/* Delete confirmation */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this fee structure? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FeeStructuresPage;