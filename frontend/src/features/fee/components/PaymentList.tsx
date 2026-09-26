// frontend/src/features/fee/components/PaymentList.tsx
import React, { useState, useEffect } from 'react';
import {
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  Grid,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Avatar,
  Tooltip
} from '@mui/material';
import { Edit, Delete, Search, Receipt as ReceiptIcon, Refresh } from '@mui/icons-material';
import ReceiptViewer from './ReceiptViewer';
import type { Payment } from '../types/feeTypes';
import { formatDate, formatCurrency } from '../utils/feeHelpers';
import { voidPayment } from '../api/feeService';

interface PaymentListProps {
  payments: Payment[];
  loading: boolean;
  error: string | null;
  onEdit: (payment: Payment) => void;
  onRefresh: () => void;
}

interface ReceiptData {
  paymentId: number;
  receiptUrl: string;
}

const PaymentList: React.FC<PaymentListProps> = ({
  payments,
  loading,
  error,
  onEdit,
  onRefresh,
}) => {
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [studentFilter, setStudentFilter] = useState<string>('');
  const [yearFilter, setYearFilter] = useState<string>('');
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
  const [paymentToDelete, setPaymentToDelete] = useState<number | null>(null);
  const [receiptViewerOpen, setReceiptViewerOpen] = useState<boolean>(false);
  const [currentReceipt, setCurrentReceipt] = useState<ReceiptData | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  useEffect(() => {
    filterPayments(payments);
  }, [payments, studentFilter, yearFilter]);

  const filterPayments = (data: Payment[]) => {
    let filtered = [...data];

    if (studentFilter) {
      const term = studentFilter.toLowerCase();
      filtered = filtered.filter((payment) =>
        payment.student_name.toLowerCase().includes(term)
      );
    }

    if (yearFilter) {
      filtered = filtered.filter((payment) => payment.payment_date.includes(yearFilter));
    }

    setFilteredPayments(filtered);
  };

  const handleDelete = (id: number) => {
    setPaymentToDelete(id);
    setConfirmDelete(true);
  };

  const confirmDeletePayment = async () => {
    if (!paymentToDelete) return;

    const reason = window.prompt(
      'Please provide a reason for voiding this payment (this will be logged):',
      'Voided by admin'
    );

    if (reason === null) {
      // User cancelled the prompt
      setConfirmDelete(false);
      setPaymentToDelete(null);
      return;
    }

    setDeleting(true);
    try {
      await voidPayment(paymentToDelete, reason || 'Voided by admin');
      onRefresh();
    } catch (err) {
      console.error('Failed to void payment:', err);
      alert('Failed to void payment. Please try again.');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
      setPaymentToDelete(null);
    }
  };

  const viewReceipt = (paymentId: number, receiptUrl: string) => {
    setCurrentReceipt({ paymentId, receiptUrl });
    setReceiptViewerOpen(true);
  };

  const handleDownloadReceipt = async (paymentId: number) => {
    try {
      // Import dynamically to avoid circular dependencies
      const { downloadReceipt } = await import('../api/feeService');
      const blob = await downloadReceipt(paymentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payment_receipt_${paymentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download receipt:', err);
    }
  };

  const getPaymentMethodColor = (
    method: string
  ): 'primary' | 'secondary' | 'success' | 'warning' | 'default' => {
    switch (method) {
      case 'Cash':
        return 'primary';
      case 'Bank Transfer':
        return 'secondary';
      case 'Mobile Money':
        return 'success';
      case 'Cheque':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Search by Student"
            variant="outlined"
            value={studentFilter}
            onChange={(e) => setStudentFilter(e.target.value)}
            InputProps={{
              endAdornment: (
                <IconButton>
                  <Search />
                </IconButton>
              ),
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Filter by Year"
            type="number"
            variant="outlined"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            inputProps={{ min: 2000, max: 2100 }}
          />
        </Grid>
      </Grid>

      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={onRefresh}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Student</TableCell>
              <TableCell>Class</TableCell>
              <TableCell>Date</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Method</TableCell>
              <TableCell>Receipt</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPayments.length > 0 ? (
              filteredPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <Avatar sx={{ width: 32, height: 32, mr: 1, bgcolor: 'primary.main' }}>
                        {payment.student_name.charAt(0)}
                      </Avatar>
                      {payment.student_name}
                    </Box>
                  </TableCell>
                  <TableCell>{payment.class_name}</TableCell>
                  <TableCell>{formatDate(payment.payment_date)}</TableCell>
                  <TableCell align="right">{formatCurrency(payment.amount_paid)}</TableCell>
                  <TableCell>
                    <Chip
                      label={payment.payment_method}
                      size="small"
                      color={getPaymentMethodColor(payment.payment_method)}
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="View Receipt">
                      <IconButton
                        onClick={() => viewReceipt(payment.id, payment.receipt_path || '')}
                      >
                        <ReceiptIcon color="primary" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton onClick={() => onEdit(payment)}>
                      <Edit color="primary" />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(payment.id)}>
                      <Delete color="error" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  {loading ? 'Loading...' : 'No payment records found'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogTitle>Confirm Void Payment</DialogTitle>
        <DialogContent>
          Are you sure you want to void this payment record? You will be asked to provide a
          reason, and the action will be logged for auditing. This cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button onClick={confirmDeletePayment} color="error" disabled={deleting}>
            {deleting ? 'Voiding...' : 'Void Payment'}
          </Button>
        </DialogActions>
      </Dialog>

      {currentReceipt && (
        <ReceiptViewer
          open={receiptViewerOpen}
          onClose={() => setReceiptViewerOpen(false)}
          paymentId={currentReceipt.paymentId}
          receiptUrl={currentReceipt.receiptUrl}
          onDownload={handleDownloadReceipt}
        />
      )}
    </Paper>
  );
};

export default PaymentList;