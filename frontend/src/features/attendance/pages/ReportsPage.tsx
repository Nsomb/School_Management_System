import React, { useState, useEffect, useRef } from 'react';
import {
  Card, Table, Button, Select, Tag, Row, Col, Spin, Alert, Typography,
  Space, Badge, Input, message, DatePicker,
} from 'antd';
import { SearchOutlined, PrinterOutlined, FilePdfOutlined } from '@ant-design/icons';
import { attendanceApi } from '../api/attendanceApi';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

export const ReportsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [reportType, setReportType] = useState<'class' | 'student' | 'teacher'>('class');
  const [className, setClassName] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>(dayjs().format('YYYY-MM'));
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    setLoadingClasses(true);
    try {
      const classNames = await attendanceApi.getClasses();
      setClasses(classNames.map((name: string) => ({ id: name, name })));
    } catch (err) {
      console.error('Error loading classes:', err);
      message.error('Failed to load classes');
    } finally {
      setLoadingClasses(false);
    }
  };

  const getDateRange = () => {
    const m = dayjs(selectedMonth);
    return {
      dateFrom: m.startOf('month').format('YYYY-MM-DD'),
      dateTo: m.endOf('month').format('YYYY-MM-DD'),
    };
  };

  const handlePrint = () => {
    if (printRef.current) {
      const printContents = printRef.current.innerHTML;
      const originalContents = document.body.innerHTML;
      document.body.innerHTML = printContents;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload();
    }
  };

  const handlePdfExport = async () => {
    if (data.length === 0) {
      message.warning('Generate a report first');
      return;
    }
    setExportingPdf(true);
    try {
      const { dateFrom, dateTo } = getDateRange();
      const blob = await attendanceApi.exportReportPdf({
        reportType,
        className,
        dateFrom,
        dateTo,
      });
      if (!blob) {
        message.error('Failed to generate PDF');
        return;
      }
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `attendance-${reportType}-${selectedMonth}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      message.success('PDF downloaded');
    } catch (err: any) {
      message.error(err.message || 'Failed to generate PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  const getRecords = (result: any): any[] => {
    if (!result) return [];
    if (Array.isArray(result.records)) return result.records;
    if (result.attendances) {
      if (Array.isArray(result.attendances)) return result.attendances;
      if (Array.isArray(result.attendances.records)) return result.attendances.records;
      if (Array.isArray(result.attendances.data)) return result.attendances.data;
    }
    for (const key of ['data', 'items', 'list', 'rows']) {
      if (Array.isArray(result[key])) return result[key];
    }
    return [];
  };

  const generateReport = async () => {
    if (!selectedMonth) {
      message.warning('Please select a month');
      return;
    }
    if (reportType !== 'teacher' && !className) {
      message.warning('Please select a class');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { dateFrom, dateTo } = getDateRange();
      let result;
      let freshData: any[] = [];

      if (reportType === 'class' || reportType === 'student') {
        const params: any = { className, dateFrom, dateTo };
        result = await attendanceApi.getStudentAttendances(params);
        const records = getRecords(result);

        if (reportType === 'class') {
          const map: Record<number, any> = {};
          records.forEach((r: any) => {
            if (!map[r.student_id]) {
              map[r.student_id] = {
                student_id: r.student_id,
                student_name: r.student_name,
                present: 0,
                absent: 0,
                excused: 0,
                total: 0,
              };
            }
            const statusKey = (r.status || '').toLowerCase();
            if (statusKey === 'present') map[r.student_id].present += 1;
            else if (statusKey === 'absent') map[r.student_id].absent += 1;
            else if (statusKey === 'excused') map[r.student_id].excused += 1;
            map[r.student_id].total += 1;
          });
          freshData = Object.values(map);
        } else {
          freshData = records;
        }
      } else {
        const params = { dateFrom, dateTo };
        result = await attendanceApi.getTeacherAttendances(params);
        freshData = getRecords(result);
      }

      setData(freshData);
      if (freshData.length === 0) {
        message.info('No data found for the selected criteria');
      } else {
        message.success(`Found ${freshData.length} records`);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to generate report';
      setError(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter((item) =>
    (item.student_name || item.teacher_name || '').toLowerCase().includes(searchText.toLowerCase())
  );

  let columns: any[] = [];
  if (reportType === 'class') {
    columns = [
      { title: 'Student', dataIndex: 'student_name', key: 'student_name' },
      { title: 'Present', dataIndex: 'present', key: 'present' },
      { title: 'Absent', dataIndex: 'absent', key: 'absent' },
      { title: 'Excused', dataIndex: 'excused', key: 'excused' },
      {
        title: 'Attendance %',
        key: 'percent',
        render: (_: any, record: any) => {
          const total = record.total || 0;
          const present = record.present || 0;
          return total ? ((present / total) * 100).toFixed(1) + '%' : '0%';
        },
      },
    ];
  } else if (reportType === 'student') {
    columns = [
      { title: 'Student', dataIndex: 'student_name', key: 'student_name' },
      { title: 'Class', dataIndex: 'class_name', key: 'class_name' },
      { title: 'Date', dataIndex: 'attendance_date', key: 'attendance_date', render: (d: string) => (d ? dayjs(d).format('DD/MM/YYYY') : 'N/A') },
      { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'Present' ? 'green' : 'red'}>{s}</Tag> },
      { title: 'Reason', dataIndex: 'reason', key: 'reason', render: (r: string) => r || '-' },
    ];
  } else {
    columns = [
      { title: 'Teacher', dataIndex: 'teacher_name', key: 'teacher_name' },
      { title: 'Date', dataIndex: 'attendance_date', key: 'attendance_date', render: (d: string) => (d ? dayjs(d).format('DD/MM/YYYY') : 'N/A') },
      { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'Present' ? 'green' : 'red'}>{s}</Tag> },
      { title: 'Reason', dataIndex: 'reason', key: 'reason', render: (r: string) => r || '-' },
    ];
  }

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <Title level={2} className="!mb-1 !text-xl sm:!text-2xl">📊 Reports</Title>
          <Text type="secondary">Generate monthly attendance reports</Text>
        </div>
        <Space className="w-full sm:w-auto justify-end">
          <Button icon={<PrinterOutlined />} onClick={handlePrint} disabled={data.length === 0}>
            Print
          </Button>
          <Button icon={<FilePdfOutlined />} onClick={handlePdfExport} loading={exportingPdf} disabled={data.length === 0}>
            PDF
          </Button>
        </Space>
      </div>

      {error && <Alert message={error} type="error" showIcon className="mb-4" closable onClose={() => setError(null)} />}

      <Card className="mb-6 shadow-sm">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
            <Select className="w-full" value={reportType} onChange={(v) => setReportType(v as any)}>
              <Option value="class">Class Summary</Option>
              <Option value="student">Student Details</Option>
              <Option value="teacher">Teacher Details</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class Name</label>
            <Select
              placeholder="Select class"
              className="w-full"
              value={className}
              onChange={setClassName}
              loading={loadingClasses}
              showSearch
              optionFilterProp="children"
              disabled={reportType === 'teacher'}
            >
              {classes.map((cls) => (
                <Option key={cls.id} value={cls.name}>{cls.name}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <DatePicker
              picker="month"
              className="w-full"
              value={selectedMonth ? dayjs(selectedMonth) : null}
              onChange={(date) => setSelectedMonth(date ? date.format('YYYY-MM') : '')}
              allowClear={false}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
            <div className="px-3 py-2 border border-gray-200 rounded text-sm text-gray-600 bg-gray-50">
              {dayjs(selectedMonth).startOf('month').format('DD/MM/YYYY')}
              {' – '}
              {dayjs(selectedMonth).endOf('month').format('DD/MM/YYYY')}
            </div>
          </Col>
          <Col xs={24}>
            <Button type="primary" icon={<SearchOutlined />} onClick={generateReport} loading={loading} block size="large">
              Generate Report
            </Button>
          </Col>
        </Row>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12"><Spin size="large" /></div>
      ) : data.length > 0 ? (
        <div ref={printRef}>
          <Card className="shadow-sm overflow-hidden">
            <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Text strong className="text-sm sm:text-base">
                  {reportType === 'class' ? 'Class Summary' : reportType === 'student' ? 'Student Details' : 'Teacher Details'}
                  {className && ` - ${className}`} — {dayjs(selectedMonth).format('MMMM YYYY')}
                </Text>
                <Badge count={data.length} showZero />
              </div>
              <Input
                placeholder="Search..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full sm:w-48"
                allowClear
              />
            </div>
            <Table
              dataSource={filteredData}
              rowKey={(r, i) => r.id || i}
              columns={columns}
              pagination={{ pageSize: 20, showSizeChanger: true }}
              scroll={{ x: 'max-content' }}
            />
          </Card>
        </div>
      ) : (
        <div className="text-center text-gray-500 py-12">
          No data found. Select a month and click <strong>Generate Report</strong>.
        </div>
      )}
    </div>
  );
};

export default ReportsPage;