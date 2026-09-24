import React, { useState } from 'react';
import { 
  Search, 
  Menu,
  Maximize,
  Moon,
  Sun,
  MessageSquare,
  Bell,
  Settings,
  LogOut,
  User
} from 'lucide-react';

const Header = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  
  const toggleMenu = (menu) => {
     setActiveMenu(activeMenu === menu ? null : menu);
  };

  return (
    <header className="h-[72px] bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-40 w-full shadow-sm-soft">
      {/* Left section: Search */}
      <div className="flex items-center gap-4 flex-1">
        <button className="lg:hidden text-gray-500 hover:text-gray-800 transition-colors p-2 -ml-2">
          <Menu className="w-5 h-5" />
        </button>
        <div className="relative hidden md:block w-72 max-w-md">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
             <Search className="w-4 h-4" />
          </span>
          <input 
            type="text" 
            placeholder="Search" 
            className="w-full pl-9 pr-10 py-2.5 bg-[#f4f7fe]/50 border-none rounded-2xl text-[13px] font-medium text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary/20 focus:bg-white transition-all"
          />
           <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
             <kbd className="font-sans text-[10px] bg-white border border-gray-200 px-1.5 py-0.5 rounded shadow-sm">⌘K</kbd>
          </span>
        </div>
      </div>

      {/* Right section: Actions */}
      <div className="flex items-center gap-2">
        
        {/* Academic Year selector */}
        <div className="hidden sm:flex items-center gap-2 border border-gray-100 bg-white rounded-xl px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors shadow-sm-soft mr-2">
          <CalendarIcon className="w-4 h-4 text-gray-500" />
          <span className="text-[13px] font-semibold text-gray-600">Academic Year : 2024 / 2025</span>
        </div>

        {/* Action icons */}
        <div className="flex items-center relative">
           <ActionButton onClick={() => toggleMenu('lang')} isActive={activeMenu === 'lang'}>
               <img src="https://flagcdn.com/w20/us.png" alt="English" className="w-4.5 h-auto rounded-[2px]" />
           </ActionButton>
           
           {/* Dummy Lang Dropdown */}
           {activeMenu === 'lang' && (
             <div className="absolute top-[48px] left-0 w-32 bg-white border border-gray-100 shadow-md-soft rounded-lg py-1 z-50">
               <button className="w-full text-left px-4 py-2 text-[13px] hover:bg-gray-50 text-gray-700">English (US)</button>
               <button className="w-full text-left px-4 py-2 text-[13px] hover:bg-gray-50 text-gray-700">Spanish</button>
             </div>
           )}

           <ActionButton icon={<Maximize className="w-[18px] h-[18px]" />} />
           
           <ActionButton 
              icon={darkMode ? <Sun className="w-[18px] h-[18px] text-warning" /> : <Moon className="w-[18px] h-[18px]" />} 
              onClick={() => setDarkMode(!darkMode)} 
              isActive={darkMode}
           />
           
           <div className="relative">
              <ActionButton icon={<Bell className="w-[18px] h-[18px]" />} showBadge onClick={() => toggleMenu('notif')} isActive={activeMenu === 'notif'} />
              {activeMenu === 'notif' && (
                <div className="absolute top-[48px] right-0 w-64 bg-white border border-gray-100 shadow-md-soft rounded-xl py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-100 font-bold text-[14px] text-gray-800">Notifications</div>
                  <div className="px-4 py-3 text-[13px] text-gray-500 hover:bg-gray-50 cursor-pointer">New student enrolled in Class V.</div>
                  <div className="px-4 py-3 text-[13px] text-gray-500 hover:bg-gray-50 cursor-pointer">Staff meeting at 9 AM.</div>
                </div>
              )}
           </div>

           <ActionButton icon={<MessageSquare className="w-[18px] h-[18px]" />} showBadge badgeColor="bg-primary" onClick={() => toggleMenu('msg')} isActive={activeMenu === 'msg'} />
           <ActionButton icon={<Settings className="w-[18px] h-[18px]" />} />
        </div>

        <div className="h-6 w-px bg-gray-200 mx-2 hidden sm:block"></div>

        {/* Profile */}
        <div className="relative ml-1">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => toggleMenu('profile')}>
            <div className="relative">
               <img 
                 src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80" 
                 alt="Profile" 
                 className={`w-9 h-9 rounded-full object-cover ring-2 shadow-sm transition-all ${activeMenu === 'profile' ? 'ring-primary' : 'ring-white'}`}
               />
               <div className="absolute right-0 bottom-0 w-2.5 h-2.5 bg-success rounded-full ring-2 ring-white"></div>
            </div>
          </div>
          
          {/* Profile Dropdown */}
          {activeMenu === 'profile' && (
             <div className="absolute top-[48px] right-0 w-48 bg-white border border-gray-100 shadow-md-soft rounded-xl py-2 z-50">
                <button className="w-full text-left px-4 py-2.5 text-[13px] hover:bg-gray-50 text-gray-700 flex items-center gap-2 font-medium">
                  <User className="w-4 h-4" /> My Profile
                </button>
                <button className="w-full text-left px-4 py-2.5 text-[13px] hover:bg-gray-50 text-gray-700 flex items-center gap-2 font-medium">
                  <Settings className="w-4 h-4" /> Settings
                </button>
                <div className="h-px bg-gray-100 my-1"></div>
                <button className="w-full text-left px-4 py-2.5 text-[13px] hover:bg-red-50 text-red-600 flex items-center gap-2 font-medium">
                  <LogOut className="w-4 h-4" /> Logout
                </button>
             </div>
          )}
        </div>
      </div>
    </header>
  );
};

const ActionButton = ({ icon, children, showBadge, badgeColor = "bg-danger", onClick, isActive }) => (
  <button 
    onClick={onClick}
    className={`relative p-2.5 transition-colors flex items-center justify-center rounded-full ${isActive ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:text-primary hover:bg-[#f4f7fe]'}`}
  >
    {icon || children}
    {showBadge && (
      <span className={`absolute top-2 right-2.5 w-[7px] h-[7px] ${badgeColor} rounded-full border-[1.5px] border-white`}></span>
    )}
  </button>
);

const CalendarIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
    <line x1="16" x2="16" y1="2" y2="6"/>
    <line x1="8" x2="8" y1="2" y2="6"/>
    <line x1="3" x2="21" y1="10" y2="10"/>
  </svg>
)

export default Header;
