import React, { useState } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
  Box,
  CircularProgress,
  Collapse,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import { KeyboardArrowDown, KeyboardArrowUp, Edit, Delete } from '@mui/icons-material';
import { formatCurrency } from '../utils/feeHelpers';
import type { FeeStructure } from '../types/feeTypes';

interface FeeStructureListProps {
  structures: FeeStructure[];
  loading: boolean;
  error: string | null;
  onEdit: (structure: FeeStructure) => void;
  onDelete: (id: number) => Promise<void>;
  onRefresh: () => void;
}

const FeeStructureList: React.FC<FeeStructureListProps> = ({
  structures,
  loading,
  error,
  onEdit,
  onDelete,
  onRefresh
}) => {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const toggleRow = (id: number) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const handleDeleteClick = (id: number) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    setDeleting(true);
    try {
      await onDelete(deletingId);
      setDeleteDialogOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeleting(false);
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box py={4} textAlign="center">
        <Typography color="error">{error}</Typography>
        <Button variant="contained" onClick={onRefresh} sx={{ mt: 2 }}>
          Retry
        </Button>
      </Box>
    );
  }

  if (structures.length === 0) {
    return (
      <Box py={4} textAlign="center">
        <Typography variant="h6" color="textSecondary">
          No fee structures found.
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Click "New Structure" to create your first fee structure.
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Paper elevation={3} sx={{ p: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" />
                <TableCell>Class</TableCell>
                <TableCell>Academic Year</TableCell>
                <TableCell>Term</TableCell>
                <TableCell align="right">Total Amount</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {structures.map((structure) => {
                const isExpanded = expandedRow === structure.id;
                const total = structure.total_amount || 0;
                const components = structure.components || [];

                return (
                  <React.Fragment key={structure.id}>
                    <TableRow hover>
                      <TableCell padding="checkbox">
                        <IconButton size="small" onClick={() => toggleRow(structure.id)}>
                          {isExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                        </IconButton>
                      </TableCell>
                      <TableCell>{structure.class_name}</TableCell>
                      <TableCell>{structure.academic_year}</TableCell>
                      <TableCell>{structure.term}</TableCell>
                      <TableCell align="right">{formatCurrency(total)}</TableCell>
                      <TableCell>{structure.description || '-'}</TableCell>
                      <TableCell>
                        {structure.due_date ? new Date(structure.due_date).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          startIcon={<Edit />}
                          onClick={() => onEdit(structure)}
                          sx={{ mr: 1 }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          startIcon={<Delete />}
                          onClick={() => handleDeleteClick(structure.id)}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={8} style={{ padding: 0 }}>
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box sx={{ margin: 1, padding: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              Fee Components
                            </Typography>
                            {components.length > 0 ? (
                              <Box display="flex" flexWrap="wrap" gap={1}>
                                {components.map((comp, idx) => (
                                  <Chip
                                    key={idx}
                                    label={`${comp.name}: ${formatCurrency(comp.amount)}`}
                                    variant="outlined"
                                    size="small"
                                  />
                                ))}
                              </Box>
                            ) : (
                              <Typography variant="body2" color="textSecondary">
                                No components defined.
                              </Typography>
                            )}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this fee structure? This action cannot be undone.
            All associated components will also be deleted.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FeeStructureList;