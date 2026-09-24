import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BookOpen, FileText, Calendar, ChevronRight, Filter, AlertTriangle, Info, Sun, X, Download } from 'lucide-react';

export default function Notifications({ notifications = [] }) {
  const [filterType, setFilterType] = useState('All');
  const [selectedNotice, setSelectedNotice] = useState(null); // State for the modal
  const navigate = useNavigate();

  const baseNotices = notifications || [];

  const filteredNotices = filterType === 'All' 
    ? baseNotices 
    : baseNotices.filter(notice => notice.category === filterType);

  const getIcon = (category) => {
    switch (category?.toLowerCase()) {
      case "academic": 
        return { icon: <BookOpen className="w-5 h-5" />, color: "bg-blue-100 text-blue-600", label: "Academic" };
      case "exam": 
        return { icon: <FileText className="w-5 h-5" />, color: "bg-purple-100 text-purple-600", label: "Exam" };
      case "event": 
        return { icon: <Calendar className="w-5 h-5" />, color: "bg-green-100 text-green-600", label: "Event" };
      case "urgent": 
        return { icon: <AlertTriangle className="w-5 h-5" />, color: "bg-red-100 text-red-600", label: "Urgent" };
      case "administrative": 
        return { icon: <Info className="w-5 h-5" />, color: "bg-orange-100 text-orange-600", label: "Admin" };
      case "holiday": 
        return { icon: <Sun className="w-5 h-5" />, color: "bg-teal-100 text-teal-600", label: "Holiday" };
      default: 
        return { icon: <Bell className="w-5 h-5" />, color: "bg-gray-100 text-gray-600", label: "Notice" };
    }
  };

  return (
    <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 p-8 hover:shadow-md transition-shadow h-full flex flex-col font-sans relative">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center">
          <div className="bg-blue-50 p-2 rounded-lg mr-3">
            <Bell className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="font-bold text-xl text-slate-800 tracking-tight">Notice Board</h3>
        </div>

        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
          <Filter className="w-4 h-4 text-slate-400 mr-2" />
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-transparent text-sm font-semibold text-slate-600 outline-none cursor-pointer pr-2"
          >
            <option value="All">All Notices</option>
            <option value="Academic">Academic</option>
            <option value="Administrative">Administrative</option>
            <option value="Exam">Exam</option>
            <option value="Holiday">Holiday</option>
            <option value="General">General</option>
            <option value="Urgent">Urgent</option>
          </select>
        </div>
      </div>

      {/* List Section */}
      <div className="space-y-4 overflow-y-auto pr-2 no-scrollbar flex-1 max-h-[420px]">
        {filteredNotices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <div className="bg-slate-50 p-4 rounded-full mb-4">
              <Bell className="w-10 h-10 opacity-20" />
            </div>
            <p className="text-sm font-medium italic">No notices found in this category</p>
          </div>
        ) : (
          filteredNotices.map((item) => {
            const style = getIcon(item.category);
            return (
              <div 
                key={item.id} 
                className="group p-4 bg-slate-50/50 rounded-2xl hover:bg-white border border-transparent hover:border-slate-100 hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setSelectedNotice(item)} // Opens the modal instead of navigating
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center transition-all group-hover:scale-110 group-hover:rotate-3 ${style.color}`}>
                    {style.icon}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {style.label}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400">
                        {item.date}
                      </span>
                    </div>
                    <h5 className="text-[14px] font-semibold text-slate-700 group-hover:text-blue-600 transition-colors leading-relaxed line-clamp-1">
                      {item.title}
                    </h5>
                    {/* Added the content preview back in! */}
                    <p className="text-[12px] text-slate-500 mt-1 line-clamp-2">
                      {item.content}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center">
        <span className="text-xs text-slate-400 font-medium">
          Showing {filteredNotices.length} {filterType !== 'All' ? filterType : ''} updates
        </span>
        <button
          className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center group"
          onClick={() => navigate("/parent/notices")}
        >
          View All <ChevronRight className="w-3 h-3 ml-0.5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Modal Popup Component */}
      {selectedNotice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2rem] max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-100 flex items-center justify-between p-6 z-10">
              <span className={`text-xs font-black px-3 py-1 rounded-full ${getIcon(selectedNotice.category).color}`}>
                {selectedNotice.category}
              </span>
              <button
                onClick={() => setSelectedNotice(null)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <h2 className="text-2xl font-black text-slate-800 mb-2">
                {selectedNotice.title}
              </h2>
              <p className="text-slate-400 text-sm mb-4">
                Published on {selectedNotice.date}
              </p>

              <div className="border-t border-b border-slate-100 py-4 my-4">
                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {selectedNotice.content}
                </p>
              </div>

              {selectedNotice.attachment && (
                <button className="bg-blue-50 text-blue-600 px-4 py-3 rounded-2xl text-sm font-bold inline-flex items-center gap-2 hover:bg-blue-100 transition-all">
                  <Download className="w-4 h-4" />
                  Download {selectedNotice.attachmentName || "attachment"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}