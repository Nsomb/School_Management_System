// frontend/src/components/common/DashboardLayout.tsx
import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Box, Drawer, useMediaQuery, useTheme } from '@mui/material';
import type { User } from '../../types/userTypes';
import Header from './Header';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';

interface DashboardLayoutProps {
  user: User;
}

const DRAWER_WIDTH = 256;

const DashboardLayout = ({ user }: DashboardLayoutProps) => {
  const { logout, role } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const isTeacher = role === 'teacher';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleToggleSidebar = () => setMobileOpen((prev) => !prev);
  const handleCloseSidebar = () => setMobileOpen(false);

  // Hide the sidebar entirely for teachers (they use top nav only)
  const showSidebar = !isTeacher;

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: '#f5f5f5', overflow: 'hidden' }}>
      {/* ─── Desktop Sidebar (permanent) ─────────────────── */}
      {showSidebar && isDesktop && (
        <Box
          component="nav"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
          }}
        >
          <Sidebar />
        </Box>
      )}

      {/* ─── Mobile Sidebar (temporary drawer) ───────────── */}
      {showSidebar && !isDesktop && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleCloseSidebar}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              border: 0,
            },
          }}
        >
          <Sidebar onClose={handleCloseSidebar} />
        </Drawer>
      )}

      {/* ─── Main Content ────────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minWidth: 0,
          overflowY: 'auto',
        }}
      >
        <Header user={user} onLogout={handleLogout} onToggleSidebar={handleToggleSidebar} />
        <Box
          component="main"
          sx={{
            flex: 1,
            p: { xs: 2, md: 3 },
            width: '100%',
            minWidth: 0,
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardLayout;