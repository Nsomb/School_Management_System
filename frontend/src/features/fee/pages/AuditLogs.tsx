import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  TextField,
  Button,
  Grid,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Stack,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import { useFeeApi } from '../hooks/useFeeApi';
import type { AuditLog } from '../types/feeTypes';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Helper: Export to PDF ───────────────────────────────────────────────────
const exportAuditLogsToPDF = (logs: AuditLog[], filters: any) => {
  if (!logs || logs.length === 0) {
    alert('No logs to export.');
    return;
  }

  const doc = new jsPDF('landscape', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(18);
  doc.text('Audit Logs', pageWidth / 2, 40, { align: 'center' });

  let subtitle = `Generated: ${new Date().toLocaleString()}`;
  if (filters.action) subtitle += ` | Action: ${filters.action}`;
  if (filters.entityType) subtitle += ` | Entity: ${filters.entityType}`;
  if (filters.startDate) subtitle += ` | From: ${filters.startDate}`;
  if (filters.endDate) subtitle += ` | To: ${filters.endDate}`;
  doc.setFontSize(10);
  doc.text(subtitle, pageWidth / 2, 60, { align: 'center' });

  const headers = ['Date/Time', 'User', 'Action', 'Entity', 'IP Address', 'Details'];
  const rows = logs.map(log => [
    new Date(log.created_at).toLocaleString(),
    log.user_username || 'System',
    log.action.replace(/_/g, ' '),
    `${log.entity_type} #${log.entity_id}`,
    log.ip_address || 'N/A',
    (log.old_data ? `Old: ${JSON.stringify(log.old_data).slice(0, 60)}...` : '') +
    (log.new_data ? ` | New: ${JSON.stringify(log.new_data).slice(0, 60)}...` : '')
  ]);

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 80,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255] },
    margin: { left: 30, right: 30 },
  });

  doc.save(`audit_logs_${new Date().toISOString().slice(0, 10)}.pdf`);
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
const AuditLogs: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const { getAuditLogs, loading } = useFeeApi();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);

  const [filters, setFilters] = useState({
    action: '',
    entityType: '',
    startDate: '',
    endDate: '',
  });

  const actionOptions = [
    'PAYMENT_CREATED',
    'PAYMENT_VOIDED',
    'PAYMENT_REVERSED',
    'FEE_STRUCTURE_CREATED',
    'FEE_STRUCTURE_UPDATED',
    'FEE_STRUCTURE_DELETED',
    'DISCOUNT_TYPE_CREATED',
    'DISCOUNT_TYPE_UPDATED',
    'DISCOUNT_TYPE_DELETED',
    'STUDENT_DISCOUNT_ASSIGNED',
    'STUDENT_DISCOUNT_REMOVED',
  ];

  const entityOptions = [
    'payment',
    'fee_structure',
    'discount_type',
    'student_discount',
  ];

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const fetchLogs = useCallback(async (showLoading = true) => {
    if (showLoading) setFetching(true);
    setError(null);
    try {
      const result = await getAuditLogs({
        ...filters,
        limit: rowsPerPage,
        offset: page * rowsPerPage
      });
      setLogs(result?.logs || []);
      setTotal(result?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
      setLogs([]);
      setTotal(0);
    } finally {
      if (showLoading) setFetching(false);
    }
  }, [filters, page, rowsPerPage, getAuditLogs]);

  const debouncedFetch = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => fetchLogs(true), 500);
  }, [fetchLogs]);

  useEffect(() => {
    fetchLogs(true);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [page, rowsPerPage]);

  useEffect(() => {
    if (page !== 0) setPage(0);
    else debouncedFetch();
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [filters]);

  const handleFilterChange = (field: string, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleChangePage = (event: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleExportPDF = () => exportAuditLogsToPDF(logs, filters);

  const getActionColor = (action: string) => {
    if (action.includes('CREATED') || action.includes('PAID')) return 'success';
    if (action.includes('UPDATED')) return 'info';
    if (action.includes('VOID') || action.includes('REVERS')) return 'error';
    if (action.includes('DELET')) return 'error';
    return 'default';
  };

  if (loading && logs.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 3 }, width: '100%', boxSizing: 'border-box' }}>
      {/* Top Header */}
      <Box
        display="flex"
        flexDirection={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        gap={2}
        mb={3}
      >
        <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight: 600 }}>
          Audit Logs
        </Typography>

        <Box width={{ xs: '100%', sm: 'auto' }}>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleExportPDF}
            disabled={logs.length === 0}
            fullWidth={isMobile}
            size="small"
            color="primary"
          >
            Download PDF
          </Button>
        </Box>
      </Box>

      {/* Filter Controls */}
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Action</InputLabel>
              <Select
                value={filters.action}
                label="Action"
                onChange={(e) => handleFilterChange('action', e.target.value)}
              >
                <MenuItem value="">All Actions</MenuItem>
                {actionOptions.map(action => (
                  <MenuItem key={action} value={action}>{action.replace(/_/g, ' ')}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Entity Type</InputLabel>
              <Select
                value={filters.entityType}
                label="Entity Type"
                onChange={(e) => handleFilterChange('entityType', e.target.value)}
              >
                <MenuItem value="">All Entities</MenuItem>
                {entityOptions.map(entity => (
                  <MenuItem key={entity} value={entity}>{entity.replace(/_/g, ' ')}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Start Date"
              type="date"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="End Date"
              type="date"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
          </Grid>
        </Grid>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Main Content Area */}
      <Paper elevation={isMobile ? 0 : 3} sx={{ bgcolor: isMobile ? 'transparent' : 'background.paper' }}>
        {isMobile ? (
          /* Mobile View: Stacked Cards */
          <Stack spacing={2}>
            {fetching && logs.length === 0 ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress size={30} />
              </Box>
            ) : logs.length === 0 ? (
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="textSecondary">
                  No audit logs found.
                </Typography>
              </Paper>
            ) : (
              logs.map((log) => (
                <Card key={log.id} variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(log.created_at).toLocaleString()}
                      </Typography>
                      <Chip
                        label={log.action.replace(/_/g, ' ')}
                        color={getActionColor(log.action)}
                        size="small"
                      />
                    </Box>

                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      User: {log.user_username || 'System'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Entity: {log.entity_type} #{log.entity_id}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      IP: {log.ip_address || 'N/A'}
                    </Typography>

                    {(log.old_data || log.new_data) && (
                      <>
                        <Divider sx={{ my: 1 }} />
                        <Box sx={{ fontSize: '0.75rem', bgcolor: 'action.hover', p: 1, borderRadius: 1 }}>
                          {log.old_data && (
                            <div><strong>Old:</strong> {JSON.stringify(log.old_data)}</div>
                          )}
                          {log.new_data && (
                            <div><strong>New:</strong> {JSON.stringify(log.new_data)}</div>
                          )}
                        </Box>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </Stack>
        ) : (
          /* Desktop View: Full Table */
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Date/Time</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Entity</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>IP Address</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {fetching && logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <CircularProgress size={30} />
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="textSecondary">
                        No audit logs found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                      <TableCell>{log.user_username || 'System'}</TableCell>
                      <TableCell>
                        <Chip
                          label={log.action.replace(/_/g, ' ')}
                          color={getActionColor(log.action)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{log.entity_type} #{log.entity_id}</TableCell>
                      <TableCell>{log.ip_address || 'N/A'}</TableCell>
                      <TableCell>
                        <Box sx={{ maxWidth: 220, maxHeight: 60, overflow: 'auto', fontSize: '0.75rem' }}>
                          {log.old_data && <div>Old: {JSON.stringify(log.old_data).slice(0, 50)}...</div>}
                          {log.new_data && <div>New: {JSON.stringify(log.new_data).slice(0, 50)}...</div>}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <TablePagination
          rowsPerPageOptions={[25, 50, 100]}
          component="div"
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
    </Box>
  );
};

export default AuditLogs;