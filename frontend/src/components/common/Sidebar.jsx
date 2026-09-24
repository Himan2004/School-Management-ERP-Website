import React, { useState } from 'react';
import { 
  LayoutGrid, 
  ChevronDown,
  MonitorPlay,
  UserCheck,
  Briefcase
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { NavLink } from 'react-router-dom';
import { BRAND_CONFIG } from '../../config/brandConfig';

const Sidebar = () => {
  const [isMainOpen, setIsMainOpen] = useState(true);
  const [isAppOpen, setIsAppOpen] = useState(false);

  return (
    <aside className="w-64 bg-white border-r border-gray-100 h-screen flex flex-col fixed left-0 top-0 overflow-y-auto custom-scrollbar shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-50">
      {/* Logo */}
      <div className="h-[72px] flex items-center px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-sm">
            {/* Simple logo icon resembling a book/shield */}
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-bold text-[#1e293b] text-xl tracking-tight">{BRAND_CONFIG.name}</span>
        </div>
      </div>

      <div className="px-4 py-2">
        {/* School Name Card (Global International) */}
        <div className="flex justify-between items-center px-4 py-3 mb-6 bg-white border border-gray-100 rounded-xl shadow-sm-soft">
          <div className="flex items-center gap-3">
             <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-[10px] font-bold text-primary">GI</span>
             </div>
             <span className="font-semibold text-[13px] text-gray-700">Global International</span>
          </div>
        </div>

        <nav className="space-y-6">
          {/* Main Menu */}
          <div>
            <p className="text-[11px] font-bold text-gray-400 mb-2 px-3 uppercase tracking-wider">MAIN</p>
            <div className="space-y-1">
              <div className="group">
                <button 
                  onClick={() => setIsMainOpen(!isMainOpen)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#f4f7fe]/60 text-primary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 flex justify-center">
                       <LayoutGrid className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-[14px]">Dashboard</span>
                  </div>
                  <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isMainOpen ? "rotate-180" : "")} />
                </button>
                <div className={cn(
                  "mt-1 ml-4 pl-4 border-l-2 border-gray-100 space-y-1 overflow-hidden transition-all duration-300",
                  isMainOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
                )}>
                  {['Teacher Dashboard'].map((item, idx) => (
                    <NavLink
                      key={idx}
                      to={item === 'Teacher Dashboard' ? '/teacher' : '#'}
                      className={({ isActive }) => cn(
                        "block px-4 py-2 text-[13px] rounded-lg transition-colors relative",
                         isActive && item === 'Teacher Dashboard'
                           ? "text-primary font-bold before:absolute before:left-[-19px] before:top-1/2 before:-translate-y-1/2 before:w-1.5 before:h-1.5 before:bg-primary before:rounded-full" 
                           : "text-gray-500 hover:text-gray-800 font-medium"
                      )}
                    >
                      {item}
                    </NavLink>
                  ))}
                </div>
              </div>

              {/* Application Section */}
               <div className="mt-6 pt-4">
                  <button 
                    onClick={() => setIsAppOpen(!isAppOpen)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                       <div className="w-6 flex justify-center">
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                       </div>
                      <span className="font-medium text-[14px]">Application</span>
                    </div>
                    <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isAppOpen ? "rotate-180" : "")} />
                  </button>
                  <div className={cn(
                    "mt-1 ml-4 pl-4 border-l-2 border-gray-100 space-y-1 overflow-hidden transition-all duration-300",
                    isAppOpen ? "max-h-64 opacity-100 py-1" : "max-h-0 opacity-0"
                  )}>
                     <NavLink to="#" className="block px-4 py-2 text-[13px] text-gray-500 hover:text-gray-800 font-medium rounded-lg transition-colors">Calendar</NavLink>
                     <NavLink to="#" className="block px-4 py-2 text-[13px] text-gray-500 hover:text-gray-800 font-medium rounded-lg transition-colors">Chat</NavLink>
                  </div>
               </div>
            </div>
          </div>

          {/* Layout Section */}
          <div className="pt-2">
            <p className="text-[11px] font-bold text-gray-400 mb-2 px-3 uppercase tracking-wider">LAYOUT</p>
            <div className="space-y-1">
               <NavLink to="#" className="flex items-center gap-3 px-3 py-2.5 text-gray-500 hover:text-gray-800 font-medium text-[14px] rounded-xl hover:bg-gray-50">
                  <div className="w-6 flex justify-center"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg></div>
                  Default
               </NavLink>
               <NavLink to="#" className="flex items-center gap-3 px-3 py-2.5 text-gray-500 hover:text-gray-800 font-medium text-[14px] rounded-xl hover:bg-gray-50">
                  <div className="w-6 flex justify-center"><MonitorPlay className="w-5 h-5" /></div>
                  Mini
               </NavLink>
                <NavLink to="#" className="flex items-center gap-3 px-3 py-2.5 text-gray-500 hover:text-gray-800 font-medium text-[14px] rounded-xl hover:bg-gray-50">
                  <div className="w-6 flex justify-center"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M15 3v18"/></svg></div>
                  RTL
               </NavLink>
                <NavLink to="#" className="flex items-center gap-3 px-3 py-2.5 text-gray-500 hover:text-gray-800 font-medium text-[14px] rounded-xl hover:bg-gray-50">
                  <div className="w-6 flex justify-center"><Briefcase className="w-5 h-5" /></div>
                  Box
               </NavLink>
                <NavLink to="#" className="flex items-center gap-3 px-3 py-2.5 text-gray-500 hover:text-gray-800 font-medium text-[14px] rounded-xl hover:bg-gray-50">
                  <div className="w-6 flex justify-center"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg></div>
                  Dark
               </NavLink>
            </div>
          </div>
          
           {/* PEOPLES Section */}
          <div className="pt-2">
            <p className="text-[11px] font-bold text-gray-400 mb-2 px-3 uppercase tracking-wider">PEOPLES</p>
             <div className="space-y-1">
               <NavLink to="#" className="flex items-center gap-3 px-3 py-2.5 text-gray-500 hover:text-gray-800 font-medium text-[14px] rounded-xl hover:bg-gray-50">
                  <div className="w-6 flex justify-center"><UserCheck className="w-5 h-5" /></div>
                  Students
               </NavLink>
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
