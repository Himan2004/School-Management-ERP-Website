import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronDown, Award } from 'lucide-react';
import { cn } from '../../lib/utils';

const students = [
  { 
    name: 'Susan Boswell', 
    class: 'III, B', 
    percentage: 98, 
    badgeColor: 'text-[#22c55e]', // Green
    badgeBg: 'bg-[#22c55e]/10',
    avatar: "https://images.unsplash.com/photo-1601288496920-b6154fe3626a?w=100&h=100&fit=crop"
  },
  { 
    name: 'Richard Mayes', 
    class: 'V, A', 
    percentage: 98, 
    badgeColor: 'text-[#0ea5e9]', // Light Info Blue
    badgeBg: 'bg-[#0ea5e9]/10',
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&h=100&fit=crop"
  },
  { 
    name: 'Veronica Randle', 
    class: 'V, B', 
    percentage: 78, 
    badgeColor: 'text-[#22c55e]',
    badgeBg: 'bg-[#22c55e]/10',
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop"
  },
];

const StudentProgress = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('This Month');

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm-soft h-full flex flex-col">
      <div className="flex justify-between items-center mb-6 relative">
        <h3 className="font-bold text-gray-800 text-[16px]">Student Progress</h3>
        
        <div className="relative">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded text-gray-600 font-semibold text-[13px] hover:bg-gray-50 transition-colors shadow-sm relative z-10"
          >
            <CalendarIcon className="w-3.5 h-3.5" /> {selectedFilter} <ChevronDown className={cn("w-3.5 h-3.5 opacity-60 flex-shrink-0 transition-transform duration-200", isDropdownOpen ? "rotate-180" : "")} />
          </button>
          
          {isDropdownOpen && (
            <div className="absolute right-0 top-[32px] w-36 bg-white border border-gray-100 shadow-md-soft rounded-lg py-1 z-20">
              {['This Week', 'This Month', 'This Year'].map((filter) => (
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

      <div className="flex-1 flex flex-col gap-3">
        {students.map((student, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all group cursor-pointer bg-white">
            <div className="flex items-center gap-3">
              <img src={student.avatar} alt={student.name} className="w-[42px] h-[42px] rounded-lg object-cover shadow-sm group-hover:scale-105 transition-transform" />
              <div>
                <h4 className="font-bold text-[14px] text-gray-800 group-hover:text-primary transition-colors">{student.name}</h4>
                <p className="text-[12px] text-gray-500 font-medium tracking-wide">{student.class}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${student.badgeBg}`}>
                <Award className={`w-4 h-4 ${student.badgeColor}`} />
              </div>
              <span className={`font-bold text-[14px] ${
                  student.percentage > 85 ? 'text-[#22c55e]' : 
                  student.percentage > 70 ? 'text-[#0ea5e9]' : 'text-[#ef4444]'
              }`}>
                {student.percentage}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentProgress;
