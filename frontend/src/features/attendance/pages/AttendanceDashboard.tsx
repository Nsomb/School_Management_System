import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Tabs, Typography } from 'antd';
import type { TabsProps } from 'antd';

export const AttendanceDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeKey, setActiveKey] = useState<string>('students');

  useEffect(() => {
    const path = location.pathname;
    if (path.includes('teachers')) setActiveKey('teachers');
    else if (path.includes('work-schedule')) setActiveKey('work-schedule');
    else if (path.includes('reports')) setActiveKey('reports');
    else setActiveKey('students');
  }, [location.pathname]);

  const onTabChange = (key: string) => {
    setActiveKey(key);
    navigate(`/admin/attendance/${key}`);
  };

  const tabItems: TabsProps['items'] = [
    { key: 'students', label: '👨‍🎓 Students' },
    { key: 'teachers', label: '👩‍🏫 Teachers' },
    { key: 'work-schedule', label: '📅 Work Schedule' },
    { key: 'reports', label: '📊 Reports' },
  ];

  return (
    <div className="w-full min-h-screen bg-gray-50 flex flex-col">
      {/* Top Header & Navigation Bar */}
      <div className="w-full bg-white border-b border-gray-200 px-3 pt-3 sm:px-6 sm:pt-6">
        <Typography.Title 
          level={2} 
          className="!mb-2 !text-lg sm:!text-2xl font-bold text-gray-800"
        >
          Attendance Management
        </Typography.Title>

        <Tabs
          activeKey={activeKey}
          onChange={onTabChange}
          size="middle"
          items={tabItems}
          className="[&_.ant-tabs-nav]:!mb-0 [&_.ant-tabs-nav-wrap]:overflow-x-auto"
        />
      </div>

      {/* Main Content Area: Takes 100% width, zero side padding on mobile */}
      <main className="w-full flex-1 p-0 sm:p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
};

export default AttendanceDashboard;