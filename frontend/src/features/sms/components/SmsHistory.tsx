// src/features/sms/components/SmsHistory.tsx
import React, { useEffect, useState, useMemo } from 'react';
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
  Chip,
  useTheme,
  TablePagination,
  CircularProgress,
  Stack,
} from '@mui/material';
import { useSmsApi } from '../hooks/useSmsApi';
import type { SmsLog } from '../types/smsTypes';
import { format } from 'date-fns';

type StatusColorMap = {
  sent: 'success';
  failed: 'error';
  partial_success: 'warning';
  pending: 'default';
};

const statusColors: StatusColorMap = {
  sent: 'success',
  failed: 'error',
  partial_success: 'warning',
  pending: 'default',
};

export const SmsHistory: React.FC = () => {
  const theme = useTheme();
  const { fetchSmsHistory, isLoading, error } = useSmsApi();
  const [history, setHistory] = useState<SmsLog[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    const loadHistory = async () => {
      const data = await fetchSmsHistory();
      if (data) setHistory(data);
    };
    loadHistory();
  }, [fetchSmsHistory]);

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const visibleRows = useMemo(
    () => history.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [history, page, rowsPerPage]
  );

  if (isLoading && history.length === 0) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={2} color={theme.palette.error.main}>
        {error}
      </Box>
    );
  }

  if (!isLoading && history.length === 0) {
    return (
      <Box p={2} textAlign="center">
        <Typography variant="body1">No message history found</Typography>
      </Box>
    );
  }

  return (
    <Paper elevation={3}>
      <Box p={2}>
        <Typography variant="h6" gutterBottom>
          Message History
        </Typography>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Message Preview</TableCell>
                <TableCell>Recipients</TableCell>
                <TableCell>Delivery</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleRows.map((log) => {
                const messagePreview =
                  (log.message_content || '').length > 50
                    ? `${(log.message_content || '').substring(0, 50)}...`
                    : log.message_content || '';

                const recipientLabel = `${log.recipient_count} ${log.recipient_type}`;

                return (
                  <TableRow key={log.id} hover>
                    <TableCell>
                      {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm')}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 220 }}>
                      <Typography variant="body2" noWrap title={log.message_content}>
                        {messagePreview}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{recipientLabel}</Typography>
                    </TableCell>

                    {/* ─── Channel breakdown ─────────────── */}
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {log.whatsapp_count > 0 && (
                          <Chip
                            label={`💬 WhatsApp: ${log.whatsapp_count}`}
                            size="small"
                            sx={{ bgcolor: '#dcfce7', color: '#166534', fontWeight: 500 }}
                          />
                        )}
                        {log.sms_count > 0 && (
                          <Chip
                            label={`📱 SMS: ${log.sms_count}`}
                            size="small"
                            sx={{ bgcolor: '#dbeafe', color: '#1e40af', fontWeight: 500 }}
                          />
                        )}
                        {log.failed_count > 0 && (
                          <Chip
                            label={`❌ Failed: ${log.failed_count}`}
                            size="small"
                            sx={{ bgcolor: '#fee2e2', color: '#991b1b', fontWeight: 500 }}
                          />
                        )}
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={String(log.status || 'pending').replace('_', ' ')}
                        color={statusColors[log.status as keyof StatusColorMap] || 'default'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={history.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Box>
    </Paper>
  );
};