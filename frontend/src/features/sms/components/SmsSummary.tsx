// src/features/sms/components/SmsSummary.tsx
import React from 'react';
import {
  Typography,
  Divider,
  Grid,
  Paper,
  useTheme,
  Stack,
  Chip,
} from '@mui/material';

interface SmsSummaryProps {
  recipientType: string;
  studentCount: number;
  teacherCount: number;
  logId?: number;
  whatsappCount?: number;
  smsCount?: number;
  failedCount?: number;
}

export const SmsSummary: React.FC<SmsSummaryProps> = ({
  recipientType,
  studentCount,
  teacherCount,
  logId,
  whatsappCount = 0,
  smsCount = 0,
  failedCount = 0,
}) => {
  const theme = useTheme();

  const getRecipientSummary = () => {
    switch (recipientType) {
      case 'parents':
        return `${studentCount} parent(s)`;
      case 'teachers':
        return `${teacherCount} teacher(s)`;
      case 'both':
        return `${studentCount} parent(s) and ${teacherCount} teacher(s)`;
      default:
        return 'No recipients';
    }
  };

  return (
    <Paper elevation={2} sx={{ mt: 3, p: 2, backgroundColor: theme.palette.background.default }}>
      <Typography variant="h6" gutterBottom>
        Message Summary
      </Typography>
      <Divider sx={{ mb: 2 }} />

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle1">Recipients:</Typography>
          <Typography variant="body1">{getRecipientSummary()}</Typography>
        </Grid>

        {logId && (
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle1">Reference ID:</Typography>
            <Typography variant="body1">#{logId}</Typography>
          </Grid>
        )}

        <Grid item xs={12}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Delivery Channels
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {whatsappCount > 0 && (
              <Chip
                label={`💬 WhatsApp: ${whatsappCount}`}
                sx={{ bgcolor: '#dcfce7', color: '#166534', fontWeight: 500 }}
              />
            )}
            {smsCount > 0 && (
              <Chip
                label={`📱 SMS: ${smsCount}`}
                sx={{ bgcolor: '#dbeafe', color: '#1e40af', fontWeight: 500 }}
              />
            )}
            {failedCount > 0 && (
              <Chip
                label={`❌ Failed: ${failedCount}`}
                sx={{ bgcolor: '#fee2e2', color: '#991b1b', fontWeight: 500 }}
              />
            )}
            {whatsappCount === 0 && smsCount === 0 && failedCount === 0 && (
              <Typography variant="body2" color="text.secondary">
                No deliveries recorded.
              </Typography>
            )}
          </Stack>
        </Grid>
      </Grid>
    </Paper>
  );
};