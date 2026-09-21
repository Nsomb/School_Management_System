import React, { useState, useEffect } from 'react';
import { Form, Input, Select, DatePicker, Modal, message, InputNumber } from 'antd';
import type { StudentAttendance, TeacherAttendance } from '../types/attendanceTypes';
import dayjs from 'dayjs';
import { ClassFilter } from './filters/ClassFilter';
import { TeacherFilter } from './filters/TeacherFilter';

const { Option } = Select;
const { TextArea } = Input;

interface AttendanceFormProps {
  type: 'student' | 'teacher';
  visible: boolean;
  onCancel: () => void;
  onSubmit: (values: any) => Promise<void>;
  initialValues?: Partial<StudentAttendance> | Partial<TeacherAttendance>;
}

export const AttendanceForm: React.FC<AttendanceFormProps> = ({
  type,
  visible,
  onCancel,
  onSubmit,
  initialValues,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible && initialValues) {
      form.setFieldsValue({
        ...initialValues,
        attendanceDate: initialValues.attendance_date ? dayjs(initialValues.attendance_date) : dayjs(),
      });
    } else if (visible) {
      form.setFieldsValue({
        attendanceDate: dayjs(),
      });
    }
  }, [visible, initialValues, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      
      const payload = {
        ...values,
        attendanceDate: values.attendanceDate.format('YYYY-MM-DD'),
        studentId: values.studentId,
        teacherId: values.teacherId,
        className: values.className,
        status: values.status,
        reason: values.reason || null,
        markedBy: values.markedBy || 'admin',
      };

      await onSubmit(payload);
      form.resetFields();
      message.success(`${type.charAt(0).toUpperCase() + type.slice(1)} attendance recorded successfully`);
    } catch (error) {
      console.error('Form validation failed:', error);
      message.error('Failed to submit attendance. Please check the form.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  const statusOptions = [
    { value: 'Present', label: 'Present' },
    { value: 'Absent', label: 'Absent' },
    { value: 'Excused', label: 'Excused' },
  ];

  return (
    <Modal
      title={`${initialValues?.id ? 'Edit' : 'Add'} ${type} Attendance`}
      open={visible}
      onCancel={handleCancel}
      onOk={handleSubmit}
      confirmLoading={submitting}
      style={{ top: 16, maxWidth: 'calc(100vw - 32px)' }}
      width={600}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ markedBy: 'admin' }}
        className="pt-2"
      >
        {type === 'student' ? (
          <>
            <Form.Item
              name="studentId"
              label="Student ID"
              rules={[{ required: true, message: 'Student ID is required' }]}
            >
              <InputNumber 
                style={{ width: '100%' }} 
                placeholder="Enter student ID"
                min={1}
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="className"
              label="Class"
              rules={[{ required: true, message: 'Class is required' }]}
            >
              <ClassFilter />
            </Form.Item>
          </>
        ) : (
          <Form.Item
            name="teacherId"
            label="Teacher"
            rules={[{ required: true, message: 'Teacher is required' }]}
          >
            <TeacherFilter />
          </Form.Item>
        )}

        <Form.Item
          name="attendanceDate"
          label="Date"
          rules={[{ required: true, message: 'Date is required' }]}
        >
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" size="large" />
        </Form.Item>

        <Form.Item
          name="status"
          label="Status"
          rules={[{ required: true, message: 'Status is required' }]}
        >
          <Select placeholder="Select status" size="large">
            {statusOptions.map(option => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="reason" label="Reason (if absent/excused)">
          <TextArea rows={3} placeholder="Enter reason for absence or excused leave" />
        </Form.Item>

        <Form.Item
          name="markedBy"
          label="Marked By"
          rules={[{ required: true, message: 'Marked by is required' }]}
        >
          <Input placeholder="Enter your name" size="large" />
        </Form.Item>

        {type === 'teacher' && (
          <>
            <Form.Item name="halfDayType" label="Half Day Type">
              <Select placeholder="Select half day type" size="large">
                <Option value="morning">Morning</Option>
                <Option value="afternoon">Afternoon</Option>
              </Select>
            </Form.Item>
            <Form.Item name="leaveType" label="Leave Type">
              <Input placeholder="Enter leave type" size="large" />
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
};