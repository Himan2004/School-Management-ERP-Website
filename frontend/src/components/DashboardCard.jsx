import React from 'react';

const DashboardCard = ({
  icon,
  title,
  value,
  subtitle,
  color = 'orange',
  trend,
  trendDirection = 'up',
}) => {
  const colorClasses = {
    orange: 'from-orange-400 to-orange-300 border-orange-200',
    yellow: 'from-yellow-400 to-yellow-300 border-yellow-200',
    green: 'from-green-400 to-green-300 border-green-200',
    blue: 'from-blue-300 to-blue-200 border-blue-200',
    pink: 'from-pink-400 to-pink-300 border-pink-200',
    purple: 'from-purple-400 to-purple-300 border-purple-200',
  };



  const iconBgClasses = {
    orange: 'bg-orange-100',
    yellow: 'bg-yellow-100',
    green: 'bg-green-100',
    blue: 'bg-blue-100',
    pink: 'bg-pink-100',
    purple: 'bg-purple-100',
  };

  return (
    <div
      className={`bg-gradient-to-br ${colorClasses[color]} rounded-3xl p-6 shadow-lg border-2 hover:shadow-2xl transition-all duration-300 transform hover:scale-105`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-sm md:text-base">{title}</h3>
        <div className={`${iconBgClasses[color]} p-3 rounded-2xl`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>

      {/* Value */}
      <div className="mb-4">
        <p className="text-white text-4xl md:text-5xl font-bold mb-1">{value}</p>
        {subtitle && <p className="text-white text-sm opacity-90">{subtitle}</p>}
      </div>

      {/* Trend */}
      {trend && (
        <div
          className={`flex items-center space-x-2 ${
            trendDirection === 'up' ? 'text-green-600' : 'text-red-600'
          } font-semibold text-sm`}
        >
          <span>{trendDirection === 'up' ? '📈' : '📉'}</span>
          <span>
            {trend} {trendDirection === 'up' ? 'increase' : 'decrease'} this month
          </span>
        </div>
      )}
    </div>
  );
};

export default DashboardCard;
