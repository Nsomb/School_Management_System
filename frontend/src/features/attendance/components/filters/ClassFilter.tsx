// src/components/filters/ClassFilter.tsx
import React, { useState, useEffect } from 'react';
import { Select, Spin, message } from 'antd';
import { attendanceApi } from '../../api/attendanceApi';

const { Option } = Select;

interface ClassFilterProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  style?: React.CSSProperties;
  disabled?: boolean; 
}

export const ClassFilter: React.FC<ClassFilterProps> = ({
  value,
  onChange,
  placeholder = 'Select class',
  allowClear = true,
  style,
  disabled = false,
}) => {
  const [classes, setClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClasses = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('ClassFilter: Fetching classes from API...');
        const classList = await attendanceApi.getClasses();
        console.log('ClassFilter: Classes fetched:', classList);
        setClasses(classList);
      } catch (err: any) {
        console.error('ClassFilter: Error fetching classes:', err);
        const errorMsg = err.message || 'Failed to load classes';
        setError(errorMsg);
        message.error(`Failed to load classes: ${errorMsg}`);
        setClasses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, []);

  const handleChange = (newValue: string) => {
    console.log('Class selected:', newValue);
    onChange?.(newValue);
  };

  const filterOption = (input: string, option?: { children: string }) => {
    if (!option?.children) return false;
    return option.children.toLowerCase().includes(input.toLowerCase());
  };

  return (
    <Select
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
      allowClear={allowClear}
      style={style || { minWidth: 200, width: '100%' }}
      showSearch
      optionFilterProp="children"
      filterOption={filterOption}
      loading={loading}
      notFoundContent={
        loading ? <Spin size="small" /> : 
        error ? `Error loading classes` : 
        'No classes found'
      }
      disabled={disabled || loading}
      status={error ? 'error' : undefined}
    >
      {classes.map((className) => (
        <Option key={className} value={className}>
          {className}
        </Option>
      ))}
    </Select>
  );
};