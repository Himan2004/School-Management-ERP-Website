import React from 'react';

const Card = ({ children, className = '', gradient = false, hover = true }) => {
  const baseClasses = 'overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800';
  const hoverClasses = hover
    ? 'transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:hover:shadow-slate-900/50'
    : '';
  const gradientClasses = gradient ? 'border-0 text-white shadow-lg' : '';
  
  return (
    <div className={`${baseClasses} ${hoverClasses} ${gradientClasses} ${className}`}>
      {children}
    </div>
  );
};

export default Card;