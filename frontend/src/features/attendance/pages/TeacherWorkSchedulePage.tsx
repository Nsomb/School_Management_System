import React, { useState, useEffect } from 'react';
import { Card, Button, Select, Alert, Typography, Row, Col, Radio, Spin, Tag, Empty } from 'antd';
import { attendanceApi } from '../api/attendanceApi';
import { toast } from 'react-toastify';

const { Title, Text } = Typography;
const { Option } = Select;

const DAYS = [
  { value: 'Monday', label: 'Monday' },
  { value: 'Tuesday', label: 'Tuesday' },
  { value: 'Wednesday', label: 'Wednesday' },
  { value: 'Thursday', label: 'Thursday' },
  { value: 'Friday', label: 'Friday' },
  { value: 'Saturday', label: 'Saturday' },
  { value: 'Sunday', label: 'Sunday' },
];

const ATTENDANCE_TYPES = [
  { value: 'Full Day', label: 'Full Day' },
  { value: 'Morning', label: 'Morning' },
  { value: 'Afternoon', label: 'Afternoon' },
  { value: 'Off', label: 'Off' },
];

export const TeacherWorkSchedulePage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<number | null>(null);
  const [schedule, setSchedule] = useState<Record<string, string>>({});
  const [originalSchedule, setOriginalSchedule] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTeachers();
  }, []);

  useEffect(() => {
    if (selectedTeacher) {
      loadSchedule(selectedTeacher);
    } else {
      setSchedule({});
      setOriginalSchedule({});
    }
  }, [selectedTeacher]);

  const loadTeachers = async () => {
    setLoading(true);
    try {
      const data = await attendanceApi.getAllTeachersForAttendance();
      if (data) setTeachers(data.teachers || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load teachers');
    } finally {
      setLoading(false);
    }
  };

  const loadSchedule = async (teacherId: number) => {
    setLoading(true);
    try {
      const data = await attendanceApi.getExpectedDaysByTeacher(String(teacherId));
      const map: Record<string, string> = {};
      (data?.expectedDays || []).forEach((d: any) => {
        const day = d.day_of_week;
        const isFull = d.is_full_day_expected;
        const halfType = d.expected_half_day_type;
        let type = 'Off';
        if (isFull) type = 'Full Day';
        else if (halfType === 'Morning') type = 'Morning';
        else if (halfType === 'Afternoon') type = 'Afternoon';
        map[day] = type;
      });
      setSchedule(map);
      setOriginalSchedule({ ...map });
    } catch (err) {
      toast.error('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = () => JSON.stringify(schedule) !== JSON.stringify(originalSchedule);

  const handleSaveSchedule = async () => {
    if (!selectedTeacher) {
      toast.warning('Select a teacher');
      return;
    }
    setLoading(true);
    try {
      const expectedDays = Object.entries(schedule)
        .filter(([, type]) => type !== 'Off')
        .map(([day, type]) => {
          const isFull = type === 'Full Day';
          let halfType: 'Morning' | 'Afternoon' | undefined = undefined;
          if (!isFull) {
            if (type === 'Morning') halfType = 'Morning';
            else if (type === 'Afternoon') halfType = 'Afternoon';
          }
          return {
            dayOfWeek: day,
            isFullDayExpected: isFull,
            expectedHalfDayType: halfType,
          };
        });
      await attendanceApi.setBulkExpectedDays({
        teacherId: selectedTeacher,
        expectedDays,
      });
      toast.success('Schedule saved successfully!');
      setOriginalSchedule({ ...schedule });
      loadSchedule(selectedTeacher);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleDayTypeChange = (day: string, type: string) => {
    setSchedule((prev) => ({ ...prev, [day]: type }));
  };

  if (loading && !teachers.length) {
    return <div className="flex justify-center py-12"><Spin size="large" /></div>;
  }

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
        <div>
          <Title level={3} className="!mb-0 text-xl md:text-2xl">Teacher Work Schedule</Title>
          <Text type="secondary" className="text-xs md:text-sm">Set expected working days for each teacher</Text>
        </div>
        {selectedTeacher && hasChanges() && (
          <Tag color="orange" className="self-start sm:self-auto">Unsaved Changes</Tag>
        )}
      </div>

      {error && <Alert message={error} type="error" showIcon className="mb-4" closable onClose={() => setError(null)} />}

      <Card className="mb-4 shadow-sm" bodyStyle={{ padding: '16px' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Teacher</label>
            <Select
              placeholder="Search teacher..."
              className="w-full"
              size="large"
              value={selectedTeacher ? String(selectedTeacher) : undefined}
              onChange={(val) => setSelectedTeacher(val ? Number(val) : null)}
              showSearch
              optionFilterProp="children"
            >
              {teachers.map((t) => (
                <Option key={t.id} value={String(t.id)}>{t.full_name}</Option>
              ))}
            </Select>
          </Col>
        </Row>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12"><Spin size="large" /></div>
      ) : selectedTeacher ? (
        <Card className="shadow-sm" bodyStyle={{ padding: '16px' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {DAYS.map((day) => {
              const currentType = schedule[day.value] || 'Off';
              return (
                <div key={day.value} className="border rounded-lg p-3 bg-gray-50 flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-semibold text-gray-800 text-base">{day.label}</span>
                    <span className="text-xs text-gray-500 font-medium">{currentType}</span>
                  </div>
                  <Radio.Group
                    value={currentType}
                    onChange={(e) => handleDayTypeChange(day.value, e.target.value)}
                    size="middle"
                    buttonStyle="solid"
                    className="w-full flex"
                  >
                    {ATTENDANCE_TYPES.map((type) => (
                      <Radio.Button key={type.value} value={type.value} className="flex-1 text-center text-xs px-1">
                        {type.label}
                      </Radio.Button>
                    ))}
                  </Radio.Group>
                </div>
              );
            })}
          </div>

          <div className="mt-6">
            <Button
              type="primary"
              onClick={handleSaveSchedule}
              loading={loading}
              disabled={!hasChanges()}
              size="large"
              block
            >
              Save Changes
            </Button>
          </div>
        </Card>
      ) : (
        <Empty description="Select a teacher to view or edit their work schedule" />
      )}
    </div>
  );
};

export default TeacherWorkSchedulePage;