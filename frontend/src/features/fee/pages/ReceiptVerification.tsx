import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Link
} from '@mui/material';
import {
  Search,
  CheckCircle,
  Cancel,
  ReceiptLong,
  Person,
  CalendarToday,
  AttachMoney,
  School,
  CreditCard
} from '@mui/icons-material';

interface ReceiptData {
  id: number;
  receipt_number: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  status: string;
  student_name: string;
  class_name: string;
  academic_year: string;
  term: string;
  recorded_by_admin_username: string;
}

const ReceiptVerification: React.FC = () => {
  const [receiptNumber, setReceiptNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReceiptData | null>(null);

  const handleVerify = async () => {
    if (!receiptNumber.trim()) {
      setError('Please enter a receipt number.');
      return;
    }
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const response = await fetch(`/api/fees/verify-receipt/${receiptNumber.trim()}`);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Receipt not found.');
      }
      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Receipt not found or invalid.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleVerify();
  };

  const handleReset = () => {
    setReceiptNumber('');
    setData(null);
    setError(null);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#f5f7fa',
        p: 3
      }}
    >
      <Paper
        elevation={4}
        sx={{
          maxWidth: 600,
          width: '100%',
          p: 4,
          borderRadius: 4,
          bgcolor: '#ffffff'
        }}
      >
        {/* Header */}
        <Box textAlign="center" mb={3}>
          <ReceiptLong sx={{ fontSize: 48, color: '#1976d2', mb: 1 }} />
          <Typography variant="h4" fontWeight={600} color="primary">
            Receipt Verification
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Enter your receipt number to verify your payment.
          </Typography>
        </Box>

        {/* Input */}
        <Box display="flex" gap={2} sx={{ mb: 2 }}>
          <TextField
            fullWidth
            label="Receipt Number"
            variant="outlined"
            value={receiptNumber}
            onChange={(e) => setReceiptNumber(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="e.g., RCP-2026-00001"
            disabled={loading}
            InputProps={{
              startAdornment: <ReceiptLong sx={{ color: 'text.secondary', mr: 1 }} />,
            }}
          />
          <Button
            variant="contained"
            onClick={handleVerify}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <Search />}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Verify
          </Button>
        </Box>

        {/* Error */}
        {error && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
            {error}
            <Button size="small" color="inherit" onClick={handleReset} sx={{ ml: 2 }}>
              Try Again
            </Button>
          </Alert>
        )}

        {/* Results */}
        {data && (
          <Card
            sx={{
              mt: 3,
              borderLeft: `4px solid ${data.status === 'active' ? '#2e7d32' : '#d32f2f'}`,
              borderRadius: 3,
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}
          >
            <CardContent>
              {/* Status Chip */}
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight={600}>
                  Payment Details
                </Typography>
                <Chip
                  label={data.status === 'active' ? '✅ Verified' : '❌ Invalid'}
                  color={data.status === 'active' ? 'success' : 'error'}
                  size="medium"
                />
              </Box>

              <Divider sx={{ mb: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Receipt Number
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {data.receipt_number}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Amount Paid
                  </Typography>
                  <Typography variant="body1" fontWeight="bold" color="primary">
                    FCFA {data.amount_paid.toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary">
                    <Person fontSize="inherit" /> Student
                  </Typography>
                  <Typography variant="body1">{data.student_name}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary">
                    <School fontSize="inherit" /> Class
                  </Typography>
                  <Typography variant="body1">{data.class_name}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary">
                    <CalendarToday fontSize="inherit" /> Payment Date
                  </Typography>
                  <Typography variant="body1">
                    {new Date(data.payment_date).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary">
                    <CreditCard fontSize="inherit" /> Method
                  </Typography>
                  <Typography variant="body1">{data.payment_method}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="textSecondary">
                    Academic Year / Term
                  </Typography>
                  <Typography variant="body1">
                    {data.academic_year} – {data.term}
                  </Typography>
                </Grid>
                {data.recorded_by_admin_username && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="textSecondary">
                      Recorded By
                    </Typography>
                    <Typography variant="body2">{data.recorded_by_admin_username}</Typography>
                  </Grid>
                )}
              </Grid>

              {/* Footer action */}
              <Box display="flex" justifyContent="center" mt={3}>
                <Button variant="outlined" onClick={handleReset} startIcon={<Search />}>
                  Check Another Receipt
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Footer note */}
        <Typography
          variant="caption"
          color="textSecondary"
          align="center"
          display="block"
          sx={{ mt: 3 }}
        >
          This is an official verification service. For any issues, please contact the school bursar.
        </Typography>
      </Paper>
    </Box>
  );
};

export default ReceiptVerification;