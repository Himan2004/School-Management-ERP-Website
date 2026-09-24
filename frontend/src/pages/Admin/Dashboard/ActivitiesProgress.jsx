import React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Activity, ThumbsUp, MessageCircle, Share2, Send, ChevronRight } from 'lucide-react';
import { useSelector } from 'react-redux';
import { selectIsDarkMode } from '../../../features/theme/themeSlice';
import { Button } from '../../../components/shared/Common_Components';

const ActivitiesProgress = ({
  activities,
  likedActivities,
  handleActivityLike,
  addNotification,
  progressData,
  totalClassesCount,
  completedClassesCount,
  remainingClassesCount
}) => {
  const navigate = useNavigate();
  const darkMode = useSelector(selectIsDarkMode);

  return (
    <div className="w-full">
      {/* Student Activity Feed */}
      <div className={`rounded-[24px] p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 h-full flex flex-col border
        ${darkMode 
          ? 'bg-[#1e293b] border-slate-800 text-white shadow-slate-950/20 hover:shadow-slate-950/40' 
          : 'bg-white border-[#E7E2DB] text-slate-800 shadow-[0_6px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_30px_rgba(34,63,116,0.06)]'}`}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className={`font-semibold text-lg flex items-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            <Activity className="w-5 h-5 mr-2 text-[#223F74] dark:text-[#F59B87]" />
            Student Activity Feed
          </h3>
          <div className="w-28">
            <Button
              variant="ghost"
              text="View All"
              icon={<ChevronRight className="w-4 h-4" />}
              onClick={() => navigate('/admin/tasks')}
              size={12}
            />
          </div>
        </div>

        <div className="space-y-4 flex-1 overflow-y-auto pr-2">
          {activities.map((activity) => (
            <div 
              key={activity.id} 
              className={`group flex items-start space-x-3 p-3 rounded-2xl transition-all
                ${darkMode ? 'hover:bg-slate-800/40' : 'hover:bg-gray-50'}`}
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#223F74] to-[#7A8FC6]"></div>
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 bg-[#5B9A6A] rounded-full border-2 ${darkMode ? 'border-[#1e293b]' : 'border-white'}`}></div>
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className={`font-semibold transition-colors ${darkMode ? 'group-hover:text-[#F59B87] text-white' : 'group-hover:text-[#223F74] text-slate-800'}`}>{activity.student}</p>
                  <span className={`text-xs transition-colors ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>{activity.time}</span>
                </div>
                <p className={`text-sm mt-0.5 transition-colors ${darkMode ? 'text-slate-300' : 'text-gray-650'}`}>{activity.achievement}</p>
                
                <div className="flex items-center space-x-4 mt-2">
                  <button 
                    onClick={() => handleActivityLike(activity.id)} 
                    className={`flex items-center space-x-1 text-xs transition-colors ${darkMode ? 'text-slate-400 hover:text-[#F59B87]' : 'text-gray-500 hover:text-[#223F74]'}`}
                  >
                    <ThumbsUp className={`w-4 h-4 ${likedActivities[activity.id] ? 'fill-current text-[#F59B87]' : ''}`} />
                    <span>{activity.likes + (likedActivities[activity.id] ? 1 : 0)}</span>
                  </button>
                  <button 
                    onClick={() => toast("Comments section is view-only on dashboard.")} 
                    className={`flex items-center space-x-1 text-xs transition-colors ${darkMode ? 'text-slate-400 hover:text-[#F59B87]' : 'text-gray-500 hover:text-[#223F74]'}`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{activity.comments}</span>
                  </button>
                  <button 
                    onClick={() => toast.success("Activity details copied to clipboard!")} 
                    className={`flex items-center space-x-1 text-xs transition-colors ${darkMode ? 'text-slate-400 hover:text-[#F59B87]' : 'text-gray-500 hover:text-[#223F74]'}`}
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className={`mt-4 pt-4 border-t transition-colors ${darkMode ? 'border-slate-800' : 'border-[#E7E2DB]'}`}>
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#223F74] to-[#7A8FC6]"></div>
            <input 
              type="text" 
              placeholder="Share an achievement..." 
              className={`flex-1 px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] border transition-all
                ${darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400' : 'bg-white border-[#E7E2DB] text-slate-800'}`}
              onKeyPress={(e) => { if (e.key === 'Enter' && e.target.value.trim()) { addNotification(`Achievement posted: "${e.target.value}"`, 'success'); e.target.value = ''; } }} 
            />
            <button 
              onClick={(e) => { const input = e.currentTarget.previousElementSibling; if (input.value.trim()) { addNotification(`Achievement posted: "${input.value}"`, 'success'); input.value = ''; } }}
              className="p-3.5 bg-[#F59B87] text-white rounded-xl hover:bg-[#EC856D] active:scale-95 transition-all duration-200"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivitiesProgress;