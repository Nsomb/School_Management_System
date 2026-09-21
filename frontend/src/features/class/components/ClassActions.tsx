import { 
  Box, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Button, 
  Divider, 
  Typography,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import DownloadIcon from '@mui/icons-material/Download';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import type { DownloadOptions, ViewType } from '../types/classTypes';
import { downloadClassResource } from '../api/classApi';
import type { SelectChangeEvent } from '@mui/material';
import { useState } from 'react';

interface ClassActionsProps {
  classNames: string[];
  selectedClass: string;
  activeView: ViewType;
  term: string;
  academicYear: string;
  onClassChange: (className: string) => void;
  onViewChange: (view: ViewType) => void;
  onTermChange: (term: string) => void;
  onYearChange: (year: string) => void;
}

export function ClassActions({ 
  classNames, 
  selectedClass, 
  activeView, 
  term,
  academicYear,
  onClassChange, 
  onViewChange,
  onTermChange,
  onYearChange
}: ClassActionsProps) {
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [evaluationType, setEvaluationType] = useState('EVA1');

  const handleDownload = (type: DownloadOptions['type']) => {
    if (type === 'marksheet') {
      setDownloadDialogOpen(true);
    } else if (type === 'statistics') {
      downloadClassResource({ 
        type: 'statistics',
        className: selectedClass,
        term,
        academicYear
      });
    } else {
      downloadClassResource({ 
        type,
        className: selectedClass
      });
    }
  };

  const handleMarksheetDownload = () => {
    downloadClassResource({ 
      type: 'marksheet',
      className: selectedClass,
      evaluationType,
      term,
      academicYear
    });
    setDownloadDialogOpen(false);
  };

  return (
    <Box>
      <Typography variant="h6" fontSize={isMobile ? '1.1rem' : '1.25rem'} gutterBottom>
        Class Management
      </Typography>
      
      <FormControl fullWidth margin="dense" size="small">
        <InputLabel id="class-select-label">Select Class</InputLabel>
        <Select
          labelId="class-select-label"
          value={selectedClass}
          label="Select Class"
          onChange={(e: SelectChangeEvent) => onClassChange(e.target.value as string)}
          disabled={classNames.length === 0}
        >
          {classNames.map((name) => (
            <MenuItem key={name} value={name}>
              {name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      
      <Divider sx={{ my: 1.5 }} />
      
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        View Mode
      </Typography>
      
      <ToggleButtonGroup
        orientation={isMobile ? 'horizontal' : 'vertical'}
        value={activeView}
        exclusive
        onChange={(_, value) => value && onViewChange(value)}
        fullWidth
        size="small"
        sx={{ mb: 1.5 }}
      >
        <ToggleButton value="statistics">
          <AssessmentIcon fontSize="small" sx={{ mr: { sm: 1 } }} />
          {!isMobile && 'Statistics'}
        </ToggleButton>
        <ToggleButton value="students">
          <PeopleIcon fontSize="small" sx={{ mr: { sm: 1 } }} />
          {!isMobile && 'Students'}
        </ToggleButton>
        <ToggleButton value="performance">
          <TrendingUpIcon fontSize="small" sx={{ mr: { sm: 1 } }} />
          {!isMobile && 'Performance'}
        </ToggleButton>
      </ToggleButtonGroup>
      
      {(activeView === 'statistics' || activeView === 'performance') && (
        <>
          <Divider sx={{ my: 1.5 }} />
          
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Filters
          </Typography>
          
          <Stack spacing={1}>
            <FormControl fullWidth size="small">
              <InputLabel>Term</InputLabel>
              <Select
                value={term}
                label="Term"
                onChange={(e: SelectChangeEvent) => onTermChange(e.target.value)}
              >
                <MenuItem value="Term 1">Term 1</MenuItem>
                <MenuItem value="Term 2">Term 2</MenuItem>
                <MenuItem value="Term 3">Term 3</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl fullWidth size="small">
              <InputLabel>Academic Year</InputLabel>
              <Select
                value={academicYear}
                label="Academic Year"
                onChange={(e: SelectChangeEvent) => onYearChange(e.target.value)}
              >
                <MenuItem value="2024/2025">2024/2025</MenuItem>
                <MenuItem value="2025/2026">2025/2026</MenuItem>
                <MenuItem value="2026/2027">2026/2027</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </>
      )}
      
      <Divider sx={{ my: 1.5 }} />
      
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Downloads
      </Typography>
      
      <Stack spacing={1}>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon fontSize="small" />}
          onClick={() => handleDownload('blank')}
          fullWidth
          disabled={!selectedClass}
          size="small"
        >
          Blank Sheet (CSV)
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<DownloadIcon fontSize="small" />}
          onClick={() => handleDownload('marksheet')}
          fullWidth
          disabled={!selectedClass}
          size="small"
        >
          Mark Sheet (PDF)
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<AssessmentIcon fontSize="small" />}
          onClick={() => handleDownload('statistics')}
          fullWidth
          disabled={!selectedClass}
          size="small"
        >
          Statistics (PDF)
        </Button>
      </Stack>

      <Dialog open={downloadDialogOpen} onClose={() => setDownloadDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Select Evaluation Type</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Evaluation Type"
            type="text"
            fullWidth
            variant="outlined"
            size="small"
            value={evaluationType}
            onChange={(e) => setEvaluationType(e.target.value)}
            helperText="e.g., EVA1, EVA2, Exam"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDownloadDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleMarksheetDownload} variant="contained">Download</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}