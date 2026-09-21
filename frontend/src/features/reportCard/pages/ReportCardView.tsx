// components/ReportCardView.tsx
import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tab,
  Tabs,
  CircularProgress,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import { School, CalendarToday, PictureAsPdf } from '@mui/icons-material';
import StudentReportGenerator from '../Components/StudentReportGenerator';
import ClassReportGenerator from '../Components/ClassReportGenerator';
import { useReportCard } from '../hooks/useReportCard';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const ReportCardView: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const { classes, terms, isLoading } = useReportCard();

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>Loading report system...</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box textAlign="center" mb={5}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold" color="primary">
          Academic Report Generator
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Generate comprehensive academic reports for individual students or entire classes
        </Typography>
      </Box>

      {/* Tabs */}
      <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': { py: 2, fontWeight: 'bold' },
            '& .Mui-selected': { color: 'primary.main' },
          }}
          indicatorColor="primary"
          textColor="inherit"
        >
          <Tab icon={<School />} label="Student Report" />
          <Tab icon={<CalendarToday />} label="Class Reports" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          <TabPanel value={tabValue} index={0}>
            <StudentReportGenerator />
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <ClassReportGenerator />
          </TabPanel>
        </Box>
      </Paper>

      {/* Stats Footer */}
      <Grid container spacing={2} sx={{ mt: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card elevation={1}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h5" color="primary" fontWeight="bold">
                {classes.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Available Classes
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card elevation={1}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h5" color="success.main" fontWeight="bold">
                {terms.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Academic Terms
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card elevation={1}>
            <CardContent sx={{ textAlign: 'center' }}>
              <PictureAsPdf sx={{ fontSize: 32, color: 'error.main' }} />
              <Typography variant="caption" color="text.secondary" display="block">
                PDF / ZIP Export
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ReportCardView;