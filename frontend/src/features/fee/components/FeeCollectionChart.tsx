import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton, Box, Typography } from '@mui/material';

interface ChartData {
  month: string;
  amount: number;
}

interface FeeCollectionChartProps {
  data: ChartData[];
  loading: boolean;
}

export const FeeCollectionChart = ({ data, loading }: FeeCollectionChartProps) => {
  if (loading) {
    return <Skeleton variant="rectangular" height={300} />;
  }

  if (!data || data.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <Typography variant="body1" color="text.secondary">
          No collection data available.
        </Typography>
      </Box>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip formatter={(value: number) => `${value.toLocaleString()} FCFA`} />
        <Bar dataKey="amount" fill="#1976d2" />
      </BarChart>
    </ResponsiveContainer>
  );
};