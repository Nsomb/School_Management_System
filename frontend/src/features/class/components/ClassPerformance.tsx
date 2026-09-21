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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
  Tooltip,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import { useClassPerformance } from '../hooks/useClassPerformance';
import { downloadClassMarksheetPDF } from '../api/classApi';
import { useState } from 'react';

interface ClassPerformanceProps {
  className: string;
  term: string;
  academicYear: string;
}

const SUBJECT_MAP: Record<string, string> = {
  'Computer Science': 'CSC',
  'Information and Communications Technology': 'ICT',
  'Information & Communication Technology': 'ICT',
  'Mathematics': 'MAT',
  'English Language': 'ENG',
  'French Language': 'FRE',
  'Physical Education': 'PED',
  'Physics': 'PHY',
  'Chemistry': 'CHE',
  'Biology': 'BIO',
  'Geography': 'GEO',
  'History': 'HIS',
  'Economics': 'ECO',
  'Citizenship': 'CIT',
  'Logic': 'LOG',
  'Philosophy': 'PHI',
  'Literature in English': 'LIT',
  'Geology': 'GEL',
  'Further Mathematics': 'FMA',
};

const formatSubjectName = (name: string): string => {
  if (SUBJECT_MAP[name]) return SUBJECT_MAP[name];
  return name.substring(0, 3).toUpperCase();
};

const SUBJECT_COL_WIDTH = 26;
const STUDENT_NAME_COL_WIDTH = 180;

export function ClassPerformance({ className, term, academicYear }: ClassPerformanceProps) {
  const [evaluationType, setEvaluationType] = useState('EVA1');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tempEvalType, setTempEvalType] = useState('EVA1');
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const { reportData, loading, error } = useClassPerformance(className, evaluationType, term, academicYear);

  const handleDownloadPDF = async () => {
    setDownloadError(null);
    try {
      await downloadClassMarksheetPDF(className, evaluationType, term, academicYear);
    } catch (err: any) {
      setDownloadError(`Failed to download PDF: ${err.message}`);
    }
  };

  const handleOpenDialog = () => {
    setTempEvalType(evaluationType);
    setDialogOpen(true);
  };

  const handleLoadData = () => {
    setEvaluationType(tempEvalType);
    setDialogOpen(false);
  };

  const totalTableWidth = reportData
    ? STUDENT_NAME_COL_WIDTH + (reportData.subjects.length * SUBJECT_COL_WIDTH)
    : 'auto';

  return (
    <Box sx={{ maxWidth: '100%', overflow: 'hidden' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            Performance - {className}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {term} • {academicYear} • <strong>{evaluationType}</strong>
          </Typography>
        </Box>

        <Box display="flex" gap={0.5}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<EditIcon />}
            onClick={handleOpenDialog}
            sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
          >
            Eval
          </Button>

          <Tooltip title="Download PDF">
            <span>
              <IconButton onClick={handleDownloadPDF} disabled={loading || !reportData} size="small">
                <DownloadIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
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

      {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}

      {!loading && !error && reportData && reportData.students.length > 0 && (
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{
            overflowX: 'auto',
            maxWidth: '100%',
            WebkitOverflowScrolling: 'touch',
            display: 'inline-block',
          }}
        >
          <Table
            size="small"
            sx={{
              borderCollapse: 'collapse',
              tableLayout: 'fixed',
              width: `${totalTableWidth}px`,
              minWidth: `${totalTableWidth}px`,
              maxWidth: `${totalTableWidth}px`,
              '& .MuiTableCell-root': {
                padding: 0,
              },
            }}
          >
            <TableHead>
              <TableRow sx={{ height: 105 }}>
                <TableCell
                  sx={{
                    width: STUDENT_NAME_COL_WIDTH,
                    minWidth: STUDENT_NAME_COL_WIDTH,
                    maxWidth: STUDENT_NAME_COL_WIDTH,
                    position: 'sticky',
                    left: 0,
                    backgroundColor: '#f5f5f5',
                    zIndex: 3,
                    borderRight: '2px solid #333',
                    borderBottom: '2px solid #333',
                    fontWeight: 'bold',
                    verticalAlign: 'bottom',
                    px: 1,
                    py: 0.5,
                    fontSize: '0.85rem',
                    lineHeight: 1.15,
                  }}
                >
                  Student
                </TableCell>

                {reportData.subjects.map((subject) => (
                  <TableCell
                    key={subject.id}
                    align="center"
                    sx={{
                      width: SUBJECT_COL_WIDTH,
                      minWidth: SUBJECT_COL_WIDTH,
                      maxWidth: SUBJECT_COL_WIDTH,
                      p: 0,
                      position: 'relative',
                      borderLeft: '1px solid #ccc',
                      borderRight: '1px solid #ccc',
                      borderBottom: '2px solid #333',
                      verticalAlign: 'bottom',
                      backgroundColor: '#f5f5f5',
                    }}
                  >
                    <Tooltip title={subject.name} arrow enterTouchDelay={0}>
                      <Box
                        sx={{
                          writingMode: 'vertical-rl',
                          transform: 'rotate(180deg)',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          lineHeight: 1,
                          whiteSpace: 'nowrap',
                          display: 'inline-block',
                          height: '85px',
                          py: 0.5,
                          userSelect: 'none',
                        }}
                      >
                        {formatSubjectName(subject.name)}
                      </Box>
                    </Tooltip>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {reportData.students.map((student, rowIndex) => (
                <TableRow key={student.student_id}>
                  <TableCell
                    sx={{
                      fontWeight: 'medium',
                      position: 'sticky',
                      left: 0,
                      backgroundColor: 'background.paper',
                      zIndex: 1,
                      borderRight: '2px solid #333',
                      borderBottom: '1px solid #eee',
                      width: STUDENT_NAME_COL_WIDTH,
                      minWidth: STUDENT_NAME_COL_WIDTH,
                      maxWidth: STUDENT_NAME_COL_WIDTH,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      px: 1,
                      py: 0.5,
                      fontSize: '0.8rem',
                      lineHeight: 1.15,
                    }}
                    title={student.student_name}
                  >
                    {student.student_name}
                  </TableCell>
                  {reportData.subjects.map((subject) => (
                    <TableCell
                      key={subject.id}
                      align="center"
                      sx={{
                        width: SUBJECT_COL_WIDTH,
                        minWidth: SUBJECT_COL_WIDTH,
                        maxWidth: SUBJECT_COL_WIDTH,
                        p: 0,
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        borderLeft: '1px solid #eee',
                        borderRight: '1px solid #eee',
                        borderBottom: '1px solid #eee',
                        backgroundColor: rowIndex % 2 === 0 ? '#fafafa' : 'inherit',
                        lineHeight: 1.1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {student.marks[subject.name] ?? '-'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {!loading && !error && reportData && reportData.students.length === 0 && (
        <Alert severity="info">No marks found for this evaluation type.</Alert>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Select Evaluation</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Evaluation Type"
            fullWidth
            variant="outlined"
            size="small"
            value={tempEvalType}
            onChange={(e) => setTempEvalType(e.target.value)}
            helperText="e.g., EVA1, EVA2, Exam"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleLoadData} variant="contained">Load Data</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}