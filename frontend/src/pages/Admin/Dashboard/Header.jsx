import React from 'react';
import { Clock, Calendar, Plus } from 'lucide-react';
import { Button, Heading } from '../../../components/shared/Common_Components';

const Header = ({
  adminName,
  setShowTeacherForm,
  setAccountantForm,
  currentTime,
}) => {

  return (
    <>
      {/* Top Header with Animations & Welcome Info */}
      <div className="mb-8">
        <Heading
          primaryText={
            <div className="text-white text-left font-medium select-text">
              <div className="flex items-center gap-3 mb-3">
                <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-semibold uppercase tracking-wider border border-blue-500/30">
                  Portal status: Live
                </span>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
                  <span>Operational</span>
                </div>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight mb-2">
                <span className="text-[#E8612C]">Welcome back, </span>
                <span className="text-[#FFFFFF]">{adminName}</span>
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-2xl">
                Here is a quick summary of the school system metrics for today. Let's make it a productive day!
              </p>

              <div className="flex flex-wrap items-center gap-3 mt-4">
                <div className="flex items-center space-x-2 bg-slate-800/40 px-3 py-1.5 rounded-xl border border-slate-700/30 backdrop-blur-sm">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="font-semibold text-sm">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex items-center space-x-2 bg-slate-800/40 px-3 py-1.5 rounded-xl border border-slate-700/30 backdrop-blur-sm">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <span className="font-semibold text-sm">{currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>
            </div>
          }
          showAnimations={true}
          size={12}
        />
      </div>

      {/* Welcome Banner / Action Panel */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 lg:p-8 mb-8 text-white shadow-xl border border-blue-900/30">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full filter blur-3xl opacity-20 transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500 rounded-full filter blur-3xl opacity-15 transform -translate-x-1/2 translate-y-1/2"></div>

        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold">Dashboard Quick Actions</h2>
            <p className="text-xs text-slate-400 mt-1">Manage personnel and account setup</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="w-full sm:w-44">
              <Button
                onClick={() => setShowTeacherForm(true)}
                variant="primary"
                text={<span className="whitespace-nowrap text-[13px]">Add Teacher</span>}
                icon={<Plus className="w-4 h-4" />}
                size={12}
              />
            </div>
            <div className="w-full sm:w-44">
              <Button
                onClick={() => setAccountantForm(true)}
                variant="primary"
                text={<span className="whitespace-nowrap text-[13px]">Add Accountant</span>}
                icon={<Plus className="w-4 h-4" />}
                size={12}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Header;