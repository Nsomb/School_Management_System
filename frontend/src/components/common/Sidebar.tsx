// frontend/src/components/common/Sidebar.tsx
import { NavLink, useLocation } from 'react-router-dom';
import {
  Box, List, ListItemButton, ListItemIcon, ListItemText,
  Typography, Avatar, IconButton,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, ListTree,
  CalendarCheck, ClipboardList, MessageSquare, ClipboardCheck,
  Receipt, FileText, BarChart3, ScrollText, Percent, History, CreditCard,
  Settings,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  onClose?: () => void;
}

const SIDEBAR_BG = '#1e40af';

const BURSAR_ITEMS = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/admin/fees' },
  { name: 'Structures', icon: FileText, path: '/admin/fees/structures' },
  { name: 'Payments', icon: Receipt, path: '/admin/fees/payments' },
  { name: 'Student Payments', icon: CreditCard, path: '/admin/fees/student-payments' },
  { name: 'Reports', icon: BarChart3, path: '/admin/fees/reports' },
  { name: 'Advanced Reports', icon: ScrollText, path: '/admin/fees/advanced-reports' },
  { name: 'Discounts', icon: Percent, path: '/admin/fees/discounts' },
  { name: 'Audit Logs', icon: History, path: '/admin/fees/audit-logs' },
  { name: 'Student Statement', icon: FileText, path: '/admin/fees/student-statement' },
];

// ─── ADMIN — new order: Dashboard → Academics → Classes → Subjects →
//     Teachers → Students → Attendance → Report Card → Questions → SMS
const ADMIN_ITEMS = [
  { name: 'Dashboard',      icon: LayoutDashboard, path: '/admin' },
  { name: 'Academic Setup', icon: Settings,        path: '/admin/academic-setup' },
  { name: 'Classes',        icon: ListTree,        path: '/admin/classes' },
  { name: 'Subjects',       icon: BookOpen,        path: '/admin/subjects' },
  { name: 'Teachers',       icon: Users,           path: '/admin/teachers' },
  { name: 'Students',       icon: GraduationCap,   path: '/admin/students' },
  { name: 'Attendance',     icon: CalendarCheck,   path: '/admin/attendance' },
  { name: 'Report Card',    icon: ClipboardList,   path: '/admin/report-card' },
  { name: 'Questions',      icon: ClipboardCheck,  path: '/admin/questions' },
  { name: 'SMS',            icon: MessageSquare,   path: '/admin/sms' },
];

const TEACHER_ITEMS = [
  { name: 'Dashboard',  icon: LayoutDashboard, path: '/teacher' },
  { name: 'Marks',      icon: ClipboardList,   path: '/teacher/marks' },
  { name: 'Attendance', icon: CalendarCheck,   path: '/teacher/attendance' },
  { name: 'Questions',  icon: ClipboardCheck,  path: '/teacher/questions' },
  { name: 'Statistics', icon: BarChart3,       path: '/teacher/statistics' },
];

const Sidebar = ({ onClose }: SidebarProps) => {
  const { role, schoolProfile } = useAuth();
  const location = useLocation();

  const getItems = () => {
    switch (role) {
      case 'bursar': return BURSAR_ITEMS;
      case 'teacher': return TEACHER_ITEMS;
      case 'super_admin': return ADMIN_ITEMS;
      default: return ADMIN_ITEMS;
    }
  };

  const items = getItems();
  const sidebarTitle = role === 'super_admin' ? 'Platform Admin' : schoolProfile?.name || '';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: 256, bgcolor: SIDEBAR_BG, color: '#fff' }}>
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 64, px: 2.5, borderBottom: '1px solid rgba(255,255,255,0.15)', flexShrink: 0,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          {schoolProfile?.logo_url ? (
            <Avatar
              src={schoolProfile.logo_url}
              alt=""
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              sx={{ width: 32, height: 32, bgcolor: '#fff', p: 0.25 }}
            >
              {schoolProfile?.name?.charAt(0).toUpperCase() || 'S'}
            </Avatar>
          ) : role === 'super_admin' ? (
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(255,255,255,0.2)', fontSize: 13, fontWeight: 700 }}>PA</Avatar>
          ) : schoolProfile?.name ? (
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
              {schoolProfile.name.charAt(0).toUpperCase()}
            </Avatar>
          ) : null}
          {sidebarTitle && (
            <Typography variant="subtitle2" fontWeight={700} noWrap title={sidebarTitle} sx={{ color: '#fff' }}>
              {sidebarTitle}
            </Typography>
          )}
        </Box>
        {onClose && (
          <IconButton onClick={onClose} size="small" sx={{ color: '#fff', display: { md: 'none' } }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', py: 1.5, px: 1 }}>
        <List disablePadding>
          {items.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/admin' && item.path !== '/teacher' && location.pathname.startsWith(item.path));

            return (
              <ListItemButton
                key={item.name}
                component={NavLink}
                to={item.path}
                onClick={onClose}
                sx={{
                  borderRadius: 1.5, mb: 0.5,
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.85)',
                  bgcolor: isActive ? 'rgba(255,255,255,0.18)' : 'transparent',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                  '&.active': { bgcolor: 'rgba(255,255,255,0.18)' },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                  <Icon size={20} />
                </ListItemIcon>
                <ListItemText
                  primary={item.name}
                  primaryTypographyProps={{ fontSize: 14, fontWeight: 500, noWrap: true }}
                />
              </ListItemButton>
            );
          })}
        </List>
      </Box>
    </Box>
  );
};

export default Sidebar;