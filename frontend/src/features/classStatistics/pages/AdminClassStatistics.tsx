// src/features/classStatistics/pages/AdminClassStatistics.tsx
import React, { useState, useEffect } from 'react';
import {
  Card,
  Select,
  Spin,
  Empty,
  Typography,
  Row,
  Col,
  Statistic,
  Tag,
  Button,
  Alert,
  Space,
  Tooltip,
  Progress
} from 'antd';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  BookOutlined,
  TrophyOutlined,
  UserOutlined,
  PercentageOutlined,
  DownloadOutlined,
  ReloadOutlined,
  TeamOutlined,
  AppstoreOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { useClassStatistics } from '../hooks/useClassStatistics';
import type { SubjectStat, StatisticsMetadata } from '../hooks/useClassStatistics';
import { classStatisticsApi } from '../api/classStatisticsApi';
import { toast } from 'react-toastify';

const { Title, Text } = Typography;
const { Option } = Select;

const TERMS = [
  { value: 'Term 1', label: 'Term 1 (Evals 1 & 2)' },
  { value: 'Term 2', label: 'Term 2 (Evals 3 & 4)' },
  { value: 'Term 3', label: 'Term 3 (Evals 5 & 6)' },
  { value: 'Year-End', label: 'Year-End (All Terms)' },
];

const COLORS = {
  excellent: '#10B981',
  satisfactory: '#F59E0B',
  needsAttention: '#EF4444',
  primary: '#3B82F6',
  secondary: '#8B5CF6',
};

export const AdminClassStatistics: React.FC = () => {
  const {
    loading,
    error,
    statistics,
    metadata,
    hasData,
    clearError,
    fetchAdminStatistics,
    downloadAdminPDF,
  } = useClassStatistics();

  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [selectedTerm, setSelectedTerm] = useState<string>('Term 1');
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [loadingOptions, setLoadingOptions] = useState(true);

  useEffect(() => {
    loadClasses();
    loadAcademicYears();
  }, []);

  useEffect(() => {
    if (selectedClass && selectedTerm && selectedYear) {
      loadStatistics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass, selectedTerm, selectedYear]);

  const loadClasses = async () => {
    try {
      const classesData = await classStatisticsApi.getClasses();
      setClasses(classesData);
      if (classesData.length > 0) {
        setSelectedClass(classesData[0]);
      }
    } catch (err) {
      toast.error('Failed to load classes');
    } finally {
      setLoadingOptions(false);
    }
  };

  const loadAcademicYears = async () => {
    try {
      const years = await classStatisticsApi.getAcademicYears();
      const resolved = years.length > 0 ? years : ['2024-2025', '2025-2026'];
      setAvailableYears(resolved);
      setSelectedYear(resolved[0] || '2025-2026');
    } catch (err) {
      setAvailableYears(['2024-2025', '2025-2026']);
      setSelectedYear('2025-2026');
    }
  };

  const loadStatistics = async () => {
    if (!selectedClass) return;
    await fetchAdminStatistics(
      selectedClass.name || selectedClass.class_name,
      selectedTerm,
      selectedYear
    );
  };

  const handleDownloadPDF = async () => {
    if (!selectedClass || !metadata) return;
    await downloadAdminPDF(
      selectedClass.name || selectedClass.class_name,
      selectedTerm,
      selectedYear
    );
  };

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 70) return 'text-green-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceTag = (percentage: number) => {
    if (percentage >= 70) return <Tag color="success">Excellent</Tag>;
    if (percentage >= 50) return <Tag color="warning">Satisfactory</Tag>;
    return <Tag color="error">Needs Attention</Tag>;
  };

  const getPerformanceIcon = (percentage: number) => {
    if (percentage >= 70) return <CheckCircleOutlined className="text-green-600" />;
    if (percentage >= 50) return <WarningOutlined className="text-yellow-600" />;
    return <CloseCircleOutlined className="text-red-600" />;
  };

  const getOverallStatus = () => {
    if (!statistics.length) return { status: 'No Data', color: 'default' };
    const avg =
      statistics.reduce((sum, s) => sum + parseFloat(s.performance_percentage), 0) /
      statistics.length;
    if (avg >= 70) return { status: 'Excellent Performance', color: 'success' };
    if (avg >= 50) return { status: 'Satisfactory Performance', color: 'warning' };
    return { status: 'Needs Improvement', color: 'error' };
  };

  if (loadingOptions || (loading && !statistics.length && !hasData)) {
    return (
      <div className="flex justify-center items-center h-96">
        <Spin size="large" tip="Loading statistics..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Alert
          message="Error Loading Statistics"
          description={error}
          type="error"
          showIcon
          closable
          onClose={clearError}
        />
        <div className="mt-4 flex gap-3">
          <Button onClick={loadStatistics} icon={<ReloadOutlined />} type="primary">
            Retry
          </Button>
          <Button onClick={clearError}>Dismiss</Button>
        </div>
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <Empty description="No classes available" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        <p className="text-gray-500 mt-2">No classes have been created yet.</p>
      </div>
    );
  }

  const chartData = statistics.map((item: SubjectStat) => ({
    name: item.subject_name,
    average: parseFloat(item.class_average_mark),
    performance: parseFloat(item.performance_percentage),
  }));

  const distributionData = [
    { name: 'Excellent (≥70%)', value: chartData.filter((d) => d.performance >= 70).length },
    {
      name: 'Satisfactory (50-69%)',
      value: chartData.filter((d) => d.performance >= 50 && d.performance < 70).length,
    },
    { name: 'Needs Attention (<50%)', value: chartData.filter((d) => d.performance < 50).length },
  ].filter((item) => item.value > 0);

  const PIE_COLORS = [COLORS.excellent, COLORS.satisfactory, COLORS.needsAttention];
  const overallStatus = getOverallStatus();
  const overallPerformance =
    chartData.reduce((sum, d) => sum + d.performance, 0) / (chartData.length || 1);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <Title level={2} className="!mb-1 flex items-center gap-2">
            Class Statistics - Admin
            {selectedClass && (
              <Tag color="blue" className="ml-2">
                {selectedClass.name || selectedClass.class_name}
              </Tag>
            )}
            {hasData && (
              <Tag
                color={
                  overallStatus.color === 'success'
                    ? 'success'
                    : overallStatus.color === 'warning'
                    ? 'warning'
                    : 'error'
                }
              >
                {overallStatus.status}
              </Tag>
            )}
            {selectedTerm === 'Year-End' && (
              <Tag color="gold" className="ml-1">
                Final Year
              </Tag>
            )}
          </Title>
          <Text type="secondary">
            View performance statistics for all classes across the school
          </Text>
        </div>
        <div className="mt-3 md:mt-0 flex gap-2 flex-wrap">
          <Tooltip title={hasData ? 'Download PDF report' : 'No data to download'}>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleDownloadPDF}
              disabled={!hasData || loading}
              loading={loading}
            >
              Download PDF
            </Button>
          </Tooltip>
          <Button
            icon={<ReloadOutlined spin={loading} />}
            onClick={loadStatistics}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      <Card className="mb-6 shadow-sm">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={6}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <TeamOutlined className="mr-1" /> Class
            </label>
            <Select
              placeholder="Select class"
              className="w-full"
              value={selectedClass?.id}
              onChange={(value) => {
                const cls = classes.find((c) => c.id === value);
                setSelectedClass(cls);
              }}
              size="large"
            >
              {classes.map((cls) => (
                <Option key={cls.id} value={cls.id}>
                  {cls.name || cls.class_name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} md={6}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <AppstoreOutlined className="mr-1" /> Term
            </label>
            <Select
              placeholder="Select term"
              className="w-full"
              value={selectedTerm}
              onChange={setSelectedTerm}
              size="large"
            >
              {TERMS.map((term) => (
                <Option key={term.value} value={term.value}>
                  {term.label}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} md={6}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <CalendarOutlined className="mr-1" /> Academic Year
            </label>
            <Select
              placeholder="Select year"
              className="w-full"
              value={selectedYear}
              onChange={setSelectedYear}
              size="large"
            >
              {availableYears.map((year) => (
                <Option key={year} value={year}>
                  {year}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} md={6}>
            <div className="flex items-end h-full">
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={loadStatistics}
                className="w-full"
                loading={loading}
              >
                Load Data
              </Button>
            </div>
          </Col>
        </Row>
      </Card>

      {hasData ? (
        <>
          <Row gutter={[16, 16]} className="mb-6">
            <Col xs={12} sm={6}>
              <Card className="shadow-sm">
                <Statistic
                  title="Total Students"
                  value={metadata?.total_students || 0}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: COLORS.primary }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card className="shadow-sm">
                <Statistic
                  title="Subjects"
                  value={metadata?.total_subjects || 0}
                  prefix={<AppstoreOutlined />}
                  valueStyle={{ color: COLORS.secondary }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card className="shadow-sm">
                <Statistic
                  title="Total Marks"
                  value={metadata?.total_marks_found || 0}
                  prefix={<TrophyOutlined />}
                  valueStyle={{ color: '#F59E0B' }}
                />
                <Text type="secondary" className="text-xs">
                  {metadata?.relevant_marks} relevant for this term
                </Text>
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card className="shadow-sm">
                <Statistic
                  title="Overall Performance"
                  value={overallPerformance}
                  precision={1}
                  suffix="%"
                  prefix={getPerformanceIcon(overallPerformance)}
                  valueStyle={{
                    color:
                      overallPerformance >= 70
                        ? '#10B981'
                        : overallPerformance >= 50
                        ? '#F59E0B'
                        : '#EF4444',
                  }}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} className="mb-6">
            <Col xs={24} lg={16}>
              <Card className="shadow-sm" title="Subject Performance Overview">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis
                      domain={[0, 20]}
                      label={{ value: 'Score / 20', angle: -90, position: 'insideLeft' }}
                    />
                    <RechartsTooltip
                      formatter={(value: any) => [`${value.toFixed(2)} / 20`, 'Average Score']}
                    />
                    <Legend />
                    <Bar dataKey="average" fill={COLORS.primary} name="Average Score (/20)" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card className="shadow-sm" title="Performance Distribution">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={distributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {distributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>

          <Card className="shadow-sm" title="Detailed Subject Statistics">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">#</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Subject</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Average</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Performance</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Students Evaluated</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {statistics.map((item: SubjectStat, index: number) => {
                    const perf = parseFloat(item.performance_percentage);
                    return (
                      <tr key={item.subject_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-400">{index + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">
                          <Space>
                            {getPerformanceIcon(perf)}
                            {item.subject_name}
                          </Space>
                        </td>
                        <td className="px-4 py-3 text-center text-sm">
                          <span className={`font-semibold ${getPerformanceColor(perf)}`}>
                            {item.class_average_mark}/20
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm">
                          <div className="flex items-center justify-center gap-2">
                            <Progress
                              percent={perf}
                              size="small"
                              showInfo={false}
                              strokeColor={
                                perf >= 70 ? '#10B981' : perf >= 50 ? '#F59E0B' : '#EF4444'
                              }
                              className="w-20"
                            />
                            <span className={`font-semibold ${getPerformanceColor(perf)}`}>
                              {item.performance_percentage}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">
                          {item.students_evaluated_count} / {item.total_students_in_class}
                          <span className="text-xs text-gray-400 ml-1">
                            (
                            {Math.round(
                              (item.students_evaluated_count / item.total_students_in_class) * 100
                            )}
                            %)
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">{getPerformanceTag(perf)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="mt-4 text-center text-sm text-gray-400">
            <p>
              Generated for {selectedTerm} • {selectedYear}
              {metadata &&
                ` • ${metadata.total_students} students • ${metadata.total_subjects} subjects`}
            </p>
            <p className="text-xs">Report generated on {new Date().toLocaleString()}</p>
          </div>
        </>
      ) : (
        <div className="text-center py-16 bg-gray-50 rounded-lg">
          <Empty description="No statistics data available" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          <p className="text-gray-500 mt-2">
            No marks have been recorded for this class and term combination.
          </p>
          <div className="mt-4 text-sm text-gray-400">
            <p>
              Current selection: {selectedTerm} • {selectedYear}
            </p>
            <p className="mt-1">
              Try selecting a different term or academic year, or ensure marks have been entered
              for this class.
            </p>
          </div>
          <Button className="mt-4" icon={<ReloadOutlined />} onClick={loadStatistics}>
            Check Again
          </Button>
        </div>
      )}
    </div>
  );
};

export default AdminClassStatistics;