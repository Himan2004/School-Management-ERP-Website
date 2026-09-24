import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react';
import './Testimonials.css';

export default function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const reviews = [
    {
      id: 1,
      text: "Graphura ERP has completely transformed how we run our campus. The AI-driven analytics helped us identify at-risk students months in advance, allowing our teachers to intervene and improve pass rates significantly.",
      name: 'Sarah Jenkins',
      role: 'Principal, Lincoln High School',
      rating: 5,
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
    },
    {
      id: 2,
      text: "The unified portals for parents, teachers, and students are incredibly intuitive. I went from spending hours compiling attendance and grades manually to having it all automated in a gorgeous dashboard. Absolute game-changer.",
      name: 'Michael Chang',
      role: 'Head of Administration',
      rating: 5,
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    },
    {
      id: 3,
      text: "Data security and reliable cloud infrastructure were our top priorities when upgrading our school's tech stack. Graphura exceeded every expectation with robust governance controls and seamless mobile access.",
      name: 'Dr. Robert Hale',
      role: 'Superintendent, State District',
      rating: 5,
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
    },
  ];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? reviews.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === reviews.length - 1 ? 0 : prev + 1));
  };

  return (
    <section className="testimonials-section section px-6 md:px-12 lg:px-0" id="testimonials">
      <div className="container mx-auto">
        <div className="section-title-wrap">
          <h2 className="section-title">What Our Students Say</h2>
          <p className="section-subtitle text-base md:text-lg">
            Discover how leading institutions are streamlining their administration
            and achieving better outcomes with Graphura ERP.
          </p>
        </div>

        <div className="testimonials-slider-container flex flex-row items-center gap-3 sm:gap-5 md:gap-[30px]">
          <button 
            className="slider-arrow arrow-left flex" 
            onClick={handlePrev}
            aria-label="Previous testimonial"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="testimonial-card-wrapper">
            {reviews.map((review, idx) => {
              // Determine card state relative to active index
              let cardClass = "testimonial-slide p-[28px_20px] sm:p-[32px_36px] md:p-[40px_48px]";
              if (idx === currentIndex) {
                cardClass += " slide-active";
              } else if (
                idx === currentIndex - 1 || 
                (currentIndex === 0 && idx === reviews.length - 1)
              ) {
                cardClass += " slide-left";
              } else {
                cardClass += " slide-right";
              }

              return (
                <div key={review.id} className={`${cardClass} glass-card`}>
                  <div className="quote-icon-box">
                    <Quote size={36} className="quote-icon" />
                  </div>
                  
                  <p className="testimonial-text text-sm sm:text-base md:text-[20px]">"{review.text}"</p>

                  <div className="testimonial-stars">
                    {[...Array(review.rating)].map((_, i) => (
                      <Star key={i} size={18} fill="#f59e0b" color="#f59e0b" />
                    ))}
                  </div>

                  <div className="testimonial-user">
                    <img loading="lazy" src={review.avatar} 
                      alt={review.name} 
                      className="testimonial-avatar"
                    />
                    <div className="testimonial-user-info">
                      <span className="testimonial-name">{review.name}</span>
                      <span className="testimonial-role">{review.role}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button 
            className="slider-arrow arrow-right flex" 
            onClick={handleNext}
            aria-label="Next testimonial"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Indicator dots */}
        <div className="slider-dots">
          {reviews.map((_, idx) => (
            <button
              key={idx}
              className={`dot ${currentIndex === idx ? 'dot-active' : ''}`}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Go to slide ${idx + 1}`}
            ></button>
          ))}
        </div>
      </div>
    </section>
  );
}
