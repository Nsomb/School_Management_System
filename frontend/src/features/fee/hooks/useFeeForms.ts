import { useState } from 'react';
import { validateFeeStructure, validatePayment } from '../utils/feeHelpers';
import type { FeeStructure, Payment, FeeComponent } from '../types/feeTypes';

// ============================================================================
// EXPLICIT FORM STATE SHAPES
// (safer than Omit<...> when the base types evolve)
// ============================================================================

type FeeStructureFormState = {
  class_id: number;
  class_name: string;
  academic_year: string;
  term: string;
  description: string;
  due_date: string;
  components: FeeComponent[];   // ✅ non-optional – always an array
};

type PaymentFormState = {
  student_id: number;
  student_name: string;
  class_id: number;
  class_name: string;
  fees_structure_id: number;
  amount_paid: number;
  payment_date: string;
  receipt_number: string;
  payment_method: string;
  reference_number: string;
  component_name: string;
  academic_year: string;
  term: string;
  recorded_by: number;
  notes: string;
};

// ============================================================================
// FEE STRUCTURE FORM HOOK
// ============================================================================

export const useFeeStructureForm = (initialData?: Partial<FeeStructure>) => {
  const [formData, setFormData] = useState<FeeStructureFormState>(() => ({
    class_id: initialData?.class_id ?? 0,
    class_name: initialData?.class_name ?? '',
    academic_year: initialData?.academic_year ?? '',
    term: initialData?.term ?? 'Term 1',
    description: initialData?.description ?? '',
    due_date: initialData?.due_date ?? '',
    // ✅ Guarantee an array – never undefined
    components: Array.isArray(initialData?.components)
      ? initialData!.components!
      : [],
  }));

  const [errors, setErrors] = useState<string[]>([]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>
  ) => {
    const { name, value } = e.target as { name: string; value: any };
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleComponentChange = (
    index: number,
    field: keyof FeeComponent,
    value: any
  ) => {
    setFormData((prev) => {
      // ✅ Guard – components is always an array now, but stay defensive
      const updatedComponents = Array.isArray(prev.components)
        ? [...prev.components]
        : [];
      updatedComponents[index] = {
        ...updatedComponents[index],
        [field]: value,
      };
      return { ...prev, components: updatedComponents };
    });
  };

  const addComponent = (component: FeeComponent) => {
    setFormData((prev) => ({
      ...prev,
      components: [...prev.components, component],
    }));
  };

  const removeComponent = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      components: prev.components.filter((_, i) => i !== index),
    }));
  };

  const validate = (): boolean => {
    const validationErrors = validateFeeStructure(formData);
    setErrors(validationErrors);
    return validationErrors.length === 0;
  };

  return {
    formData,
    setFormData,
    errors,
    handleChange,
    handleComponentChange,
    addComponent,
    removeComponent,
    validate,
  };
};

// ============================================================================
// PAYMENT FORM HOOK
// ============================================================================

export const usePaymentForm = (initialData?: Partial<Payment>) => {
  const [formData, setFormData] = useState<PaymentFormState>(() => ({
    student_id: initialData?.student_id ?? 0,
    student_name: initialData?.student_name ?? '',
    class_id: initialData?.class_id ?? 0,
    class_name: initialData?.class_name ?? '',
    fees_structure_id: initialData?.fees_structure_id ?? 0,
    amount_paid: initialData?.amount_paid ?? 0,
    payment_date:
      initialData?.payment_date ?? new Date().toISOString().split('T')[0],
    receipt_number: initialData?.receipt_number ?? '',
    payment_method: initialData?.payment_method ?? 'Cash',
    reference_number: initialData?.reference_number ?? '',
    component_name: initialData?.component_name ?? '',
    academic_year: initialData?.academic_year ?? '',
    term: initialData?.term ?? '',
    recorded_by: initialData?.recorded_by ?? 0,
    notes: initialData?.notes ?? '',
  }));

  const [errors, setErrors] = useState<string[]>([]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>
  ) => {
    const { name, value } = e.target as { name: string; value: any };
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validate = (): boolean => {
    const validationErrors = validatePayment(formData);
    setErrors(validationErrors);
    return validationErrors.length === 0;
  };

  return {
    formData,
    setFormData,
    errors,
    handleChange,
    validate,
  };
};