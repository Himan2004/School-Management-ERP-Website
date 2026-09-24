import React from 'react';
import { CheckCircle2, Shield, Database, TrendingUp } from 'lucide-react';
import './CommandCenter.css';

export default function CommandCenter() {
  return (
    <section className="command-center-section py-[100px]" id="modules">
      <div className="container mx-auto cc-grid grid-cols-2 gap-[60px]">
        
        {/* Left Column: Text & Features */}
        <div className="cc-content max-w-[520px]">
          <h2 className="cc-title text-[42px]">Command Center for Super Admins</h2>
          <p className="cc-desc text-[16px]">
            A bird's-eye view of your entire school network. Manage multiple campuses, control global settings, and audit financial flows from a single unified cockpit.
          </p>

          <div className="cc-feature-list">
            <div className="cc-feature-item">
              <CheckCircle2 size={24} className="cc-check-icon" fill="currentColor" color="white" />
              <span className="cc-feature-text text-[15px]">RBAC Control & Permission Management</span>
            </div>

            <div className="cc-feature-item">
              <CheckCircle2 size={24} className="cc-check-icon" fill="currentColor" color="white" />
              <span className="cc-feature-text text-[15px]">Institution-wide Financial Audit Trails</span>
            </div>

            <div className="cc-feature-item">
              <CheckCircle2 size={24} className="cc-check-icon" fill="currentColor" color="white" />
              <span className="cc-feature-text text-[15px]">Bulk Data Import & Export Wizards</span>
            </div>
          </div>

          <div className="cc-pills">
            <div className="cc-pill">
              <Shield size={16} className="cc-pill-icon" />
              Encrypted
            </div>
            <div className="cc-pill">
              <Database size={16} className="cc-pill-icon" />
              Auto-backup
            </div>
          </div>
        </div>

        {/* Right Column: Graphic Mockup */}
        <div className="cc-graphic flex justify-end">
          <div className="cc-chart-card max-w-[500px]">
            <div className="cc-chart-header">
              <h4 className="cc-chart-title text-[18px]">Financial Transactions</h4>
              <TrendingUp size={20} className="cc-chart-icon" />
            </div>
            
            <div className="cc-chart-body">
              {/* Fake SVG Line Chart */}
              <svg className="cc-chart-svg" viewBox="0 0 500 200" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(124, 58, 237, 0.2)" />
                    <stop offset="100%" stopColor="rgba(124, 58, 237, 0)" />
                  </linearGradient>
                </defs>
                {/* Filled Area */}
                <path 
                  d="M0,150 L60,130 L120,80 L180,110 L260,60 L320,80 L400,20 L480,90 L500,40 L500,200 L0,200 Z" 
                  fill="url(#chartGradient)" 
                />
                {/* Line */}
                <path 
                  d="M0,150 L60,130 L120,80 L180,110 L260,60 L320,80 L400,20 L480,90 L500,40" 
                  fill="none" 
                  stroke="#7c3aed" 
                  strokeWidth="4" 
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              
              <div className="cc-chart-labels">
                <span>Jan 2023</span>
                <span>Feb</span>
                <span>Mar</span>
                <span>Apr</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
