import React from 'react';
import { useSelector } from 'react-redux';
import { selectIsDarkMode } from '../../../features/theme/themeSlice.js';
import { Users, AlertCircle, UserX, Clock } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line } from 'recharts';

const ScheduleAttendance = ({
  activeAttendanceTab,
  setActiveAttendanceTab,
  attendanceData,
  monthlyAttendanceData,
}) => {
  const darkMode = useSelector(selectIsDarkMode);

  let trendText = '--';
  let trendColor = 'text-gray-500';
  if (monthlyAttendanceData && monthlyAttendanceData.length >= 2) {
    const last = monthlyAttendanceData[monthlyAttendanceData.length - 1].attendance;
    const prev = monthlyAttendanceData[monthlyAttendanceData.length - 2].attendance;
    const diff = (last - prev).toFixed(1);
    if (diff > 0) {
      trendText = `+${diff}%`;
      trendColor = 'text-green-500';
    } else if (diff < 0) {
      trendText = `${diff}%`;
      trendColor = 'text-red-500';
    } else {
      trendText = '0.0%';
      trendColor = 'text-gray-500';
    }
  }

  return (
    <div className="mb-8">
      {/* Attendance Analytics */}
      <div id="dashboard-attendance" className={`rounded-[24px] border p-6 transition-all duration-300
        ${darkMode
          ? 'bg-[#1e293b] border-slate-800 shadow-slate-950/20 hover:shadow-slate-950/40'
          : 'bg-white border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_30px_rgba(34,63,116,0.06)] hover:-translate-y-0.5'}`}
      >
        <div className="flex items-start justify-between mb-5">
          <h3 className={`font-semibold text-lg flex items-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            <Users className="w-5 h-5 mr-2 text-[#223F74] dark:text-[#F59B87]" />
            Attendance Analytics
          </h3>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5
            ${darkMode ? 'bg-[#5B9A6A]/20 text-[#5B9A6A] border-[#5B9A6A]/30' : 'bg-[#5B9A6A]/10 text-[#5B9A6A] border-[#5B9A6A]/15'}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#5B9A6A] animate-pulse"></span>
            Live
          </span>
        </div>

        <div className={`grid grid-cols-3 gap-2 mb-5 p-1.5 rounded-xl border transition-colors duration-200
          ${darkMode ? 'bg-slate-800/50 border-slate-700/80' : 'bg-[#F4F7FB] border-[#E7E2DB]'}`}
        >
          {['Students', 'Teachers', 'Other Staff'].map(tab => (
            <button key={tab} onClick={() => setActiveAttendanceTab(tab)}
              className={`px-3 py-2 text-sm font-semibold rounded-lg transition-all duration-200 active:scale-95
                ${activeAttendanceTab === tab
                  ? (darkMode ? 'bg-slate-700 text-white shadow-sm border border-slate-650' : 'bg-white text-[#223F74] shadow-sm border border-[#E7E2DB]')
                  : (darkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800/50' : 'text-gray-600 hover:text-[#223F74] hover:bg-white/50')
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Present', value: attendanceData[activeAttendanceTab]?.present || 0, icon: AlertCircle, color: 'text-[#223F74] dark:text-[#7A8FC6]', bg: darkMode ? 'bg-[#223F74]/15 border-[#223F74]/30' : 'bg-[#223F74]/5 border-[#223F74]/15' },
            { label: 'Absent', value: attendanceData[activeAttendanceTab]?.absent || 0, icon: UserX, color: 'text-[#D66B5F]', bg: darkMode ? 'bg-[#D66B5F]/15 border-[#D66B5F]/30' : 'bg-[#D66B5F]/5 border-[#D66B5F]/15' },
            { label: 'Late', value: attendanceData[activeAttendanceTab]?.late || 0, icon: Clock, color: 'text-[#E0A04B]', bg: darkMode ? 'bg-[#E0A04B]/15 border-[#E0A04B]/30' : 'bg-[#E0A04B]/5 border-[#E0A04B]/15' },
          ].map((stat, idx) => {
            const Icon = stat.icon;
            const displayValue = (stat.value || 0).toString().padStart(2, '0');
            return (
              <div key={idx} className={`rounded-xl p-3 text-center border hover:shadow-md transition-all duration-200 ${stat.bg}`}
              >
                <Icon className={`w-4 h-4 ${stat.color} mx-auto mb-1.5`} />
                <p className={`text-lg font-extrabold ${stat.color} leading-none`}>{displayValue}</p>
                <p className={`text-[11px] mt-1 font-semibold ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>{stat.label}</p>
              </div>
            );
          })}
        </div>

        <div className={`rounded-2xl border p-4 mb-4 transition-colors duration-200
          ${darkMode ? 'border-slate-800 bg-gradient-to-br from-slate-800/50 to-slate-900/50' : 'border-gray-100 bg-gradient-to-br from-slate-50 to-white'}`}
        >
          <div className="relative h-52 flex items-center justify-center">
            <ResponsiveContainer width="100%" height={208}>
              <PieChart>
                <Pie data={[
                  { name: 'Present', value: typeof attendanceData[activeAttendanceTab]?.percentage === 'number' ? attendanceData[activeAttendanceTab]?.percentage : 0, color: '#223F74' },
                  { name: 'Absent', value: typeof attendanceData[activeAttendanceTab]?.percentage === 'number' ? 100 - attendanceData[activeAttendanceTab]?.percentage : 100, color: darkMode ? '#334155' : '#e5e7eb' },
                ]} cx="50%" cy="50%" innerRadius={62} outerRadius={82} paddingAngle={2} dataKey="value">
                  {[{ color: '#223F74' }, { color: darkMode ? '#334155' : '#e5e7eb' }].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {typeof attendanceData[activeAttendanceTab]?.percentage === 'number'
                  ? `${attendanceData[activeAttendanceTab].percentage}%`
                  : (attendanceData[activeAttendanceTab]?.percentage || '--')}
              </span>
              <span className={`text-xs tracking-wide uppercase ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Present</span>
            </div>
          </div>

          <div className={`flex items-center justify-center gap-6 mt-1 text-xs ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#223F74]"></span><span>Present</span></div>
            <div className="flex items-center gap-2"><span className={`w-2.5 h-2.5 rounded-full ${darkMode ? 'bg-slate-600' : 'bg-gray-300'}`}></span><span>Absent</span></div>
          </div>
        </div>

        <div className={`rounded-xl border px-3 py-2 transition-colors duration-200
          ${darkMode ? 'border-slate-800 bg-slate-800/30' : 'border-gray-100'}`}
        >
          <div className="flex items-center justify-between mb-1">
            <p className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>Monthly Trend</p>
            <p className={`text-xs font-medium ${trendColor}`}>{trendText}</p>
          </div>
          <div className="h-14">
            <ResponsiveContainer width="100%" height={56}>
              <LineChart data={monthlyAttendanceData}>
                <Line type="monotone" dataKey="attendance" stroke="#223F74" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleAttendance;