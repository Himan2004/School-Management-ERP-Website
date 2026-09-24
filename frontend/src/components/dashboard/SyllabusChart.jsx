import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Completed', value: 95, color: '#4361ee' }, // Primary blue from reference
  { name: 'Pending', value: 5, color: '#ef4444' },    // Danger red
];

const SyllabusChart = () => {
  return (
    <div className="bg-white rounded-xl p-6 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-8 border border-gray-100 shadow-sm-soft h-[150px]">
      <div className="w-[100px] h-[100px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={32}
              outerRadius={46}
              paddingAngle={0}
              dataKey="value"
              stroke="none"
              startAngle={90}
              endAngle={450}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Subtle inner shadow overlay */}
        <div className="absolute inset-0 rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] pointer-events-none w-[64px] h-[64px] m-auto"></div>
      </div>

      <div className="flex flex-col justify-center">
        <h3 className="text-gray-800 font-bold mb-3 text-[16px]">Syllabus</h3>
        <div className="space-y-2.5">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-2.5 text-[13px] font-semibold">
              <span 
                className="w-2.5 h-2.5 rounded-full block shadow-sm" 
                style={{ backgroundColor: item.color }} 
              />
              <span className="text-gray-600 w-20">{item.name}</span>
              <span className="text-gray-800 font-bold">: {item.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SyllabusChart;
