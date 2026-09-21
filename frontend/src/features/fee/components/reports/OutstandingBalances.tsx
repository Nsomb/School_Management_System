import React from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  Button,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import { formatCurrency } from '../../utils/feeHelpers';
import type { OutstandingBalance } from '../../types/feeTypes';

interface OutstandingBalancesProps {
  data: OutstandingBalance[];
  onExport?: () => void;
}

const OutstandingBalancesReport: React.FC<OutstandingBalancesProps> = ({ data, onExport }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (!data || data.length === 0) {
    return (
      <Box py={6} textAlign="center" className="w-full bg-white rounded-xl border border-gray-100">
        <Typography variant="body1" color="textSecondary">
          No outstanding balances found.
        </Typography>
      </Box>
    );
  }

  return (
    <Box className="w-full space-y-4">
      {/* Header & Export Action */}
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
            <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight="bold" color="text.primary">
              Outstanding Balances
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total records: {data.length}
            </Typography>
          </Box>

          {onExport && (
            <Button
              variant="contained"
              onClick={onExport}
              disabled={data.length === 0}
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

      {/* MOBILE VIEW: Full-Width Cards (Zero Horizontal Scrolling) */}
      {isMobile ? (
        <Box className="w-full space-y-3">
          {data.map((row) => {
            const totalPaid = Number(row.total_paid) || 0;
            const totalExpected = Number(row.total_expected) || 0;
            const balance = Math.max(0, Number(row.balance) || (totalExpected - totalPaid));

            return (
              <Box
                key={row.student_id}
                className="w-full bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3"
              >
                {/* Student Name & Class */}
                <Box className="flex justify-between items-start border-b border-gray-100 pb-2">
                  <Box>
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Student</span>
                    <span className="text-sm font-bold text-gray-900">{row.student_name}</span>
                  </Box>
                  <Box className="text-right">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Class</span>
                    <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md inline-block mt-0.5">
                      {row.class_name}
                    </span>
                  </Box>
                </Box>

                {/* Amount Paid & Amount Due */}
                <Box className="grid grid-cols-2 gap-2 text-sm pt-1">
                  <Box>
                    <span className="text-xs text-gray-500 block">Amount Paid</span>
                    <span className="text-sm font-semibold text-emerald-600">
                      {formatCurrency(totalPaid)}
                    </span>
                  </Box>
                  <Box>
                    <span className="text-xs text-gray-500 block">Amount Due</span>
                    <span className="text-sm font-semibold text-gray-700">
                      {formatCurrency(totalExpected)}
                    </span>
                  </Box>
                </Box>

                {/* Balance Summary */}
                <Box className="pt-2 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-500">Balance</span>
                  <span className={`text-sm font-bold ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {formatCurrency(balance)}
                  </span>
                </Box>
              </Box>
            );
          })}
        </Box>
      ) : (
        /* DESKTOP VIEW: Full Width Material Table */
        <Paper elevation={0} className="w-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <TableContainer className="w-full">
            <Table size="medium" className="w-full">
              <TableHead className="bg-gray-50">
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Student</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Class</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Amount Paid</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Amount Due</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Balance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((row) => {
                  const totalPaid = Number(row.total_paid) || 0;
                  const totalExpected = Number(row.total_expected) || 0;
                  const balance = Math.max(0, Number(row.balance) || (totalExpected - totalPaid));

                  return (
                    <TableRow key={row.student_id} hover className="transition-colors">
                      <TableCell sx={{ fontWeight: 500 }}>{row.student_name}</TableCell>
                      <TableCell>{row.class_name}</TableCell>
                      <TableCell align="right" sx={{ color: 'success.main', fontWeight: 500 }}>
                        {formatCurrency(totalPaid)}
                      </TableCell>
                      <TableCell align="right">{formatCurrency(totalExpected)}</TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          color: balance > 0 ? 'error.main' : 'success.main',
                          fontWeight: balance > 0 ? 'bold' : 'normal'
                        }}
                      >
                        {formatCurrency(balance)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
};

export default React.memo(OutstandingBalancesReport);