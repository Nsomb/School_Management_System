// frontend/src/pages/SchoolSelectionPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Grid, Card, CardActionArea,
  CardContent, Avatar, Chip, CircularProgress, Alert,
  AppBar, Toolbar, Divider, Link, Stack,
} from '@mui/material';
import {
  School as SchoolIcon,
  AdminPanelSettings as AdminIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { BRANDING } from '../config/branding';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

interface School {
  id: number;
  name: string;
  name_french?: string | null;
  code: string;
  logo_url: string | null;
  primary_color: string | null;
  region?: string | null;
  division?: string | null;
}

export default function SchoolSelectionPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/schools/public`)
      .then((res) => setSchools(res.data))
      .catch(() => setError('Unable to connect to the platform. Please try again later.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (school: School) => {
    localStorage.setItem('selectedSchool', JSON.stringify(school));
    navigate('/login');
  };

  const { brandColor, brandAccent } = BRANDING;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(160deg, ${brandColor}15 0%, #f8fafc 45%, #f8fafc 100%)`,
      }}
    >
      {/* ═══════════════════════════════════════════════════════
          TOP NAVIGATION
          ═══════════════════════════════════════════════════════ */}
      <AppBar
        position="static"
        elevation={0}
        sx={{
          bgcolor: brandColor,
          backgroundImage: `linear-gradient(90deg, ${brandColor} 0%, ${brandAccent} 100%)`,
        }}
      >
        <Toolbar sx={{ py: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40, height: 40, borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(10px)',
              }}
            >
              <SchoolIcon sx={{ color: '#fff', fontSize: 24 }} />
            </Box>
            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.1 }}>
              {BRANDING.systemName}
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      {/* ═══════════════════════════════════════════════════════
          HERO — small welcome text
          ═══════════════════════════════════════════════════════ */}
      <Container maxWidth="lg" sx={{ pt: { xs: 4, md: 6 }, pb: 2 }}>
        <Box sx={{ textAlign: 'center', maxWidth: 720, mx: 'auto' }}>
          <Typography
            variant="body1"
            sx={{
              mb: 1,
              color: 'text.secondary',
              fontSize: { xs: '0.85rem', sm: '0.95rem' },
              fontWeight: 500,
              letterSpacing: 0.2,
            }}
          >
            Welcome to {BRANDING.systemNameLong}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem' } }}
          >
            {BRANDING.contactMessage} —{' '}
            <Link
              href={`mailto:${BRANDING.contactEmail}`}
              underline="hover"
              sx={{ color: brandColor, fontWeight: 600 }}
            >
              {BRANDING.contactEmail}
            </Link>
          </Typography>
        </Box>
      </Container>

      {/* ═══════════════════════════════════════════════════════
          SCHOOLS GRID
          ═══════════════════════════════════════════════════════ */}
      <Container maxWidth="lg" sx={{ flex: 1, py: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress sx={{ color: brandColor }} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ maxWidth: 560, mx: 'auto' }}>
            {error}
          </Alert>
        ) : schools.length === 0 ? (
          // ─── MINIMAL EMPTY STATE ──────────────────────────
          <Box
            sx={{
              maxWidth: 520,
              mx: 'auto',
              textAlign: 'center',
              py: { xs: 5, md: 8 },
              px: 3,
              bgcolor: '#fff',
              borderRadius: 3,
              border: '1px dashed',
              borderColor: 'grey.300',
              boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
            }}
          >
            <Box
              sx={{
                width: 80, height: 80, mx: 'auto', mb: 2.5,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${brandColor}20, ${brandAccent}20)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <SchoolIcon sx={{ fontSize: 44, color: brandColor }} />
            </Box>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              No schools on the platform yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              The platform is ready. Please check back once your institution
              has been registered.
            </Typography>
          </Box>
        ) : (
          // ─── SCHOOLS GRID ──────────────────────────────────
          <>
            <Typography
              variant="overline"
              sx={{
                display: 'block',
                textAlign: 'center',
                color: 'text.secondary',
                fontWeight: 600,
                letterSpacing: 1.5,
                mb: 3,
              }}
            >
              Available Institutions · {schools.length}
            </Typography>

            <Grid container spacing={3} justifyContent="center">
              {schools.map((school) => (
                <Grid item xs={12} sm={6} md={4} key={school.id}>
                  <Card
                    elevation={0}
                    sx={{
                      height: '100%',
                      borderRadius: 3,
                      border: '1px solid',
                      borderColor: 'grey.200',
                      borderTop: `5px solid ${brandColor}`,
                      transition: 'all 0.25s ease',
                      overflow: 'hidden',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: `0 12px 32px ${brandColor}30`,
                        borderColor: `${brandColor}60`,
                      },
                    }}
                  >
                    <CardActionArea
                      onClick={() => handleSelect(school)}
                      sx={{ height: '100%', p: 1 }}
                    >
                      <CardContent sx={{ textAlign: 'center', py: 4 }}>
                        <Avatar
                          src={school.logo_url || undefined}
                          sx={{
                            width: 84, height: 84, mx: 'auto', mb: 2,
                            bgcolor: brandColor,
                            fontSize: 34, fontWeight: 700,
                            border: `3px solid ${brandColor}30`,
                          }}
                        >
                          {!school.logo_url && school.name.charAt(0).toUpperCase()}
                        </Avatar>

                        <Typography
                          variant="h6"
                          fontWeight={700}
                          sx={{ mb: 0.5, color: '#0f172a' }}
                        >
                          {school.name}
                        </Typography>

                        {school.name_french && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ fontStyle: 'italic', mb: 1.5 }}
                          >
                            {school.name_french}
                          </Typography>
                        )}

                        <Stack
                          direction="row"
                          spacing={1}
                          justifyContent="center"
                          sx={{ mt: 2, mb: 1 }}
                        >
                          <Chip
                            label={school.code}
                            size="small"
                            sx={{
                              bgcolor: `${brandColor}15`,
                              color: brandColor,
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

                        <Box
                          sx={{
                            mt: 2,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.5,
                            color: brandColor,
                            fontWeight: 600,
                            fontSize: 13,
                          }}
                        >
                          Enter portal
                          <ArrowForwardIcon sx={{ fontSize: 16 }} />
                        </Box>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </>
        )}
      </Container>

      {/* ═══════════════════════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════════════════════ */}
      <Box
        component="footer"
        sx={{
          mt: 'auto',
          py: 2.5,
          bgcolor: '#fff',
          borderTop: '1px solid',
          borderColor: 'grey.200',
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              © {BRANDING.copyrightYear} {BRANDING.systemNameLong}
            </Typography>

            <Divider
              orientation="vertical"
              flexItem
              sx={{ display: { xs: 'none', sm: 'block' } }}
            />

            <Link
              component="button"
              onClick={() => navigate('/super-admin-login')}
              underline="hover"
              sx={{
                fontSize: 12,
                color: 'text.secondary',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                '&:hover': { color: brandColor },
              }}
            >
              <AdminIcon sx={{ fontSize: 14 }} />
              Administrator
            </Link>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}