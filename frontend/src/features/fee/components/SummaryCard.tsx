import type { ReactNode } from 'react';
import { Skeleton, Paper, Typography, Box } from '@mui/material';
import { formatCurrency } from '../utils/feeHelpers';

interface SummaryCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  color?: string;
  loading?: boolean;
  isCurrency?: boolean;
}

export const SummaryCard = ({
  title,
  value,
  icon,
  color = '#1976d2',
  loading = false,
  isCurrency = true,
}: SummaryCardProps) => {
  const displayValue = isCurrency ? formatCurrency(value) : value;

  return (
    <Paper
      elevation={1}
      sx={{
        p: 2,
        borderRadius: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderLeft: `4px solid ${color}`,
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography
          variant="subtitle2"
          color="textSecondary"
          sx={{ fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.7rem' }}
        >
          {title}
        </Typography>
        <Box sx={{ color, display: 'flex', alignItems: 'center' }}>{icon}</Box>
      </Box>
      {loading ? (
        <Skeleton variant="text" width="60%" height={30} sx={{ mt: 1 }} />
      ) : (
        <Typography variant="h6" sx={{ fontWeight: 600, mt: 1, fontSize: '1.1rem' }}>
          {displayValue}
        </Typography>
      )}
    </Paper>
  );
};