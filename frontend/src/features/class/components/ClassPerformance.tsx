import {
  Box, Typography, CircularProgress, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, IconButton, Tooltip,
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
  'mathematics': 'MATH', 'maths': 'MATH', 'math': 'MATH',
  'further mathematics': 'F.MATH', 'further maths': 'F.MATH',
  'english language': 'ENG', 'english': 'ENG',
  'french language': 'FRE', 'french': 'FRE',
  'physics': 'PHY',
  'chemistry': 'CHEM',
  'biology': 'BIO',
  'human biology': 'H.BIO',
  'geography': 'GEO',
  'history': 'HIS',
  'economics': 'ECO',
  'citizenship': 'CIT', 'citizenship education': 'CIT',
  'philosophy': 'PHILO',
  'computer science': 'CSC',
  'information and communications technology': 'ICT',
  'information & communication technology': 'ICT',
  'ict': 'ICT',
  'literature': 'LIT', 'literature in english': 'LIT',
  'physical education': 'PE',
  'geology': 'GEOL',
  'logic': 'LOG',
  'religious studies': 'R.S',
  'science': 'SCI',
};

const abbreviateSubject = (name: string): string => {
  if (!name) return 'SUBJ';
  const lower = name.trim().toLowerCase();
  if (SUBJECT_MAP[lower]) return SUBJECT_MAP[lower];
  const clean = name.trim().toUpperCase();
  if (clean.length <= 5) return clean;
  return clean.substring(0, 4) + '.';
};

const HORIZONTAL_HEADER_THRESHOLD = 10;

const getSubjectColWidth = (subjectCount: number, useHorizontal: boolean): number => {
  if (useHorizontal) {
    if (subjectCount <= 5) return 54;
    if (subjectCount <= 7) return 46;
    if (subjectCount <= 9) return 40;
    return 36;
  }
  if (subjectCount <= 12) return 22;
  if (subjectCount <= 15) return 20;
  if (subjectCount <= 18) return 17;
  if (subjectCount <= 22) return 15;
  return 13;
};

const STUDENT_NAME_COL_WIDTH = 170;
const TOTAL_COL_WIDTH = 62;
const AVG_COL_WIDTH = 52;
const RANK_COL_WIDTH = 46;

const GRID_CELL: React.CSSProperties = {
  border: '1px solid #000',
  padding: '4px 6px',
  fontSize: '0.8rem',
  lineHeight: 1.15,
  color: '#000',
};

/**
 * A single marksheet cell can be one of three shapes:
 *   { score: number, isExempt: false }  → shows the mark
 *   { score: null,   isExempt: true  }  → shows "EX"
 *   null                                → shows blank
 */
type MarkCell = { score: number | null; isExempt: boolean } | null;

const renderCell = (cell: MarkCell): { text: string; italic?: boolean; gray?: boolean } => {
  if (!cell) return { text: '' };
  if (cell.isExempt) return { text: 'EX', italic: true, gray: true };
  if (cell.score !== null && cell.score !== undefined && !isNaN(cell.score)) {
    return { text: String(cell.score) };
  }
  return { text: '' };
};

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

  const handleOpenDialog = () => { setTempEvalType(evaluationType); setDialogOpen(true); };
  const handleLoadData = () => { setEvaluationType(tempEvalType); setDialogOpen(false); };

  const subjectCount = reportData?.subjects.length || 0;
  const useHorizontalHeaders = subjectCount <= HORIZONTAL_HEADER_THRESHOLD;
  const subjectColWidth = getSubjectColWidth(subjectCount, useHorizontalHeaders);
  const headerHeight = useHorizontalHeaders ? 46 : 115;

  const totalTableWidth =
    STUDENT_NAME_COL_WIDTH +
    subjectCount * subjectColWidth +
    TOTAL_COL_WIDTH + AVG_COL_WIDTH + RANK_COL_WIDTH;

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
            variant="outlined" size="small" startIcon={<EditIcon />}
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
          elevation={0}
          sx={{
            overflowX: 'auto',
            maxWidth: '100%',
            WebkitOverflowScrolling: 'touch',
            display: 'inline-block',
            border: '1px solid #000',
            borderRadius: 0,
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
              '& .MuiTableCell-root': { padding: 0, border: '1px solid #000' },
            }}
          >
            <TableHead>
              <TableRow sx={{ height: headerHeight }}>
                <TableCell
                  sx={{
                    ...GRID_CELL,
                    width: STUDENT_NAME_COL_WIDTH,
                    minWidth: STUDENT_NAME_COL_WIDTH,
                    maxWidth: STUDENT_NAME_COL_WIDTH,
                    position: 'sticky',
                    left: 0,
                    backgroundColor: '#f2f2f2',
                    zIndex: 3,
                    fontWeight: 700,
                    verticalAlign: 'middle',
                    px: 1,
                    fontSize: '0.82rem',
                  }}
                >
                  STUDENT NAME
                </TableCell>

                {reportData.subjects.map((subject) => (
                  <TableCell
                    key={subject.id}
                    align="center"
                    sx={{
                      ...GRID_CELL,
                      width: subjectColWidth,
                      minWidth: subjectColWidth,
                      maxWidth: subjectColWidth,
                      verticalAlign: 'middle',
                      backgroundColor: '#f2f2f2',
                      p: 0.25,
                      position: 'relative',
                    }}
                  >
                    <Tooltip title={subject.name} arrow enterTouchDelay={0}>
                      {useHorizontalHeaders ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.1 }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                            {abbreviateSubject(subject.name)}
                          </span>
                          {subject.coefficient != null && (
                            <span style={{ fontSize: '0.6rem', color: '#444' }}>
                              ({subject.coefficient})
                            </span>
                          )}
                        </Box>
                      ) : (
                        <Box
                          sx={{
                            writingMode: 'vertical-rl',
                            transform: 'rotate(180deg)',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            lineHeight: 1,
                            whiteSpace: 'nowrap',
                            display: 'inline-block',
                            height: '100px',
                            py: 0.5,
                            userSelect: 'none',
                          }}
                        >
                          {abbreviateSubject(subject.name)}
                          {subject.coefficient != null && (
                            <span style={{ fontWeight: 400, color: '#444' }}>
                              {' '}({subject.coefficient})
                            </span>
                          )}
                        </Box>
                      )}
                    </Tooltip>
                  </TableCell>
                ))}

                <TableCell align="center" sx={{
                  ...GRID_CELL, width: TOTAL_COL_WIDTH, minWidth: TOTAL_COL_WIDTH,
                  maxWidth: TOTAL_COL_WIDTH, backgroundColor: '#e8eef7',
                  fontWeight: 700, fontSize: '0.75rem', verticalAlign: 'middle',
                }}>
                  TOTAL
                </TableCell>
                <TableCell align="center" sx={{
                  ...GRID_CELL, width: AVG_COL_WIDTH, minWidth: AVG_COL_WIDTH,
                  maxWidth: AVG_COL_WIDTH, backgroundColor: '#e8eef7',
                  fontWeight: 700, fontSize: '0.75rem', verticalAlign: 'middle',
                }}>
                  AVG
                </TableCell>
                <TableCell align="center" sx={{
                  ...GRID_CELL, width: RANK_COL_WIDTH, minWidth: RANK_COL_WIDTH,
                  maxWidth: RANK_COL_WIDTH, backgroundColor: '#e8eef7',
                  fontWeight: 700, fontSize: '0.75rem', verticalAlign: 'middle',
                }}>
                  RANK
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {reportData.students.map((student) => (
                <TableRow key={student.student_id}>
                  <TableCell
                    sx={{
                      ...GRID_CELL,
                      fontWeight: 500,
                      position: 'sticky',
                      left: 0,
                      backgroundColor: '#fff',
                      zIndex: 1,
                      width: STUDENT_NAME_COL_WIDTH,
                      minWidth: STUDENT_NAME_COL_WIDTH,
                      maxWidth: STUDENT_NAME_COL_WIDTH,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      px: 1,
                    }}
                    title={student.student_name}
                  >
                    {student.student_name}
                  </TableCell>

                  {reportData.subjects.map((subject) => {
                    const cell = (student.marks as any)[subject.name] as MarkCell;
                    const { text, italic, gray } = renderCell(cell);
                    return (
                      <TableCell
                        key={subject.id}
                        align="center"
                        sx={{
                          ...GRID_CELL,
                          width: subjectColWidth,
                          minWidth: subjectColWidth,
                          maxWidth: subjectColWidth,
                          fontSize: '0.78rem',
                          fontWeight: italic ? 400 : 500,
                          fontStyle: italic ? 'italic' : 'normal',
                          color: gray ? '#666' : '#000',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {text}
                      </TableCell>
                    );
                  })}

                  <TableCell align="center" sx={{
                    ...GRID_CELL, width: TOTAL_COL_WIDTH, minWidth: TOTAL_COL_WIDTH,
                    maxWidth: TOTAL_COL_WIDTH, backgroundColor: '#eef3fb',
                    fontWeight: 700, fontSize: '0.8rem',
                  }}>
                    {student.total != null ? Number(student.total).toFixed(2) : '-'}
                  </TableCell>
                  <TableCell align="center" sx={{
                    ...GRID_CELL, width: AVG_COL_WIDTH, minWidth: AVG_COL_WIDTH,
                    maxWidth: AVG_COL_WIDTH, backgroundColor: '#eef3fb',
                    fontWeight: 700, fontSize: '0.8rem',
                  }}>
                    {student.avg != null ? Number(student.avg).toFixed(2) : '-'}
                  </TableCell>
                  <TableCell align="center" sx={{
                    ...GRID_CELL, width: RANK_COL_WIDTH, minWidth: RANK_COL_WIDTH,
                    maxWidth: RANK_COL_WIDTH, backgroundColor: '#eef3fb',
                    fontWeight: 700, fontSize: '0.8rem',
                  }}>
                    {student.rank ?? '-'}
                  </TableCell>
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
            autoFocus margin="dense" label="Evaluation Type" fullWidth
            variant="outlined" size="small" value={tempEvalType}
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