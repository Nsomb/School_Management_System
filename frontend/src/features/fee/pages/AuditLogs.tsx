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
  Tooltip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import { useFeeApi } from '../hooks/useFeeApi';
import type { AuditLog } from '../types/feeTypes';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Helper: turn a raw audit log entry into human-readable text ─────────────
const formatAuditDetails = (log: AuditLog): string => {
  const action = log.action || '';
  const n = (log as any).new_data;
  const o = (log as any).old_data;

  const fmtAmount = (v: any): string => {
    if (v === null || v === undefined || v === '') return '';
    const num = Number(v);
    if (isNaN(num)) return String(v);
    return `${num.toLocaleString()} FCFA`;
  };

  const joinParts = (parts: (string | undefined | null | false)[]): string =>
    parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

  switch (action) {
    case 'PAYMENT_CREATED': {
      if (!n) return '—';
      const name = n.student_name || `Student #${n.student_id ?? '?'}`;
      const cls = n.student_class || n.class_name;
      const comp = n.component_name;
      const amt = fmtAmount(n.amount_paid);
      const method = n.payment_method;
      return joinParts([
        'Paid',
        amt,
        comp ? `${comp} fee` : 'fee',
        `for ${name}`,
        cls ? `(${cls})` : '',
        method ? `— ${method}` : '',
      ]);
    }

    case 'PAYMENT_VOIDED': {
      const ref = o || n || {};
      const name = ref.student_name;
      const amt = fmtAmount(ref.amount_paid);
      const receipt = ref.receipt_number;
      const reason = ref.void_reason || (n && n.void_reason);
      return joinParts([
        'Voided payment',
        receipt ? `#${receipt}` : '',
        amt ? `of ${amt}` : '',
        name ? `for ${name}` : '',
        reason ? `— ${reason}` : '',
      ]) || 'Payment voided';
    }

    case 'PAYMENT_REVERSED': {
      const orig = (n && n.original) || o || {};
      const name = orig.student_name;
      const amt = fmtAmount(orig.amount_paid);
      const receipt = orig.receipt_number;
      const reason = orig.reversal_reason;
      return joinParts([
        'Reversed payment',
        receipt ? `#${receipt}` : '',
        amt ? `of ${amt}` : '',
        name ? `for ${name}` : '',
        reason ? `— ${reason}` : '',
      ]) || 'Payment reversed';
    }

    case 'FEE_STRUCTURE_CREATED': {
      if (!n) return 'Created fee structure';
      const classes = Array.isArray(n.class_names) ? n.class_names.join(', ') : '';
      const year = n.academic_year || '';
      const term = n.term || '';
      const total = Array.isArray(n.components)
        ? n.components.reduce((s: number, c: any) => s + (Number(c.amount) || 0), 0)
        : 0;
      return joinParts([
        'Created fee structure',
        classes ? `for ${classes}` : '',
        year || term ? `(${[year, term].filter(Boolean).join(' ')})` : '',
        total ? `— ${fmtAmount(total)}` : '',
      ]);
    }

    case 'FEE_STRUCTURE_UPDATED': {
      const ref = n || o || {};
      const classes =
        (Array.isArray(ref.classes) ? ref.classes.map((c: any) => c.name).filter(Boolean).join(', ') : '') ||
        (Array.isArray(ref.class_names) ? ref.class_names.join(', ') : '');
      const year = ref.academic_year || '';
      const term = ref.term || '';
      return joinParts([
        'Updated fee structure',
        classes ? `for ${classes}` : '',
        year || term ? `(${[year, term].filter(Boolean).join(' ')})` : '',
      ]) || 'Updated fee structure';
    }

    case 'FEE_STRUCTURE_DELETED': {
      const ref = o || {};
      const classes =
        (Array.isArray(ref.classes) ? ref.classes.map((c: any) => c.name).filter(Boolean).join(', ') : '') ||
        (Array.isArray(ref.class_names) ? ref.class_names.join(', ') : '');
      const year = ref.academic_year || '';
      const term = ref.term || '';
      return joinParts([
        'Deleted fee structure',
        classes ? `for ${classes}` : '',
        year || term ? `(${[year, term].filter(Boolean).join(' ')})` : '',
      ]) || 'Deleted fee structure';
    }

    case 'DISCOUNT_TYPE_CREATED':
    case 'DISCOUNT_TYPE_UPDATED': {
      const ref = n || o || {};
      const name = ref.name || '';
      const value =
        ref.value != null
          ? ref.type === 'percentage'
            ? `${ref.value}%`
            : fmtAmount(ref.value)
          : '';
      const verb = action.includes('UPDATED') ? 'Updated' : 'Created';
      return joinParts([
        `${verb} discount type`,
        name ? `"${name}"` : '',
        value ? `(${value})` : '',
      ]);
    }

    case 'DISCOUNT_TYPE_DELETED': {
      const ref = o || {};
      const name = ref.name || '';
      return `Deleted discount type${name ? ` "${name}"` : ''}`;
    }

    case 'STUDENT_DISCOUNT_ASSIGNED': {
      if (!n) return 'Assigned student discount';
      return joinParts([
        `Assigned discount #${n.discountTypeId ?? '?'}`,
        `to student #${n.studentId ?? '?'}`,
        n.academicYear || n.term ? `(${[n.academicYear, n.term].filter(Boolean).join(' ')})` : '',
      ]);
    }

    case 'STUDENT_DISCOUNT_REMOVED': {
      const ref = o || {};
      return joinParts([
        'Removed discount',
        ref.discount_type_id ? `#${ref.discount_type_id}` : '',
        ref.student_id ? `from student #${ref.student_id}` : '',
      ]) || 'Removed student discount';
    }

    default:
      return '—';
  }
};

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

  const headers = ['Date/Time', 'User', 'Action', 'Entity', 'Details', 'IP'];

  const rows = logs.map((log) => [
    new Date(log.created_at).toLocaleString(),
    (log as any).username || (log as any).user_username || 'System',
    log.action.replace(/_/g, ' '),
    `${log.entity_type} #${log.entity_id}`,
    formatAuditDetails(log),       // long text — will wrap
    log.ip_address || 'N/A',
  ]);

  // A4 landscape width = 842pt. With 20pt margins → usable width 802pt.
  // Distribute: Date 100 | User 75 | Action 90 | Entity 80 | Details 380 | IP 77
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 80,
    styles: {
      fontSize: 7,           // smaller font so more text fits per cell
      cellPadding: 3,
      overflow: 'linebreak', // wrap long text across lines inside the cell
      valign: 'top',
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 75 },
      2: { cellWidth: 90 },
      3: { cellWidth: 80 },
      4: { cellWidth: 380 }, // Details gets the most space
      5: { cellWidth: 77 },
    },
    margin: { left: 20, right: 20 },
    didDrawPage: () => {
      // (optional) footer with page number
      const pageCount = doc.getNumberOfPages();
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.text(
        `Page ${doc.getCurrentPageInfo().pageNumber} of ${pageCount}`,
        pageWidth - 40,
        pageHeight - 15,
        { align: 'right' }
      );
    },
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

  const fetchLogs = useCallback(
    async (showLoading = true) => {
      if (showLoading) setFetching(true);
      setError(null);
      try {
        const result = await getAuditLogs({
          ...filters,
          limit: rowsPerPage,
          offset: page * rowsPerPage,
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
    },
    [filters, page, rowsPerPage, getAuditLogs]
  );

  const debouncedFetch = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => fetchLogs(true), 500);
  }, [fetchLogs]);

  useEffect(() => {
    fetchLogs(true);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [page, rowsPerPage]);

  useEffect(() => {
    if (page !== 0) setPage(0);
    else debouncedFetch();
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [filters]);

  const handleFilterChange = (field: string, value: any) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
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

  const getUserDisplayName = (log: AuditLog): string => {
    const anyLog = log as any;
    return anyLog.username || anyLog.user_username || 'System';
  };

  // Tooltip with raw JSON — small info icon next to the details
  const RawJsonTooltip = ({ log }: { log: AuditLog }) => {
    const anyLog = log as any;
    const raw: any = {};
    if (anyLog.old_data) raw.old = anyLog.old_data;
    if (anyLog.new_data) raw.new = anyLog.new_data;
    return (
      <Tooltip
        title={
          <pre style={{ margin: 0, fontSize: 11, maxWidth: 380, whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(raw, null, 2)}
          </pre>
        }
        placement="left"
        arrow
      >
        <span style={{ cursor: 'help', color: 'inherit' }}>ⓘ</span>
      </Tooltip>
    );
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
                {actionOptions.map((action) => (
                  <MenuItem key={action} value={action}>
                    {action.replace(/_/g, ' ')}
                  </MenuItem>
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
                {entityOptions.map((entity) => (
                  <MenuItem key={entity} value={entity}>
                    {entity.replace(/_/g, ' ')}
                  </MenuItem>
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

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Main Content Area */}
      <Paper elevation={isMobile ? 0 : 3} sx={{ bgcolor: isMobile ? 'transparent' : 'background.paper' }}>
        {isMobile ? (
          /* ═══════════ MOBILE VIEW ═══════════ */
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
                      User: {getUserDisplayName(log)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {formatAuditDetails(log)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                      Entity: {log.entity_type} #{log.entity_id} · IP: {log.ip_address || 'N/A'}
                    </Typography>
                  </CardContent>
                </Card>
              ))
            )}
          </Stack>
        ) : (
          /* ═══════════ DESKTOP VIEW ═══════════ */
          <TableContainer>
            <Table sx={{ tableLayout: 'fixed', width: '100%' }}>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 600, width: '140px' }}>Date/Time</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: '110px' }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: '120px' }}>Action</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: '140px' }}>Entity</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Details</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: '120px' }}>IP Address</TableCell>
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
                      <TableCell sx={{ fontSize: '0.8rem', verticalAlign: 'top' }}>
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', verticalAlign: 'top', wordBreak: 'break-word' }}>
                        {getUserDisplayName(log)}
                      </TableCell>
                      <TableCell sx={{ verticalAlign: 'top' }}>
                        <Chip
                          label={log.action.replace(/_/g, ' ')}
                          color={getActionColor(log.action)}
                          size="small"
                          sx={{ fontSize: '0.7rem', height: 22 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', verticalAlign: 'top', wordBreak: 'break-word' }}>
                        {log.entity_type} #{log.entity_id}
                      </TableCell>
                      <TableCell sx={{ verticalAlign: 'top' }}>
                        {/* ─── Wrapping details — no scroll, no ellipsis ─── */}
                        <Typography
                          variant="body2"
                          sx={{
                            fontSize: '0.78rem',
                            lineHeight: 1.35,
                            whiteSpace: 'normal',
                            wordBreak: 'break-word',
                            color: 'text.primary',
                          }}
                        >
                          {formatAuditDetails(log)}
                          {' '}
                          <RawJsonTooltip log={log} />
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', verticalAlign: 'top', color: 'text.secondary' }}>
                        {log.ip_address || 'N/A'}
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