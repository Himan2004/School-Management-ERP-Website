import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

const data = [
  { name: 'Present', value: 25, color: '#22c55e' }, // Green
  { name: 'Absent', value: 2, color: '#ef4444' },   // Red
  { name: 'Late', value: 1, color: '#f59e0b' },     // Yellow
  { name: 'Halfday', value: 0, color: '#4361ee' },  // Primary Blue
];

const days = [
  { label: 'M', status: 'present' },
  { label: 'T', status: 'present' },
  { label: 'W', status: 'present' },
  { label: 'T', status: 'present' },
  { label: 'F', status: 'absent' },
  { label: 'S', status: 'none' },
  { label: 'S', status: 'none' },
];

const AttendanceWidget = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('This Week');

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm-soft h-full flex flex-col">
      <div className="flex justify-between items-center mb-6 relative">
        <h3 className="font-bold text-gray-800 text-[16px]">Attendance</h3>
        
        <div className="relative">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded text-gray-600 font-semibold text-[13px] hover:bg-gray-50 transition-colors shadow-sm"
          >
            <CalendarIcon className="w-3.5 h-3.5" /> {selectedFilter} <ChevronDown className={cn("w-3.5 h-3.5 opacity-60 transition-transform duration-200", isDropdownOpen ? "rotate-180" : "")} />
          </button>
          
          {isDropdownOpen && (
            <div className="absolute right-0 top-[32px] w-36 bg-white border border-gray-100 shadow-md-soft rounded-lg py-1 z-10">
              {['This Week', 'Last Week', 'This Month'].map((filter) => (
                <button 
                  key={filter}
                  onClick={() => { setSelectedFilter(filter); setIsDropdownOpen(false); }}
                  className="w-full text-left px-4 py-2 text-[13px] hover:bg-gray-50 text-gray-700"
                >
                  {filter}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mb-6 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
        <div className="flex justify-between text-[13px] mb-3">
          <span className="font-bold text-gray-800">Last 7 Days</span>
          <span className="text-gray-500 font-medium">14 May 2024 - 21 May 2024</span>
        </div>
        <div className="flex gap-2 mb-4">
          {days.map((day, idx) => (
            <div 
              key={idx} 
              className={cn(
                "flex-1 aspect-square max-h-[36px] rounded flex items-center justify-center font-bold text-[13px] transition-transform hover:-translate-y-0.5",
                day.status === 'present' ? 'bg-[#22c55e] text-white shadow-sm' : 
                day.status === 'absent' ? 'bg-[#ef4444] text-white shadow-sm' : 
                'bg-[#f4f7fe] text-gray-400 border border-gray-100'
              )}
            >
              {day.label}
            </div>
          ))}
        </div>
        
        <p className="text-[13px] font-semibold flex items-center gap-2 text-primary">
          <CalendarIcon className="w-4 h-4" /> No of total working days <span className="text-gray-800">28 Days</span>
        </p>
      </div>

      <div className="grid grid-cols-4 pt-2 mb-6 px-1">
        <div className="text-center">
          <p className="text-[12px] text-gray-500 font-semibold mb-1 uppercase tracking-wider">Present</p>
          <p className="font-bold text-gray-800 text-xl">25</p>
        </div>
        <div className="text-center">
          <p className="text-[12px] text-gray-500 font-semibold mb-1 uppercase tracking-wider">Absent</p>
          <p className="font-bold text-gray-800 text-xl">2</p>
        </div>
        <div className="text-center">
          <p className="text-[12px] text-gray-500 font-semibold mb-1 uppercase tracking-wider">Halfday</p>
          <p className="font-bold text-gray-800 text-xl">0</p>
        </div>
        <div className="text-center">
          <p className="text-[12px] text-gray-500 font-semibold mb-1 uppercase tracking-wider">Late</p>
          <p className="font-bold text-gray-800 text-xl">1</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center min-h-[180px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data.filter(d => d.value > 0)}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
              cornerRadius={4}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Subtle inner shadow overlay */}
        <div className="absolute inset-0 rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] pointer-events-none w-[110px] h-[110px] m-auto"></div>
      </div>
    </div>
  );
};

export default AttendanceWidget;
