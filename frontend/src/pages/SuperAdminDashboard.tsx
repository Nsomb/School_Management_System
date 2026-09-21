// frontend/src/pages/SuperAdminDashboard.tsx
import { useEffect, useState, useRef } from 'react';
import {
  Box, Container, Typography, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Grid, IconButton,
  Select, MenuItem, FormControl, InputLabel, Chip, Alert,
  Tooltip, CircularProgress, Avatar, Card, CardContent, Stack,
  Divider, IconButton as MUIIconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  ManageAccounts as ManageIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  CloudUpload as UploadIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import apiClient from '../api/AuthService';

// ─── Types ────────────────────────────────────────────────────
interface School {
  id: number;
  name: string;
  name_french?: string | null;
  code: string;
  motto?: string | null;
  motto_french?: string | null;
  ministry?: string | null;
  ministry_french?: string | null;
  region: string | null;
  region_french?: string | null;
  division: string | null;
  division_french?: string | null;
  logo_url: string | null;
  primary_color: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  is_active: boolean;
  created_at: string;
}

interface Admin {
  id: number;
  username: string;
  full_name: string | null;
  phone_number: string | null;
  role: 'admin' | 'bursar';
  created_at: string;
}

const emptySchoolForm = {
  name: '', name_french: '', code: '', motto: '', motto_french: '',
  ministry: '', ministry_french: '', region: '', region_french: '',
  division: '', division_french: '', logo_url: '', primary_color: '#1976d2',
  phone: '', email: '', address: '',
};

const emptyAdminForm = {
  username: '', password: '', full_name: '', phone_number: '',
  role: 'admin' as 'admin' | 'bursar',
};

const API_BASE_URL = 'http://localhost:5000';

export default function SuperAdminDashboard() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);

  // School modal (create or edit)
  const [schoolModalOpen, setSchoolModalOpen] = useState(false);
  const [schoolForm, setSchoolForm] = useState({ ...emptySchoolForm });
  const [editingSchoolId, setEditingSchoolId] = useState<number | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Admins modal
  const [adminsModalOpen, setAdminsModalOpen] = useState(false);
  const [activeSchool, setActiveSchool] = useState<School | null>(null);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);

  const [adminFormOpen, setAdminFormOpen] = useState(false);
  const [adminForm, setAdminForm] = useState({ ...emptyAdminForm });
  const [editingAdminId, setEditingAdminId] = useState<number | null>(null);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [error, setError] = useState('');

  // ─── Load Schools ───────────────────────────────────────────
  const fetchSchools = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/schools/admin/all');
      setSchools(res.data);
    } catch {
      setError('Failed to load schools.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSchools(); }, []);

  // ─── Open modal for CREATE ──────────────────────────────────
  const openCreateSchoolModal = () => {
    setEditingSchoolId(null);
    setSchoolForm({ ...emptySchoolForm });
    setError('');
    setSchoolModalOpen(true);
  };

  // ─── Open modal for EDIT ────────────────────────────────────
  const openEditSchoolModal = (s: School) => {
    setEditingSchoolId(s.id);
    setSchoolForm({
      name: s.name || '',
      name_french: s.name_french || '',
      code: s.code || '',
      motto: s.motto || '',
      motto_french: s.motto_french || '',
      ministry: s.ministry || '',
      ministry_french: s.ministry_french || '',
      region: s.region || '',
      region_french: s.region_french || '',
      division: s.division || '',
      division_french: s.division_french || '',
      logo_url: s.logo_url || '',
      primary_color: s.primary_color || '#1976d2',
      phone: s.phone || '',
      email: s.email || '',
      address: s.address || '',
    });
    setError('');
    setSchoolModalOpen(true);
  };

  // ─── Logo Upload ────────────────────────────────────────────
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      setSchoolForm((prev) => ({ ...prev, logo_url: reader.result as string }));
    };
    reader.readAsDataURL(file);

    // Upload to server
    try {
      setUploadingLogo(true);
      const formData = new FormData();
      formData.append('logo', file);

      const res = await apiClient.post(
        '/api/schools/admin/upload-logo',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      // Replace the base64 preview with the actual server URL
      setSchoolForm((prev) => ({ ...prev, logo_url: res.data.logo_url }));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload logo.');
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const clearLogo = () => setSchoolForm((prev) => ({ ...prev, logo_url: '' }));

  // ─── Save School (create or update) ─────────────────────────
  const handleSaveSchool = async () => {
    setError('');
    if (!schoolForm.name || !schoolForm.code) {
      setError('Name and Code are required.');
      return;
    }

    try {
      if (editingSchoolId) {
        await apiClient.put(`/api/schools/admin/${editingSchoolId}`, schoolForm);
        setFeedback({ type: 'success', msg: 'School updated.' });
      } else {
        await apiClient.post('/api/schools/admin/create', schoolForm);
        setFeedback({ type: 'success', msg: 'School created.' });
      }
      setSchoolModalOpen(false);
      setSchoolForm({ ...emptySchoolForm });
      setEditingSchoolId(null);
      fetchSchools();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save school.');
    }
  };

  // ─── Manage Admins ──────────────────────────────────────────
  const openAdminsModal = async (school: School) => {
    setActiveSchool(school);
    setAdminsModalOpen(true);
    setAdminFormOpen(false);
    setError('');
    await loadAdmins(school.id);
  };

  const loadAdmins = async (schoolId: number) => {
    try {
      setAdminsLoading(true);
      const res = await apiClient.get(`/api/super-admin/schools/${schoolId}/admins`);
      setAdmins(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load admins.');
    } finally {
      setAdminsLoading(false);
    }
  };

  const closeAdminsModal = () => {
    setAdminsModalOpen(false);
    setActiveSchool(null);
    setAdmins([]);
    setAdminFormOpen(false);
    setAdminForm({ ...emptyAdminForm });
    setEditingAdminId(null);
    setError('');
  };

  const handleSaveAdmin = async () => {
    setError('');
    if (!activeSchool) return;
    if (!adminForm.username || (!editingAdminId && !adminForm.password)) {
      setError('Username and password are required.');
      return;
    }

    try {
      if (editingAdminId) {
        const payload: any = {
          full_name: adminForm.full_name,
          phone_number: adminForm.phone_number,
          role: adminForm.role,
        };
        if (adminForm.password) payload.password = adminForm.password;
        await apiClient.put(`/api/super-admin/admins/${editingAdminId}`, payload);
        setFeedback({ type: 'success', msg: 'Admin updated.' });
      } else {
        await apiClient.post(`/api/super-admin/schools/${activeSchool.id}/admins`, adminForm);
        setFeedback({ type: 'success', msg: 'Admin created.' });
      }
      setAdminFormOpen(false);
      setAdminForm({ ...emptyAdminForm });
      setEditingAdminId(null);
      await loadAdmins(activeSchool.id);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save admin.');
    }
  };

  const handleEditAdmin = (admin: Admin) => {
    setEditingAdminId(admin.id);
    setAdminForm({
      username: admin.username,
      password: '',
      full_name: admin.full_name || '',
      phone_number: admin.phone_number || '',
      role: admin.role,
    });
    setAdminFormOpen(true);
  };

  const handleDeleteAdmin = async (admin: Admin) => {
    if (!window.confirm(`Delete admin "${admin.username}"? This cannot be undone.`)) return;
    try {
      await apiClient.delete(`/api/super-admin/admins/${admin.id}`);
      setFeedback({ type: 'success', msg: 'Admin deleted.' });
      if (activeSchool) await loadAdmins(activeSchool.id);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete admin.');
    }
  };

  // ─── Shared field renderer ──────────────────────────────────
  const schoolField = (key: keyof typeof schoolForm, label: string, type = 'text') => (
    <TextField
      fullWidth size="small" type={type} label={label}
      value={(schoolForm as any)[key]}
      onChange={(e) => setSchoolForm({ ...schoolForm, [key]: e.target.value })}
    />
  );

  const adminField = (key: keyof typeof adminForm, label: string) => (
    <TextField
      fullWidth size="small" label={label}
      value={(adminForm as any)[key]}
      onChange={(e) => setAdminForm({ ...adminForm, [key]: e.target.value })}
    />
  );

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 1.5, sm: 2 } }}>
      {/* ─── Header ─────────────────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight="bold">
            Platform Super Admin
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage schools and their admin accounts
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreateSchoolModal}
          sx={{ alignSelf: { xs: 'stretch', sm: 'auto' } }}
        >
          Add New School
        </Button>
      </Box>

      {/* Feedback alerts */}
      {feedback && (
        <Alert severity={feedback.type} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>
          {feedback.msg}
        </Alert>
      )}
      {error && !schoolModalOpen && !adminsModalOpen && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* ─── Schools — Cards Grid (mobile-responsive) ─────────── */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : schools.length === 0 ? (
        <Card
          elevation={0}
          sx={{
            py: 6, textAlign: 'center',
            border: '1px dashed', borderColor: 'grey.300', borderRadius: 3,
          }}
        >
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No schools yet.
          </Typography>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={openCreateSchoolModal}>
            Create your first school
          </Button>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {schools.map((s) => (
            <Grid item xs={12} sm={6} lg={4} key={s.id}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'grey.200',
                  transition: 'box-shadow 0.2s',
                  '&:hover': { boxShadow: '0 6px 20px rgba(0,0,0,0.06)' },
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  {/* Top row: Avatar + Name + Status */}
                  <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mb: 2 }}>
                    <Avatar
                      src={s.logo_url || undefined}
                      sx={{
                        width: 52, height: 52,
                        bgcolor: s.primary_color || 'primary.main',
                        fontSize: 20, fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {s.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" fontWeight={700} noWrap>
                        {s.name}
                      </Typography>
                      {s.name_french && (
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', fontStyle: 'italic' }}>
                          {s.name_french}
                        </Typography>
                      )}
                      <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                        <Chip label={s.code} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
                        <Chip
                          label={s.is_active ? 'Active' : 'Inactive'}
                          size="small"
                          color={s.is_active ? 'success' : 'default'}
                          sx={{ fontSize: 10, height: 20 }}
                        />
                      </Stack>
                    </Box>
                  </Stack>

                  <Divider sx={{ mb: 2 }} />

                  {/* Detail rows */}
                  <Stack spacing={0.75} sx={{ mb: 2 }}>
                    <Stack direction="row" spacing={1}>
                      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 60 }}>Region:</Typography>
                      <Typography variant="caption">{s.region || '—'}</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1}>
                      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 60 }}>Division:</Typography>
                      <Typography variant="caption">{s.division || '—'}</Typography>
                    </Stack>
                  </Stack>

                  {/* Actions */}
                  <Stack direction="row" spacing={1}>
                    <Button
                      fullWidth
                      size="small"
                      variant="outlined"
                      startIcon={<EditIcon />}
                      onClick={() => openEditSchoolModal(s)}
                    >
                      Edit
                    </Button>
                    <Button
                      fullWidth
                      size="small"
                      variant="contained"
                      startIcon={<ManageIcon />}
                      onClick={() => openAdminsModal(s)}
                    >
                      Admins
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* ═══════════════════════════════════════════════════════
          SCHOOL MODAL (Create / Edit)
          ═══════════════════════════════════════════════════════ */}
      <Dialog
        open={schoolModalOpen}
        onClose={() => setSchoolModalOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={false}
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pr: 1 }}>
          {editingSchoolId ? 'Edit School' : 'Register New School'}
          <IconButton onClick={() => setSchoolModalOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ pt: 3 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {/* ─── Logo upload block ──────────────────────────── */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: 'center',
              gap: 2,
              p: 2,
              mb: 3,
              borderRadius: 2,
              bgcolor: 'grey.50',
              border: '1px solid',
              borderColor: 'grey.200',
            }}
          >
            <Avatar
              src={schoolForm.logo_url || undefined}
              sx={{
                width: 80, height: 80,
                bgcolor: schoolForm.primary_color || 'primary.main',
                fontSize: 30, fontWeight: 700,
              }}
            >
              {!schoolForm.logo_url && (schoolForm.name.charAt(0).toUpperCase() || '?')}
            </Avatar>

            <Box sx={{ textAlign: { xs: 'center', sm: 'left' }, flex: 1 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                School Logo
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                PNG, JPG, SVG, or WEBP — max 2MB
              </Typography>

              <Stack direction="row" spacing={1} justifyContent={{ xs: 'center', sm: 'flex-start' }}>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleLogoFileChange}
                />
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={uploadingLogo ? <CircularProgress size={14} /> : <UploadIcon />}
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                >
                  {uploadingLogo ? 'Uploading…' : schoolForm.logo_url ? 'Replace Logo' : 'Upload Logo'}
                </Button>
                {schoolForm.logo_url && (
                  <Button
                    size="small"
                    variant="text"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={clearLogo}
                  >
                    Remove
                  </Button>
                )}
              </Stack>
            </Box>
          </Box>

          {/* ─── Fields grid ────────────────────────────────── */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>{schoolField('name', 'School Name (English) *')}</Grid>
            <Grid item xs={12} sm={6}>{schoolField('name_french', 'School Name (French)')}</Grid>
            <Grid item xs={12} sm={6}>{schoolField('code', 'School Code (e.g. UBCHS) *')}</Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  fullWidth size="small" label="Primary Color" type="color"
                  value={schoolForm.primary_color}
                  onChange={(e) => setSchoolForm({ ...schoolForm, primary_color: e.target.value })}
                />
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>{schoolField('region', 'Region (English)')}</Grid>
            <Grid item xs={12} sm={6}>{schoolField('region_french', 'Region (French)')}</Grid>
            <Grid item xs={12} sm={6}>{schoolField('division', 'Division (English)')}</Grid>
            <Grid item xs={12} sm={6}>{schoolField('division_french', 'Division (French)')}</Grid>
            <Grid item xs={12} sm={6}>{schoolField('motto', 'Motto (English)')}</Grid>
            <Grid item xs={12} sm={6}>{schoolField('motto_french', 'Motto (French)')}</Grid>
            <Grid item xs={12} sm={6}>{schoolField('phone', 'Phone')}</Grid>
            <Grid item xs={12} sm={6}>{schoolField('email', 'Email')}</Grid>
            <Grid item xs={12}>{schoolField('address', 'Address')}</Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSchoolModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveSchool}>
            {editingSchoolId ? 'Save Changes' : 'Create School'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════
          ADMINS MODAL
          ═══════════════════════════════════════════════════════ */}
      <Dialog
        open={adminsModalOpen}
        onClose={closeAdminsModal}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>Manage Admins</Typography>
            <Typography variant="body2" color="text.secondary">
              {activeSchool?.name} ({activeSchool?.code})
            </Typography>
          </Box>
          <IconButton onClick={closeAdminsModal} size="small"><CloseIcon /></IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

          {/* ─── Add Admin form toggle ─────────────────────── */}
          {!adminFormOpen ? (
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setEditingAdminId(null);
                  setAdminForm({ ...emptyAdminForm });
                  setAdminFormOpen(true);
                }}
              >
                Add Admin
              </Button>
            </Box>
          ) : (
            <Card variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5 }} fontWeight={600}>
                {editingAdminId ? 'Edit Admin' : 'New Admin'}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth size="small" label="Username *"
                    value={adminForm.username}
                    onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })}
                    disabled={!!editingAdminId}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth size="small"
                    label={editingAdminId ? 'New Password (leave blank to keep)' : 'Password *'}
                    type="password"
                    value={adminForm.password}
                    onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>{adminField('full_name', 'Full Name')}</Grid>
                <Grid item xs={12} sm={6}>{adminField('phone_number', 'Phone')}</Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Role</InputLabel>
                    <Select
                      label="Role"
                      value={adminForm.role}
                      onChange={(e) => setAdminForm({ ...adminForm, role: e.target.value as any })}
                    >
                      <MenuItem value="admin">Admin</MenuItem>
                      <MenuItem value="bursar">Bursar</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button size="small" onClick={() => { setAdminFormOpen(false); setEditingAdminId(null); }}>
                  Cancel
                </Button>
                <Button size="small" variant="contained" onClick={handleSaveAdmin}>
                  {editingAdminId ? 'Update' : 'Create'}
                </Button>
              </Box>
            </Card>
          )}

          {/* ─── Admins list ───────────────────────────────── */}
          {adminsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : admins.length === 0 ? (
            <Typography textAlign="center" color="text.secondary" sx={{ py: 4 }}>
              No admins yet. Click "Add Admin" to create the first one.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {admins.map((a) => (
                <Card
                  key={a.id}
                  variant="outlined"
                  sx={{ p: 1.5, borderRadius: 2, '&:hover': { bgcolor: 'grey.50' } }}
                >
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    justifyContent="space-between"
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography fontWeight={600}>{a.username}</Typography>
                        <Chip
                          label={a.role}
                          size="small"
                          color={a.role === 'admin' ? 'primary' : 'secondary'}
                          sx={{ fontSize: 10, height: 20 }}
                        />
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {a.full_name || 'No name'} · {a.phone_number || 'No phone'}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.5}>
                      <IconButton size="small" onClick={() => handleEditAdmin(a)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteAdmin(a)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Card>
              ))}
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeAdminsModal}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}