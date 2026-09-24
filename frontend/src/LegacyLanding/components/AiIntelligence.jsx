import React from 'react';
import './AiIntelligence.css';

export default function AiIntelligence() {
  return (
    <section className="ai-intelligence-section" id="ai-engine">
      
      {/* Top Wave Divider */}
      <div className="ai-top-wave">
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
          <path d="M1440,0 L1440,120 C1000,120 720,0 0,0 Z" fill="var(--bg-main)" />
        </svg>
      </div>

      {/* Ambient Background Glows */}
      <div className="ai-glow ai-glow-1"></div>
      <div className="ai-glow ai-glow-2"></div>

      {/* Abstract Globe Background Graphic */}
      <div className="ai-bg-globe">
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="globe-svg">
          <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.3"/>
          <ellipse cx="50" cy="50" rx="45" ry="15" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.3" transform="rotate(30 50 50)" />
          <ellipse cx="50" cy="50" rx="45" ry="15" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.3" transform="rotate(90 50 50)" />
          <ellipse cx="50" cy="50" rx="45" ry="15" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.3" transform="rotate(150 50 50)" />
          
          <ellipse cx="50" cy="50" rx="15" ry="45" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.3" transform="rotate(0 50 50)" />
          <ellipse cx="50" cy="50" rx="15" ry="45" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.3" transform="rotate(60 50 50)" />
          <ellipse cx="50" cy="50" rx="15" ry="45" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.3" transform="rotate(120 50 50)" />
        </svg>
      </div>

      <div className="container mx-auto ai-container">
        
        {/* Top Content */}
        <div className="ai-header">
          <div className="ai-badge">
            <span className="ai-badge-dot"></span>
            PROPRIETARY AI ENGINE
          </div>
          <h2 className="ai-title text-[46px]">AI Driven Academic Intelligence</h2>
          <p className="ai-desc text-[17px]">
            Our AI doesn't just store data; it predicts the future. Identify at-risk students 3 months before their exams and receive automated intervention recommendations.
          </p>
        </div>

        {/* Data Grid */}
        <div className="ai-dashboard">
          
          {/* Top Row: Large Cards */}
          <div className="ai-dash-row ai-dash-top grid grid-cols-[350px_350px] gap-5">
            <div className="ai-glass-card ai-large-card">
              <h4 className="ai-card-title">At-Risk Probabilities</h4>
              <p className="ai-card-desc">Maps behavioral and academic data to flag students needing extra attention.</p>
            </div>

            <div className="ai-glass-card ai-large-card">
              <h4 className="ai-card-title">Performance Trends</h4>
              <p className="ai-card-desc">Longitudinal analysis of performance across years and subjects.</p>
            </div>
          </div>

          {/* Bottom Row: Metrics Grid */}
          <div className="ai-dash-row ai-dash-metrics grid grid-cols-5 gap-4">
            
            <div className="ai-glass-card ai-metric-card">
              <span className="ai-metric-label">PREDICTED RISK</span>
              <div className="ai-metric-value text-[28px]">78%</div>
              <span className="ai-metric-subtext">Model confidence high</span>
            </div>

            <div className="ai-glass-card ai-metric-card">
              <span className="ai-metric-label">AT RISK STUDENTS</span>
              <div className="ai-metric-value text-[28px]">234</div>
              <span className="ai-metric-subtext">Needs focused review</span>
            </div>

            <div className="ai-glass-card ai-metric-card">
              <span className="ai-metric-label">INTERVENTION RATE</span>
              <div className="ai-metric-value text-[28px]">92%</div>
              <span className="ai-metric-subtext">Actions completed</span>
            </div>

            <div className="ai-glass-card ai-metric-card">
              <span className="ai-metric-label">TREND SIGNAL</span>
              <div className="ai-metric-value text-[28px]">Weekly</div>
              <span className="ai-metric-subtext">Performance pulse active</span>
            </div>

            <div className="ai-glass-card ai-metric-card">
              <span className="ai-metric-label">FORECAST WINDOW</span>
              <div className="ai-metric-value text-[28px]">90 Days</div>
              <span className="ai-metric-subtext">Early intervention timeline</span>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
