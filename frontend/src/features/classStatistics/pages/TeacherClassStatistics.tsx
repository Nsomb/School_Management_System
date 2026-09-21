// src/features/classStatistics/pages/TeacherClassStatistics.tsx
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
  message,
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
  DownloadOutlined,
  ReloadOutlined,
  CalendarOutlined,
  TeamOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { useClassStatistics } from '../hooks/useClassStatistics';
import type { SubjectStat } from '../hooks/useClassStatistics';
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

const ACADEMIC_YEARS = ['2024/2025', '2025/2026', '2026/2027'];

const COLORS = {
  excellent: '#10B981',
  satisfactory: '#F59E0B',
  needsAttention: '#EF4444',
  primary: '#3B82F6',
  secondary: '#8B5CF6',
};

const BAR_PALETTE = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981',
  '#06B6D4', '#F97316', '#6366F1', '#14B8A6', '#EF4444',
  '#A855F7', '#84CC16', '#0EA5E9', '#D946EF', '#22C55E',
];

interface TeacherSubject {
  id: number;
  name: string;
  classes: { id: number; name: string }[];
}

const shortenSubjectName = (name: string): string => {
  if (!name) return '';
  const trimmed = name.trim();

  const abbreviations: Record<string, string> = {
    'mathematics': 'Math',
    'math': 'Math',
    'english language': 'English',
    'english': 'English',
    'french language': 'French',
    'french': 'French',
    'physics': 'Physics',
    'chemistry': 'Chem',
    'biology': 'Bio',
    'geography': 'Geo',
    'history': 'History',
    'economics': 'Econ',
    'citizenship': 'Civics',
    'philosophy': 'Philo',
    'computer science': 'Comp Sci',
    'information and communications technology': 'ICT',
    'information & communication technology': 'ICT',
    'physical education': 'PE',
    'literature in english': 'Lit',
    'literature': 'Lit',
    'further mathematics': 'F.Math',
    'religious studies': 'RS',
    'science': 'Science',
    'logic': 'Logic',
    'geology': 'Geology',
  };

  const lower = trimmed.toLowerCase();
  if (abbreviations[lower]) return abbreviations[lower];

  if (trimmed.length <= 10) return trimmed;
  return trimmed.substring(0, 9) + '…';
};

const CustomXAxisTick = ({ x, y, payload }: any) => {
  const label = payload?.value || '';
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={12}
        textAnchor="end"
        transform="rotate(-35)"
        fontSize={11}
        fill="#4b5563"
      >
        {label}
      </text>
    </g>
  );
};

export const TeacherClassStatistics: React.FC = () => {
  const {
    loading,
    error,
    statistics,
    metadata,
    hasData,
    clearError,
    fetchTeacherStatistics,
    downloadTeacherPDF,
  } = useClassStatistics();

  const [subjects, setSubjects] = useState<TeacherSubject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<TeacherSubject | null>(null);
  const [selectedClass, setSelectedClass] = useState<{ id: number; name: string } | null>(null);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [selectedTerm, setSelectedTerm] = useState<string>('Term 1');
  const [selectedYear, setSelectedYear] = useState<string>(ACADEMIC_YEARS[1]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadTeacherData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedSubject && selectedClass && selectedTerm && selectedYear) {
      loadStatistics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubject, selectedClass, selectedTerm, selectedYear]);

  const loadTeacherData = async () => {
    setLoadingSubjects(true);
    try {
      const data = await classStatisticsApi.getTeacherSubjects();
      setSubjects(data);

      if (data.length > 0) {
        setSelectedSubject(data[0]);
        if (data[0].classes?.length > 0) {
          setSelectedClass(data[0].classes[0]);
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load your subjects');
    } finally {
      setLoadingSubjects(false);
    }
  };

  const loadStatistics = async () => {
    if (!selectedClass || !selectedTerm || !selectedYear) return;

    setIsRefreshing(true);
    try {
      await fetchTeacherStatistics(selectedClass.name, selectedTerm, selectedYear);
    } catch (error) {
      // handled by hook
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSubjectChange = (subjectId: number) => {
    const subject = subjects.find((s) => s.id === subjectId);
    setSelectedSubject(subject || null);
    if (subject?.classes?.length) {
      setSelectedClass(subject.classes[0]);
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedClass || !metadata) {
      message.warning('No data available to download');
      return;
    }

    try {
      await downloadTeacherPDF(selectedClass.name, selectedTerm, selectedYear);
      message.success('PDF downloaded successfully');
    } catch (error) {
      toast.error('Failed to download PDF');
    }
  };

  const getPerformanceColor = (percentage: number): string => {
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

  if (loadingSubjects || (loading && !statistics.length && !hasData)) {
    return (
      <div className="flex justify-center items-center h-96">
        <Spin size="large" tip="Loading your statistics..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
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

  if (subjects.length === 0) {
    return (
      <div className="p-4 md:p-8 text-center max-w-md mx-auto">
        <Empty description="No subjects assigned to you" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        <p className="text-gray-500 mt-2">You haven't been assigned to any subjects yet.</p>
        <p className="text-gray-400 text-sm">Please contact the administrator.</p>
      </div>
    );
  }

  const chartData = statistics.map((item: SubjectStat, idx: number) => ({
    name: shortenSubjectName(item.subject_name),
    fullName: item.subject_name,
    average: parseFloat(item.class_average_mark),
    performance: parseFloat(item.performance_percentage),
    fill: BAR_PALETTE[idx % BAR_PALETTE.length],
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
  const chartHeight = Math.max(300, chartData.length * 32 + 100);
  const overallPerformance =
    chartData.reduce((sum, d) => sum + d.performance, 0) / (chartData.length || 1);

  return (
    <div className="w-full max-w-full overflow-x-hidden p-3 sm:p-4 md:p-6 lg:max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-6 gap-3">
        <div className="w-full md:w-auto">
          <Title
            level={2}
            className="!mb-1 !text-xl sm:!text-2xl md:!text-3xl flex items-center flex-wrap gap-2"
          >
            Class Statistics
            {selectedClass && (
              <Tag color="blue" className="!m-0">
                {selectedClass.name}
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
                className="!m-0"
              >
                {overallStatus.status}
              </Tag>
            )}
            {selectedTerm === 'Year-End' && (
              <Tag color="gold" className="!m-0">
                Final Year
              </Tag>
            )}
          </Title>
          <Text type="secondary" className="!text-xs sm:!text-sm">
            View performance statistics for your assigned classes and subjects
          </Text>
        </div>

        <div className="w-full md:w-auto flex gap-2 flex-wrap">
          <Tooltip title={hasData ? 'Download PDF report' : 'No data available to download'}>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleDownloadPDF}
              disabled={!hasData || loading}
              loading={loading}
              className="flex-1 sm:flex-none"
            >
              Download PDF
            </Button>
          </Tooltip>
          <Button
            icon={<ReloadOutlined spin={isRefreshing} />}
            onClick={loadStatistics}
            disabled={loading}
            className="flex-1 sm:flex-none"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* FILTERS */}
      <Card className="mb-4 md:mb-6 shadow-sm">
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} md={6}>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              <BookOutlined className="mr-1" /> Subject
            </label>
            <Select
              placeholder="Select subject"
              className="w-full"
              value={selectedSubject?.id}
              onChange={handleSubjectChange}
              size="large"
              disabled={loadingSubjects}
            >
              {subjects.map((subject) => (
                <Option key={subject.id} value={subject.id}>
                  {subject.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              <TeamOutlined className="mr-1" /> Class
            </label>
            <Select
              placeholder="Select class"
              className="w-full"
              value={selectedClass?.id}
              onChange={(value) => {
                const cls = selectedSubject?.classes?.find((c: any) => c.id === value);
                setSelectedClass(cls || null);
              }}
              size="large"
              disabled={!selectedSubject || loadingSubjects}
            >
              {selectedSubject?.classes?.map((cls: any) => (
                <Option key={cls.id} value={cls.id}>
                  {cls.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              <FileTextOutlined className="mr-1" /> Term
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
          <Col xs={24} sm={12} md={6}>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              <CalendarOutlined className="mr-1" /> Academic Year
            </label>
            <Select
              placeholder="Select year"
              className="w-full"
              value={selectedYear}
              onChange={setSelectedYear}
              size="large"
            >
              {ACADEMIC_YEARS.map((year) => (
                <Option key={year} value={year}>
                  {year}
                </Option>
              ))}
            </Select>
          </Col>
        </Row>
      </Card>

      {/* CONTENT */}
      {hasData ? (
        <>
          <Row gutter={[12, 12]} className="mb-4 md:mb-6">
            <Col xs={12} sm={12} md={6}>
              <Card className="shadow-sm h-full">
                <Statistic
                  title={<span className="text-xs sm:text-sm">Total Students</span>}
                  value={metadata?.total_students || 0}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: COLORS.primary, fontSize: '1rem' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={12} md={6}>
              <Card className="shadow-sm h-full">
                <Statistic
                  title={<span className="text-xs sm:text-sm">Subjects</span>}
                  value={metadata?.total_subjects || 0}
                  prefix={<BookOutlined />}
                  valueStyle={{ color: COLORS.secondary, fontSize: '1rem' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={12} md={6}>
              <Card className="shadow-sm h-full">
                <Statistic
                  title={<span className="text-xs sm:text-sm">Total Marks</span>}
                  value={metadata?.total_marks_found || 0}
                  prefix={<TrophyOutlined />}
                  valueStyle={{ color: '#F59E0B', fontSize: '1rem' }}
                />
                <Text type="secondary" className="!text-xs">
                  {metadata?.relevant_marks} relevant for this term
                </Text>
              </Card>
            </Col>
            <Col xs={12} sm={12} md={6}>
              <Card className="shadow-sm h-full">
                <Statistic
                  title={<span className="text-xs sm:text-sm">Overall Performance</span>}
                  value={overallPerformance}
                  precision={1}
                  suffix="%"
                  prefix={getPerformanceIcon(overallPerformance)}
                  valueStyle={{
                    fontSize: '1rem',
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

          <Row gutter={[12, 12]} className="mb-4 md:mb-6">
            <Col xs={24} lg={16}>
              <Card
                className="shadow-sm"
                title="Subject Performance Overview"
                bodyStyle={{ padding: '12px' }}
              >
                <div className="w-full overflow-x-auto">
                  <div style={{ minWidth: Math.max(chartData.length * 60, 320), height: chartHeight }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" interval={0} tick={<CustomXAxisTick />} height={60} />
                        <YAxis
                          domain={[0, 20]}
                          tick={{ fontSize: 11 }}
                          label={{
                            value: 'Score / 20',
                            angle: -90,
                            position: 'insideLeft',
                            fontSize: 11,
                          }}
                        />
                        <RechartsTooltip
                          formatter={(value: any, name: any, props: any) => [
                            `${Number(value).toFixed(2)} / 20`,
                            props?.payload?.fullName || 'Average',
                          ]}
                        />
                        <Bar dataKey="average" name="Average Score (/20)" radius={[4, 4, 0, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card
                className="shadow-sm"
                title="Performance Distribution"
                bodyStyle={{ padding: '12px' }}
              >
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
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
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>
          </Row>

          <Card
            className="shadow-sm"
            title="Detailed Subject Statistics"
            bodyStyle={{ padding: '12px' }}
          >
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-3 py-2 text-left text-xs sm:text-sm font-semibold text-gray-600">
                      #
                    </th>
                    <th className="px-3 py-2 text-left text-xs sm:text-sm font-semibold text-gray-600">
                      Subject
                    </th>
                    <th className="px-3 py-2 text-center text-xs sm:text-sm font-semibold text-gray-600">
                      Average
                    </th>
                    <th className="px-3 py-2 text-center text-xs sm:text-sm font-semibold text-gray-600">
                      Performance
                    </th>
                    <th className="px-3 py-2 text-center text-xs sm:text-sm font-semibold text-gray-600">
                      Students
                    </th>
                    <th className="px-3 py-2 text-center text-xs sm:text-sm font-semibold text-gray-600">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {statistics.map((item: SubjectStat, index: number) => {
                    const perf = parseFloat(item.performance_percentage);
                    return (
                      <tr key={item.subject_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-2 text-xs text-gray-400">{index + 1}</td>
                        <td className="px-3 py-2 text-xs sm:text-sm font-medium text-gray-800">
                          <Space>
                            {getPerformanceIcon(perf)}
                            {item.subject_name}
                          </Space>
                        </td>
                        <td className="px-3 py-2 text-center text-xs sm:text-sm">
                          <span className={`font-semibold ${getPerformanceColor(perf)}`}>
                            {item.class_average_mark}/20
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center text-xs sm:text-sm">
                          <div className="flex items-center justify-center gap-2">
                            <Progress
                              percent={perf}
                              size="small"
                              showInfo={false}
                              strokeColor={
                                perf >= 70 ? '#10B981' : perf >= 50 ? '#F59E0B' : '#EF4444'
                              }
                              className="w-16 sm:w-20"
                            />
                            <span className={`font-semibold ${getPerformanceColor(perf)}`}>
                              {item.performance_percentage}%
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center text-xs sm:text-sm text-gray-600">
                          {item.students_evaluated_count} / {item.total_students_in_class}
                          <span className="text-xs text-gray-400 ml-1">
                            (
                            {Math.round(
                              (item.students_evaluated_count / item.total_students_in_class) * 100
                            )}
                            %)
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">{getPerformanceTag(perf)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="mt-4 text-center text-xs sm:text-sm text-gray-400">
            <p>
              Generated for {selectedTerm} • {selectedYear}
              {metadata &&
                ` • ${metadata.total_students} students • ${metadata.total_subjects} subjects`}
            </p>
            <p className="text-xs mt-1">Report generated on {new Date().toLocaleString()}</p>
          </div>
        </>
      ) : (
        <div className="text-center py-12 md:py-16 bg-gray-50 rounded-lg px-4">
          <Empty description="No statistics data available" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          <p className="text-gray-500 mt-2 text-sm">
            No marks have been recorded for this class and term combination.
          </p>
          <div className="mt-4 text-xs sm:text-sm text-gray-400">
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

export default TeacherClassStatistics;