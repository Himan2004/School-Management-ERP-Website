import React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Bell, BookOpen, FileText, Calendar, Plus, CreditCard, TrendingUp, TrendingDown, Clock as ClockIcon, CheckCircle, XCircle, Eye, Target, ChevronRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useSelector } from 'react-redux';
import { selectIsDarkMode } from '../../../features/theme/themeSlice';
import { Button, Select, Option } from '../../../components/shared/Common_Components';

const NoticesFinance = ({
  filterType,
  setFilterType,
  getFilteredNotices,
  setShowNoticeForm,
  addNotification,
  financialSummary,
  paymentMethodsData,
  financeLoading,
  leaveRequests,
  handleApproveLeave,
  handleRejectLeave,
  performanceData,
  subjectPerformanceData
}) => {
  const navigate = useNavigate();

  const getNoticeDateDisplay = (createdAt) => {
    if (!createdAt) return '—';
    
    const createdTime = new Date(createdAt).getTime();
    if (isNaN(createdTime)) return '—';
    
    const now = new Date().getTime();
    const diffMs = now - createdTime;
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 24) {
      return 'Today';
    }
    
    const dateObj = new Date(createdAt);
    const day = String(dateObj.getDate()).padStart(2, '0');
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[dateObj.getMonth()];
    const year = dateObj.getFullYear();
    
    return `${day} ${month} ${year}`;
  };
  const darkMode = useSelector(selectIsDarkMode);
  const totalPerformanceStudents = performanceData.reduce((acc, curr) => acc + (curr.students || 0), 0);

  const paymentMethods = [
    { label: 'Online', percentage: paymentMethodsData?.online || 0, color: 'bg-blue-500' },
    { label: 'Cash',   percentage: paymentMethodsData?.cash || 0, color: 'bg-green-500' },
    { label: 'Cheque', percentage: paymentMethodsData?.cheque || 0, color: 'bg-purple-500' },
  ];

  return (
    <>
      {/* Row 1: Notice Board | Financial Overview */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        {/* Notice Board */}
        <div className={`rounded-[24px] p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 h-full flex flex-col border
          ${darkMode 
            ? 'bg-[#1e293b] border-slate-800 text-white shadow-slate-950/20 hover:shadow-slate-950/40' 
            : 'bg-white border-[#E7E2DB] text-slate-800 shadow-[0_6px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_30px_rgba(34,63,116,0.06)]'}`}
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className={`font-semibold text-lg flex items-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              <Bell className="w-5 h-5 mr-2 text-[#223F74] dark:text-[#F59B87]" />
              Notice Board
            </h3>
            <div className="flex items-center space-x-2 w-48 z-[20]">
              <Select 
                value={filterType} 
                onChange={(e) => { 
                  setFilterType(e.target.value); 
                  addNotification(`Filter changed to: ${e.target.value === 'all' ? 'All Categories' : e.target.value}`, 'success'); 
                }}
                searchable={false}
                size={12}
              >
                <Option value="all" label="All Categories" />
                <Option value="academic" label="Academic" />
                <Option value="exam" label="Exam" />
                <Option value="event" label="Event" />
              </Select>
            </div>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-2 flex-1">
            {getFilteredNotices().length === 0 ? (
              <div className={`flex flex-col items-center justify-center p-8 rounded-xl border border-dashed h-48 transition-colors
                ${darkMode ? 'bg-slate-800/40 border-[#334155] text-slate-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
              >
                <Bell className="w-10 h-10 mb-2 text-gray-300" />
                <p className="text-sm">No notices found</p>
              </div>
            ) : (
              getFilteredNotices().map((notice) => (
                <div 
                  key={notice.id} 
                  onClick={() => navigate('/admin/notice')} 
                  className={`group p-4 rounded-xl border transition-all cursor-pointer
                    ${darkMode 
                      ? 'bg-slate-800/40 border-transparent hover:bg-slate-800 hover:border-[#334155]' 
                      : 'bg-gray-50 border-transparent hover:bg-gray-100 hover:border-blue-100 hover:shadow-sm'}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors
                        ${notice.category === 'academic' 
                          ? (darkMode ? 'bg-[#7A8FC6]/20 text-[#7A8FC6]' : 'bg-[#7A8FC6]/10 text-[#7A8FC6]') 
                          : notice.category === 'exam' 
                          ? (darkMode ? 'bg-[#F59B87]/20 text-[#F59B87]' : 'bg-[#F59B87]/10 text-[#F59B87]') 
                          : (darkMode ? 'bg-[#5B9A6A]/20 text-[#5B9A6A]' : 'bg-[#5B9A6A]/10 text-[#5B9A6A]')}`}
                      >
                        {notice.category === 'academic' ? <BookOpen className="w-5 h-5" /> : notice.category === 'exam' ? <FileText className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
                      </div>
                      <div>
                        <h5 className={`font-medium group-hover:text-[#F59B87] transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>{notice.title}</h5>
                        <p className={`text-xs mt-1 transition-colors ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Added: {getNoticeDateDisplay(notice.createdAt)} • {notice.views} views</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className={`mt-4 pt-4 border-t flex justify-between items-center transition-colors ${darkMode ? 'border-slate-800' : 'border-[#E7E2DB]'}`}>
            <div className="w-36">
              <Button
                variant="ghost"
                text="Add Notice"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setShowNoticeForm(true)}
                size={12}
              />
            </div>
            <span className={`text-xs transition-colors ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>{getFilteredNotices().length} notices</span>
          </div>
        </div>

        {/* Financial Overview */}
        <div className={`rounded-[24px] p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 h-full flex flex-col border
          ${darkMode 
            ? 'bg-[#1e293b] border-slate-800 text-white shadow-slate-950/20 hover:shadow-slate-950/40' 
            : 'bg-white border-[#E7E2DB] text-slate-800 shadow-[0_6px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_30px_rgba(34,63,116,0.06)]'}`}
        >
          <h3 className={`font-semibold text-lg mb-6 flex items-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            <CreditCard className="w-5 h-5 mr-2 text-[#223F74] dark:text-[#F59B87]" />
            Financial Overview
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            {financeLoading ? (
              [1, 2, 3, 4].map((i) => (
                <div 
                  key={i} 
                  className={`p-5 rounded-xl animate-pulse h-32 flex flex-col justify-between border
                    ${darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-gray-50 border-[#E7E2DB]'}`}
                >
                  <div className="flex justify-between items-center">
                    <div className={`w-10 h-10 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
                    <div className={`w-12 h-6 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
                  </div>
                  <div className={`h-4 rounded w-24 ${darkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
                  <div className={`h-6 rounded w-16 ${darkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
                </div>
              ))
            ) : (
              financialSummary.map((item) => {
                const Icon = item.icon;
                const trendUp = item.trend.startsWith('+');
                
                // Dynamic color styling using theme colors
                let cardStyles = '';
                let iconStyles = '';
                let trendStyles = '';

                if (item.id === 1 || item.id === 2) {
                  // Success Green (#5B9A6A)
                  cardStyles = darkMode 
                    ? 'bg-[#5B9A6A]/10 border-[#5B9A6A]/15 hover:border-[#5B9A6A]/30 text-white' 
                    : 'bg-[#5B9A6A]/5 border-[#5B9A6A]/10 hover:border-[#5B9A6A]/20 text-slate-800';
                  iconStyles = 'text-[#5B9A6A] bg-[#5B9A6A]/15 dark:bg-[#5B9A6A]/25';
                  trendStyles = 'text-[#5B9A6A] bg-[#5B9A6A]/15 dark:bg-[#5B9A6A]/25';
                } else if (item.id === 3) {
                  // Danger Rose (#D66B5F)
                  cardStyles = darkMode 
                    ? 'bg-[#D66B5F]/10 border-[#D66B5F]/15 hover:border-[#D66B5F]/30 text-white' 
                    : 'bg-[#D66B5F]/5 border-[#D66B5F]/10 hover:border-[#D66B5F]/20 text-slate-800';
                  iconStyles = 'text-[#D66B5F] bg-[#D66B5F]/15 dark:bg-[#D66B5F]/25';
                  trendStyles = 'text-[#D66B5F] bg-[#D66B5F]/15 dark:bg-[#D66B5F]/25';
                } else {
                  // Warning Amber (#E0A04B)
                  cardStyles = darkMode 
                    ? 'bg-[#E0A04B]/10 border-[#E0A04B]/15 hover:border-[#E0A04B]/30 text-white' 
                    : 'bg-[#E0A04B]/5 border-[#E0A04B]/10 hover:border-[#E0A04B]/20 text-slate-800';
                  iconStyles = 'text-[#E0A04B] bg-[#E0A04B]/15 dark:bg-[#E0A04B]/25';
                  trendStyles = 'text-[#E0A04B] bg-[#E0A04B]/15 dark:bg-[#E0A04B]/25';
                }

                return (
                  <div 
                    key={item.id} 
                    onClick={() => navigate('/admin/finance/analytics')} 
                    className={`${cardStyles} p-5 rounded-xl hover:shadow-md border transition-all cursor-pointer group`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className={`p-2 rounded-lg group-hover:scale-110 transition-transform ${iconStyles}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className={`flex items-center text-xs px-2 py-1 rounded-full font-bold ${trendStyles}`}>
                        {trendUp ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                        {item.trend}
                      </span>
                    </div>
                    <p className={`text-sm mb-1 transition-colors ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>{item.label}</p>
                    <p className={`text-xl font-bold mb-2 transition-colors ${darkMode ? 'text-white' : 'text-gray-800'}`}>{item.amount}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className={`transition-colors ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>vs last month</span>
                      <span className={trendUp ? 'text-[#5B9A6A] font-semibold' : 'text-[#D66B5F] font-semibold'}>
                        {item.previous > 0 ? `${((item.value - item.previous) / item.previous * 100).toFixed(1)}%` : '0.0%'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Payment Methods */}
          <div className={`mt-6 pt-5 border-t transition-colors ${darkMode ? 'border-slate-800' : 'border-[#E7E2DB]'}`}>
            <h4 className={`text-sm font-semibold mb-4 transition-colors ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Payment Methods</h4>
            <div className="space-y-3">
              {paymentMethods.map((method) => {
                // Determine theme-aligned color class
                let barColor = 'bg-[#223F74] dark:bg-[#7A8FC6]';
                if (method.label === 'Cash') barColor = 'bg-[#5B9A6A]';
                if (method.label === 'Cheque') barColor = 'bg-[#E0A04B]';

                return (
                  <div key={method.label} className="flex items-center gap-3">
                    <div className={`flex-1 h-2 rounded-full overflow-hidden transition-colors ${darkMode ? 'bg-slate-800' : 'bg-gray-100'}`}>
                      <div className={`h-full ${barColor} rounded-full`} style={{ width: `${method.percentage}%` }} />
                    </div>
                    <span className={`text-xs w-24 text-right transition-colors ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>{method.label} {method.percentage}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Leave Requests | Performance Analytics */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        {/* Leave Requests */}
        <div className={`rounded-[24px] p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 border
          ${darkMode 
            ? 'bg-[#1e293b] border-slate-800 text-white shadow-slate-950/20 hover:shadow-slate-950/40' 
            : 'bg-white border-[#E7E2DB] text-slate-800 shadow-[0_6px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_30px_rgba(34,63,116,0.06)]'}`}
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className={`font-semibold text-lg flex items-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              <ClockIcon className="w-5 h-5 mr-2 text-[#223F74] dark:text-[#F59B87]" />
              Leave Requests
            </h3>
            <div className="w-28">
              <Button
                variant="ghost"
                text="View All"
                icon={<ChevronRight className="w-4 h-4" />}
                onClick={() => navigate('/admin/attendance/manage', { state: { activeTab: 'leaves' } })}
                size={12}
              />
            </div>
          </div>

          <div className="space-y-4">
            {leaveRequests.filter(r => r.status === 'pending').length === 0 ? (
              <div className={`flex flex-col items-center justify-center p-8 rounded-xl border border-dashed h-48 transition-colors
                ${darkMode ? 'bg-slate-800/40 border-[#334155] text-slate-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
              >
                <ClockIcon className="w-10 h-10 mb-2 text-orange-400" />
                <p className="text-sm">No pending leave requests</p>
              </div>
            ) : (
              leaveRequests.filter(r => r.status === 'pending').map((request) => (
                <div 
                  key={request.id} 
                  onClick={() => navigate('/admin/attendance/manage', { state: { activeTab: 'leaves' } })} 
                  className={`group rounded-2xl p-4 border transition-all cursor-pointer
                    ${darkMode 
                      ? 'bg-slate-800/40 border-transparent hover:bg-slate-800 hover:border-slate-700' 
                      : 'bg-gray-50 border-transparent hover:bg-gray-100 hover:border-[#E7E2DB] hover:shadow-sm'}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#223F74] to-[#7A8FC6]"></div>
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 ${darkMode ? 'border-[#1e293b]' : 'border-white'} ${request.status === 'pending' ? 'bg-[#E0A04B]' : request.status === 'approved' ? 'bg-[#5B9A6A]' : 'bg-[#D66B5F]'}`}></div>
                      </div>
                      <div>
                        <p className={`font-semibold group-hover:text-[#F59B87] transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>{request.name}</p>
                        <p className={`text-xs transition-colors ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>{request.role}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full border transition-colors font-bold
                      ${request.type === 'Sick Leave' 
                        ? (darkMode ? 'bg-[#D66B5F]/20 text-[#D66B5F] border-[#D66B5F]/30' : 'bg-[#D66B5F]/10 text-[#D66B5F] border-[#D66B5F]/15') 
                        : request.type === 'Vacation' 
                        ? (darkMode ? 'bg-[#5B9A6A]/20 text-[#5B9A6A] border-[#5B9A6A]/30' : 'bg-[#5B9A6A]/10 text-[#5B9A6A] border-[#5B9A6A]/15') 
                        : (darkMode ? 'bg-[#223F74]/20 text-[#7A8FC6] border-[#223F74]/30' : 'bg-[#223F74]/10 text-[#223F74] border-[#223F74]/15')}`}
                    >
                      {request.type}
                    </span>
                  </div>

                  <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm mb-3 gap-2 transition-colors ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-[#223F74] dark:text-[#7A8FC6]" />
                      <span>{request.dates}</span>
                    </div>
                    <span className={`text-xs sm:text-sm break-words transition-colors ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{request.reason}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={`text-xs transition-colors ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>Applied: {request.appliedOn}</span>
                    <div className="flex space-x-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleApproveLeave(request.id); }} 
                        className={`p-2 rounded-lg transition-all hover:scale-115 border
                          ${darkMode ? 'bg-[#5B9A6A]/15 text-[#5B9A6A] border-[#5B9A6A]/20 hover:bg-[#5B9A6A]/25' : 'bg-[#5B9A6A]/10 text-[#5B9A6A] border-[#5B9A6A]/15 hover:bg-[#5B9A6A]/20'}`}
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleRejectLeave(request.id); }} 
                        className={`p-2 rounded-lg transition-all hover:scale-115 border
                          ${darkMode ? 'bg-[#D66B5F]/15 text-[#D66B5F] border-[#D66B5F]/20 hover:bg-[#D66B5F]/25' : 'bg-[#D66B5F]/10 text-[#D66B5F] border-[#D66B5F]/15 hover:bg-[#D66B5F]/20'}`}
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); navigate('/admin/attendance/manage', { state: { activeTab: 'leaves' } }); }} 
                        className={`p-2 rounded-lg transition-all hover:scale-115 border
                          ${darkMode ? 'bg-[#223F74]/20 text-[#7A8FC6] border-[#223F74]/30 hover:bg-[#223F74]/35' : 'bg-[#223F74]/10 text-[#223F74] border-[#223F74]/15 hover:bg-[#223F74]/20'}`}
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className={`mt-4 pt-4 border-t grid grid-cols-3 gap-2 transition-colors ${darkMode ? 'border-slate-800' : 'border-[#E7E2DB]'}`}>
            <div className="text-center">
              <p className="text-lg font-extrabold text-[#E0A04B]">{leaveRequests.filter(r => r.status === 'pending').length}</p>
              <p className={`text-xs transition-colors ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Pending</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-extrabold text-[#5B9A6A]">{leaveRequests.filter(r => r.status === 'approved').length}</p>
              <p className={`text-xs transition-colors ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Approved</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-extrabold text-[#D66B5F]">{leaveRequests.filter(r => r.status === 'rejected').length}</p>
              <p className={`text-xs transition-colors ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Rejected</p>
            </div>
          </div>
        </div>

        {/* Performance Analytics */}
        <div 
          id="performance-analytics" 
          className={`rounded-[24px] p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 border
            ${darkMode 
              ? 'bg-[#1e293b] border-slate-800 text-white shadow-slate-950/20 hover:shadow-slate-950/40' 
              : 'bg-white border-[#E7E2DB] text-slate-800 shadow-[0_6px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_30px_rgba(34,63,116,0.06)]'}`}
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className={`font-semibold text-lg flex items-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              <Target className="w-5 h-5 mr-2 text-[#223F74] dark:text-[#F59B87]" />
              Performance Analytics
            </h3>
            <span 
              className={`px-2.5 py-1 text-xs rounded-full border font-bold transition-colors
                ${darkMode ? 'bg-[#7A8FC6]/20 text-[#7A8FC6] border-[#7A8FC6]/30' : 'bg-[#223F74]/10 text-[#223F74] border-[#223F74]/15'}`}
            >
              This Term
            </span>
          </div>

          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="space-y-4">
              {performanceData.map((item, idx) => (
                <div 
                  key={idx} 
                  onClick={() => navigate('/admin/exam')} 
                  className={`flex items-center space-x-3 group cursor-pointer transition-colors
                    ${darkMode ? 'hover:text-purple-400' : 'hover:text-purple-600'}`}
                >
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <div>
                    <span className={`text-sm font-medium transition-colors ${darkMode ? 'text-white' : 'text-slate-800'}`}>{item.name}</span>
                    <div className={`flex items-center space-x-2 text-xs transition-colors ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                      <span>{item.students} students</span>
                      <span>•</span>
                      <span>Avg: {item.average}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="relative h-48 w-48">
              <ResponsiveContainer width={192} height={192}>
                <PieChart>
                  <Pie data={performanceData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                    {performanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className={`text-2xl font-bold transition-colors ${darkMode ? 'text-white' : 'text-slate-800'}`}>{totalPerformanceStudents}</span>
                <span className={`text-xs transition-colors ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Total Students</span>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h4 className={`text-sm font-medium mb-3 transition-colors ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Subject-wise Performance</h4>
            <div className="space-y-3">
              {subjectPerformanceData.map((subject, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-medium w-20 transition-colors ${darkMode ? 'text-white' : 'text-slate-800'}`}>{subject.subject}</span>
                    <span className={`text-xs transition-colors ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Class {subject.class}</span>
                  </div>
                  <div className="flex items-center space-x-3 flex-1 ml-4">
                    <div className={`flex-1 h-2 rounded-full overflow-hidden transition-colors ${darkMode ? 'bg-slate-800' : 'bg-gray-100'}`}>
                      <div className="h-full bg-[#223F74] dark:bg-[#7A8FC6] rounded-full" style={{ width: `${subject.score}%` }}></div>
                    </div>
                    <span className={`text-sm font-semibold w-12 transition-colors ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>{subject.score}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default NoticesFinance;