import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Stack,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import { useClassStatistics } from '../hooks/useClassStatistics';
import { downloadClassStatisticsPDF } from '../api/classApi';
import { useState } from 'react';

interface ClassStatisticsProps {
  className: string;
  term?: string;
  academicYear?: string;
}

// Shared black-grid style applied to both head and body cells
const GRID_CELL_SX = {
  border: '1px solid #000',
  fontSize: '0.82rem',
  color: '#000',
  py: 0.6,
  px: 1,
};

export function ClassStatistics({ className, term, academicYear }: ClassStatisticsProps) {
  const { statistics, loading, error, refetch, metadata } = useClassStatistics(className, term, academicYear);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const hasNoData =
    statistics.length > 0 &&
    statistics.every(
      (stat) =>
        parseFloat(stat.class_average_mark) === 0 &&
        parseFloat(stat.performance_percentage) === 0 &&
        stat.students_evaluated_count === 0
    );

  const handleDownloadPDF = async () => {
    setDownloadError(null);
    try {
      await downloadClassStatisticsPDF(className, term, academicYear);
    } catch (err: any) {
      setDownloadError(`Failed to download PDF: ${err.message}`);
    }
  };

  const displayTerm = metadata?.term || term || 'Current Term';
  const displayYear = metadata?.academic_year || academicYear || 'Current Year';

  return (
    <Box>
      <Box
        display="flex"
        flexDirection={{ xs: 'row', sm: 'row' }}
        justifyContent="space-between"
        alignItems="center"
        mb={1.5}
      >
        <Typography variant="h6" sx={{ fontSize: { xs: '1.05rem', sm: '1.25rem' } }}>
          {className} - {displayTerm} ({displayYear})
        </Typography>

        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Download PDF">
            <IconButton
              onClick={handleDownloadPDF}
              disabled={loading || statistics.length === 0}
              size="small"
            >
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh">
            <IconButton onClick={refetch} disabled={loading} size="small">
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {downloadError && (
        <Alert severity="error" onClose={() => setDownloadError(null)} sx={{ mb: 1 }}>
          {downloadError}
        </Alert>
      )}

      {loading && (
        <Box display="flex" justifyContent="center" my={3}>
          <CircularProgress size={24} />
        </Box>
      )}

      {error && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={refetch}>
              Retry
            </Button>
          }
          sx={{ mb: 1 }}
        >
          {error}
        </Alert>
      )}

      {!loading && !error && statistics.length === 0 && (
        <Alert severity="info">No statistics available for this class.</Alert>
      )}

      {!loading && !error && hasNoData && (
        <Alert severity="warning">Statistics show zeros - no marks entered or processed.</Alert>
      )}

      {statistics.length > 0 &&
        !hasNoData &&
        (isMobile ? (
          <Stack spacing={1}>
            {statistics.map((stat) => (
              <Card
                key={stat.subject_id}
                variant="outlined"
                sx={{ border: '1px solid #000', borderRadius: 0 }}
              >
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {stat.subject_name}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        color: stat.is_below_10_percent ? '#c62828' : '#2e7d32',
                      }}
                    >
                      {stat.is_below_10_percent ? 'NEEDS ATTENTION' : 'GOOD'}
                    </Typography>
                  </Box>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption">
                      Avg: <strong>{stat.class_average_mark}</strong>
                    </Typography>
                    <Typography variant="caption">
                      Pass: <strong>{stat.performance_percentage}%</strong>
                    </Typography>
                    <Typography variant="caption">
                      Evaluated: <strong>{stat.students_evaluated_count}</strong>
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        ) : (
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{ border: '1px solid #000', borderRadius: 0, overflowX: 'auto' }}
          >
            <Table
              size="small"
              sx={{
                borderCollapse: 'collapse',
                '& .MuiTableCell-root': GRID_CELL_SX,
                '& .MuiTableCell-root:not(:last-child)': { borderRight: '1px solid #000' },
                '& .MuiTableHead-root .MuiTableCell-root': {
                  backgroundColor: '#f2f2f2',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                },
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell align="left">SUBJECT</TableCell>
                  <TableCell align="right">AVG</TableCell>
                  <TableCell align="right">PERF %</TableCell>
                  <TableCell align="right">EVALUATED</TableCell>
                  <TableCell align="center">STATUS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {statistics.map((stat) => (
                  <TableRow key={stat.subject_id}>
                    <TableCell align="left">{stat.subject_name}</TableCell>
                    <TableCell align="right">{stat.class_average_mark}</TableCell>
                    <TableCell align="right">{stat.performance_percentage}%</TableCell>
                    <TableCell align="right">
                      {stat.students_evaluated_count}/
                      {stat.total_students_in_class || metadata?.total_students || 'N/A'}
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        fontWeight: 700,
                        color: stat.is_below_10_percent ? '#c62828' : '#2e7d32',
                      }}
                    >
                      {stat.is_below_10_percent ? 'NEEDS ATTENTION' : 'GOOD'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ))}
    </Box>
  );
}