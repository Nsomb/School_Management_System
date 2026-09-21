// frontend/src/components/common/Header.tsx
import { AppBar, Toolbar, Box, Typography, Avatar, Button, IconButton } from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';
import type { User } from '../../types/userTypes';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  onToggleSidebar: () => void;
}

// Single shared color — matches the sidebar exactly
const HEADER_BG = '#1e40af';

const Header = ({ user, onLogout, onToggleSidebar }: HeaderProps) => {
  const { user: authUser, schoolProfile, role } = useAuth();

  const displayName = authUser?.full_name || authUser?.username || user?.userName || 'User';
  const displayRole = role || user?.userRole || '';

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const showMobileMenu = role !== 'teacher';

  return (
    <AppBar
      position="sticky"
      elevation={1}
      sx={{ bgcolor: HEADER_BG, zIndex: (theme) => theme.zIndex.drawer + 1 }}
    >
      <Toolbar sx={{ gap: 2 }}>
        {showMobileMenu && (
          <IconButton color="inherit" edge="start" onClick={onToggleSidebar} sx={{ display: { md: 'none' } }}>
            <MenuIcon />
          </IconButton>
        )}

        <Box sx={{ display: { xs: 'none', md: 'block' }, minWidth: 0 }}>
          {schoolProfile?.name && (
            <Typography variant="subtitle1" fontWeight={600} noWrap>
              {schoolProfile.name}
            </Typography>
          )}
          {schoolProfile?.motto && (
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', fontStyle: 'italic' }} noWrap>
              {schoolProfile.motto}
            </Typography>
          )}
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="body2" fontWeight={500}>{displayName}</Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', textTransform: 'capitalize' }}>
              {displayRole}
            </Typography>
          </Box>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', width: 36, height: 36, fontSize: 14 }}>
            {initials}
          </Avatar>
        </Box>

        <Button
          onClick={onLogout}
          variant="outlined"
          size="small"
          sx={{
            color: '#fff',
            borderColor: 'rgba(255,255,255,0.5)',
            textTransform: 'none',
            '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },
          }}
        >
          Sign Out
        </Button>
      </Toolbar>
    </AppBar>
  );
};

export default Header;