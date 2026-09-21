import React, { useState } from 'react';
import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography
} from '@mui/material';
import { AttachMoney, Cancel, PersonSearch, Save } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import { usePaymentForm } from '../hooks/useFeeForms';
import type { Payment, Student, FeeStructure } from '../types/feeTypes';

interface PaymentFormProps {
  initialData?: Payment;
  onSuccess: () => void;
  onCancel: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ initialData, onSuccess, onCancel }) => {
  const {
    formData,
    setFormData,
    handleChange,
    validate
  } = usePaymentForm(initialData);

  const [students] = useState<Student[]>([]);
  const [feeStructures] = useState<FeeStructure[]>([]);
  const [selectedStructure, setSelectedStructure] = useState<FeeStructure | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSuccess();
    }
  };

  const handleStudentSelect = (student: Student | null) => {
    if (student) {
      setFormData({
        ...formData,
        student_id: student.id,
        student_name: student.name,
        class_id: student.class_id,
        class_name: student.class_name
      });
      // Load fee structures for selected student's class
    }
  };

  return (
    <Dialog open fullWidth maxWidth="md" onClose={onCancel}>
      <DialogTitle>{initialData ? 'Edit Payment' : 'Record Payment'}</DialogTitle>
      <DialogContent dividers>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Autocomplete
                options={students}
                getOptionLabel={(option) => `${option.name} (${option.class_name})`}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                onChange={(_, value) => handleStudentSelect(value)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Search Student"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <PersonSearch sx={{ mr: 1, color: 'action.active' }} />
                          {params.InputProps.startAdornment}
                        </>
                      )
                    }}
                  />
                )}
              />
            </Grid>
            {formData.student_id > 0 && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Student Name"
                    value={formData.student_name}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Class"
                    value={formData.class_name}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6">Fee Structure</Typography>
                  <FormControl fullWidth sx={{ mt: 2 }}>
                    <InputLabel>Select Fee Structure</InputLabel>
                    <Select
                      value={selectedStructure?.id || ''}
                      onChange={(e) => {
                        const structure = feeStructures.find(s => s.id === e.target.value);
                        setSelectedStructure(structure || null);
                      }}
                      label="Select Fee Structure"
                    >
                      {feeStructures.map(structure => (
                        <MenuItem key={structure.id} value={structure.id}>
                          {structure.academic_year} - {structure.term}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6">Payment Details</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DatePicker
                    label="Payment Date"
                    value={formData.payment_date}
                    onChange={(date) => setFormData(prev => ({
                      ...prev,
                      payment_date: date ? new Date(date).toISOString().split('T')[0] : ''
                    }))}
                    slotProps={{
                      textField: {
                        fullWidth: true
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Payment Method</InputLabel>
                    <Select
                      value={formData.payment_method}
                      onChange={(e) => handleChange(e as React.ChangeEvent<{ name?: string; value: unknown }>)}
                      name="payment_method"
                      label="Payment Method"
                    >
                      <MenuItem value="Cash">Cash</MenuItem>
                      <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                      <MenuItem value="Cheque">Cheque</MenuItem>
                      <MenuItem value="Mobile Money">Mobile Money</MenuItem>
                      <MenuItem value="Other">Other</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Receipt Number"
                    name="receipt_number"
                    value={formData.receipt_number}
                    onChange={handleChange}
                    InputProps={{
                      startAdornment: <AttachMoney sx={{ mr: 1, color: 'action.active' }} />
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Amount Paid"
                    name="amount_paid"
                    type="number"
                    value={formData.amount_paid}
                    onChange={handleChange}
                    InputProps={{
                      startAdornment: <AttachMoney sx={{ mr: 1, color: 'action.active' }} />
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    multiline
                    rows={2}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </form>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} startIcon={<Cancel />}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          startIcon={<Save />}
          variant="contained"
          disabled={!formData.student_id}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PaymentForm;