import React, { useMemo } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableFooter,
  Typography,
  Button,
  Box,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import { formatCurrency } from '../../utils/feeHelpers';
import type { CollectionSummary } from '../../types/feeTypes';

interface CollectionSummaryProps {
  data: CollectionSummary[];
  onExport?: () => void;
}

const CollectionSummaryReport: React.FC<CollectionSummaryProps> = ({ data, onExport }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const totals = useMemo(() => {
    const totalExpectedAll = data.reduce((sum, row) => sum + Number(row.total_expected || 0), 0);
    const totalCollectedAll = data.reduce((sum, row) => sum + Number(row.total_paid || 0), 0);
    const totalPercentageAll = totalExpectedAll > 0 ? (totalCollectedAll / totalExpectedAll) * 100 : 0;
    return { totalExpectedAll, totalCollectedAll, totalPercentageAll };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <Box py={6} textAlign="center" className="w-full bg-white rounded-xl border border-gray-100">
        <Typography variant="body1" color="textSecondary">
          No data available for the selected filters.
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
            <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight="bold">
              Fee Collection Summary
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total classes: {data.length}
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

      {/* MOBILE VIEW: Cards View */}
      {isMobile ? (
        <Box className="w-full space-y-3">
          {data.map((row, index) => {
            const totalExpected = Number(row.total_expected) || 0;
            const totalCollected = Number(row.total_paid) || 0;
            const percentage = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

            return (
              <Box 
                key={index} 
                className="w-full bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-2"
              >
                <Box className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Class</span>
                  <span className="text-sm font-bold text-blue-900">{row.class_name}</span>
                </Box>

                <Box className="grid grid-cols-2 gap-2 text-sm pt-1">
                  <Box>
                    <span className="text-xs text-gray-500 block">Total Expected</span>
                    <span className="text-sm font-semibold text-gray-800">{formatCurrency(totalExpected)}</span>
                  </Box>
                  <Box>
                    <span className="text-xs text-gray-500 block">Total Collected</span>
                    <span className="text-sm font-semibold text-emerald-600">{formatCurrency(totalCollected)}</span>
                  </Box>
                </Box>

                <Box className="pt-2 border-t border-gray-100 flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-medium">% Paid</span>
                  <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                    {percentage.toFixed(1)}%
                  </span>
                </Box>
              </Box>
            );
          })}

          {/* Overall Summary Card for Mobile */}
          <Box className="w-full bg-blue-900 text-white p-4 rounded-xl shadow-md space-y-2 mt-4">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-200 block">Overall Summary</span>
            <Box className="grid grid-cols-2 gap-2 text-xs border-t border-blue-800 pt-2">
              <Box>
                <span className="text-blue-300 block">Expected:</span>
                <span className="font-bold text-sm">{formatCurrency(totals.totalExpectedAll)}</span>
              </Box>
              <Box>
                <span className="text-blue-300 block">Collected:</span>
                <span className="font-bold text-sm text-emerald-400">{formatCurrency(totals.totalCollectedAll)}</span>
              </Box>
            </Box>
            <Box className="pt-2 border-t border-blue-800 flex justify-between items-center text-xs">
              <span className="text-blue-200">Overall Progress</span>
              <span className="font-bold text-emerald-300 bg-blue-950 px-2.5 py-1 rounded-md">
                {totals.totalPercentageAll.toFixed(1)}%
              </span>
            </Box>
          </Box>
        </Box>
      ) : (
        /* DESKTOP VIEW: Table */
        <Paper elevation={0} className="w-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <TableContainer className="w-full">
            <Table size="medium" className="w-full">
              <TableHead className="bg-gray-50">
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Class</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Total Expected</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Total Collected</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>% Paid</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((row, index) => {
                  const totalExpected = Number(row.total_expected) || 0;
                  const totalCollected = Number(row.total_paid) || 0;
                  const percentage = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

                  return (
                    <TableRow key={index} hover className="transition-colors">
                      <TableCell sx={{ fontWeight: 500 }}>{row.class_name}</TableCell>
                      <TableCell align="right">{formatCurrency(totalExpected)}</TableCell>
                      <TableCell align="right" sx={{ color: 'success.main', fontWeight: 500 }}>
                        {formatCurrency(totalCollected)}
                      </TableCell>
                      <TableCell align="right">{percentage.toFixed(1)}%</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter className="bg-gray-50 font-bold">
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Overall</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatCurrency(totals.totalExpectedAll)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                    {formatCurrency(totals.totalCollectedAll)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>{totals.totalPercentageAll.toFixed(1)}%</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
};

export default React.memo(CollectionSummaryReport);