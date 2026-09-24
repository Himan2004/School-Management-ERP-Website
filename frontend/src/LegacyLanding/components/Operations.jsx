import React from 'react';
import { Shield, Orbit, Globe } from 'lucide-react';
import './Operations.css';

export default function Operations() {
  const cards = [
    {
      id: '01',
      title: 'Secure by Design',
      desc: 'Protect student and campus data with layered access controls, reliable backups, and audit-ready security.',
      icon: <Shield className="op-icon" size={40} />,
      classType: 'secure'
    },
    {
      id: '02',
      title: 'Designed for Daily Work',
      desc: 'Simple, guided workflows that help teachers and administrators complete tasks faster with fewer clicks.',
      icon: <Orbit className="op-icon" size={40} />,
      classType: 'daily'
    },
    {
      id: '03',
      title: 'Insights that Act',
      desc: 'Turn data into timely recommendations for attendance, performance, and planning across your campus.',
      icon: <Globe className="op-icon" size={40} />,
      classType: 'insights'
    }
  ];

  return (
    <section className="operations-section py-[100px]">
      <div className="container mx-auto">
        {/* Section Header */}
        <div className="operations-header">
          <h2 className="operations-title text-[44px]">
            Built to run smarter school operations
          </h2>
          <p className="operations-desc text-[18px]">
            Unify admissions, academics, finance, and communication in one connected platform with practical automation for everyday work.
          </p>
        </div>

        {/* Operations Grid */}
        <div className="operations-grid grid-cols-3 gap-[30px]">
          {cards.map((card) => (
            <div key={card.id} className={`operations-card ${card.classType}`}>
              <div className="card-top-accent"></div>
              <span className="card-number">{card.id}</span>
              
              <div className="card-icon-container">
                <div className="card-icon-bg">
                  {card.icon}
                </div>
              </div>
              
              <h3 className="card-title text-[22px]">{card.title}</h3>
              <p className="card-description text-[15px]">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
