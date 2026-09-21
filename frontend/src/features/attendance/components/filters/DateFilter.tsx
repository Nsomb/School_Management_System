import React from 'react';
import { DatePicker, Space } from 'antd';
import type { RangePickerProps } from 'antd/es/date-picker';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

interface DateFilterProps {
  value?: [string, string];
  onChange?: (dates: [string, string] | null) => void;
  style?: React.CSSProperties;
}

export const DateFilter: React.FC<DateFilterProps> = ({ value, onChange, style }) => {
  const handleChange: RangePickerProps['onChange'] = (dates, dateStrings) => {
    if (dates && dates[0] && dates[1]) {
      onChange?.(dateStrings as [string, string]);
    } else {
      onChange?.(null);
    }
  };

  const rangePickerValue = value ? [dayjs(value[0]), dayjs(value[1])] as [dayjs.Dayjs, dayjs.Dayjs] : null;

  return (
    <Space>
      <RangePicker
        onChange={handleChange}
        value={rangePickerValue}
        style={style || { width: '100%' }}
        allowClear
        format="DD/MM/YYYY"
      />
    </Space>
  );
};