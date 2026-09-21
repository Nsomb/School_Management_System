// frontend/src/pages/LoginPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, TextField, Button,
  Tabs, Tab, InputAdornment, IconButton, Alert, Avatar,
  CircularProgress, Divider, Link, Stack, Chip,
} from '@mui/material';
import {
  Visibility, VisibilityOff,
  School as SchoolIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

interface SelectedSchool {
  id: number;
  name: string;
  name_french?: string | null;
  code: string;
  logo_url: string | null;
  primary_color: string | null;
  region?: string | null;
  division?: string | null;
}

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [school, setSchool] = useState<SelectedSchool | null>(null);
  const [roleTab, setRoleTab] = useState<'admin' | 'teacher'>('admin');
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('selectedSchool');
    if (!stored) {
      navigate('/select-school', { replace: true });
      return;
    }
    try {
      setSchool(JSON.parse(stored));
    } catch {
      navigate('/select-school', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login({ ...credentials, schoolId: school?.id ?? null }, roleTab);

      const actualRole = localStorage.getItem('role');
      switch (actualRole) {
        case 'bursar':
          navigate('/admin/fees');
          break;
        case 'teacher':
          navigate('/teacher');
          break;
        case 'admin':
        default:
          navigate('/admin');
          break;
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeSchool = () => {
    localStorage.removeItem('selectedSchool');
    navigate('/select-school');
  };

  if (!school) return null;

  // The school's own color — falls back to a neutral grey, NOT the platform brand
  const accent = school.primary_color || '#374151';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(160deg, ${accent}10 0%, #f8fafc 60%, #f8fafc 100%)`,
        p: 2,
      }}
    >
      <Card
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 440,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'grey.200',
          borderTop: `6px solid ${accent}`,
          overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(0,0,0,0.06)',
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          {/* ══════════════════════════════════════════════
              SCHOOL BRANDING HEADER
              ══════════════════════════════════════════════ */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            {school.logo_url ? (
              <Avatar
                src={school.logo_url}
                alt={school.name}
                sx={{
                  width: 88, height: 88, mx: 'auto', mb: 1.5,
                  bgcolor: '#fff',
                  border: `3px solid ${accent}20`,
                  boxShadow: `0 4px 16px ${accent}20`,
                }}
              />
            ) : (
              <Box
                sx={{
                  width: 88, height: 88, mx: 'auto', mb: 1.5,
                  borderRadius: '50%',
                  bgcolor: accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 4px 16px ${accent}40`,
                }}
              >
                {school.name ? (
                  <Typography sx={{ color: '#fff', fontSize: 36, fontWeight: 800 }}>
                    {school.name.charAt(0).toUpperCase()}
                  </Typography>
                ) : (
                  <SchoolIcon sx={{ fontSize: 44, color: '#fff' }} />
                )}
              </Box>
            )}

            <Typography
              variant="h5"
              fontWeight={800}
              sx={{ color: '#0f172a', letterSpacing: -0.3, mb: 0.5 }}
            >
              {school.name}
            </Typography>

            {school.name_french && (
              <Typography
                variant="body2"
                sx={{ color: 'text.secondary', fontStyle: 'italic', mb: 1 }}
              >
                {school.name_french}
              </Typography>
            )}

            <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 1 }}>
              <Chip
                label={school.code}
                size="small"
                sx={{
                  bgcolor: `${accent}15`,
                  color: accent,
                  fontWeight: 600,
                  fontSize: 11,
                }}
              />
              {school.region && (
                <Chip
                  label={school.region}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: 11 }}
                />
              )}
            </Stack>

            <Typography
              variant="caption"
              sx={{ display: 'block', mt: 2, color: 'text.secondary', letterSpacing: 0.5 }}
            >
              Sign in to your account
            </Typography>
          </Box>

          {/* ══════════════════════════════════════════════
              ROLE TABS
              ══════════════════════════════════════════════ */}
          <Tabs
            value={roleTab}
            onChange={(_, v) => setRoleTab(v)}
            variant="fullWidth"
            sx={{
              mb: 3,
              minHeight: 40,
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: 13, minHeight: 40 },
              '& .MuiTabs-indicator': { backgroundColor: accent },
              '& .Mui-selected': { color: `${accent} !important` },
            }}
          >
            <Tab label="Admin / Bursar" value="admin" />
            <Tab label="Teacher" value="teacher" />
          </Tabs>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {/* ══════════════════════════════════════════════
              LOGIN FORM
              ══════════════════════════════════════════════ */}
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Username"
              value={credentials.username}
              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
              required
              disabled={loading}
              size="medium"
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              required
              disabled={loading}
              size="medium"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 3 }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                bgcolor: accent,
                '&:hover': { bgcolor: accent, filter: 'brightness(0.9)' },
                py: 1.3,
                fontWeight: 700,
                textTransform: 'none',
                fontSize: 15,
                letterSpacing: 0.3,
              }}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Sign In'}
            </Button>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* ══════════════════════════════════════════════
              FOOTER LINKS — school-scoped only
              ══════════════════════════════════════════════ */}
          <Stack spacing={1.5} alignItems="center">
            <Link
              component={RouterLink}
              to="/verify-receipt"
              variant="body2"
              underline="hover"
              sx={{ color: 'text.secondary' }}
            >
              Verify a receipt
            </Link>
            <Link
              component="button"
              type="button"
              onClick={handleChangeSchool}
              variant="body2"
              underline="hover"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                color: 'text.secondary',
                '&:hover': { color: accent },
              }}
            >
              <ArrowBackIcon sx={{ fontSize: 14 }} />
              Choose a different school
            </Link>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginPage;