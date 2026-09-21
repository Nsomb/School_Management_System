// src/features/subjects/components/SubjectForm.tsx
import { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Button, TextField, Select, MenuItem, FormControl, InputLabel, Grid,
  FormHelperText, CircularProgress, Box, Typography, useMediaQuery,
  Checkbox, ListItemText, OutlinedInput, Divider, Alert, Dialog,
  DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import type { Theme } from '@mui/material/styles';
import type { SelectChangeEvent } from '@mui/material/Select';
import type {
  SubjectFormProps, SubjectFormData, SubjectCreateData, Specialty, Faculty,
} from '../types/subjectTypes';
import { classService } from '../api/ClassServices';
import {
  createFaculty, fetchFaculties, createSpecialty, fetchSpecialtiesByFaculties,
} from '../../academic/services/academicService';

const MenuProps = {
  PaperProps: { sx: { maxHeight: 'min(320px, 60vh)', width: 320 } },
  autoFocus: false,
  variant: 'menu' as const,
};

const NEW_OPTION = '__new__';
const ALL_OPTION = '__all__';

export const SubjectForm = ({
  faculties: initialFaculties = [],
  onSubmit,
  onCancel,
  initialData,
  isEditing = false,
}: SubjectFormProps) => {
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));

  const initialFacultyIds = (() => {
    if (initialData?.faculty_ids?.length) return initialData.faculty_ids.map(String);
    if (initialData?.faculty_id) return [String(initialData.faculty_id)];
    return [];
  })();

  const initialSpecialtyIds = (() => {
    if (initialData?.specialty_ids?.length) return initialData.specialty_ids.map(String);
    if (initialData?.specialty_id) return [String(initialData.specialty_id)];
    return [];
  })();

  const defaultValues: SubjectFormData = {
    name: initialData?.name || '',
    coefficient: initialData?.coefficient || 1,
    faculty_ids: initialFacultyIds,
    specialty_ids: initialSpecialtyIds,
    classes: [],
  };

  const {
    register, handleSubmit, watch, reset, setValue, control,
    formState: { errors },
  } = useForm<SubjectFormData>({ defaultValues });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [faculties, setFaculties] = useState<Faculty[]>(initialFaculties);
  const [classOptions, setClassOptions] = useState<{ id: string; name: string }[]>([]);
  const [classLoading, setClassLoading] = useState(false);
  const [classError, setClassError] = useState<string | null>(null);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [specialtyLoading, setSpecialtyLoading] = useState(false);
  const [newFacultyOpen, setNewFacultyOpen] = useState(false);
  const [newFacultyName, setNewFacultyName] = useState('');
  const [newFacultySaving, setNewFacultySaving] = useState(false);
  const [newSpecialtyOpen, setNewSpecialtyOpen] = useState(false);
  const [newSpecialtyName, setNewSpecialtyName] = useState('');
  const [newSpecialtySaving, setNewSpecialtySaving] = useState(false);

  const selectedFacultyIds = watch('faculty_ids') || [];
  const selectedSpecialtyIds = watch('specialty_ids') || [];
  const selectedClasses = watch('classes') || [];

  useEffect(() => { setFaculties(initialFaculties); }, [initialFaculties]);

  const loadClasses = useCallback(async () => {
    try {
      setClassLoading(true);
      setClassError(null);
      const classes = await classService.getAllClasses();
      // Defensive: drop any row missing a usable id (a stray undefined id
      // would make every MenuItem share the same value, which looks
      // exactly like "clicking does nothing").
      const safeClasses = (classes || [])
        .filter((c: any) => c && c.id !== undefined && c.id !== null)
        .map((c: any) => ({ id: String(c.id), name: c.name ?? String(c.id) }));
      setClassOptions(safeClasses);
    } catch (err) {
      setClassError('Failed to load class options.');
    } finally {
      setClassLoading(false);
    }
  }, []);

  useEffect(() => { loadClasses(); }, [loadClasses]);

  useEffect(() => {
    if (selectedFacultyIds.length === 0) { setSpecialties([]); return; }
    let cancelled = false;
    (async () => {
      setSpecialtyLoading(true);
      try {
        const ids = selectedFacultyIds.map((id) => Number(id)).filter((n) => !isNaN(n));
        const result = await fetchSpecialtiesByFaculties(ids);
        if (!cancelled) {
          // Same defensive filter as classes: guarantee every specialty
          // has a real, unique id before it reaches the Select.
          const safeResult = (result || []).filter((s: any) => s && s.id !== undefined && s.id !== null);
          setSpecialties(safeResult);
          const availableIds = new Set(safeResult.map((s) => String(s.id)));
          const currentSelected = watch('specialty_ids') || [];
          const stillValid = currentSelected.filter((id) => availableIds.has(String(id)));
          if (stillValid.length !== currentSelected.length) {
            setValue('specialty_ids', stillValid);
          }
        }
      } catch { if (!cancelled) setSpecialties([]); }
      finally { if (!cancelled) setSpecialtyLoading(false); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(selectedFacultyIds)]);

  useEffect(() => {
    if (isEditing && classOptions.length > 0 && initialData?.classes?.length) {
      const matched = initialData.classes
        .map((name) => {
          const c = classOptions.find((opt) => opt.name.toLowerCase() === String(name).toLowerCase());
          return c ? c.id : null;
        })
        .filter((id): id is string => id !== null);
      setValue('classes', matched);
    }
  }, [isEditing, classOptions, initialData, setValue]);

  // ─── THE HANDLER — matches MUI's official docs pattern ───
  const makeChangeHandler =
    (field: any, allIds: string[], newOptionHandler?: () => void) =>
    (event: SelectChangeEvent<string[]>) => {
      const newValue = event.target.value as string[];
      // The __all__ value is always added at the END by MUI
      // Check the last element instead of `.includes()` — this is the crucial fix
      if (newValue[newValue.length - 1] === ALL_OPTION) {
        const cleaned = newValue.filter((v) => v !== ALL_OPTION);
        const wasAll = allIds.length > 0 && cleaned.length === allIds.length;
        field.onChange(wasAll ? [] : allIds);
        return;
      }
      if (newOptionHandler && newValue.includes(NEW_OPTION)) {
        newOptionHandler();
        return;
      }
      field.onChange(newValue.filter((v) => v !== ALL_OPTION));
    };

  const submitHandler = async (formData: SubjectFormData) => {
    setError(null);
    try {
      setLoading(true);
      const classNames = (formData.classes || []).map((classId) => {
        const c = classOptions.find((opt) => opt.id === String(classId));
        return c ? c.name : classId;
      });
      const payload: SubjectCreateData = {
        name: formData.name,
        coefficient: Number(formData.coefficient),
        faculty_ids: (formData.faculty_ids || []).map(Number),
        specialty_ids: (formData.specialty_ids || []).map(Number),
        classes: classNames,
      };
      await onSubmit(payload);
      if (!isEditing) reset();
    } catch (err: any) {
      setError(err?.message || 'Failed to save subject.');
      throw err;
    } finally { setLoading(false); }
  };

  const handleCreateFaculty = async () => {
    const name = newFacultyName.trim();
    if (!name) return;
    setNewFacultySaving(true);
    try {
      const created = await createFaculty(name);
      const updated = await fetchFaculties();
      setFaculties(updated);
      setValue('faculty_ids', [...selectedFacultyIds, String(created.id)]);
      setNewFacultyOpen(false);
      setNewFacultyName('');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to create faculty.');
    } finally { setNewFacultySaving(false); }
  };

  const handleCreateSpecialty = async () => {
    const name = newSpecialtyName.trim();
    if (!name) return;
    const targetFacultyId = selectedFacultyIds.length > 0
      ? Number(selectedFacultyIds[0])
      : faculties.length > 0 ? faculties[0].id : null;
    if (!targetFacultyId) { setError('Select a faculty first.'); return; }
    setNewSpecialtySaving(true);
    try {
      const created = await createSpecialty(name, targetFacultyId);
      const refreshed = await fetchSpecialtiesByFaculties(selectedFacultyIds.map(Number));
      setSpecialties(refreshed);
      setValue('specialty_ids', [...selectedSpecialtyIds, String(created.id)]);
      setNewSpecialtyOpen(false);
      setNewSpecialtyName('');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to create specialty.');
    } finally { setNewSpecialtySaving(false); }
  };

  const makeRenderValue =
    <T,>(list: T[], getName: (item: T) => string, empty: string, all: string) =>
    (selected: unknown) => {
      const ids = (selected as string[]).filter((id) => id !== ALL_OPTION);
      if (ids.length === 0) return empty;
      if (list.length > 0 && ids.length === list.length) return all;
      const names = ids.map((id) => {
        const match = list.find((item: any) => String(item.id) === id);
        return match ? getName(match) : id;
      });
      if (names.length > 2) return `${names.slice(0, 2).join(', ')} +${names.length - 2} more`;
      return names.join(', ');
    };

  return (
    <form onSubmit={handleSubmit(submitHandler)}>
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        {isEditing ? 'Edit Subject' : 'Create New Subject'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>
      )}

      <Grid container spacing={isMobile ? 2 : 3}>
        <Grid item xs={12}>
          <TextField fullWidth label="Subject Name"
            {...register('name', { required: 'Subject name is required', minLength: { value: 2, message: 'At least 2 characters' } })}
            error={!!errors.name} helperText={errors.name?.message}
            size={isMobile ? 'small' : 'medium'} disabled={loading} />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField fullWidth label="Coefficient" type="number"
            inputProps={{ min: 1, max: 20, step: 0.5 }}
            {...register('coefficient', {
              required: 'Coefficient is required',
              min: { value: 1, message: 'Minimum is 1' },
              max: { value: 20, message: 'Maximum is 20' },
              valueAsNumber: true,
            })}
            error={!!errors.coefficient}
            helperText={errors.coefficient?.message || 'Weight in the average'}
            size={isMobile ? 'small' : 'medium'} disabled={loading} />
        </Grid>

        {/* ═══════════ FACULTIES ═══════════ */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
            <InputLabel>Faculties</InputLabel>
            <Controller name="faculty_ids" control={control} render={({ field }) => {
              const selected = field.value || [];
              const allIds = faculties.map((f) => String(f.id));
              const allSelected = allIds.length > 0 && selected.filter((v: string) => v !== ALL_OPTION).length === allIds.length;
              const someSelected = selected.filter((v: string) => v !== ALL_OPTION).length > 0 && !allSelected;

              return (
                <Select multiple label="Faculties" value={selected}
                  onChange={makeChangeHandler(field, allIds, () => setNewFacultyOpen(true))}
                  input={<OutlinedInput label="Faculties" />}
                  renderValue={makeRenderValue(faculties, (f) => f.name, 'Select faculties...', 'All Faculties')}
                  disabled={loading} MenuProps={MenuProps}>
                  {faculties.length > 0 && (
                    <MenuItem value={ALL_OPTION}>
                      <Checkbox checked={allSelected} indeterminate={someSelected} />
                      <ListItemText primary="Select All" />
                    </MenuItem>
                  )}
                  {faculties.length > 0 && <Divider />}
                  {faculties.map((f) => (
                    <MenuItem key={f.id} value={String(f.id)}>
                      <Checkbox checked={selected.includes(String(f.id))} />
                      <ListItemText primary={f.name} />
                    </MenuItem>
                  ))}
                  <Divider />
                  <MenuItem value={NEW_OPTION} sx={{ color: 'primary.main', fontWeight: 600 }}>
                    <AddCircleOutlineIcon fontSize="small" sx={{ mr: 1 }} />
                    Add New Faculty
                  </MenuItem>
                </Select>
              );
            }} />
            <FormHelperText>
              {selectedFacultyIds.length === 0 ? 'Pick at least one faculty' : 'A subject can belong to multiple faculties'}
            </FormHelperText>
          </FormControl>
        </Grid>

        {/* ═══════════ SPECIALTIES ═══════════ */}
        {/* FIX: options are now direct children of <Select> (matching the
            working Faculties pattern above) instead of being nested inside
            a ternary-returned <Fragment>. That Fragment nesting was why
            clicks weren't registering a selection even though the items
            were visibly listed. */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
            <InputLabel>Specialties</InputLabel>
            <Controller name="specialty_ids" control={control} render={({ field }) => {
              const selected = field.value || [];
              const allIds = specialties.map((s) => String(s.id));
              const allSelected = allIds.length > 0 && selected.filter((v: string) => v !== ALL_OPTION).length === allIds.length;
              const someSelected = selected.filter((v: string) => v !== ALL_OPTION).length > 0 && !allSelected;
              const hasSpecialties = specialties.length > 0;

              return (
                <Select multiple label="Specialties" value={selected}
                  onChange={makeChangeHandler(field, allIds, () => setNewSpecialtyOpen(true))}
                  input={<OutlinedInput label="Specialties" />}
                  renderValue={makeRenderValue(specialties, (s) => s.name, 'Select specialties...', 'All Specialties')}
                  disabled={selectedFacultyIds.length === 0 || specialtyLoading || loading}
                  MenuProps={MenuProps}>
                  {specialtyLoading && (
                    <MenuItem disabled>
                      <CircularProgress size={18} sx={{ mr: 1 }} /> Loading...
                    </MenuItem>
                  )}
                  {!specialtyLoading && !hasSpecialties && (
                    <MenuItem disabled>No specialties under the selected faculties</MenuItem>
                  )}
                  {!specialtyLoading && hasSpecialties && (
                    <MenuItem value={ALL_OPTION}>
                      <Checkbox checked={allSelected} indeterminate={someSelected} />
                      <ListItemText primary="Select All" />
                    </MenuItem>
                  )}
                  {!specialtyLoading && hasSpecialties && <Divider />}
                  {!specialtyLoading && specialties.map((sp) => (
                    <MenuItem key={sp.id} value={String(sp.id)}>
                      <Checkbox checked={selected.includes(String(sp.id))} />
                      <ListItemText primary={sp.name} secondary={sp.faculty_name} />
                    </MenuItem>
                  ))}
                  {!specialtyLoading && hasSpecialties && <Divider />}
                  {!specialtyLoading && hasSpecialties && (
                    <MenuItem value={NEW_OPTION} sx={{ color: 'primary.main', fontWeight: 600 }}>
                      <AddCircleOutlineIcon fontSize="small" sx={{ mr: 1 }} />
                      Add New Specialty
                    </MenuItem>
                  )}
                </Select>
              );
            }} />
            <FormHelperText>
              {selectedFacultyIds.length === 0 ? 'Pick faculties first' : 'Which specialties take this subject?'}
            </FormHelperText>
          </FormControl>
        </Grid>

        {/* ═══════════ CLASSES ═══════════ */}
        {/* Same fix applied here: flat direct-children MenuItems instead of
            a Fragment nested inside a ternary chain. */}
        <Grid item xs={12}>
          <FormControl fullWidth size={isMobile ? 'small' : 'medium'}
            error={!!classError || !!errors.classes}>
            <InputLabel>Classes</InputLabel>
            <Controller name="classes" control={control} render={({ field, fieldState }) => {
              const selected = field.value || [];
              const allIds = classOptions.map((c) => c.id);
              const allSelected = allIds.length > 0 && selected.filter((v: string) => v !== ALL_OPTION).length === allIds.length;
              const someSelected = selected.filter((v: string) => v !== ALL_OPTION).length > 0 && !allSelected;
              const hasClasses = classOptions.length > 0;

              return (
                <>
                  <Select multiple label="Classes" value={selected}
                    onChange={makeChangeHandler(field, allIds)}
                    input={<OutlinedInput label="Classes" />}
                    renderValue={makeRenderValue(classOptions, (c) => c.name, 'Select classes...', 'All Classes')}
                    disabled={classLoading || loading} MenuProps={MenuProps}>
                    {classLoading && (
                      <MenuItem disabled>
                        <CircularProgress size={18} sx={{ mr: 1 }} /> Loading classes...
                      </MenuItem>
                    )}
                    {!classLoading && classError && (
                      <MenuItem disabled><Typography color="error">{classError}</Typography></MenuItem>
                    )}
                    {!classLoading && !classError && !hasClasses && (
                      <MenuItem disabled>No classes yet</MenuItem>
                    )}
                    {!classLoading && !classError && hasClasses && (
                      <MenuItem value={ALL_OPTION}>
                        <Checkbox checked={allSelected} indeterminate={someSelected} />
                        <ListItemText primary="Select All" />
                      </MenuItem>
                    )}
                    {!classLoading && !classError && hasClasses && <Divider />}
                    {!classLoading && !classError && classOptions.map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        <Checkbox checked={selected.includes(c.id)} />
                        <ListItemText primary={c.name} />
                      </MenuItem>
                    ))}
                  </Select>
                  {(fieldState.error || classError) && (
                    <FormHelperText error>{fieldState.error?.message || classError}</FormHelperText>
                  )}
                </>
              );
            }} />
            <FormHelperText>Which classes are taught this subject?</FormHelperText>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <Box display="flex" justifyContent="flex-end" gap={2}>
            {onCancel && <Button variant="outlined" onClick={onCancel} disabled={loading}>Cancel</Button>}
            <Button type="submit" variant="contained" disabled={loading || classLoading}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}>
              {loading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Subject' : 'Create Subject')}
            </Button>
          </Box>
        </Grid>
      </Grid>

      {/* New Faculty Dialog */}
      <Dialog open={newFacultyOpen} onClose={() => !newFacultySaving && setNewFacultyOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add New Faculty</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth label="Faculty Name" value={newFacultyName}
            onChange={(e) => setNewFacultyName(e.target.value)}
            placeholder="e.g., Grammar, Commercial, Industrial" sx={{ mt: 1 }}
            disabled={newFacultySaving}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFaculty()} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewFacultyOpen(false)} disabled={newFacultySaving}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateFaculty} disabled={newFacultySaving}>
            {newFacultySaving ? <CircularProgress size={20} color="inherit" /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Specialty Dialog */}
      <Dialog open={newSpecialtyOpen} onClose={() => !newSpecialtySaving && setNewSpecialtyOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add New Specialty</DialogTitle>
        <DialogContent>
          {selectedFacultyIds.length > 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Will be created under:{' '}
              <strong>{faculties.find((f) => String(f.id) === selectedFacultyIds[0])?.name}</strong>
            </Alert>
          )}
          <TextField autoFocus fullWidth label="Specialty Name" value={newSpecialtyName}
            onChange={(e) => setNewSpecialtyName(e.target.value)}
            placeholder="e.g., Arts, Science, Accounting"
            disabled={newSpecialtySaving}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateSpecialty()} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewSpecialtyOpen(false)} disabled={newSpecialtySaving}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateSpecialty} disabled={newSpecialtySaving}>
            {newSpecialtySaving ? <CircularProgress size={20} color="inherit" /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </form>
  );
};
