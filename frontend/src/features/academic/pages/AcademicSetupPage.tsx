// frontend/src/features/academic/pages/AcademicSetupPage.tsx
import { useState, useEffect, useCallback } from 'react';
import {
  Box, Container, Typography, Button, TextField, IconButton, Alert,
  CircularProgress, Paper, List, ListItem, ListItemButton, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider, Chip,
  Stack, Card, useMediaQuery, useTheme, Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  School as SchoolIcon,
  Category as CategoryIcon,
} from '@mui/icons-material';
import {
  fetchFaculties, createFaculty, updateFaculty, deleteFaculty,
  fetchSpecialtiesByFaculty, createSpecialty, updateSpecialty, deleteSpecialty,
  type Faculty, type Specialty,
} from '../services/academicService';

export default function AcademicSetupPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);

  const [loadingFaculties, setLoadingFaculties] = useState(true);
  const [loadingSpecialties, setLoadingSpecialties] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [facultyDialogOpen, setFacultyDialogOpen] = useState(false);
  const [facultyEditing, setFacultyEditing] = useState<Faculty | null>(null);
  const [facultyName, setFacultyName] = useState('');
  const [facultySaving, setFacultySaving] = useState(false);

  const [specialtyDialogOpen, setSpecialtyDialogOpen] = useState(false);
  const [specialtyEditing, setSpecialtyEditing] = useState<Specialty | null>(null);
  const [specialtyName, setSpecialtyName] = useState('');
  const [specialtySaving, setSpecialtySaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<
    { type: 'faculty' | 'specialty'; id: number; name: string } | null
  >(null);
  const [deleting, setDeleting] = useState(false);

  // ─── Load faculties ───────────────────────────────────
  const loadFaculties = useCallback(async (selectId?: number) => {
    setLoadingFaculties(true);
    setError(null);
    try {
      const data = await fetchFaculties();
      setFaculties(data);

      const target = selectId
        ? data.find((f) => f.id === selectId)
        : data[0];
      if (target) {
        setSelectedFaculty(target);
      } else {
        setSelectedFaculty(null);
        setSpecialties([]);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load faculties.');
    } finally {
      setLoadingFaculties(false);
    }
  }, []);

  const loadSpecialties = useCallback(async (facultyId: number) => {
    setLoadingSpecialties(true);
    try {
      const data = await fetchSpecialtiesByFaculty(facultyId);
      setSpecialties(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load specialties.');
      setSpecialties([]);
    } finally {
      setLoadingSpecialties(false);
    }
  }, []);

  useEffect(() => {
    loadFaculties();
  }, [loadFaculties]);

  useEffect(() => {
    if (selectedFaculty) loadSpecialties(selectedFaculty.id);
    else setSpecialties([]);
  }, [selectedFaculty, loadSpecialties]);

  // ─── Faculty actions ──────────────────────────────────
  const openCreateFaculty = () => {
    setFacultyEditing(null);
    setFacultyName('');
    setError(null);
    setFacultyDialogOpen(true);
  };

  const openEditFaculty = (faculty: Faculty) => {
    setFacultyEditing(faculty);
    setFacultyName(faculty.name);
    setError(null);
    setFacultyDialogOpen(true);
  };

  const handleSaveFaculty = async () => {
    const name = facultyName.trim();
    if (!name) { setError('Faculty name is required.'); return; }
    setFacultySaving(true);
    setError(null);
    try {
      if (facultyEditing) {
        await updateFaculty(facultyEditing.id, name);
        await loadFaculties(facultyEditing.id);
      } else {
        const created = await createFaculty(name);
        await loadFaculties(created.id);
      }
      setFacultyDialogOpen(false);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to save faculty.');
    } finally {
      setFacultySaving(false);
    }
  };

  // ─── Specialty actions ────────────────────────────────
  const openCreateSpecialty = () => {
    if (!selectedFaculty) return;
    setSpecialtyEditing(null);
    setSpecialtyName('');
    setError(null);
    setSpecialtyDialogOpen(true);
  };

  const openEditSpecialty = (specialty: Specialty) => {
    setSpecialtyEditing(specialty);
    setSpecialtyName(specialty.name);
    setError(null);
    setSpecialtyDialogOpen(true);
  };

  const handleSaveSpecialty = async () => {
    if (!selectedFaculty) return;
    const name = specialtyName.trim();
    if (!name) { setError('Specialty name is required.'); return; }
    setSpecialtySaving(true);
    setError(null);
    try {
      if (specialtyEditing) {
        await updateSpecialty(specialtyEditing.id, name, selectedFaculty.id);
      } else {
        await createSpecialty(name, selectedFaculty.id);
      }
      // ⚡ Await BOTH so the faculty count refreshes after the specialty is created
      await loadSpecialties(selectedFaculty.id);
      await loadFaculties(selectedFaculty.id);
      setSpecialtyDialogOpen(false);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to save specialty.');
    } finally {
      setSpecialtySaving(false);
    }
  };

  // ─── Delete ───────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      if (deleteTarget.type === 'faculty') {
        await deleteFaculty(deleteTarget.id);
        await loadFaculties();
      } else {
        await deleteSpecialty(deleteTarget.id);
        if (selectedFaculty) {
          await loadSpecialties(selectedFaculty.id);
          await loadFaculties(selectedFaculty.id);
        }
      }
      setDeleteTarget(null);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to delete.');
    } finally {
      setDeleting(false);
    }
  };

  // ─── Render ───────────────────────────────────────────
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 }, px: { xs: 1.5, sm: 2 } }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} sx={{ fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
          Academic Setup
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure faculties and specialties. Subjects and teacher assignments depend on these.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {!loadingFaculties && faculties.length === 0 && (
        <Paper
          elevation={0}
          sx={{
            border: '1px dashed', borderColor: 'grey.300',
            borderRadius: 3, p: 4, textAlign: 'center',
          }}
        >
          <SchoolIcon sx={{ fontSize: 56, color: 'primary.main', mb: 1 }} />
          <Typography variant="h6" gutterBottom>No faculties yet</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 480, mx: 'auto' }}>
            Create your first faculty to unlock subjects, classes, and teacher assignments.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateFaculty}>
            Create Faculty
          </Button>
        </Paper>
      )}

      {faculties.length > 0 && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '320px 1fr' },
            gap: 2,
          }}
        >
          <Card
            variant="outlined"
            sx={{ borderRadius: 2, display: 'flex', flexDirection: 'column', minHeight: { md: 480 } }}
          >
            <Box
              sx={{
                p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderBottom: '1px solid', borderColor: 'divider',
              }}
            >
              <Typography variant="subtitle2" fontWeight={700}>
                Faculties ({faculties.length})
              </Typography>
              <Tooltip title="Add Faculty">
                <IconButton size="small" color="primary" onClick={openCreateFaculty}>
                  <AddIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            {loadingFaculties ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <List disablePadding sx={{ flex: 1, overflowY: 'auto' }}>
                {faculties.map((f) => (
                  <ListItem
                    key={f.id}
                    disablePadding
                    secondaryAction={
                      <Stack direction="row" spacing={0} sx={{ mr: 1 }}>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); openEditFaculty(f); }}>
                          <EditIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'faculty', id: f.id, name: f.name }); }}
                        >
                          <DeleteIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Stack>
                    }
                  >
                    <ListItemButton
                      selected={selectedFaculty?.id === f.id}
                      onClick={() => setSelectedFaculty(f)}
                    >
                      <ListItemText
                        primary={f.name}
                        secondary={`${f.specialty_count ?? 0} ${(f.specialty_count ?? 0) === 1 ? 'specialty' : 'specialties'}`}
                        primaryTypographyProps={{ fontWeight: 500, fontSize: 14 }}
                        secondaryTypographyProps={{ fontSize: 12 }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </Card>

          <Card
            variant="outlined"
            sx={{ borderRadius: 2, minHeight: { md: 480 }, display: 'flex', flexDirection: 'column' }}
          >
            {selectedFaculty ? (
              <>
                <Box
                  sx={{
                    p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    borderBottom: '1px solid', borderColor: 'divider',
                  }}
                >
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700}>
                      {selectedFaculty.name} — Specialties
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {specialties.length} {specialties.length === 1 ? 'specialty' : 'specialties'}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={openCreateSpecialty}
                    sx={{ textTransform: 'none' }}
                  >
                    Add
                  </Button>
                </Box>

                {loadingSpecialties ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : specialties.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <CategoryIcon sx={{ fontSize: 40, color: 'grey.400', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      No specialties yet for {selectedFaculty.name}.
                    </Typography>
                    <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={openCreateSpecialty}>
                      Add First Specialty
                    </Button>
                  </Box>
                ) : (
                  <List disablePadding sx={{ flex: 1, overflowY: 'auto' }}>
                    {specialties.map((s) => (
                      <ListItem
                        key={s.id}
                        divider
                        secondaryAction={
                          <Stack direction="row" spacing={0}>
                            <IconButton size="small" onClick={() => openEditSpecialty(s)}>
                              <EditIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setDeleteTarget({ type: 'specialty', id: s.id, name: s.name })}
                            >
                              <DeleteIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Stack>
                        }
                      >
                        <ListItemText primary={s.name} primaryTypographyProps={{ fontSize: 14 }} />
                      </ListItem>
                    ))}
                  </List>
                )}
              </>
            ) : (
              <Box sx={{ p: 4, textAlign: 'center', my: 'auto' }}>
                <Typography variant="body2" color="text.secondary">
                  Select a faculty on the left to manage its specialties.
                </Typography>
              </Box>
            )}
          </Card>
        </Box>
      )}

      {/* Faculty dialog */}
      <Dialog open={facultyDialogOpen} onClose={() => !facultySaving && setFacultyDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pr: 1 }}>
          {facultyEditing ? 'Edit Faculty' : 'Add Faculty'}
          <IconButton size="small" onClick={() => setFacultyDialogOpen(false)} disabled={facultySaving}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          <TextField
            fullWidth
            label="Faculty Name"
            value={facultyName}
            onChange={(e) => setFacultyName(e.target.value)}
            placeholder="e.g., Grammar, Commercial, Industrial"
            autoFocus
            disabled={facultySaving}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveFaculty()}
          />
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setFacultyDialogOpen(false)} disabled={facultySaving}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveFaculty} disabled={facultySaving}>
            {facultySaving ? <CircularProgress size={20} color="inherit" /> : facultyEditing ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Specialty dialog */}
      <Dialog open={specialtyDialogOpen} onClose={() => !specialtySaving && setSpecialtyDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pr: 1 }}>
          {specialtyEditing ? 'Edit Specialty' : 'Add Specialty'}
          <IconButton size="small" onClick={() => setSpecialtyDialogOpen(false)} disabled={specialtySaving}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          {selectedFaculty && (
            <Chip label={`Faculty: ${selectedFaculty.name}`} size="small" sx={{ mb: 2 }} color="primary" variant="outlined" />
          )}
          <TextField
            fullWidth
            label="Specialty Name"
            value={specialtyName}
            onChange={(e) => setSpecialtyName(e.target.value)}
            placeholder="e.g., Arts, Science, Accounting"
            autoFocus
            disabled={specialtySaving}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveSpecialty()}
          />
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSpecialtyDialogOpen(false)} disabled={specialtySaving}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveSpecialty} disabled={specialtySaving}>
            {specialtySaving ? <CircularProgress size={20} color="inherit" /> : specialtyEditing ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm Delete</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="body1">Delete <strong>{deleteTarget?.name}</strong>?</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {deleteTarget?.type === 'faculty'
              ? 'You cannot delete a faculty that still has specialties or subjects.'
              : 'This action cannot be undone.'}
          </Typography>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}>
            {deleting ? <CircularProgress size={20} color="inherit" /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}