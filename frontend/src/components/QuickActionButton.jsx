import React from 'react';

const QuickActionButton = ({ icon, label, color = 'orange' }) => {
  const colorClasses = {
    orange: 'from-orange-400 to-orange-300 hover:shadow-orange-300',
    yellow: 'from-yellow-400 to-yellow-300 hover:shadow-yellow-300',
    green: 'from-green-400 to-green-300 hover:shadow-green-300',
    blue: 'from-blue-300 to-blue-200 hover:shadow-blue-300',
    pink: 'from-pink-400 to-pink-300 hover:shadow-pink-300',
    purple: 'from-purple-400 to-purple-300 hover:shadow-purple-300',
  };

  return (
    <button
      className={`bg-gradient-to-br ${colorClasses[color]} text-white font-semibold py-4 px-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 flex flex-col items-center space-y-2 w-full md:w-auto`}
    >
      <span className="text-3xl">{icon}</span>
      <span className="text-sm">{label}</span>
    </button>
  );
};

export default QuickActionButton;
