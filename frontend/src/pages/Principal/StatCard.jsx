import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, trend, trendUp, color, bgColor, subtitle }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 group cursor-pointer transform hover:-translate-y-1">
      <div className="flex justify-between items-start mb-4">
        <div className={`${bgColor} p-3 rounded-xl group-hover:scale-110 transition-transform duration-300`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
        {trend && (
          <div className="flex items-center space-x-2">
            <span className={`flex items-center text-sm ${trendUp ? 'text-green-600' : 'text-red-600'} bg-gray-50 px-2 py-1 rounded-full`}>
              {trendUp ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {trend}
            </span>
          </div>
        )}
      </div>

      <h3 className="text-gray-500 text-sm mb-2">{title}</h3>
      <p className="text-3xl font-bold mb-4">{value}</p>

      {/* Dynamic Subtitle */}
      <div className="text-xs text-gray-500">
        <p>{subtitle || 'Overall'}</p>
      </div>
    </div>
  );
};

export default StatCard;