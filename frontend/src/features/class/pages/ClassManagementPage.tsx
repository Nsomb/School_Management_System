// src/features/class/pages/ClassManagementPage.tsx
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, IconButton, Chip, Alert,
  CircularProgress, Card, CardContent, Stack, Divider, InputAdornment,
  useMediaQuery, useTheme, Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  School as SchoolIcon,
  InfoOutlined as InfoIcon,
} from '@mui/icons-material';
import {
  fetchAllClasses,
  createClass,
  updateClass,
  deleteClass,
  type ClassRecord,
} from '../api/classApi';

interface ClassFormState {
  class_name: string;
  progression_order: string;
  stream: string;
}

const emptyForm: ClassFormState = {
  class_name: '',
  progression_order: '',
  stream: '',
};

export default function ClassManagementPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ClassFormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ClassRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllClasses();
      setClasses(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load classes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (cls: ClassRecord) => {
    setEditingId(cls.id);
    setForm({
      class_name: cls.class_name,
      progression_order:
        cls.progression_order !== null && cls.progression_order !== undefined
          ? String(cls.progression_order)
          : '',
      stream: cls.stream || '',
    });
    setFormError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    setForm(emptyForm);
    setEditingId(null);
    setFormError(null);
  };

  const handleSave = async () => {
    setFormError(null);
    const trimmedName = form.class_name.trim();
    if (!trimmedName) {
      setFormError('Class name is required.');
      return;
    }

    let progression_order: number | null = null;
    if (form.progression_order.trim() !== '') {
      const n = Number(form.progression_order);
      if (!Number.isInteger(n) || n < 0) {
        setFormError('Progression order must be a positive integer (or leave blank).');
        return;
      }
      progression_order = n;
    }

    const stream = form.stream.trim() || null;

    setSaving(true);
    try {
      const payload = { class_name: trimmedName, progression_order, stream };
      if (editingId) {
        await updateClass(editingId, payload);
      } else {
        await createClass(payload);
      }
      await load();
      closeForm();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || 'Failed to save class.';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteClass(deleteTarget.id);
      await load();
      setDeleteTarget(null);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || 'Failed to delete class.';
      setError(msg);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const filtered = classes.filter((c) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      c.class_name.toLowerCase().includes(q) ||
      (c.stream || '').toLowerCase().includes(q)
    );
  });

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 }, px: { xs: 1.5, sm: 2 } }}>
      {/* HEADER */}
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/admin/classes')}
          sx={{ mb: 1.5, textTransform: 'none' }}
          size="small"
        >
          Back to Class Analytics
        </Button>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', sm: 'center' },
            gap: 2,
          }}
        >
          <Box>
            <Typography
              variant="h5"
              fontWeight={700}
              sx={{ fontSize: { xs: '1.25rem', md: '1.5rem' } }}
            >
              Manage Classes
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create, edit, and organize your school's classes and progression order
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreate}
            sx={{
              alignSelf: { xs: 'stretch', sm: 'auto' },
              textTransform: 'none',
            }}
          >
            Add Class
          </Button>
        </Box>
      </Box>

      {/* ERROR */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* SEARCH */}
      <TextField
        fullWidth
        size="small"
        placeholder="Search classes by name or stream..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2 }}
      />

      {/* CONTENT */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filtered.length === 0 ? (
        <Card
          elevation={0}
          sx={{
            border: '1px dashed',
            borderColor: 'grey.300',
            borderRadius: 3,
            p: 4,
            textAlign: 'center',
          }}
        >
          <SchoolIcon sx={{ fontSize: 56, color: 'grey.400', mb: 1 }} />
          <Typography variant="h6" gutterBottom>
            {classes.length === 0 ? 'No classes yet' : 'No matches found'}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 3, maxWidth: 480, mx: 'auto' }}
          >
            {classes.length === 0
              ? 'Create your first class to get started. Classes are used for attendance, marks, and student promotion.'
              : 'Try a different search term.'}
          </Typography>
          {classes.length === 0 && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
              Create First Class
            </Button>
          )}
        </Card>
      ) : isMobile ? (
        /* ─── MOBILE: CARDS ─────────────────────────────── */
        <Stack spacing={1.5}>
          {filtered.map((cls) => (
            <Card
              key={cls.id}
              elevation={0}
              sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}
            >
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 1,
                  }}
                >
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight={700} noWrap>
                      {cls.class_name}
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ mt: 1, flexWrap: 'wrap' }}
                      useFlexGap
                    >
                      {cls.progression_order !== null &&
                      cls.progression_order !== undefined ? (
                        <Chip
                          size="small"
                          label={`Order ${cls.progression_order}`}
                          color="primary"
                          variant="outlined"
                        />
                      ) : (
                        <Chip size="small" label="No order" variant="outlined" />
                      )}
                      {cls.stream && (
                        <Chip
                          size="small"
                          label={cls.stream}
                          color="secondary"
                          variant="outlined"
                        />
                      )}
                    </Stack>
                  </Box>
                  <Stack direction="row" spacing={0.5}>
                    <IconButton
                      size="small"
                      onClick={() => openEdit(cls)}
                      aria-label="edit"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setDeleteTarget(cls)}
                      aria-label="delete"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        /* ─── DESKTOP: TABLE ────────────────────────────── */
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}
        >
          <Table>
            <TableHead sx={{ bgcolor: 'grey.50' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Class Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">
                  Progression Order
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Stream</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((cls) => (
                <TableRow key={cls.id} hover>
                  <TableCell>
                    <Typography fontWeight={500}>{cls.class_name}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    {cls.progression_order !== null &&
                    cls.progression_order !== undefined ? (
                      <Chip
                        size="small"
                        label={cls.progression_order}
                        color="primary"
                        variant="outlined"
                      />
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        —
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {cls.stream ? (
                      <Chip
                        size="small"
                        label={cls.stream}
                        color="secondary"
                        variant="outlined"
                      />
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        —
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Stack
                      direction="row"
                      spacing={0.5}
                      justifyContent="flex-end"
                    >
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit(cls)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeleteTarget(cls)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ═══════════ FORM DIALOG ═══════════ */}
      <Dialog
        open={formOpen}
        onClose={closeForm}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pr: 1,
          }}
        >
          {editingId ? 'Edit Class' : 'Create Class'}
          <IconButton onClick={closeForm} size="small" disabled={saving}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ pt: 3 }}>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}

          <Stack spacing={3}>
            <TextField
              label="Class Name"
              required
              fullWidth
              value={form.class_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, class_name: e.target.value }))
              }
              placeholder="e.g., Form 1, Form 3 Commercial, 6ème"
              disabled={saving}
              autoFocus
            />

            <Box>
              <TextField
                label="Progression Order"
                type="number"
                fullWidth
                value={form.progression_order}
                onChange={(e) =>
                  setForm((f) => ({ ...f, progression_order: e.target.value }))
                }
                placeholder="1, 2, 3..."
                disabled={saving}
                inputProps={{ min: 0, max: 999 }}
              />
              <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-start', mt: 1 }}>
                <InfoIcon
                  sx={{
                    fontSize: 16,
                    color: 'info.main',
                    mt: 0.25,
                    flexShrink: 0,
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  Position in the promotion chain. Form 1 = 1, Form 2 = 2, ...
                  Upper Sixth = 7. Leave blank if this class is not part of
                  automatic student promotion.
                </Typography>
              </Box>
            </Box>

            <Box>
              <TextField
                label="Stream (optional)"
                fullWidth
                value={form.stream}
                onChange={(e) =>
                  setForm((f) => ({ ...f, stream: e.target.value }))
                }
                placeholder="e.g., Commercial, Industrial, Science"
                disabled={saving}
              />
              <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-start', mt: 1 }}>
                <InfoIcon
                  sx={{
                    fontSize: 16,
                    color: 'info.main',
                    mt: 0.25,
                    flexShrink: 0,
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  Only fill this if your school has parallel classes at the same
                  grade level (for example, Form 3 Commercial / Industrial /
                  Grammar). Leave blank for regular classes.
                </Typography>
              </Box>
            </Box>
          </Stack>
        </DialogContent>

        <Divider />

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeForm} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <CircularProgress size={20} color="inherit" />
            ) : editingId ? (
              'Save Changes'
            ) : (
              'Create Class'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════════ DELETE CONFIRM DIALOG ═══════════ */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Class</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="body1">
            Are you sure you want to delete <strong>{deleteTarget?.class_name}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone. You cannot delete a class that still
            has students or teacher assignments.
          </Typography>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
            disabled={deleting}
          >
            {deleting ? <CircularProgress size={20} color="inherit" /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}