// src/features/attendance/pages/AdminStudentAttendance.tsx
import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Select, Tag, Row, Col, Spin, Alert, Typography,
  Input, Space, Radio, Badge, List, Empty, message,
} from 'antd';
import { ReloadOutlined, SaveOutlined, SearchOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { attendanceApi } from '../api/attendanceApi';

const { Title, Text } = Typography;
const { Option } = Select;

type Status = 'Present' | 'Absent' | 'Excused';
const STATUS_COLORS: Record<Status, string> = { Present: '#52c41a', Absent: '#ff4d4f', Excused: '#1890ff' };
const STATUS_OPTIONS: Status[] = ['Present', 'Absent', 'Excused'];
const STATUS_LABELS: Record<Status, string> = { Present: '✅ Present', Absent: '❌ Absent', Excused: '⏳ Excused' };

interface StudentRow { id: number; name: string; status: Status; reason: string; }

export const AdminStudentAttendance: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedClassName, setSelectedClassName] = useState<string>('');
  const [attendanceDate, setAttendanceDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');

  useEffect(() => { loadClasses(); }, []);

  useEffect(() => {
    if (selectedClassId && selectedClassName) loadStudentsForClass(selectedClassName);
    else setStudents([]);
  }, [selectedClassId, selectedClassName]);

  const loadClasses = async () => {
    setLoading(true);
    try {
      const classNames = await attendanceApi.getClasses();
      const classOptions = classNames.map((name: string) => ({ id: name, name }));
      setClasses(classOptions);
      if (classOptions.length > 0) {
        setSelectedClassId(classOptions[0].id);
        setSelectedClassName(classOptions[0].name);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load classes');
      message.error(err?.message || 'Failed to load classes');
    } finally { setLoading(false); }
  };

  const loadStudentsForClass = async (className: string) => {
    if (!className) return;
    setLoading(true);
    try {
      const data = await attendanceApi.getStudentsByClass(className);
      if (data?.students) {
        const rows: StudentRow[] = data.students.map((s: any) => ({
          id: s.id,
          name: s.full_name || s.name,
          status: 'Present' as Status,
          reason: '',
        }));
        setStudents(rows);
        await checkExistingAttendance(className, rows);
      } else setStudents([]);
    } catch (err: any) {
      message.error(err?.message || 'Failed to load students');
    } finally { setLoading(false); }
  };

  const checkExistingAttendance = async (className: string, rows: StudentRow[]) => {
    try {
      const data = await attendanceApi.getStudentAttendances({ className, dateFrom: attendanceDate, dateTo: attendanceDate });
      if (data?.records) {
        const map: Record<number, any> = {};
        data.records.forEach((r: any) => { map[r.student_id] = r; });
        const updated = rows.map((s) => {
          if (map[s.id]) {
            const status = map[s.id].status;
            const mappedStatus: Status = STATUS_OPTIONS.includes(status) ? status : 'Present';
            return { ...s, status: mappedStatus, reason: map[s.id].reason || '' };
          }
          return s;
        });
        setStudents(updated);
        if (data.records.length > 0) message.info(`Loaded ${data.records.length} existing records`);
      }
    } catch { /* silent */ }
  };

  const handleStatusChange = (id: number, status: Status) => {
    setStudents(prev => prev.map(s =>
      s.id === id ? { ...s, status, reason: status === 'Present' ? '' : s.reason } : s
    ));
  };

  const handleReasonChange = (id: number, reason: string) => {
    setStudents(prev => prev.map(s => (s.id === id ? { ...s, reason } : s)));
  };

  const handleBulkStatus = (status: Status) => {
    setStudents(prev => prev.map(s => ({ ...s, status, reason: status === 'Present' ? '' : s.reason })));
    message.info(`All students set to ${status}`);
  };

  const handleLockAttendance = async () => {
    if (!selectedClassName || !attendanceDate) { message.warning('Select class and date'); return; }
    try {
      const result = await attendanceApi.lockStudentAttendance({ className: selectedClassName, attendanceDate });
      message.success(`Locked ${result?.locked?.length || 0} records`);
      await loadStudentsForClass(selectedClassName);
    } catch (err: any) { message.error(err.message || 'Failed to lock'); }
  };

  const handleUnlockAttendance = async () => {
    if (!selectedClassName || !attendanceDate) { message.warning('Select class and date'); return; }
    try {
      const result = await attendanceApi.unlockStudentAttendance({ className: selectedClassName, attendanceDate });
      message.success(`Unlocked ${result?.unlocked?.length || 0} records`);
      await loadStudentsForClass(selectedClassName);
    } catch (err: any) { message.error(err.message || 'Failed to unlock'); }
  };

  const saveAttendance = async () => {
    if (!selectedClassName) { message.warning('Select a class'); return; }
    if (students.length === 0) { message.warning('No students'); return; }
    const records = students.map(s => ({ studentId: s.id, status: s.status, reason: s.reason || undefined }));
    setSubmitting(true);
    try {
      await attendanceApi.markClassAttendance({ className: selectedClassName, attendanceDate, records });
      message.success(`✅ Saved ${records.length} records for ${dayjs(attendanceDate).format('DD/MM/YYYY')}`);
      await loadStudentsForClass(selectedClassName);
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || 'Failed to save');
    } finally { setSubmitting(false); }
  };

  const filteredStudents = students.filter(s => s.name.toLowerCase().includes(searchText.toLowerCase()));
  const presentCount = students.filter(s => s.status === 'Present').length;
  const absentCount = students.filter(s => s.status === 'Absent').length;
  const excusedCount = students.filter(s => s.status === 'Excused').length;

  if (loading && !students.length) {
    return <div className="flex justify-center items-center min-h-[60vh]"><Spin size="large" tip="Loading..." /></div>;
  }

  return (
    <div className="p-3 sm:p-6 w-full max-w-7xl mx-auto">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div>
          <Title level={3} className="!mb-0 !text-lg sm:!text-2xl">👨‍🎓 Student Attendance</Title>
          <Text type="secondary" className="text-xs sm:text-sm">Mark attendance for students in any class</Text>
        </div>
        <Button icon={<ReloadOutlined spin={loading} />} onClick={() => loadStudentsForClass(selectedClassName)} disabled={submitting}>
          Refresh
        </Button>
      </div>

      {error && <Alert message={error} type="error" showIcon className="mb-4" closable onClose={() => setError(null)} />}

      <Card className="mb-6 shadow-sm w-full">
        <Row gutter={[12, 12]} align="bottom">
          <Col xs={24} sm={12} md={8}>
            <label className="block text-sm font-medium text-gray-700 mb-1">📚 Class</label>
            <Select
              placeholder="Select class"
              className="w-full"
              value={selectedClassId}
              onChange={(val) => {
                const cls = classes.find(c => c.id === val);
                setSelectedClassId(val);
                setSelectedClassName(cls?.name || '');
              }}
              showSearch
              optionFilterProp="children"
              disabled={submitting}
            >
              {classes.map(cls => <Option key={cls.id} value={cls.id}>{cls.name}</Option>)}
            </Select>
          </Col>
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
          <Col xs={24} sm={24} md={8}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">Bulk:</span>
              {STATUS_OPTIONS.map(status => (
                <Button
                  key={status}
                  size="small"
                  style={{ backgroundColor: STATUS_COLORS[status], color: '#fff', border: 'none' }}
                  onClick={() => handleBulkStatus(status)}
                  disabled={submitting}
                  className="flex-1 sm:flex-none"
                >
                  {status}
                </Button>
              ))}
            </div>
          </Col>
        </Row>
        <Row gutter={[12, 12]} className="mt-3">
          <Col xs={24} sm={12} md={6}>
            <Button danger icon={<LockOutlined />} onClick={handleLockAttendance} disabled={submitting || students.length === 0} block>
              Lock Attendance
            </Button>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Button icon={<UnlockOutlined />} onClick={handleUnlockAttendance} disabled={submitting || students.length === 0} block>
              Unlock Attendance
            </Button>
          </Col>
        </Row>
      </Card>

      {students.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Input
            placeholder="🔍 Search student"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="w-full sm:w-48"
            allowClear
            disabled={submitting}
          />
        </div>
      )}

      {selectedClassId && students.length > 0 ? (
        <Card className="shadow-sm w-full">
          <div className="mb-3 flex flex-wrap justify-between items-center gap-2">
            <span className="font-medium text-base">
              {selectedClassName} – {dayjs(attendanceDate).format('DD/MM/YYYY')}
              <Badge count={students.length} className="ml-2" />
            </span>
            <Space size="middle" wrap>
              <Badge color="green" text={`✅ Present ${presentCount}`} />
              <Badge color="red" text={`❌ Absent ${absentCount}`} />
              <Badge color="blue" text={`⏳ Excused ${excusedCount}`} />
            </Space>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <Table
              dataSource={filteredStudents}
              rowKey="id"
              pagination={false}
              size="middle"
              columns={[
                { title: 'Student', dataIndex: 'name', key: 'name', render: name => <strong>{name}</strong>, width: '20%' },
                {
                  title: 'Status', dataIndex: 'status', key: 'status', width: '40%',
                  render: (status: Status, record) => (
                    <Radio.Group value={status} onChange={e => handleStatusChange(record.id, e.target.value)} size="small" buttonStyle="solid" disabled={submitting}>
                      {STATUS_OPTIONS.map(s => (
                        <Radio.Button key={s} value={s} style={{
                          backgroundColor: status === s ? STATUS_COLORS[s] : undefined,
                          color: status === s ? '#fff' : undefined,
                          borderColor: status === s ? STATUS_COLORS[s] : undefined,
                        }}>{s}</Radio.Button>
                      ))}
                    </Radio.Group>
                  ),
                },
                {
                  title: 'Reason', dataIndex: 'reason', key: 'reason', width: '40%',
                  render: (reason, record) => (
                    <Input
                      placeholder="Reason (if not Present)"
                      value={reason}
                      onChange={e => handleReasonChange(record.id, e.target.value)}
                      disabled={record.status === 'Present' || submitting}
                      className="w-full"
                      size="small"
                    />
                  ),
                },
              ]}
            />
          </div>

          <div className="block md:hidden">
            <List
              dataSource={filteredStudents}
              className="divide-y divide-gray-200"
              renderItem={(student) => (
                <List.Item className="py-4 px-1">
                  <div className="w-full">
                    <div className="flex justify-between items-center mb-2">
                      <strong className="text-base">{student.name}</strong>
                      <Badge color={STATUS_COLORS[student.status]} text={STATUS_LABELS[student.status]} />
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {STATUS_OPTIONS.map(s => {
                        const isActive = student.status === s;
                        return (
                          <Button key={s} size="small" type={isActive ? 'primary' : 'default'}
                            onClick={() => handleStatusChange(student.id, s)} disabled={submitting}
                            style={isActive ? { backgroundColor: STATUS_COLORS[s], color: '#fff', borderColor: STATUS_COLORS[s] } : {}}>
                            {s}
                          </Button>
                        );
                      })}
                    </div>
                    {student.status !== 'Present' && (
                      <Input
                        placeholder="Reason for absence"
                        value={student.reason}
                        onChange={e => handleReasonChange(student.id, e.target.value)}
                        className="mt-1"
                        size="small"
                        disabled={submitting}
                      />
                    )}
                  </div>
                </List.Item>
              )}
            />
          </div>

          <div className="mt-6 border-t pt-4">
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={saveAttendance}
              loading={submitting}
              disabled={submitting || students.length === 0}
              block
              size="large"
            >
              {submitting ? 'Saving...' : '💾 Save Attendance'}
            </Button>
          </div>
        </Card>
      ) : selectedClassId ? (
        <Empty description="No students in this class" />
      ) : (
        <div className="text-center py-12 text-gray-500">Select a class to load students</div>
      )}
    </div>
  );
};
export default AdminStudentAttendance;