import React from 'react';
import { BookOpen, Users, Award } from 'lucide-react';
import studentHero from '../assets/new_student_hero.png';
import './Hero.css';

export default function Hero({ onNavigateRegister }) {
  return (
    <section className="hero">
      <div className="hero-overlay"></div>
      <div className="container mx-auto px-4 sm:px-6 md:px-12 lg:px-0">
        <div className="hero-layout flex flex-col items-center text-center lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:text-left gap-6 lg:gap-[60px]">
          {/* Top Block: Title, Description & CTA Button */}
          <div className="hero-content flex flex-col items-center text-center lg:items-start lg:text-left w-full max-w-xl lg:max-w-[580px]">
            <h1 className="hero-title text-2xl sm:text-4xl lg:text-[68px] lg:leading-[1.15]">
              Transform Your School <br />Operations with <span className="highlight-text whitespace-normal">AI Intelligence</span>
            </h1>
            <p className="hero-description text-sm sm:text-lg lg:text-[19px]">
              Reduce administrative workload by 40% and boost student outcomes by 25%. Our intelligent platform predicts challenges before they arise.
            </p>
            <div className="hero-actions flex justify-center lg:justify-start w-full">
              <button className="enroll-btn" onClick={onNavigateRegister}>
                Get Started
              </button>
            </div>
          </div>

          {/* Bottom Block on Mobile / Right Block on Desktop: Student PNG & Floating Cards */}
          <div className="hero-illustration">
            {/* Student Image Container */}
            <div className="student-image-container">
              <img loading="lazy" src={studentHero} 
                alt="Etech Student" 
                className="student-image"
              />
            </div>

            {/* Floating Card 1: Easy Access */}
            <div className="floating-card card-easy-access glass-card animate-float">
              <div className="icon-box icon-blue">
                <BookOpen size={20} />
              </div>
              <div className="card-text">
                <span>Easy Access to everyone</span>
              </div>
            </div>

            {/* Floating Card 2: Students Count */}
            <div className="floating-card card-students glass-card animate-float-delayed">
              <div className="icon-box icon-orange">
                <Users size={20} />
              </div>
              <div className="card-text-stacked">
                <span className="count-num">10k+</span>
                <span className="count-label">Online Students</span>
              </div>
            </div>

            {/* Floating Card 3: School System */}
            <div className="floating-card card-school glass-card animate-float">
              <div className="icon-box icon-purple">
                <Award size={20} />
              </div>
              <div className="card-text">
                <span>Beyond the traditional School system</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
