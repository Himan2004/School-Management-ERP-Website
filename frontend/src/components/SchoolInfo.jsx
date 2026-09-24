import React from "react";
import { Menu, ChevronLeft } from 'lucide-react';
import { useSelector } from "react-redux";
import { BRAND_CONFIG } from "../config/brandConfig";

// 🔥 1. IMPORT YOUR STATIC LOGO HERE
// Adjust the relative path depending on where SchoolInfo.jsx is relative to your assets folder!
import graphuraLogo from '../assets/Graphura_Logo_Sm.png';

// Added 'role' to the props
const SchoolInfo = ({ isOpen, setIsExpanded, setIsOpen, setMobileOpen, isMobileOpen, role = "User" }) => {
    const setSidebarExpanded = setIsExpanded || setIsOpen;
    const adminUser = useSelector((state) => state.adminAuth?.authUser);
    const teacherUser = useSelector((state) => state.teacherAuth?.teacher);
    const principalUser = useSelector((state) => state.principalAuth?.principal);
    const studentUser = useSelector((state) => state.studentAuth?.student);
    const parentUser = useSelector((state) => state.parentAuth?.parent);
    const accountantUser = useSelector((state) => state.accountantAuth?.accountant);
    const superUser = useSelector((state) => state.superAuth?.authUser);

    const activeUser =
        adminUser ||
        teacherUser ||
        principalUser ||
        studentUser ||
        parentUser ||
        accountantUser ||
        superUser ||
        null;

    const school = activeUser?.school || null;
    
    // We keep the dynamic name so it still says "Delhi Public School" or whatever they registered as
    const schoolName =
        school?.schoolName ||
        school?.name ||
        activeUser?.organizationName ||
        BRAND_CONFIG.name;

    // 🔥 2. HARDCODE THE LOGO
    const schoolLogo = graphuraLogo;
    const logoAlt = `Graphura Logo`;

    return (
        <div className={`flex items-center ${isOpen ? 'justify-between' : 'justify-center'} px-2 h-20 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-950 transition-all duration-300`}>
            <div className={`flex items-center ${isOpen ? 'gap-3' : 'justify-center'} overflow-hidden w-full`}>
                {/* School Icon: Clicking it when minimized expands the sidebar */}
                <img
                    src={schoolLogo}
                    alt={logoAlt}
                    className={`rounded-lg object-cover flex-shrink-0 border border-gray-50 dark:border-slate-800 shadow-sm cursor-pointer 
  ${isOpen ? 'w-16 h-16' : 'w-16 h-16'}
`}                  onClick={() => !isOpen && setSidebarExpanded?.(true)}
                />

                {/* School Name & Dynamic Role */}
                {(isOpen || isMobileOpen) && (
                    <div className="flex flex-col min-w-0 transition-opacity duration-300">
                        <span className="text-[14px] font-bold text-slate-800 dark:text-white truncate leading-tight">
                            {schoolName}
                        </span>
                        {/* Dynamic Role Display */}
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
                            {role.replace('-', ' ')}
                        </span>
                    </div>
                )}
            </div>

            {/* --- BUTTON LOGIC --- */}

            {/* 1. DESKTOP TOGGLE: Hidden on mobile. 
                 Shows 'Menu' icon. If you want it to always be visible even when minimized, 
                 adjust the 'hidden' logic. */}
            {isOpen && (
                <button
                    onClick={() => setSidebarExpanded?.(!isOpen)}
                    className="hidden lg:flex text-gray-400 dark:text-slate-500 hover:bg-gray-50 dark:hover:bg-slate-900 p-1.5 rounded-lg transition-colors flex-shrink-0"
                >
                    <Menu size={20} />
                </button>
            )}

            {/* 2. MOBILE CLOSE: Only shows on small screens when sidebar is pulled out */}
            {isMobileOpen && (
                <button
                    onClick={() => setMobileOpen(false)}
                    className="lg:hidden text-gray-500 dark:text-slate-400 p-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full flex-shrink-0"
                >
                    <ChevronLeft size={22} />
                </button>
            )}
        </div>
    );
};

export default SchoolInfo;