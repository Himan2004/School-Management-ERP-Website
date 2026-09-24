import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

const students = [
  { id: '35013', name: 'Janet', class: 'III', section: 'A', marks: '89%', cgpa: '4.2', status: 'Pass', avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop" },
  { id: '35013', name: 'Joann', class: 'IV', section: 'B', marks: '88%', cgpa: '3.2', status: 'Pass', avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop" },
  { id: '35013', name: 'Kathleen', class: 'II', section: 'A', marks: '69%', cgpa: '4.5', status: 'Pass', avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop" },
  { id: '35013', name: 'Gifford', class: 'I', section: 'B', marks: '21%', cgpa: '4.5', status: 'Fail', avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop" },
];

const StudentMarksTable = () => {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [selectedClass, setSelectedClass] = useState('All Classes');
  const [selectedSection, setSelectedSection] = useState('All Sections');

  const toggleDropdown = (dropdown) => {
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm-soft col-span-1 lg:col-span-2 overflow-hidden flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h3 className="font-bold text-gray-800 text-[16px]">Student Marks</h3>
        <div className="flex items-center gap-2">
          
          <div className="relative">
            <button 
              onClick={() => toggleDropdown('class')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded text-gray-600 font-semibold text-[13px] hover:bg-gray-50 transition-colors shadow-sm tracking-wide z-10 relative"
            >
              <span className="w-3 h-3 rounded-full bg-gray-100 flex items-center justify-center mr-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary block"></span>
              </span> 
              {selectedClass} 
              <ChevronDown className={cn("w-3.5 h-3.5 opacity-60 ml-1 transition-transform duration-200", activeDropdown === 'class' ? "rotate-180" : "")} />
            </button>
            {activeDropdown === 'class' && (
              <div className="absolute right-0 top-[32px] w-36 bg-white border border-gray-100 shadow-md-soft rounded-lg py-1 z-20">
                {['All Classes', 'Class I', 'Class II', 'Class III'].map((cls) => (
                  <button key={cls} onClick={() => { setSelectedClass(cls); setActiveDropdown(null); }} className="w-full text-left px-4 py-2 text-[13px] hover:bg-gray-50 text-gray-700">
                    {cls}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button 
              onClick={() => toggleDropdown('section')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded text-gray-600 font-semibold text-[13px] hover:bg-gray-50 transition-colors shadow-sm tracking-wide z-10 relative"
            >
              <span className="w-3 h-3 rounded-full bg-gray-100 flex items-center justify-center mr-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary block"></span>
              </span> 
              {selectedSection} 
              <ChevronDown className={cn("w-3.5 h-3.5 opacity-60 ml-1 transition-transform duration-200", activeDropdown === 'section' ? "rotate-180" : "")} />
            </button>
             {activeDropdown === 'section' && (
              <div className="absolute right-0 top-[32px] w-36 bg-white border border-gray-100 shadow-md-soft rounded-lg py-1 z-20">
                {['All Sections', 'Section A', 'Section B', 'Section C'].map((sec) => (
                  <button key={sec} onClick={() => { setSelectedSection(sec); setActiveDropdown(null); }} className="w-full text-left px-4 py-2 text-[13px] hover:bg-gray-50 text-gray-700">
                    {sec}
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      <div className="overflow-x-auto flex-1 custom-scrollbar">
        <table className="w-full text-left whitespace-nowrap">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="pb-4 font-bold text-[13px] text-gray-800 px-2">ID</th>
              <th className="pb-4 font-bold text-[13px] text-gray-800">Name</th>
              <th className="pb-4 font-bold text-[13px] text-gray-800 flex justify-center">Class</th>
              <th className="pb-4 font-bold text-[13px] text-gray-800">Section</th>
              <th className="pb-4 font-bold text-[13px] text-gray-800">Marks %</th>
              <th className="pb-4 font-bold text-[13px] text-gray-800">CGPA</th>
              <th className="pb-4 font-bold text-[13px] text-gray-800 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="text-[14px]">
            {students.map((student, idx) => (
              <tr key={idx} className="border-b border-gray-50 hover:bg-[#f4f7fe]/50 transition-colors group">
                <td className="py-4 font-medium text-gray-500 px-2">{student.id}</td>
                <td className="py-2.5 min-w-[150px]">
                  <div className="flex items-center gap-3">
                    <img src={student.avatar} alt={student.name} className="w-8 h-8 rounded-lg object-cover shadow-sm" />
                    <span className="font-bold text-gray-800 group-hover:text-primary transition-colors">{student.name}</span>
                  </div>
                </td>
                <td className="py-4 font-semibold text-gray-600 text-center">{student.class}</td>
                <td className="py-4 font-semibold text-gray-600 pl-4">{student.section}</td>
                <td className="py-4 font-semibold text-gray-600">{student.marks}</td>
                <td className="py-4 font-semibold text-gray-600">{student.cgpa}</td>
                <td className="py-4 text-center">
                  <span className={cn(
                     "px-3 py-1.5 rounded-[6px] text-[12px] font-bold shadow-sm inline-block min-w-[60px]",
                     student.status === 'Pass' ? 'bg-[#22c55e] text-white' : 'bg-[#ef4444] text-white'
                  )}>
                    {student.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentMarksTable;
