// src/features/subjects/components/SubjectList.tsx
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Typography,
  Box,
  CircularProgress,
  useMediaQuery,
  useTheme,
  Chip,
  Stack,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import type { Subject } from '../types/subjectTypes';

interface SubjectListProps {
  subjects: Subject[];
  loading: boolean;
  error: string | null;
  onEdit: (subject: Subject) => void;
  onDelete: (id: string) => void;
}

// Read faculty names — new shape first, legacy fallbacks for safety
const getFacultyNames = (subject: any): string[] => {
  if (Array.isArray(subject.faculties) && subject.faculties.length > 0) {
    return subject.faculties.map((f: any) => f.name);
  }
  if (subject.faculty_name) return [subject.faculty_name];
  if (subject.faculty?.name) return [subject.faculty.name];
  return [];
};

// Read specialty names — new shape first, legacy fallbacks
const getSpecialtyNames = (subject: any): string[] => {
  if (Array.isArray(subject.specialty_names) && subject.specialty_names.length > 0) {
    return subject.specialty_names;
  }
  if (Array.isArray(subject.specialties) && subject.specialties.length > 0) {
    return subject.specialties.map((s: any) => s.name);
  }
  if (subject.specialty_name) return [subject.specialty_name];
  if (subject.specialty?.name) return [subject.specialty.name];
  return [];
};

export const SubjectList = ({
  subjects,
  loading,
  error,
  onEdit,
  onDelete,
}: SubjectListProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (loading && !subjects.length) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box py={4}>
        <Typography color="error" align="center">
          {error}
        </Typography>
      </Box>
    );
  }

  if (!subjects.length) {
    return (
      <Box py={4}>
        <Typography align="center">No subjects found</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer
        component={Paper}
        sx={{
          maxWidth: '100%',
          overflowX: 'auto',
          '& .MuiTableCell-root': {
            py: isSmallMobile ? 1 : 1.5,
            px: isSmallMobile ? 1 : 2,
          },
        }}
      >
        <Table size={isMobile ? 'small' : 'medium'} aria-label="subjects table">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Subject Name</TableCell>
              {!isMobile && (
                <>
                  <TableCell sx={{ fontWeight: 'bold' }}>Coefficient</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Faculties</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Specialties</TableCell>
                </>
              )}
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {subjects.map((subject) => {
              const facultyNames = getFacultyNames(subject);
              const specialtyNames = getSpecialtyNames(subject);

              return (
                <TableRow key={subject.id}>
                  <TableCell component="th" scope="row">
                    <Typography fontWeight={500}>{subject.name}</Typography>
                    {isMobile && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', mt: 0.5, gap: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          Coef: {subject.coefficient}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Faculties:{' '}
                          {facultyNames.length > 0 ? facultyNames.join(', ') : 'N/A'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Specialties:{' '}
                          {specialtyNames.length > 0 ? specialtyNames.join(', ') : 'N/A'}
                        </Typography>
                      </Box>
                    )}
                  </TableCell>

                  {!isMobile && (
                    <>
                      <TableCell>
                        <Chip label={subject.coefficient} size="small" />
                      </TableCell>

                      {/* ─── Faculties (multi) ──────────────── */}
                      <TableCell>
                        {facultyNames.length === 0 ? (
                          <Typography variant="caption" color="text.secondary">
                            —
                          </Typography>
                        ) : (
                          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                            {facultyNames.map((name, i) => (
                              <Chip
                                key={i}
                                label={name}
                                size="small"
                                variant="outlined"
                                color="primary"
                              />
                            ))}
                          </Stack>
                        )}
                      </TableCell>

                      {/* ─── Specialties (multi, collapse if >3) ── */}
                      <TableCell>
                        {specialtyNames.length === 0 ? (
                          <Typography variant="caption" color="text.secondary">
                            —
                          </Typography>
                        ) : specialtyNames.length > 3 ? (
                          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                            {specialtyNames.slice(0, 2).map((name, i) => (
                              <Chip key={i} label={name} size="small" variant="outlined" />
                            ))}
                            <Chip
                              label={`+${specialtyNames.length - 2} more`}
                              size="small"
                              variant="outlined"
                              color="default"
                            />
                          </Stack>
                        ) : (
                          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                            {specialtyNames.map((name, i) => (
                              <Chip key={i} label={name} size="small" variant="outlined" />
                            ))}
                          </Stack>
                        )}
                      </TableCell>
                    </>
                  )}

                  <TableCell align="right">
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: isSmallMobile ? 0.5 : 1,
                      }}
                    >
                      <IconButton
                        color="primary"
                        onClick={() => onEdit(subject)}
                        size={isSmallMobile ? 'small' : 'medium'}
                        aria-label="edit subject"
                      >
                        <EditIcon fontSize={isSmallMobile ? 'small' : 'medium'} />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => onDelete(String(subject.id))}
                        size={isSmallMobile ? 'small' : 'medium'}
                        aria-label="delete subject"
                      >
                        <DeleteIcon fontSize={isSmallMobile ? 'small' : 'medium'} />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};