import React from 'react';
import { ShieldAlert, Building2, Presentation, Heart, GraduationCap } from 'lucide-react';
import './Stakeholders.css';

export default function Stakeholders() {
  const roles = [
    {
      id: 1,
      badge: 'MASTER ACCESS',
      title: 'HQ Admin',
      desc: 'Global controls, analytics, and system-wide governance',
      icon: <ShieldAlert size={20} />,
      classType: 'role-admin'
    },
    {
      id: 2,
      badge: 'LEADERSHIP',
      title: 'Principal',
      desc: 'Campus oversight, approvals, and institutional reporting',
      icon: <Building2 size={20} />,
      classType: 'role-principal'
    },
    {
      id: 3,
      badge: 'INSTRUCTION',
      title: 'Teacher',
      desc: 'Classroom workflows, grading, attendance, and tasks',
      icon: <Presentation size={20} />,
      classType: 'role-teacher'
    },
    {
      id: 4,
      badge: 'FAMILY PORTAL',
      title: 'Parent',
      desc: 'Progress tracking, fees, notices, and communication',
      icon: <Heart size={20} />,
      classType: 'role-parent'
    },
    {
      id: 5,
      badge: 'LEARNER VIEW',
      title: 'Student',
      desc: 'Assignments, schedules, results, and daily learning',
      icon: <GraduationCap size={20} />,
      classType: 'role-student'
    }
  ];

  return (
    <section className="stakeholders-section py-[100px]">
      <div className="container mx-auto">
        {/* Section Header */}
        <div className="stakeholders-header">
          <h2 className="stakeholders-title text-[42px]">Tailored for Every Stakeholder</h2>
          <p className="stakeholders-subtitle text-[18px]">
            Customized dashboards and features for each user role.
          </p>
        </div>

        {/* Roles Grid */}
        <div className="stakeholders-grid grid-cols-5 gap-5">
          {roles.map((role) => (
            <div key={role.id} className={`stakeholder-card ${role.classType}`}>
              <div className="card-header-row">
                <div className="role-icon-box">
                  {role.icon}
                </div>
                <span className="role-badge">{role.badge}</span>
              </div>
              <h3 className="role-title text-xl">{role.title}</h3>
              <p className="role-desc text-[14px]">{role.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
