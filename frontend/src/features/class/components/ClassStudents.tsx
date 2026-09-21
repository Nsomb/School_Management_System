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
  useTheme,
  useMediaQuery,
  IconButton,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useClassStudents } from '../hooks/useClassStudents';
import { downloadClassResource, downloadClassListPDF } from '../api/classApi';
import { useState } from 'react';

interface ClassStudentsProps {
  className: string;
}

export function ClassStudents({ className }: ClassStudentsProps) {
  const { students, loading, error, refetch } = useClassStudents(className);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownloadCSV = async () => {
    setIsDownloading(true);
    setDownloadError(null);
    try {
      await downloadClassResource({ 
        type: 'blank',
        className: className
      });
    } catch (err: any) {
      setDownloadError(`CSV download failed: ${err.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    setDownloadError(null);
    try {
      await downloadClassListPDF(className);
    } catch (err: any) {
      setDownloadError(`PDF download failed: ${err.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const getStudentName = (student: any) => student.name || student.student_name || 'Unnamed Student';

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  if (!className) return <Alert severity="info">Please select a class.</Alert>;
  if (loading) return <CircularProgress sx={{ display: 'block', mx: 'auto', my: 3 }} />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (students.length === 0) return <Alert severity="info">No students in this class.</Alert>;

  return (
    <Box>
      {downloadError && (
        <Alert severity="error" onClose={() => setDownloadError(null)} sx={{ mb: 2 }}>
          {downloadError}
        </Alert>
      )}

      <Stack 
        direction={{ xs: 'column', sm: 'row' }} 
        justifyContent="space-between" 
        alignItems={{ xs: 'stretch', sm: 'center' }} 
        spacing={1.5}
        sx={{ mb: 2 }}
      >
        <Typography variant="subtitle1" fontWeight="bold">
          Total: {students.length} students
        </Typography>

        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadCSV}
            disabled={isDownloading}
            size="small"
            fullWidth={isMobile}
          >
            CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            size="small"
            fullWidth={isMobile}
          >
            PDF
          </Button>
          <IconButton onClick={refetch} disabled={loading} size="small" color="primary">
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>

      {isMobile ? (
        <Stack spacing={1}>
          {students.map((student, index) => (
            <Card key={student.id || index} variant="outlined">
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="subtitle2" color="primary" fontWeight="bold">
                  {index + 1}. {getStudentName(student)}
                </Typography>
                <Divider sx={{ my: 0.5 }} />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    Sex: <strong>{student.sex || '-'}</strong>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    DOB: <strong>{formatDate(student.date_of_birth)}</strong>
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Sex</TableCell>
                <TableCell>Date of Birth</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {students.map((student, index) => (
                <TableRow key={student.id || index}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{getStudentName(student)}</TableCell>
                  <TableCell>{student.sex || '-'}</TableCell>
                  <TableCell>{formatDate(student.date_of_birth)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}