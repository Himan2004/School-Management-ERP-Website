import React from 'react';

const performers = [
  { className: 'Class IV, C', percentage: 80, color: '#4361ee' },  // Primary Blue
  { className: 'Class III, B', percentage: 54, color: '#f59e0b' }, // Warning Yellow
  { className: 'Class V, A', percentage: 7, color: '#0ea5e9' },    // Info Light Blue
];

const avatars = [
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
  "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop",
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop"
];

const BestPerformers = () => {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm-soft h-full flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <h3 className="font-bold text-gray-800 text-[16px]">Best Performers</h3>
        <button className="text-primary text-[13px] font-bold hover:underline">View All</button>
      </div>

      <div className="flex-1 flex flex-col justify-center space-y-8">
        {performers.map((item, idx) => (
          <div key={idx} className="flex items-center gap-4 group">
            <span className="font-semibold text-gray-700 w-24 text-[13px] group-hover:text-primary transition-colors">{item.className}</span>
            <div className="flex-1 flex items-center gap-3">
              <div className="flex -space-x-2.5">
                {avatars.map((avatar, i) => (
                  <img 
                    key={i} 
                    src={avatar} 
                    alt="avatar" 
                    className="w-[28px] h-[28px] rounded-full border-2 border-white relative z-[1] shadow-sm transform group-hover:-translate-y-0.5 transition-transform" 
                    style={{ zIndex: 3 - i, transitionDelay: `${i * 50}ms` }}
                  />
                ))}
              </div>
              <div className="flex-1 h-[14px] bg-[#f4f7fe] rounded-full overflow-hidden flex relative shadow-inner">
                <div 
                  className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                  style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                >
                   {/* Shine effect */}
                   <div className="absolute top-0 left-0 w-full h-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
              </div>
              <span className="text-[12px] font-bold text-gray-500 w-8 text-right block group-hover:text-gray-800 transition-colors">{item.percentage}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BestPerformers;
