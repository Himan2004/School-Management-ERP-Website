import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Clock, ChevronRight as ChevronRightSmall } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';

const classes = [
  { time: '09:00 - 09:45', name: 'Class V, B', color: 'danger' },
  { time: '09:00 - 09:45', name: 'Class IV, C', color: 'danger' },
  { time: '11:30 - 12:15', name: 'Class V, B', color: 'primary' },
  { time: '01:30 - 02:15', name: 'Class V, B', color: 'primary' },
  { time: '03:00 - 03:45', name: 'Class VI, A', color: 'warning' }, // Extra item to ensure scrolling works
];

const TodaysClassWidget = () => {
  const scrollContainerRef = useRef(null);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -250, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 250, behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm-soft col-span-1 xl:col-span-2">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-gray-800 text-[16px]">Today's Class</h3>
          <div className="flex items-center gap-1">
            <button 
              onClick={scrollLeft}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors active:scale-95"
            >
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
            <button 
              onClick={scrollRight}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors active:scale-95"
            >
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 cursor-pointer text-gray-400 hover:text-primary transition-colors group">
          <span className="text-[13px] font-semibold">{format(new Date(), 'dd/MMM/yyyy')}</span>
          <ChevronRightSmall className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>

      <div 
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar hide-scrollbar snap-x"
      >
        {classes.map((cls, index) => (
          <div key={index} className="bg-[#f8fafc] rounded-xl p-5 border border-gray-100 hover:shadow-sm transition-all min-w-[200px] flex-1 group snap-start">
            <div className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-white text-[12px] font-bold mb-5 shadow-sm",
              cls.color === 'danger' ? 'bg-[#ef4444]' : 
              cls.color === 'warning' ? 'bg-[#f59e0b]' : 'bg-[#4361ee]'
            )}>
              <Clock className="w-3.5 h-3.5" />
              {cls.time}
            </div>
            <p className="font-bold text-gray-800 text-[15px] group-hover:text-primary transition-colors">{cls.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TodaysClassWidget;
