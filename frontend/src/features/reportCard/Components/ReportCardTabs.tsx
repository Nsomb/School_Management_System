// components/ReportCardTabs.tsx
import React from 'react';
import ClassReportGenerator from './ClassReportGenerator';
import StudentReportGenerator from './StudentReportGenerator';

const ReportCardTabs: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<'class' | 'student'>('class');

  return (
    <div className="tabs-container">
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'class' ? 'active' : ''}`}
          onClick={() => setActiveTab('class')}
        >
          Class Reports
        </button>
        <button
          className={`tab ${activeTab === 'student' ? 'active' : ''}`}
          onClick={() => setActiveTab('student')}
        >
          Student Report
        </button>
      </div>
      
      <div className="tab-content">
        {activeTab === 'class' ? <ClassReportGenerator /> : <StudentReportGenerator />}
      </div>
    </div>
  );
};

export default ReportCardTabs;