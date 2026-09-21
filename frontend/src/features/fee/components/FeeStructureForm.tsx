import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, FormControl, InputLabel, Select, MenuItem,
  Alert, CircularProgress, Box, IconButton, Typography, Grid,
  Checkbox, ListItemText, OutlinedInput, Chip,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { useFeeApi } from '../hooks/useFeeApi';
import type { FeeStructure, FeeComponent } from '../types/feeTypes';

interface FormComponent {
  name: string;
  amount: string;
}

interface FeeStructureFormProps {
  initialData?: FeeStructure;
  onSuccess: () => void;
  onCancel: () => void;
}

const FeeStructureForm: React.FC<FeeStructureFormProps> = ({ initialData, onSuccess, onCancel }) => {
  const {
    createFeeStructure,
    updateFeeStructure,
    getAllClasses,
    getAllAcademicYears,
    getCurrentAcademicYear,
    loading,
  } = useFeeApi();

  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    class_ids: number[];
    academic_year: string;
    description: string;
    due_date: string;
    components: FormComponent[];
  }>(() => ({
    class_ids: (initialData as any)?.classes?.map((c: any) => c.id) ?? [],
    academic_year: initialData?.academic_year || '',
    description: initialData?.description || '',
    due_date: initialData?.due_date || '',
    components:
      initialData?.components?.map((c) => ({ name: c.name, amount: String(c.amount) })) ||
      [{ name: '', amount: '' }],
  }));

  const isEditing = !!initialData?.id;

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const results = await Promise.allSettled([
          getAllClasses(),
          getAllAcademicYears(),
          getCurrentAcademicYear(),
        ]);

        let safeClasses: { id: number; name: string }[] = [];
        if (results[0].status === 'fulfilled') {
          safeClasses = Array.isArray(results[0].value) ? results[0].value : [];
        } else {
          console.warn('⚠️ getAllClasses failed:', results[0].reason);
        }
        setClasses(safeClasses.map((c) => ({ id: c.id, name: c.name })));

        let safeYears: string[] = [];
        if (results[1].status === 'fulfilled') {
          safeYears = Array.isArray(results[1].value) ? results[1].value : [];
        } else {
          console.warn('⚠️ getAllAcademicYears failed:', results[1].reason);
        }
        setAcademicYears(safeYears);

        let currentYear = '';
        if (results[2].status === 'fulfilled') {
          currentYear = results[2].value || '';
        } else {
          console.warn('⚠️ getCurrentAcademicYear failed:', results[2].reason);
        }

        if (!isEditing) {
          const defaultYear = currentYear || safeYears[0] || '';
          setFormData((prev) => ({ ...prev, academic_year: defaultYear }));
        }

        if (safeClasses.length === 0 && safeYears.length === 0) {
          setError('Failed to load classes or academic years.');
        }
      } catch (err) {
        console.error('Unexpected error loading options:', err);
        setError('Failed to load classes or academic years.');
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (initialData) {
      setFormData({
        class_ids: (initialData as any)?.classes?.map((c: any) => c.id) ?? [],
        academic_year: initialData.academic_year || '',
        description: initialData.description || '',
        due_date: initialData.due_date || '',
        components:
          initialData.components?.map((c) => ({ name: c.name, amount: String(c.amount) })) ||
          [{ name: '', amount: '' }],
      });
    }
  }, [initialData]);

  const handleChange = (field: keyof typeof formData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleComponentChange = (index: number, field: keyof FormComponent, value: string) => {
    const updated = [...formData.components];
    updated[index] = { ...updated[index], [field]: value };
    setFormData((prev) => ({ ...prev, components: updated }));
  };

  const addComponent = () =>
    setFormData((prev) => ({ ...prev, components: [...prev.components, { name: '', amount: '' }] }));

  const removeComponent = (index: number) => {
    if (formData.components.length <= 1) {
      setError('At least one component is required.');
      return;
    }
    setFormData((prev) => ({ ...prev, components: prev.components.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async () => {
    if (!formData.class_ids || formData.class_ids.length === 0) {
      setError('Select at least one class.');
      return;
    }
    if (!formData.academic_year) {
      setError('Academic Year is required.');
      return;
    }
    const invalidComp = formData.components.some((c) => !c.name || !c.amount || parseFloat(c.amount) <= 0);
    if (invalidComp) {
      setError('Each component must have a name and a positive amount.');
      return;
    }
    setError(null);

    const class_names = formData.class_ids
      .map((id) => classes.find((c) => c.id === id)?.name)
      .filter(Boolean) as string[];

    try {
      const payload = {
        class_names,
        academic_year: formData.academic_year,
        term: 'Annual',
        description: formData.description || undefined,
        due_date: formData.due_date || undefined,
        components: formData.components.map((c): FeeComponent => ({
          name: c.name,
          amount: parseFloat(c.amount),
        })),
      };

      if (isEditing && initialData) {
        await updateFeeStructure(initialData.id, payload as any);
      } else {
        await createFeeStructure(payload as any);
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed.');
    }
  };

  if (loadingOptions) {
    return (
      <Dialog open onClose={onCancel} maxWidth="md" fullWidth>
        <DialogContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onClose={onCancel} maxWidth="md" fullWidth>
      <DialogTitle>{isEditing ? 'Edit Fee Structure' : 'Create Fee Structure'}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Classes *</InputLabel>
              <Select
                multiple
                value={formData.class_ids}
                onChange={(e) => handleChange('class_ids', e.target.value)}
                input={<OutlinedInput label="Classes *" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as number[]).map((id) => (
                      <Chip key={id} size="small" label={classes.find((c) => c.id === id)?.name || id} />
                    ))}
                  </Box>
                )}
              >
                {classes.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    <Checkbox checked={formData.class_ids.includes(c.id)} />
                    <ListItemText primary={c.name} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Academic Year *</InputLabel>
              <Select
                value={formData.academic_year}
                label="Academic Year *"
                onChange={(e) => handleChange('academic_year', e.target.value)}
              >
                {academicYears.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Due Date (optional)"
              type="date"
              fullWidth
              value={formData.due_date}
              onChange={(e) => handleChange('due_date', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Description (optional)"
              fullWidth
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
            />
          </Grid>
        </Grid>

        <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 500 }}>
          Fee Components
        </Typography>
        {formData.components.map((comp, index) => (
          <Box key={index} display="flex" alignItems="center" gap={2} sx={{ mb: 1 }}>
            <TextField label="Component Name" value={comp.name}
              onChange={(e) => handleComponentChange(index, 'name', e.target.value)} sx={{ flex: 1 }} />
            <TextField label="Amount (FCFA)" type="number" value={comp.amount}
              onChange={(e) => handleComponentChange(index, 'amount', e.target.value)} sx={{ flex: 1 }} />
            <IconButton onClick={() => removeComponent(index)} color="error"><Delete /></IconButton>
          </Box>
        ))}
        <Button startIcon={<Add />} onClick={addComponent} variant="outlined" size="small" sx={{ mt: 1 }}>
          Add Component
        </Button>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? <CircularProgress size={24} /> : isEditing ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FeeStructureForm;