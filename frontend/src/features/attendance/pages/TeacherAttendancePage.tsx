import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Select,
  message,
  Alert,
  Modal,
  Spin,
  Empty,
  Typography,
  Row,
  Col,
  Divider,
  Tag,
} from 'antd';
import dayjs from 'dayjs';
import { useAuth } from '../../../context/AuthContext';
import { useMarks } from '../../marks/hooks/useMarks';
import { attendanceApi } from '../api/attendanceApi';

const { Title, Text } = Typography;
const { Option } = Select;

type Status = 'Present' | 'Absent' | 'Late' | 'Excused';

const STATUS_COLORS: Record<Status, string> = {
  Present: '#52c41a',
  Absent: '#ff4d4f',
  Late: '#faad14',
  Excused: '#1890ff',
};

const STATUS_OPTIONS: Status[] = ['Present', 'Absent', 'Late', 'Excused'];

export const TeacherAttendancePage: React.FC = () => {
  const { user } = useAuth();
  const { getTeacherSubjects, getStudentsByClass } = useMarks();

  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<Record<string, Status>>({});
  const [reasonData, setReasonData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState({ subjects: false, students: false, submit: false });
  const [error, setError] = useState<string | null>(null);
  const [hasExistingAttendance, setHasExistingAttendance] = useState(false);

  useEffect(() => {
    loadSubjects();
  }, []);

  useEffect(() => {
    if (selectedSubjectId) {
      const subject = subjects.find((s) => s.id === selectedSubjectId);
      if (subject && subject.classes) {
        setClasses(subject.classes);
        setSelectedClass(null);
        setStudents([]);
        setAttendanceData({});
        setReasonData({});
        setHasExistingAttendance(false);
      }
    }
  }, [selectedSubjectId, subjects]);

  useEffect(() => {
    if (selectedClass && selectedDate) {
      loadStudents();
      checkExistingAttendance();
    }
  }, [selectedClass, selectedDate]);

  const loadSubjects = async () => {
    setLoading((prev) => ({ ...prev, subjects: true }));
    try {
      const data = await getTeacherSubjects();
      setSubjects(data);
      if (data && data.length > 0) {
        setSelectedSubjectId(data[0].id);
        if (data[0].classes && data[0].classes.length > 0) {
          setClasses(data[0].classes);
          setSelectedClass(data[0].classes[0]);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load subjects');
      message.error('Failed to load your assigned subjects');
    } finally {
      setLoading((prev) => ({ ...prev, subjects: false }));
    }
  };

  const loadStudents = async () => {
    if (!selectedClass) return;
    setLoading((prev) => ({ ...prev, students: true }));
    try {
      const studentsData = await getStudentsByClass(selectedClass.id);
      setStudents(studentsData);
      const initial: Record<string, Status> = {};
      const reasons: Record<string, string> = {};
      studentsData.forEach((s: any) => {
        initial[String(s.id)] = 'Present';
        reasons[String(s.id)] = '';
      });
      setAttendanceData(initial);
      setReasonData(reasons);
    } catch (err: any) {
      setError(err.message || 'Failed to load students');
      message.error('Failed to load students');
      setStudents([]);
    } finally {
      setLoading((prev) => ({ ...prev, students: false }));
    }
  };

  const checkExistingAttendance = async () => {
    if (!selectedClass || !selectedDate) return;
    try {
      const data = await attendanceApi.getTeacherStudentAttendances({
        className: selectedClass.name,
        dateFrom: selectedDate,
        dateTo: selectedDate,
      });
      if (data && data.records && data.records.length > 0) {
        setHasExistingAttendance(true);
        const existingData: Record<string, Status> = {};
        const existingReasons: Record<string, string> = {};
        data.records.forEach((r: any) => {
          const id = String(r.student_id);
          const status = STATUS_OPTIONS.includes(r.status) ? r.status : 'Present';
          existingData[id] = status;
          existingReasons[id] = r.reason || '';
        });
        const studentIds = students.map((s) => String(s.id));
        if (Object.keys(existingData).some((id) => studentIds.includes(id))) {
          setAttendanceData(existingData);
          setReasonData(existingReasons);
        }
      } else {
        setHasExistingAttendance(false);
      }
    } catch (err) {
      // ignore error
    }
  };

  const handleStatusChange = (studentId: string, status: Status) => {
    setAttendanceData((prev) => ({ ...prev, [studentId]: status }));
    if (status === 'Present') {
      setReasonData((prev) => ({ ...prev, [studentId]: '' }));
    }
  };

  const handleReasonChange = (studentId: string, reason: string) => {
    setReasonData((prev) => ({ ...prev, [studentId]: reason }));
  };

  const handleBulkStatus = (status: Status) => {
    const newData: Record<string, Status> = {};
    students.forEach((s) => {
      newData[String(s.id)] = status;
    });
    setAttendanceData(newData);
    if (status === 'Present') setReasonData({});
    message.success(`All students set to ${status}`);
  };

  const submitAttendance = async () => {
    const records = students.map((s) => {
      const id = String(s.id);
      return {
        studentId: Number(id),
        status: attendanceData[id] || 'Present',
        reason: attendanceData[id] !== 'Present' ? reasonData[id] || undefined : undefined,
      };
    });
    setLoading((prev) => ({ ...prev, submit: true }));
    try {
      await attendanceApi.markTeacherClassAttendance({
        className: selectedClass.name,
        attendanceDate: selectedDate,
        records,
      });
      message.success(`Attendance saved for ${records.length} students`);
      setHasExistingAttendance(true);
      await loadStudents();
      await checkExistingAttendance();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
      message.error(err.message || 'Failed to save');
    } finally {
      setLoading((prev) => ({ ...prev, submit: false }));
    }
  };

  const handleSave = async () => {
    if (!selectedClass || !selectedDate) {
      message.warning('Please select subject, class, and date');
      return;
    }
    if (hasExistingAttendance) {
      Modal.confirm({
        title: 'Attendance Already Exists',
        content: `Attendance exists for ${selectedClass.name} on ${dayjs(selectedDate).format('DD/MM/YYYY')}. Overwrite?`,
        okText: 'Overwrite',
        cancelText: 'Cancel',
        onOk: submitAttendance,
      });
      return;
    }
    submitAttendance();
  };

  const getStatusStats = () => {
    const stats: Record<string, number> = { Present: 0, Absent: 0, Late: 0, Excused: 0 };
    Object.values(attendanceData).forEach((status) => {
      stats[status] = (stats[status] || 0) + 1;
    });
    return stats;
  };

  const stats = getStatusStats();

  if (loading.subjects) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <div className="p-8 text-center">
        <Empty description="No subjects assigned" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-0 sm:p-3 md:p-6">
      <Card
        className="shadow-none md:shadow-sm border-0 md:border rounded-none md:rounded-lg"
        bodyStyle={{ padding: '12px' }}
      >
        <div className="mb-3 px-1">
          <Title level={3} className="!mb-0 text-lg md:text-2xl">Take Attendance</Title>
          <Text type="secondary" className="text-xs md:text-sm">Mark student attendance for your class</Text>
        </div>

        {error && <Alert message={error} type="error" showIcon className="mb-3" closable onClose={() => setError(null)} />}
        {hasExistingAttendance && (
          <Alert
            message="Attendance Already Recorded"
            description={`${selectedClass?.name} on ${dayjs(selectedDate).format('DD/MM/YYYY')}`}
            type="warning"
            showIcon
            className="mb-3"
          />
        )}

        <Row gutter={[8, 8]} className="mb-4">
          <Col xs={24} sm={8}>
            <label className="block text-xs font-medium text-gray-700 mb-1">Subject</label>
            <Select
              placeholder="Select subject"
              className="w-full"
              size="large"
              value={selectedSubjectId || undefined}
              onChange={setSelectedSubjectId}
              loading={loading.subjects}
            >
              {subjects.map((s) => (
                <Option key={s.id} value={s.id}>{s.name}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={8}>
            <label className="block text-xs font-medium text-gray-700 mb-1">Class</label>
            <Select
              placeholder="Select class"
              className="w-full"
              size="large"
              value={selectedClass?.id || undefined}
              onChange={(val) => setSelectedClass(classes.find((c) => c.id === val))}
              disabled={!selectedSubjectId || classes.length === 0}
            >
              {classes.map((c) => (
                <Option key={c.id} value={c.id}>{c.name}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={8}>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </Col>
        </Row>

        {loading.students ? (
          <div className="py-8 text-center"><Spin size="large" /></div>
        ) : selectedClass && students.length > 0 ? (
          <>
            <div className="mb-4 bg-gray-50 p-2 sm:p-3 rounded-lg border border-gray-200">
              <span className="block text-xs font-semibold text-gray-600 mb-1.5">Set All To:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {STATUS_OPTIONS.map((s) => (
                  <Button
                    key={s}
                    size="middle"
                    style={{ backgroundColor: STATUS_COLORS[s], color: '#fff', border: 'none' }}
                    onClick={() => handleBulkStatus(s)}
                    block
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {students.map((s, idx) => {
                    const id = String(s.id);
                    const status = attendanceData[id] || 'Present';
                    const reason = reasonData[id] || '';
                    return (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-2 text-sm font-medium">{s.full_name}</td>
                        <td className="px-4 py-2 text-center">
                          <div className="flex justify-center gap-1">
                            {STATUS_OPTIONS.map((opt) => {
                              const isActive = status === opt;
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => handleStatusChange(id, opt)}
                                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                                    isActive ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                                  style={isActive ? { backgroundColor: STATUS_COLORS[opt] } : {}}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          {status !== 'Present' ? (
                            <input
                              type="text"
                              value={reason}
                              onChange={(e) => handleReasonChange(id, e.target.value)}
                              placeholder="Reason..."
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
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

            {/* Mobile View: Full-Width Card-Free List */}
            <div className="block md:hidden space-y-2">
              {students.map((s, idx) => {
                const id = String(s.id);
                const status = attendanceData[id] || 'Present';
                const reason = reasonData[id] || '';
                return (
                  <div key={s.id} className="p-2.5 border-b border-gray-200 bg-white space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-sm text-gray-800">{idx + 1}. {s.full_name}</span>
                      <span className="text-xs px-2 py-0.5 rounded text-white font-medium" style={{ backgroundColor: STATUS_COLORS[status] }}>
                        {status}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {STATUS_OPTIONS.map((opt) => {
                        const isActive = status === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleStatusChange(id, opt)}
                            className={`py-1.5 rounded text-xs font-medium ${
                              isActive ? 'text-white font-bold' : 'bg-gray-100 text-gray-700 border border-gray-200'
                            }`}
                            style={isActive ? { backgroundColor: STATUS_COLORS[opt] } : {}}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    {status !== 'Present' && (
                      <input
                        type="text"
                        value={reason}
                        onChange={(e) => handleReasonChange(id, e.target.value)}
                        placeholder="Reason for absence/tardiness..."
                        className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 bg-white"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <Divider className="my-3" />

            <div className="flex flex-wrap gap-1.5 mb-4">
              {Object.entries(stats).map(([status, count]) => (
                <Tag key={status} color={STATUS_COLORS[status as Status] || 'default'} className="text-xs py-0.5 px-2">
                  {status}: {count}
                </Tag>
              ))}
            </div>

            <div className="sticky bottom-0 bg-white pt-2 pb-2 z-10 border-t border-gray-100">
              <Button
                type="primary"
                onClick={handleSave}
                loading={loading.submit}
                size="large"
                block
                disabled={!selectedClass || students.length === 0}
              >
                {loading.submit ? 'Saving...' : hasExistingAttendance ? 'Update Attendance' : 'Save Attendance'}
              </Button>
            </div>
          </>
        ) : selectedClass ? (
          <Empty description="No students in this class" />
        ) : (
          <div className="text-center py-8 text-gray-500 text-sm">
            Select a subject and class to start
          </div>
        )}
      </Card>
    </div>
  );
};

export default TeacherAttendancePage;