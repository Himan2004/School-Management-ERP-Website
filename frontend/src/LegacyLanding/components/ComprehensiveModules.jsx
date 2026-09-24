import React from 'react';
import { GraduationCap, Fingerprint, PenTool, Smartphone, CreditCard, Users } from 'lucide-react';
import './ComprehensiveModules.css';

export default function ComprehensiveModules() {
  return (
    <section className="comp-modules-section py-[100px]">
      <div className="container mx-auto">
        {/* Section Header */}
        <div className="comp-modules-header">
          <h2 className="comp-title text-[48px]">
            Everything your <span className="highlight-text">school needs</span>
          </h2>
          <p className="comp-subtitle text-[18px]">
            Six purpose-built modules, unified under one platform – designed for schools of every size.
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className="comp-modules-grid grid-cols-4 gap-6">
          {/* Card 1: Student Management (Wide) */}
          <div className="comp-card card-student col-span-2">
            <div className="card-top-line"></div>
            <div className="card-icon-wrapper icon-blue">
              <GraduationCap size={24} />
            </div>
            <h3 className="comp-card-title">Student Management</h3>
            <p className="comp-card-desc">
              Centralize all student-related information including admissions, profiles, academic records, and class assignments. This module helps institutions maintain organized and easily accessible student data.
            </p>
            
            {/* Dashboard Visual Graphic */}
            <div className="visual-graphic student-dashboard-graphic">
              <div className="mock-window-header">
                <div className="window-dots">
                  <span className="dot dot-red"></span>
                  <span className="dot dot-yellow"></span>
                  <span className="dot dot-green"></span>
                </div>
                <span className="mock-window-title">Student Dashboard</span>
              </div>
              <div className="mock-dashboard-stats">
                <div className="stat-block">
                  <span className="stat-value text-blue">2,450</span>
                  <span className="stat-label">Total Students</span>
                </div>
                <div className="stat-block">
                  <span className="stat-value text-green">94.2%</span>
                  <span className="stat-label">Active Today</span>
                </div>
                <div className="stat-block">
                  <span className="stat-value text-dark">+38</span>
                  <span className="stat-label">New Admissions</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Attendance (Normal) */}
          <div className="comp-card card-attendance">
            <div className="card-top-line"></div>
            <div className="card-icon-wrapper icon-purple">
              <Fingerprint size={24} />
            </div>
            <h3 className="comp-card-title">Attendance</h3>
            <p className="comp-card-desc">
              Easily record and monitor student attendance in real time. The system helps teachers track daily attendance, identify patterns, and generate detailed reports to ensure accurate and transparent attendance management.
            </p>
            <div className="card-footer-bullet bullet-purple">
              <span className="bullet-point">•</span> Instant alerts to guardians
            </div>
          </div>

          {/* Card 3: Exams & Grading (Normal) */}
          <div className="comp-card card-exams">
            <div className="card-top-line"></div>
            <div className="card-icon-wrapper icon-orange">
              <PenTool size={24} />
            </div>
            <h3 className="comp-card-title">Exams & Grading</h3>
            <p className="comp-card-desc">
              Manage the complete examination process from creating exams to recording marks and publishing results. Analyze student performance with automated grading and detailed reports to support better academic decisions.
            </p>
            <div className="card-footer-bullet bullet-orange">
              <span className="bullet-point">•</span> Automated result publishing
            </div>
          </div>

          {/* Card 4: Parent Portal (Normal) */}
          <div className="comp-card card-parent">
            <div className="card-top-line"></div>
            <div className="card-icon-wrapper icon-red">
              <Smartphone size={24} />
            </div>
            <h3 className="comp-card-title">Parent Portal</h3>
            <p className="comp-card-desc">
              Provide parents with a dedicated dashboard to stay informed about their child's academic journey. Parents can check attendance, exam results, announcements, and communicate with the school easily.
            </p>
            <div className="card-footer-bullet bullet-red">
              <span className="bullet-point">•</span> Homework, fees, and notices in one app
            </div>
          </div>

          {/* Card 5: Fee Management (Normal) */}
          <div className="comp-card card-fees">
            <div className="card-top-line"></div>
            <div className="card-icon-wrapper icon-green">
              <CreditCard size={24} />
            </div>
            <h3 className="comp-card-title">Fee Management</h3>
            <p className="comp-card-desc">
              Streamline the entire fee collection process with digital payment tracking, automated reminders, invoice generation, and detailed financial reports for better transparency and management.
            </p>
            <div className="card-footer-bullet bullet-green">
              <span className="bullet-point">•</span> Auto reminders and receipts
            </div>
          </div>

          {/* Card 6: HR & Payroll (Wide) */}
          <div className="comp-card card-hr col-span-2">
            <div className="card-top-line"></div>
            <div className="card-icon-wrapper icon-slate">
              <Users size={24} />
            </div>
            <h3 className="comp-card-title">HR & Payroll</h3>
            <p className="comp-card-desc">
              Staff attendance, leave, digital payslips
            </p>
            
            {/* Payroll Visual Graphic */}
            <div className="visual-graphic payroll-graphic">
              <div className="mock-payroll-header">
                <span className="mock-payroll-title">MONTHLY PAYROLL SUMMARY</span>
              </div>
              <div className="mock-payroll-rows">
                <div className="payroll-row">
                  <span className="row-label">Teaching Staff</span>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill fill-80"></div>
                  </div>
                  <span className="row-value">₹3,20,000</span>
                </div>
                
                <div className="payroll-row">
                  <span className="row-label">Admin Staff</span>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill fill-20"></div>
                  </div>
                  <span className="row-value">₹90,000</span>
                </div>
                
                <div className="payroll-divider"></div>
                
                <div className="payroll-total-row">
                  <span className="total-label">Total Disbursed</span>
                  <span className="total-value">₹4,10,000</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
