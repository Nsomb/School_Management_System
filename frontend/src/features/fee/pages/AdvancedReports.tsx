import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Divider,
  Chip,
  Tooltip
} from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import { useFeeApi } from '../hooks/useFeeApi';
import { formatCurrency } from '../utils/feeHelpers';

interface TabPanelProps {
  children: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index} style={{ paddingTop: 16, width: '100%' }}>
      {value === index && children}
    </div>
  );
}

// ─── Helper: Export data to CSV ────────────────────────────────────────────
const exportToCSV = (data: any[], filename: string, headers: string[], rowMapper: (row: any) => any[]) => {
  if (!data || data.length === 0) {
    alert('No data to export.');
    return;
  }

  let csv = headers.join(',') + '\n';
  data.forEach(row => {
    const values = rowMapper(row).map(v => {
      // Handle commas and quotes
      if (typeof v === 'string' && (v.includes(',') || v.includes('"'))) {
        return `"${v.replace(/"/g, '""')}"`;
      }
      return v;
    });
    csv += values.join(',') + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const AdvancedReports: React.FC = () => {
  const {
    getDebtorsList,
    getClearedList,
    getDailyCollections,
    getMonthlyCollections,
    getAllClasses,
    getAllAcademicYears,
    getFeeStructures,
    loading
  } = useFeeApi();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [activeTab, setActiveTab] = useState(0);
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedClass, setSelectedClass] = useState<number | 'all'>('all');
  const [selectedComponent, setSelectedComponent] = useState<string>('all');
  const [components, setComponents] = useState<{ name: string; amount: number }[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const [debtors, setDebtors] = useState<any[]>([]);
  const [cleared, setCleared] = useState<any[]>([]);
  const [dailyData, setDailyData] = useState<{ payments: any[]; total: number }>({ payments: [], total: 0 });
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString();
  };

  // ─── Export Handlers ──────────────────────────────────────────────────────

  const exportDebtors = () => {
    exportToCSV(
      debtors,
      `debtors_${selectedYear}_${selectedClass === 'all' ? 'all' : classes.find(c => c.id === selectedClass)?.name}`,
      ['Student', 'Class', 'Expected (FCFA)', 'Paid (FCFA)', 'Balance (FCFA)'],
      (row) => [
        row.student_name || '',
        row.class_name || '',
        Number(row.total_expected || 0).toFixed(2),
        Number(row.total_paid || 0).toFixed(2),
        Math.max(0, Number(row.outstanding_balance || 0)).toFixed(2)
      ]
    );
  };

  const exportCleared = () => {
    exportToCSV(
      cleared,
      `cleared_${selectedYear}_${selectedClass === 'all' ? 'all' : classes.find(c => c.id === selectedClass)?.name}`,
      ['Student', 'Class', 'Expected (FCFA)', 'Paid (FCFA)', 'Balance (FCFA)'],
      (row) => [
        row.student_name || '',
        row.class_name || '',
        Number(row.total_expected || 0).toFixed(2),
        Number(row.total_paid || 0).toFixed(2),
        '0.00'
      ]
    );
  };

  const exportDaily = () => {
    exportToCSV(
      dailyData.payments,
      `daily_collections_${selectedDate}`,
      ['Receipt #', 'Student', 'Class', 'Method', 'Amount (FCFA)', 'Recorded By'],
      (p) => [
        p.receipt_number || '',
        p.student_name || '',
        p.class_name || '',
        p.payment_method || '',
        Number(p.amount_paid || 0).toFixed(2),
        p.recorded_by || 'N/A'
      ]
    );
  };

  const exportMonthly = () => {
    exportToCSV(
      monthlyData,
      `monthly_collections_${selectedMonth}`,
      ['Date', 'Payments', 'Total Collected (FCFA)'],
      (row) => [
        formatDateLabel(row.date),
        row.payment_count || 0,
        Number(row.total_collected || 0).toFixed(2)
      ]
    );
  };

  // ─── useEffect hooks (unchanged) ─────────────────────────────────────────

  useEffect(() => {
    let isMounted = true;
    const fetchOptions = async () => {
      try {
        const [yearsRes, classesRes] = await Promise.all([
          getAllAcademicYears(),
          getAllClasses()
        ]);
        if (!isMounted) return;
        setAcademicYears(yearsRes);
        setClasses(classesRes.map((c: any) => ({ id: c.id, name: c.name })));
        if (yearsRes.length > 0) setSelectedYear(yearsRes[0]);
      } catch (err) {
        if (isMounted) setError('Failed to load initial options.');
      }
    };
    fetchOptions();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchComponents = async () => {
      if (selectedClass === 'all' || !selectedYear) {
        setComponents([]);
        setSelectedComponent('all');
        return;
      }
      try {
        const structures = await getFeeStructures(selectedClass, selectedYear);
        if (!isMounted) return;
        const comps = structures.flatMap((s: any) => s.components || []);
        const unique = comps.filter((v: any, i: number, a: any[]) => a.findIndex(t => t.name === v.name) === i);
        setComponents(unique);
        setSelectedComponent('all');
      } catch (err) {
        if (isMounted) { setComponents([]); setSelectedComponent('all'); }
      }
    };
    fetchComponents();
    return () => { isMounted = false; };
  }, [selectedClass, selectedYear]);

  useEffect(() => {
    if (!selectedYear) return;
    let isMounted = true;
    const classId = selectedClass === 'all' ? undefined : selectedClass;

    const fetchData = async () => {
      try {
        setError(null);
        if (activeTab === 0) {
          const data = await getDebtorsList(selectedYear, classId, selectedComponent === 'all' ? undefined : selectedComponent);
          if (isMounted) setDebtors(data);
        } else if (activeTab === 1) {
          const data = await getClearedList(selectedYear, classId, selectedComponent === 'all' ? undefined : selectedComponent);
          if (isMounted) setCleared(data);
        }
      } catch (err) {
        if (isMounted) setError('Failed to load financial records.');
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [selectedYear, selectedClass, selectedComponent, activeTab]);

  const fetchDaily = useCallback(async () => {
    try {
      setError(null);
      const classId = selectedClass === 'all' ? undefined : selectedClass;
      const data = await getDailyCollections(selectedDate, classId);
      setDailyData(data);
    } catch (err) {
      setError('Failed to load daily collections.');
    }
  }, [selectedDate, selectedClass, getDailyCollections]);

  const fetchMonthly = useCallback(async () => {
    try {
      setError(null);
      const classId = selectedClass === 'all' ? undefined : selectedClass;
      const data = await getMonthlyCollections(selectedMonth, classId);
      setMonthlyData(data);
    } catch (err) {
      setError('Failed to load monthly collections.');
    }
  }, [selectedMonth, selectedClass, getMonthlyCollections]);

  useEffect(() => {
    if (activeTab === 2) fetchDaily();
  }, [activeTab, fetchDaily]);

  useEffect(() => {
    if (activeTab === 3) fetchMonthly();
  }, [activeTab, fetchMonthly]);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        p: { xs: 1, sm: 3 },
        bgcolor: { xs: 'background.default', sm: 'transparent' }
      }}
    >
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, px: { xs: 1, sm: 0 } }}>
        Advanced Reports
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper
        elevation={isMobile ? 0 : 3}
        sx={{
          p: { xs: 1, sm: 3 },
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          bgcolor: isMobile ? 'transparent' : 'background.paper',
          border: isMobile ? 'none' : undefined
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider', width: '100%' }}
          variant={isMobile ? 'scrollable' : 'standard'}
          scrollButtons={isMobile ? 'auto' : false}
        >
          <Tab label="Debtors List" />
          <Tab label="Cleared List" />
          <Tab label="Daily Collections" />
          <Tab label="Monthly Collections" />
        </Tabs>

        {/* Filters Bar (unchanged) */}
        <Box sx={{ display: 'flex', gap: isMobile ? 1.5 : 2, flexWrap: 'wrap', mb: 3, width: '100%' }}>
          <FormControl size="small" sx={{ minWidth: 140, flex: isMobile ? '1 1 100%' : '1' }}>
            <InputLabel>Academic Year</InputLabel>
            <Select
              value={selectedYear}
              label="Academic Year"
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {academicYears.map(year => (
                <MenuItem key={year} value={year}>{year}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 140, flex: isMobile ? '1 1 100%' : '1' }}>
            <InputLabel>Class</InputLabel>
            <Select
              value={selectedClass}
              label="Class"
              onChange={(e) => setSelectedClass(e.target.value as number | 'all')}
            >
              <MenuItem value="all">All Classes</MenuItem>
              {classes.map(cls => (
                <MenuItem key={cls.id} value={cls.id}>{cls.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {(activeTab === 0 || activeTab === 1) && (
            <FormControl
              size="small"
              sx={{ minWidth: 160, flex: isMobile ? '1 1 100%' : '1' }}
              disabled={selectedClass === 'all' || components.length === 0}
            >
              <InputLabel>Component</InputLabel>
              <Select
                value={selectedComponent}
                label="Component"
                onChange={(e) => setSelectedComponent(e.target.value)}
              >
                <MenuItem value="all">All Components</MenuItem>
                {components.map(comp => (
                  <MenuItem key={comp.name} value={comp.name}>
                    {comp.name} ({formatCurrency(comp.amount)})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {activeTab === 2 && (
            <>
              <TextField
                label="Date"
                type="date"
                size="small"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 140, flex: isMobile ? '1 1 100%' : '1' }}
              />
              <Button variant="contained" onClick={fetchDaily} disabled={loading} size="medium" fullWidth={isMobile}>
                {loading ? <CircularProgress size={20} /> : 'Refresh'}
              </Button>
            </>
          )}

          {activeTab === 3 && (
            <>
              <TextField
                label="Month"
                type="month"
                size="small"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 140, flex: isMobile ? '1 1 100%' : '1' }}
              />
              <Button variant="contained" onClick={fetchMonthly} disabled={loading} size="medium" fullWidth={isMobile}>
                {loading ? <CircularProgress size={20} /> : 'Refresh'}
              </Button>
            </>
          )}
        </Box>

        {/* ─── TAB 0: Debtors ──────────────────────────────────────────────── */}
        <TabPanel value={activeTab} index={0}>
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" mb={1}>
            <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 600 }}>
              Students with Outstanding Balance
            </Typography>
            {debtors.length > 0 && (
              <Tooltip title="Export to CSV">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={exportDebtors}
                  sx={{ fontSize: isMobile ? '0.7rem' : '0.8rem' }}
                >
                  Export
                </Button>
              </Tooltip>
            )}
          </Box>

          {isMobile ? (
            <Box display="flex" flexDirection="column" gap={1.5}>
              {debtors.map(row => {
                const balance = Math.max(0, row.outstanding_balance || 0);
                return (
                  <Box
                    key={row.student_id}
                    sx={{
                      bgcolor: 'background.paper',
                      borderRadius: 2,
                      p: 2,
                      border: '1px solid',
                      borderColor: 'divider'
                    }}
                  >
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="subtitle1" fontWeight={600}>{row.student_name}</Typography>
                      <Chip label={row.class_name} size="small" variant="outlined" />
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography variant="body2" color="text.secondary">Expected:</Typography>
                      <Typography variant="body2">{formatCurrency(row.total_expected)}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography variant="body2" color="text.secondary">Paid:</Typography>
                      <Typography variant="body2">{formatCurrency(row.total_paid)}</Typography>
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" fontWeight={600}>Balance:</Typography>
                      <Typography variant="body1" fontWeight={700} color="error.main">
                        {formatCurrency(balance)}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
              {debtors.length === 0 && !loading && (
                <Typography align="center" color="text.secondary" sx={{ py: 3 }}>
                  No debtors found.
                </Typography>
              )}
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Student</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Class</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Expected</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Paid</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Balance</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {debtors.map(row => {
                    const balance = Math.max(0, row.outstanding_balance || 0);
                    return (
                      <TableRow key={row.student_id}>
                        <TableCell>{row.student_name}</TableCell>
                        <TableCell>{row.class_name}</TableCell>
                        <TableCell align="right">{formatCurrency(row.total_expected)}</TableCell>
                        <TableCell align="right">{formatCurrency(row.total_paid)}</TableCell>
                        <TableCell align="right" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                          {formatCurrency(balance)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {debtors.length === 0 && !loading && (
                    <TableRow><TableCell colSpan={5} align="center">No debtors found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* ─── TAB 1: Cleared ──────────────────────────────────────────────── */}
        <TabPanel value={activeTab} index={1}>
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" mb={1}>
            <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 600 }}>
              Students Fully Cleared
            </Typography>
            {cleared.length > 0 && (
              <Tooltip title="Export to CSV">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={exportCleared}
                  sx={{ fontSize: isMobile ? '0.7rem' : '0.8rem' }}
                >
                  Export
                </Button>
              </Tooltip>
            )}
          </Box>

          {isMobile ? (
            <Box display="flex" flexDirection="column" gap={1.5}>
              {cleared.map(row => (
                <Box
                  key={row.student_id}
                  sx={{
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle1" fontWeight={600}>{row.student_name}</Typography>
                    <Chip label={row.class_name} size="small" variant="outlined" />
                  </Box>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2" color="text.secondary">Expected:</Typography>
                    <Typography variant="body2">{formatCurrency(row.total_expected)}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2" color="text.secondary">Paid:</Typography>
                    <Typography variant="body2">{formatCurrency(row.total_paid)}</Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" fontWeight={600}>Status:</Typography>
                    <Chip label="Cleared" size="small" color="success" />
                  </Box>
                </Box>
              ))}
              {cleared.length === 0 && !loading && (
                <Typography align="center" color="text.secondary" sx={{ py: 3 }}>
                  No cleared students found.
                </Typography>
              )}
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Student</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Class</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Expected</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Paid</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Balance</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cleared.map(row => (
                    <TableRow key={row.student_id}>
                      <TableCell>{row.student_name}</TableCell>
                      <TableCell>{row.class_name}</TableCell>
                      <TableCell align="right">{formatCurrency(row.total_expected)}</TableCell>
                      <TableCell align="right">{formatCurrency(row.total_paid)}</TableCell>
                      <TableCell align="right" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                        {formatCurrency(0)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {cleared.length === 0 && !loading && (
                    <TableRow><TableCell colSpan={5} align="center">No cleared students found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* ─── TAB 2: Daily Collections ────────────────────────────────────── */}
        <TabPanel value={activeTab} index={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" mb={1}>
            <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 600 }}>
              Daily Collections – {formatDateLabel(selectedDate)}
            </Typography>
            {dailyData.payments.length > 0 && (
              <Tooltip title="Export to CSV">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={exportDaily}
                  sx={{ fontSize: isMobile ? '0.7rem' : '0.8rem' }}
                >
                  Export
                </Button>
              </Tooltip>
            )}
          </Box>
          <Typography variant="subtitle2" gutterBottom sx={{ mb: 1.5 }}>
            Total: <strong>{formatCurrency(dailyData.total)}</strong> from {dailyData.payments.length} payments
          </Typography>

          {isMobile ? (
            <Box display="flex" flexDirection="column" gap={1.5}>
              {dailyData.payments.map(p => (
                <Box
                  key={p.id}
                  sx={{
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle2" fontWeight={600}>#{p.receipt_number}</Typography>
                    <Chip label={p.payment_method} size="small" color="primary" variant="outlined" />
                  </Box>
                  <Typography variant="body1" fontWeight={600} mb={0.5}>{p.student_name}</Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                    Class: {p.class_name} • By: {p.recorded_by || 'N/A'}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">Amount Paid:</Typography>
                    <Typography variant="body1" fontWeight={700} color="success.main">
                      {formatCurrency(p.amount_paid)}
                    </Typography>
                  </Box>
                </Box>
              ))}
              {dailyData.payments.length === 0 && !loading && (
                <Typography align="center" color="text.secondary" sx={{ py: 3 }}>
                  No payments recorded on this date.
                </Typography>
              )}
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Receipt #</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Student</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Class</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Method</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Recorded By</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dailyData.payments.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>{p.receipt_number}</TableCell>
                      <TableCell>{p.student_name}</TableCell>
                      <TableCell>{p.class_name}</TableCell>
                      <TableCell>{p.payment_method}</TableCell>
                      <TableCell align="right">{formatCurrency(p.amount_paid)}</TableCell>
                      <TableCell>{p.recorded_by || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                  {dailyData.payments.length === 0 && !loading && (
                    <TableRow><TableCell colSpan={6} align="center">No payments recorded on this date.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* ─── TAB 3: Monthly Collections ──────────────────────────────────── */}
        <TabPanel value={activeTab} index={3}>
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" mb={1}>
            <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 600 }}>
              Monthly Collections – {selectedMonth}
            </Typography>
            {monthlyData.length > 0 && (
              <Tooltip title="Export to CSV">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={exportMonthly}
                  sx={{ fontSize: isMobile ? '0.7rem' : '0.8rem' }}
                >
                  Export
                </Button>
              </Tooltip>
            )}
          </Box>

          {isMobile ? (
            <Box display="flex" flexDirection="column" gap={1.5}>
              {monthlyData.map(row => (
                <Box
                  key={row.date}
                  sx={{
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <Typography variant="subtitle1" fontWeight={600} mb={1}>
                    {formatDateLabel(row.date)}
                  </Typography>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2" color="text.secondary">Payments:</Typography>
                    <Typography variant="body2">{row.payment_count}</Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" fontWeight={600}>Total Collected:</Typography>
                    <Typography variant="body1" fontWeight={700} color="primary.main">
                      {formatCurrency(row.total_collected)}
                    </Typography>
                  </Box>
                </Box>
              ))}
              {monthlyData.length === 0 && !loading && (
                <Typography align="center" color="text.secondary" sx={{ py: 3 }}>
                  No collections for this month.
                </Typography>
              )}
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Payments</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Total Collected</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {monthlyData.map(row => (
                    <TableRow key={row.date}>
                      <TableCell>{formatDateLabel(row.date)}</TableCell>
                      <TableCell align="right">{row.payment_count}</TableCell>
                      <TableCell align="right">{formatCurrency(row.total_collected)}</TableCell>
                    </TableRow>
                  ))}
                  {monthlyData.length === 0 && !loading && (
                    <TableRow><TableCell colSpan={3} align="center">No collections for this month.</TableCell></TableRow>
                  )}
                  {monthlyData.length > 0 && (
                    <TableRow sx={{ backgroundColor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>Total</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                        {monthlyData.reduce((sum, r) => sum + parseInt(r.payment_count, 10), 0)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                        {formatCurrency(monthlyData.reduce((sum, r) => sum + parseFloat(r.total_collected), 0))}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default AdvancedReports;