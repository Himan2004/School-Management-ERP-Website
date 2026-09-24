import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

const StudentStatsCard = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  trend = 'up', 
  onClick, 
  color = 'from-indigo-500 to-purple-500'
}) => {
  const TrendIcon = trend === 'up' ? TrendingUp : TrendingDown;
  const trendColor = trend === 'up' ? 'text-green-600' : 'text-red-600';

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={`bg-gradient-to-br ${color} rounded-xl p-5 text-white shadow-lg cursor-pointer group`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 bg-white/20 rounded-lg group-hover:scale-110 transition-transform">
          <Icon className="w-5 h-5" />
        </div>
        <span className={`text-sm font-medium ${trendColor} bg-white/20 px-2 py-1 rounded-full`}>
          <TrendIcon className="inline w-3 h-3 mr-1" />
          {change}
        </span>
      </div>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm text-white/80 mt-1">{title}</p>
    </motion.div>
  );
};

export default StudentStatsCard;