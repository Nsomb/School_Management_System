import React, { useState, useEffect } from 'react';
import { Select, Spin, Alert } from 'antd';
import { useApi } from '../../hooks/useApi';
import type { Teacher } from '../../types/attendanceTypes';

const { Option } = Select;

interface TeacherFilterProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  style?: React.CSSProperties;
  disabled?: boolean;
}

export const TeacherFilter: React.FC<TeacherFilterProps> = ({
  value,
  onChange,
  placeholder = 'Select teacher',
  allowClear = true,
  style,
  disabled = false,
}) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const api = useApi();

  useEffect(() => {
    const fetchTeachers = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const response = await api.get<Teacher[]>('/teachers');
        setTeachers(response || []);
      } catch (error) {
        console.error('Error fetching teachers:', error);
        setFetchError('Failed to load teachers');
        setTeachers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTeachers();
  }, [api]);

  const handleChange = (newValue: string) => {
    onChange?.(newValue);
  };

  const filterOption = (input: string, option?: { children: string }) => {
    if (!option?.children) return false;
    return option.children.toLowerCase().includes(input.toLowerCase());
  };

  return (
    <div>
      <Select
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        allowClear={allowClear}
        style={style || { minWidth: 200 }}
        showSearch
        optionFilterProp="children"
        filterOption={filterOption}
        loading={loading}
        disabled={disabled || loading}
        notFoundContent={
          loading ? <Spin size="small" /> : fetchError ? 'Failed to load' : 'No teachers found'
        }
      >
        {teachers.map((teacher) => (
          <Option key={teacher.id} value={teacher.id}>
            {teacher.full_name}
          </Option>
        ))}
      </Select>
      {fetchError && (
        <Alert 
          message={fetchError} 
          type="warning" 
          showIcon 
          style={{ marginTop: 8, fontSize: '12px' }}
          closable
          onClose={() => setFetchError(null)}
        />
      )}
    </div>
  );
};