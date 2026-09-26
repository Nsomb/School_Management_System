// src/components/common/NetworkStatusBanner.tsx
import { Box, Typography, Slide } from '@mui/material';
import {
  WifiOff as OfflineIcon,
  Wifi as OnlineIcon,
} from '@mui/icons-material';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

const NetworkStatusBanner = () => {
  const { isOnline, wasOffline } = useNetworkStatus();

  // Visible when offline, OR briefly when returning online
  const showBanner = !isOnline || wasOffline;

  return (
    <Slide direction="down" in={showBanner} mountOnEnter unmountOnExit>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10000,
          bgcolor: isOnline ? '#10b981' : '#dc2626',
          color: '#fff',
          py: 1,
          px: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        {isOnline ? (
          <>
            <OnlineIcon fontSize="small" />
            <Typography variant="body2" fontWeight={600}>
              Back online — syncing your data…
            </Typography>
          </>
        ) : (
          <>
            <OfflineIcon fontSize="small" />
            <Typography variant="body2" fontWeight={600}>
              You're offline — check your internet connection
            </Typography>
          </>
        )}
      </Box>
    </Slide>
  );
};

export default NetworkStatusBanner;