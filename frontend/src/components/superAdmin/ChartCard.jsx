import React from 'react';

const ChartCard = ({ title, children, icon = '📊' }) => {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-lg border-2 border-gray-100 hover:shadow-xl transition-shadow">
      <div className="flex items-center space-x-3 mb-6">
        <span className="text-2xl">{icon}</span>
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">{title}</h2>
      </div>
      <div className="h-64 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
};

export default ChartCard;
