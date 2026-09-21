import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { Download as DownloadIcon, Search as SearchIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import { useFeeApi } from '../../hooks/useFeeApi';
import type { Payment, ClassSummary } from '../../types/feeTypes';
import dayjs, { Dayjs } from 'dayjs';

interface PaymentsByDateProps {
  onExport?: (startDate: string, endDate: string) => void;
}

const PaymentsByDate: React.FC<PaymentsByDateProps> = ({ onExport }) => {
  const { getPaymentsByDateRange, getAllClasses } = useFeeApi();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().subtract(1, 'month'));
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs());
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | 'all'>('all');

  useEffect(() => {
    const fetchClasses = async () => {
      const data = await getAllClasses();
      setClasses(data);
    };
    fetchClasses();
  }, [getAllClasses]);

  const fetchPayments = async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    try {
      const data = await getPaymentsByDateRange(
        startDate.format('YYYY-MM-DD'),
        endDate.format('YYYY-MM-DD'),
        selectedClass === 'all' ? undefined : selectedClass
      );
      setPayments(data);
    } catch (err) {
      console.error('Failed to fetch payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleExport = () => {
    if (onExport && startDate && endDate) {
      onExport(startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD'));
    }
  };

  const formatDate = (dateStr: string) => dayjs(dateStr).format('DD/MM/YYYY');

  return (
    <Box className="w-full space-y-4">
      {/* Top Action Header */}
      <Paper 
        elevation={0} 
        sx={{ p: isMobile ? 2 : 3 }} 
        className="w-full bg-white rounded-xl border border-gray-200 shadow-sm"
      >
        <Box 
          display="flex" 
          flexDirection={isMobile ? 'column' : 'row'} 
          justifyContent="space-between" 
          alignItems={isMobile ? 'stretch' : 'center'} 
          gap={2}
        >
          <Box>
            <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight="bold">
              Payments by Date Range
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Search and export payment history
            </Typography>
          </Box>

          {onExport && (
            <Button
              variant="contained"
              onClick={handleExport}
              disabled={!startDate || !endDate || payments.length === 0}
              startIcon={<DownloadIcon />}
              fullWidth={isMobile}
              sx={{
                bgcolor: '#10b981',
                '&:hover': { bgcolor: '#059669' },
                color: '#ffffff',
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: '8px',
                py: isMobile ? 1.2 : 1
              }}
            >
              Export Excel
            </Button>
          )}
        </Box>
      </Paper>

      {/* Filter Controls Container */}
      <Paper elevation={0} sx={{ p: isMobile ? 2 : 3 }} className="w-full bg-white rounded-xl border border-gray-200 shadow-sm">
        <Box className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-center">
          <DatePicker
            label="Start Date"
            value={startDate}
            onChange={setStartDate}
            maxDate={endDate || undefined}
            slotProps={{ textField: { size: 'small', fullWidth: true } }}
          />
          <DatePicker
            label="End Date"
            value={endDate}
            onChange={setEndDate}
            minDate={startDate || undefined}
            slotProps={{ textField: { size: 'small', fullWidth: true } }}
          />
          <FormControl size="small" fullWidth>
            <InputLabel>Class</InputLabel>
            <Select
              value={selectedClass}
              label="Class"
              onChange={(e) => setSelectedClass(e.target.value as number | 'all')}
            >
              <MenuItem value="all">All Classes</MenuItem>
              {classes.map((cls) => (
                <MenuItem key={cls.id} value={cls.id}>{cls.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button 
            variant="contained" 
            onClick={fetchPayments} 
            disabled={loading} 
            startIcon={<SearchIcon />}
            fullWidth
            sx={{ height: '40px', borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
          >
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </Box>
      </Paper>

      {/* Payment Data View */}
      {payments.length > 0 ? (
        isMobile ? (
          /* MOBILE VIEW: Cards */
          <Box className="w-full space-y-3">
            {payments.map((payment) => (
              <Box 
                key={payment.id} 
                className="w-full bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-2"
              >
                <Box className="flex justify-between items-start border-b border-gray-100 pb-2">
                  <Box>
                    <span className="text-xs text-gray-400 block uppercase font-semibold">Student</span>
                    <span className="text-sm font-bold text-gray-900">{payment.student_name}</span>
                  </Box>
                  <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                    {payment.class_name}
                  </span>
                </Box>

                <Box className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <Box>
                    <span className="text-gray-400 block">Date</span>
                    <span className="font-medium text-gray-700">{formatDate(payment.payment_date)}</span>
                  </Box>
                  <Box>
                    <span className="text-gray-400 block">Receipt #</span>
                    <span className="font-medium text-gray-700">{payment.receipt_number || 'N/A'}</span>
                  </Box>
                  <Box>
                    <span className="text-gray-400 block">Method</span>
                    <span className="font-medium text-gray-700">{payment.payment_method}</span>
                  </Box>
                  <Box>
                    <span className="text-gray-400 block">Amount</span>
                    <span className="font-bold text-emerald-600 text-sm">
                      {payment.amount_paid.toLocaleString()} FCFA
                    </span>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          /* DESKTOP VIEW: Table */
          <Paper elevation={0} className="w-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <TableContainer className="w-full">
              <Table size="medium" className="w-full">
                <TableHead className="bg-gray-50">
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Student</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Class</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Receipt #</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Method</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id} hover>
                      <TableCell>{formatDate(payment.payment_date)}</TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{payment.student_name}</TableCell>
                      <TableCell>{payment.class_name}</TableCell>
                      <TableCell align="right" sx={{ color: 'success.main', fontWeight: 600 }}>
                        {payment.amount_paid.toLocaleString()}
                      </TableCell>
                      <TableCell>{payment.receipt_number}</TableCell>
                      <TableCell>{payment.payment_method}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )
      ) : (
        <Paper elevation={0} className="p-8 text-center bg-white rounded-xl border border-gray-200">
          <Typography color="text.secondary">No payments found for the selected filters</Typography>
        </Paper>
      )}
    </Box>
  );
};

export default PaymentsByDate;