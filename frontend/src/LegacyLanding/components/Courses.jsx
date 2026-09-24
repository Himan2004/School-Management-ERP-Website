import React, { useState } from 'react';
import { Star, Users, ArrowRight } from 'lucide-react';
import './Courses.css';

export default function Courses() {
  const [activeFilter, setActiveFilter] = useState('All');

  const categories = ['All', 'Development', 'Design', 'Business'];

  const courses = [
    {
      id: 1,
      category: 'Development',
      title: 'React & Next.js Masterclass: Zero to Production',
      instructor: {
        name: 'Sarah Connor',
        role: 'Lead Architect',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      },
      rating: 4.9,
      reviews: 480,
      students: '2.5k',
      price: '$89.99',
      gradient: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
    },
    {
      id: 2,
      category: 'Design',
      title: 'UI/UX Design Masterclass: Design Premium Products',
      instructor: {
        name: 'Alex Rivera',
        role: 'Product Designer',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      },
      rating: 4.8,
      reviews: 320,
      students: '1.8k',
      price: '$79.99',
      gradient: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
    },
    {
      id: 3,
      category: 'Development',
      title: 'Python for Data Science & Machine Learning',
      instructor: {
        name: 'David Chen',
        role: 'Data Scientist',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      },
      rating: 4.7,
      reviews: 290,
      students: '3.1k',
      price: '$99.99',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    },
    {
      id: 4,
      category: 'Business',
      title: 'Growth Marketing: The Ultimate Playbook',
      instructor: {
        name: 'Elena Rostova',
        role: 'Growth Specialist',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      },
      rating: 4.6,
      reviews: 150,
      students: '1.2k',
      price: '$59.99',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    },
    {
      id: 5,
      category: 'Development',
      title: 'TypeScript Deep Dive: Advanced Type Systems',
      instructor: {
        name: 'Sarah Connor',
        role: 'Lead Architect',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      },
      rating: 4.9,
      reviews: 190,
      students: '900',
      price: '$69.99',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    },
    {
      id: 6,
      category: 'Design',
      title: 'Design Systems for Figma: Scale & Consistency',
      instructor: {
        name: 'Alex Rivera',
        role: 'Product Designer',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      },
      rating: 4.8,
      reviews: 140,
      students: '1.1k',
      price: '$49.99',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #db2777 100%)',
    },
  ];

  const filteredCourses = activeFilter === 'All'
    ? courses
    : courses.filter(c => c.category === activeFilter);

  return (
    <section className="courses section" id="courses">
      <div className="container">
        <div className="section-title-wrap">
          <h2 className="section-title">Explore Our Popular Courses</h2>
          <p className="section-subtitle">
            Advance your skills with interactive, self-paced courses curated
            and led by global tech professionals.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="filter-controls">
          {categories.map(cat => (
            <button
              key={cat}
              className={`filter-btn ${activeFilter === cat ? 'active' : ''}`}
              onClick={() => setActiveFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Course Grid */}
        <div className="course-grid">
          {filteredCourses.map(course => (
            <div key={course.id} className="course-card glass-card">
              {/* Thumbnail */}
              <div 
                className="course-thumbnail" 
                style={{ background: course.gradient }}
              >
                <div className="thumbnail-badge">{course.category}</div>
                <div className="thumbnail-pattern"></div>
              </div>

              {/* Card Body */}
              <div className="course-card-content">
                <div className="course-rating">
                  <Star size={16} fill="#f59e0b" color="#f59e0b" />
                  <span className="rating-num">{course.rating}</span>
                  <span className="reviews-count">({course.reviews} reviews)</span>
                </div>
                
                <h3 className="course-title">{course.title}</h3>
                
                <div className="course-instructor">
                  <img loading="lazy" src={course.instructor.avatar} 
                    alt={course.instructor.name} 
                    className="instructor-avatar"
                  />
                  <div className="instructor-info">
                    <span className="instructor-name">{course.instructor.name}</span>
                    <span className="instructor-role">{course.instructor.role}</span>
                  </div>
                </div>

                <div className="course-footer">
                  <div className="course-students">
                    <Users size={16} />
                    <span>{course.students} students</span>
                  </div>
                  <div className="course-price-wrap">
                    <span className="course-price">{course.price}</span>
                  </div>
                </div>

                <button className="btn-enroll-course">
                  Enroll Course <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
