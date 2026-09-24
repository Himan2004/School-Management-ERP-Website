import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronDown, UserX, UserCheck, ShieldAlert } from 'lucide-react';
import { cn } from '../../lib/utils';

const leaves = [
  { 
    title: 'Emergency Leave', 
    date: 'Date : 15 Jun 2024', 
    status: 'Pending',
    type: 'emergency',
    icon: <ShieldAlert className="w-[18px] h-[18px]" />
  },
  { 
    title: 'Medical Leave', 
    date: 'Date : 15 Jun 2024', 
    status: 'Approved',
    type: 'medical',
    icon: <UserCheck className="w-[18px] h-[18px]" />
  },
  { 
    title: 'Medical Leave', 
    date: 'Date : 16 Jun 2024', 
    status: 'Declined',
    type: 'medical',
    icon: <UserCheck className="w-[18px] h-[18px]" />
  },
];

const LeaveStatus = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('This Month');

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm-soft h-full flex flex-col">
      <div className="flex justify-between items-center mb-6 relative">
        <h3 className="font-bold text-gray-800 text-[16px]">Leave Status</h3>
        
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

      <div className="flex-1 flex flex-col gap-4">
        {leaves.map((leave, idx) => (
          <div key={idx} className="bg-white border text-center border-gray-100 rounded-xl p-4 flex items-center justify-between hover:border-gray-200 hover:shadow-md-soft transition-all group">
            <div className="flex items-center gap-4 text-left">
               <div className={cn(
                  "w-[42px] h-[42px] min-w-[42px] rounded-full flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm",
                  leave.type === 'emergency' ? 'bg-[#ef4444]/10 text-[#ef4444]' : 'bg-[#4361ee]/10 text-[#4361ee]'
                )}>
                  {leave.icon}
                </div>
                <div>
                  <h4 className="font-bold text-[14px] text-gray-800 mb-1 leading-snug group-hover:text-primary transition-colors">{leave.title}</h4>
                  <p className="text-[12px] font-medium text-gray-500 tracking-wide">{leave.date}</p>
                </div>
            </div>
            
            <span className={cn(
              "px-3 py-1 text-[12px] font-bold rounded-[6px] flex items-center gap-1.5 shadow-sm min-w-[85px] justify-center",
              leave.status === 'Pending' ? 'text-primary bg-primary/10 border border-primary/20' :
              leave.status === 'Approved' ? 'bg-[#22c55e] text-white border border-[#22c55e]' :
              'bg-[#ef4444] text-white border border-[#ef4444]'
            )}>
              {leave.status === 'Pending' && <span className="w-1.5 h-1.5 rounded-full bg-primary block"></span>}
              {leave.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeaveStatus;
