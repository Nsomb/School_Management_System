import React, { useState } from 'react';
import ClassReportGenerator from './ClassReportGenerator';
import StudentReportGenerator from './StudentReportGenerator';

const ReportTypeSelector: React.FC = () => {
  const [reportType, setReportType] = useState<'class' | 'student' | ''>('');

  return (
    <div className="report-type-selector">
      {/* Report Type Selection */}
      <div className="row justify-content-center mb-5">
        <div className="col-12 col-md-8 col-lg-6">
          <div className="text-center mb-4">
            <h3 className="text-dark mb-3">Select Report Type</h3>
            <p className="text-muted">Choose whether to generate reports for an entire class or individual students</p>
          </div>
          
          <div className="row g-4">
            <div className="col-6">
              <div 
                className={`report-type-card text-center p-4 rounded-3 cursor-pointer ${
                  reportType === 'class' ? 'report-type-active' : 'report-type-inactive'
                }`}
                onClick={() => setReportType('class')}
              >
                <div className="report-type-icon mb-3">
                  <i className="fas fa-users fa-3x text-primary"></i>
                </div>
                <h5 className="fw-bold">Class Reports</h5>
                <p className="small text-muted mb-0">
                  Generate ZIP file with reports for all students in a class
                </p>
              </div>
            </div>
            
            <div className="col-6">
              <div 
                className={`report-type-card text-center p-4 rounded-3 cursor-pointer ${
                  reportType === 'student' ? 'report-type-active' : 'report-type-inactive'
                }`}
                onClick={() => setReportType('student')}
              >
                <div className="report-type-icon mb-3">
                  <i className="fas fa-user-graduate fa-3x text-success"></i>
                </div>
                <h5 className="fw-bold">Student Report</h5>
                <p className="small text-muted mb-0">
                  Generate individual PDF report for a specific student
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Report Generator Components */}
      <div className="row justify-content-center">
        <div className="col-12 col-lg-10">
          {reportType === 'class' && (
            <div className="fade-in">
              <ClassReportGenerator />
            </div>
          )}
          
          {reportType === 'student' && (
            <div className="fade-in">
              <StudentReportGenerator />
            </div>
          )}
        </div>
      </div>

      {reportType && (
        <div className="text-center mt-4">
          <button 
            className="btn btn-outline-secondary btn-sm"
            onClick={() => setReportType('')}
          >
            <i className="fas fa-arrow-left me-2"></i>
            Change Report Type
          </button>
        </div>
      )}
    </div>
  );
};

export default ReportTypeSelector;