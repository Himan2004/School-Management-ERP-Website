import React from 'react';

const Card = ({ children, className = '', gradient = false, hover = true }) => {
  const baseClasses = 'overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-200';
  const hoverClasses = hover
    ? 'transition-all duration-300 hover:-translate-y-1 hover:shadow-lg'
    : '';
  const gradientClasses = gradient ? 'border-0 text-white shadow-lg' : '';
  
  return (
    <div className={`${baseClasses} ${hoverClasses} ${gradientClasses} ${className}`}>
      {children}
    </div>
  );
};

export default Card;