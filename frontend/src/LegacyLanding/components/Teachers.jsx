import React from 'react';
import './Teachers.css';

export default function Teachers() {
  const teachers = [
    {
      id: 1,
      name: 'Sarah Connor',
      role: 'Lead Developer & Architect',
      experience: '10+ Years Exp.',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300',
      social: {
        github: '#',
        linkedin: '#',
        twitter: '#',
      },
    },
    {
      id: 2,
      name: 'Alex Rivera',
      role: 'Senior UI/UX Designer',
      experience: '8+ Years Exp.',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300',
      social: {
        github: '#',
        linkedin: '#',
        twitter: '#',
      },
    },
    {
      id: 3,
      name: 'David Chen',
      role: 'Machine Learning Scientist',
      experience: '12+ Years Exp.',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300',
      social: {
        github: '#',
        linkedin: '#',
        twitter: '#',
      },
    },
    {
      id: 4,
      name: 'Elena Rostova',
      role: 'Digital Branding Consultant',
      experience: '7+ Years Exp.',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300',
      social: {
        github: '#',
        linkedin: '#',
        twitter: '#',
      },
    },
  ];

  return (
    <section className="teachers section" id="teachers">
      <div className="container">
        <div className="section-title-wrap">
          <h2 className="section-title">Meet Our Professional Teachers</h2>
          <p className="section-subtitle">
            Our instructors are active industry leaders, developers, designers,
            and innovators who are passionate about sharing their expertise.
          </p>
        </div>

        <div className="teachers-grid">
          {teachers.map((teacher) => (
            <div key={teacher.id} className="teacher-card glass-card">
              {/* Avatar Frame */}
              <div className="teacher-avatar-wrap">
                <img loading="lazy" src={teacher.avatar} 
                  alt={teacher.name} 
                  className="teacher-avatar-img"
                />
                <span className="teacher-exp-badge">{teacher.experience}</span>
              </div>

              {/* Info */}
              <div className="teacher-info-content">
                <h3 className="teacher-name">{teacher.name}</h3>
                <p className="teacher-role">{teacher.role}</p>

                {/* Social links */}
                <div className="teacher-socials">
                  <a href={teacher.social.github} aria-label="GitHub" className="social-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                      <path d="M9 18c-4.51 2-5-2-7-2" />
                    </svg>
                  </a>
                  <a href={teacher.social.linkedin} aria-label="LinkedIn" className="social-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                      <rect x="2" y="9" width="4" height="12" />
                      <circle cx="4" cy="4" r="2" />
                    </svg>
                  </a>
                  <a href={teacher.social.twitter} aria-label="Twitter" className="social-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
