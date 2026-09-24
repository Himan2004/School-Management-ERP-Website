import React, { useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { format, startOfWeek, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';
import { cn } from '../../lib/utils';

const ScheduleCalendar = () => {
  const [selectedDate, setSelectedDate] = useState(new Date(2026, 2, 11));
  
  const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const startDate = startOfWeek(monthStart);
  const days = eachDayOfInterval({
    start: startDate,
    end: new Date(startDate.getTime() + 41 * 24 * 60 * 60 * 1000)
  });

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm-soft flex flex-col h-full">
      <div className="flex justify-between items-center mb-5">
        <h3 className="font-bold text-gray-800 text-[16px]">Schedules</h3>
        <button className="flex items-center gap-1.5 text-primary text-[13px] font-semibold hover:bg-primary/5 px-2 py-1 rounded transition-colors group">
          <Plus className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" /> Add New
        </button>
      </div>

      <div className="flex justify-center items-center gap-2 mb-6">
        <button className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded text-gray-600 font-semibold text-[13px] hover:bg-gray-50 transition-colors shadow-sm">
           2026 <ChevronDown className="w-3.5 h-3.5 opacity-60 flex-shrink-0" />
        </button>
        <button className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded text-gray-600 font-semibold text-[13px] hover:bg-gray-50 transition-colors shadow-sm">
           Mar <ChevronDown className="w-3.5 h-3.5 opacity-60 flex-shrink-0" />
        </button>
        <button className="px-3 py-1.5 bg-white border border-primary text-primary rounded font-semibold text-[13px] shadow-sm hover:bg-primary/5 transition-colors">
           Month
        </button>
        <button className="px-3 py-1.5 bg-white border border-transparent text-gray-500 rounded font-semibold text-[13px] hover:text-gray-800 transition-colors">
           Year
        </button>
      </div>

      <div className="grid grid-cols-7 mb-3 px-2 text-[13px]">
        {weekDays.map(day => (
          <div key={day} className="text-center font-bold text-gray-800 py-1">{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-2 flex-1 items-center px-2">
        {days.map((day, idx) => {
          const isSelected = isSameDay(day, selectedDate);
          return (
            <div key={idx} className="flex justify-center flex-1">
              <button
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "w-[34px] h-[34px] flex items-center justify-center rounded-lg text-[13px] font-semibold transition-all duration-200",
                  !isSameMonth(day, currentDate) ? "text-gray-300 pointer-events-none" : "text-gray-600 hover:bg-gray-100",
                  isSelected && "bg-primary text-white hover:bg-primary shadow-[0_4px_10px_rgba(67,97,238,0.4)] transform hover:scale-105"
                )}
              >
                {format(day, 'd')}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ScheduleCalendar;
