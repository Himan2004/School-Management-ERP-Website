import React from 'react';
import { motion } from "framer-motion"
import { X, AlertCircle, Info, CheckCircle } from 'lucide-react';

const alertConfig = {
  warning: {
    icon: AlertCircle,
    bg: 'bg-orange-50',
    border: 'border-l-orange-500',
    text: 'text-orange-700',
    iconColor: 'text-orange-500'
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50',
    border: 'border-l-blue-500',
    text: 'text-blue-700',
    iconColor: 'text-blue-500'
  },
  success: {
    icon: CheckCircle,
    bg: 'bg-green-50',
    border: 'border-l-green-500',
    text: 'text-green-700',
    iconColor: 'text-green-500'
  }
};

const StudentAlertCard = ({ 
  type = 'info',
  title,
  message,
  date,
  onDismiss,
  className = ''
}) => {
  const config = alertConfig[type] || alertConfig.info;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`${config.bg} rounded-xl p-4 border-l-4 ${config.border} flex items-start gap-3 shadow-sm hover:shadow-md transition-all ${className}`}
    >
      <Icon className={`${config.iconColor} w-5 h-5 flex-shrink-0 mt-0.5`} />
      <div className="flex-1">
        <h3 className={`font-semibold ${config.text}`}>{title}</h3>
        <p className="text-sm text-gray-700 mt-1">{message}</p>
        {date && <p className="text-xs text-gray-500 mt-2">{date}</p>}
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
};

export default StudentAlertCard;