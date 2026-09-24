import React from 'react';
import { Share2, Clock as ClockIcon } from 'lucide-react';

const plans = [
  { 
    class: 'Class V, B', 
    title: 'Introduction Note to Physics on Tech', 
    progress: 75,
    color: 'success', // Green
    bgClass: 'bg-[#22c55e]/10',
    textClass: 'text-[#22c55e]',
    barColor: '#22c55e'
  },
  { 
    class: 'Class V, A', 
    title: 'Biometric & their Working Functionality', 
    progress: 45,
    color: 'warning', // Yellow
    bgClass: 'bg-[#f59e0b]/10',
    textClass: 'text-[#f59e0b]',
    barColor: '#f59e0b'
  },
  { 
    class: 'Class IV, C', 
    title: 'Analyze and interpret literary texts skills', 
    progress: 60,
    color: 'primary', // Blue
    bgClass: 'bg-[#4361ee]/10',
    textClass: 'text-[#4361ee]',
    barColor: '#4361ee'
  },
  { 
    class: 'Class V, A', 
    title: 'Enhance vocabulary and grammar skills', 
    progress: 20,
    color: 'danger', // Red
    bgClass: 'bg-[#ef4444]/10',
    textClass: 'text-[#ef4444]',
    barColor: '#ef4444'
  }
];

const SyllabusPlan = () => {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm-soft col-span-1 lg:col-span-3">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-gray-800 text-[16px]">Syllabus / Lesson Plan</h3>
        <button className="text-primary text-[13px] font-bold hover:underline">View All</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {plans.map((plan, idx) => (
          <div key={idx} className="bg-white border text-center border-gray-100 rounded-xl p-5 hover:border-gray-200 hover:shadow-md-soft transition-all group flex flex-col justify-between min-h-[170px]">
            <div>
              <div className={`px-4 py-1.5 rounded-lg text-[13px] font-bold w-full mb-5 ${plan.bgClass} ${plan.textClass}`}>
                {plan.class}
              </div>
              <h4 className="font-bold text-gray-800 text-[14px] leading-snug mb-5 group-hover:text-primary transition-colors line-clamp-2">
                {plan.title}
              </h4>
            </div>

            <div>
              <div className="h-1.5 w-full bg-[#f4f7fe] rounded-full overflow-hidden mb-5">
                <div 
                  className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                  style={{ width: `${plan.progress}%`, backgroundColor: plan.barColor }}
                >
                    <div className="absolute top-0 left-0 w-full h-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
              </div>
              
              <div className="flex justify-between items-center text-[12px] text-gray-500 font-semibold">
                <button className="flex items-center gap-1.5 hover:text-gray-800 transition-colors">
                  <ClockIcon className="w-3.5 h-3.5" /> Reschedule
                </button>
                <button className="flex items-center gap-1.5 text-[#4361ee] hover:text-blue-800 transition-colors">
                  <Share2 className="w-3.5 h-3.5" /> Share
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SyllabusPlan;
