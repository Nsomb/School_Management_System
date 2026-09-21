import React, { useState, useEffect } from 'react';
import {
  Card, Button, Alert, Typography, Input, Row, Col, Spin,
  Badge, Tooltip, Space, Empty, Tag, message,
} from 'antd';
import {
  ReloadOutlined, SaveOutlined, LockOutlined, UnlockOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { attendanceApi } from '../api/attendanceApi';

const { Title, Text } = Typography;

type Status = 'Present' | 'Absent' | 'Excused';
const STATUS_COLORS: Record<Status, string> = { Present: '#52c41a', Absent: '#ff4d4f', Excused: '#1890ff' };
const STATUS_OPTIONS: Status[] = ['Present', 'Absent', 'Excused'];

export const AdminTeacherAttendance: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [attendanceDate, setAttendanceDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [attendanceData, setAttendanceData] = useState<Record<string, Status>>({});
  const [reasonData, setReasonData] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadTeachers(); }, [attendanceDate]);

  const loadTeachers = async () => {
    setLoading(true);
    try {
      const data = await attendanceApi.getTeachersForDate(attendanceDate);
      if (data?.teachers) {
        const list = data.teachers;
        setTeachers(list);
        const initial: Record<string, Status> = {};
        const reasons: Record<string, string> = {};
        list.forEach((t: any) => { initial[String(t.id)] = 'Present'; reasons[String(t.id)] = ''; });
        setAttendanceData(initial);
        setReasonData(reasons);
      } else {
        setTeachers([]);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Failed to load teachers';
      setError(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (id: string, status: Status) => {
    setAttendanceData(prev => ({ ...prev, [id]: status }));
    if (status === 'Present') setReasonData(prev => ({ ...prev, [id]: '' }));
  };

  const handleReasonChange = (id: string, reason: string) => {
    setReasonData(prev => ({ ...prev, [id]: reason }));
  };

  const handleBulkStatus = (status: Status) => {
    const newData: Record<string, Status> = {};
    teachers.forEach(t => (newData[String(t.id)] = status));
    setAttendanceData(newData);
    if (status === 'Present') setReasonData({});
    message.info(`All teachers set to ${status}`);
  };

  const handleLockAttendance = async () => {
    if (!attendanceDate) { message.warning('Please select a date'); return; }
    try {
      const result = await attendanceApi.lockTeacherAttendance({ attendanceDate });
      message.success(`Locked ${result?.locked?.length || 0} teacher records`);
      await loadTeachers();
    } catch (err: any) {
      message.error(err.message || 'Failed to lock');
    }
  };

  const handleUnlockAttendance = async () => {
    if (!attendanceDate) { message.warning('Please select a date'); return; }
    try {
      const result = await attendanceApi.unlockTeacherAttendance({ attendanceDate });
      message.success(`Unlocked ${result?.unlocked?.length || 0} teacher records`);
      await loadTeachers();
    } catch (err: any) {
      message.error(err.message || 'Failed to unlock');
    }
  };

  const saveAttendance = async () => {
    if (!attendanceDate) {
      message.warning('Please select a date');
      return;
    }
    if (teachers.length === 0) {
      message.warning('No teachers to mark');
      return;
    }
    const records = teachers.map(t => ({
      teacherId: Number(t.id),
      status: attendanceData[String(t.id)] || 'Present',
      reason: attendanceData[String(t.id)] !== 'Present' ? reasonData[String(t.id)] || undefined : undefined,
    }));
    setSubmitting(true);
    try {
      await attendanceApi.markTeachersAttendance({ attendanceDate, records });
      message.success(`✅ Saved ${records.length} teacher records for ${dayjs(attendanceDate).format('DD/MM/YYYY')}`);
      await loadTeachers();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to save attendance';
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const presentCount = Object.values(attendanceData).filter(s => s === 'Present').length;
  const absentCount = Object.values(attendanceData).filter(s => s === 'Absent').length;
  const excusedCount = Object.values(attendanceData).filter(s => s === 'Excused').length;

  if (loading) {
    return <div className="flex justify-center items-center min-h-[60vh]"><Spin size="large" tip="Loading teachers..." /></div>;
  }

  if (teachers.length === 0) {
    return (
      <Empty description="No teachers scheduled for this day" className="py-12">
        <Text type="secondary">Please ensure teachers have expected working days set.</Text>
      </Empty>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div>
          <Title level={3} className="!mb-0">👩‍🏫 Teacher Attendance</Title>
          <Text type="secondary">Mark attendance for teachers scheduled on this day</Text>
        </div>
        <Button icon={<ReloadOutlined spin={loading} />} onClick={loadTeachers} disabled={submitting}>
          Refresh
        </Button>
      </div>

      {error && <Alert message={error} type="error" showIcon className="mb-4" closable onClose={() => setError(null)} />}

      <Card className="mb-6 shadow-sm">
        <Row gutter={[16, 16]} align="bottom">
          <Col xs={24} sm={12} md={8}>
            <label className="block text-sm font-medium text-gray-700 mb-1">📅 Date</label>
            <input
              type="date"
              value={attendanceDate}
              onChange={e => setAttendanceDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              disabled={submitting}
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">Bulk:</span>
              {STATUS_OPTIONS.map(status => (
                <Button
                  key={status}
                  size="small"
                  style={{ backgroundColor: STATUS_COLORS[status], color: '#fff', border: 'none' }}
                  onClick={() => handleBulkStatus(status)}
                  disabled={submitting}
                >
                  {status}
                </Button>
              ))}
            </div>
          </Col>
          <Col xs={24} sm={24} md={8} className="flex items-center gap-2 flex-wrap">
            <Button
              danger
              icon={<LockOutlined />}
              onClick={handleLockAttendance}
              disabled={submitting || teachers.length === 0}
              size="small"
            >
              Lock
            </Button>
            <Button
              icon={<UnlockOutlined />}
              onClick={handleUnlockAttendance}
              disabled={submitting || teachers.length === 0}
              size="small"
            >
              Unlock
            </Button>
          </Col>
        </Row>
      </Card>

      <Card className="shadow-sm">
        <div className="mb-3 flex flex-wrap justify-between items-center gap-2">
          <span className="font-medium">Teachers scheduled for {dayjs(attendanceDate).format('DD/MM/YYYY')}</span>
          <Space>
            <Badge color="green" text={`✅ Present ${presentCount}`} />
            <Badge color="red" text={`❌ Absent ${absentCount}`} />
            <Badge color="blue" text={`⏳ Excused ${excusedCount}`} />
          </Space>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Teacher</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Expected</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Reason</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map(t => {
                const id = String(t.id);
                const status = attendanceData[id] || 'Present';
                const reason = reasonData[id] || '';
                const expectedType = t.expected_type || 'Full Day';
                const isFull = expectedType === 'Full Day';
                const isMorning = expectedType === 'Morning';
                const isAfternoon = expectedType === 'Afternoon';
                const color = isFull ? 'green' : isMorning ? 'gold' : isAfternoon ? 'blue' : 'default';
                const label = isFull ? 'Full Day' : isMorning ? 'Morning' : isAfternoon ? 'Afternoon' : 'Unknown';
                return (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-800 font-medium">{t.full_name}</td>
                    <td className="px-4 py-3"><Tag color={color}>{label}</Tag></td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-1 flex-wrap">
                        {STATUS_OPTIONS.map(s => {
                          const active = status === s;
                          return (
                            <Tooltip title={s} key={s}>
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-all ${active ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                style={active ? { backgroundColor: STATUS_COLORS[s] } : {}}
                                onClick={() => handleStatusChange(id, s)}
                              >
                                {s}
                              </span>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {status !== 'Present' ? (
                        <Input
                          size="small"
                          value={reason}
                          onChange={e => handleReasonChange(id, e.target.value)}
                          placeholder="Enter reason..."
                          className="w-full"
                          disabled={submitting}
                        />
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-sm text-gray-500">Showing {teachers.length} teachers scheduled for this day</div>

        <div className="mt-6 border-t pt-4">
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={saveAttendance}
            loading={submitting}
            disabled={submitting || teachers.length === 0}
            block
            size="large"
          >
            {submitting ? 'Saving...' : '💾 Save Attendance'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default AdminTeacherAttendance;