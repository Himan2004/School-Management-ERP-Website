import React from 'react';
import { Lock, Palette, Building2, Shield, Globe2 } from 'lucide-react';
import './SchoolGroups.css';

export default function SchoolGroups() {
  return (
    <section className="school-groups-section py-[120px]">
      <div className="container mx-auto school-groups-grid grid-cols-2 gap-[80px]">

        {/* Left Column: Text & Features */}
        <div className="sg-content max-w-[540px]">
          <h2 className="sg-title text-[46px]">Designed for School Groups</h2>
          <p className="sg-desc text-[17px]">
            Whether you manage one campus or one hundred, our multi-tenant architecture ensures complete data isolation with global management capabilities.
          </p>

          <div className="sg-feature-list">
            <div className="sg-feature-item">
              <div className="sg-feature-icon-wrapper">
                <Lock size={20} className="sg-feature-icon" />
              </div>
              <div className="sg-feature-text">
                <h4 className="sg-feature-title text-[18px]">Isolated Data Architecture</h4>
                <p className="sg-feature-sub text-[15px]">Each school's data in separate encrypted containers</p>
              </div>
            </div>

            <div className="sg-feature-item">
              <div className="sg-feature-icon-wrapper">
                <Palette size={20} className="sg-feature-icon" />
              </div>
              <div className="sg-feature-text">
                <h4 className="sg-feature-title text-[18px]">White-Label Customization</h4>
                <p className="sg-feature-sub text-[15px]">Custom sub-domains, logos, color schemes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Bento Graphic */}
        <div className="sg-graphic flex justify-end">
          <div className="sg-bento-container max-w-[540px]">
            <div className="sg-bento-top grid-cols-2 gap-5">
              <div className="sg-bento-card">
                <Building2 size={32} className="bento-icon" fill="currentColor" />
                <span className="bento-label">Multi-Campus</span>
              </div>
              <div className="sg-bento-card">
                <Shield size={32} className="bento-icon" fill="currentColor" />
                <span className="bento-label">Data Isolation</span>
              </div>
            </div>
            <div className="sg-bento-card bento-wide">
              <Globe2 size={32} className="bento-icon" />
              <span className="bento-label">Global Management</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
