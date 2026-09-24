import React from 'react';

const ProfileSummary = () => {
  return (
    <div className="bg-[#1e293b] rounded-xl p-5 md:p-6 text-white relative overflow-hidden shadow-md-soft h-[150px] flex flex-col justify-center">
      {/* Decorative bg shapes imitating screenshot */}
      <div className="absolute right-0 top-0 w-32 h-32 opacity-20 pointer-events-none">
        <svg viewBox="0 0 100 100" className="absolute top-2 right-2 w-12 h-12 text-primary" fill="currentColor">
           <path d="M50 0 L100 25 L100 75 L50 100 L0 75 L0 25 Z" />
        </svg>
        <svg viewBox="0 0 100 100" className="absolute bottom-4 right-16 w-8 h-8 text-warning" fill="none" stroke="currentColor" strokeWidth="8">
           <circle cx="50" cy="50" r="40" />
        </svg>
        <svg viewBox="0 0 100 100" className="absolute top-1/2 left-4 w-4 h-4 text-info" fill="currentColor">
           <polygon points="50 0, 100 100, 0 100" />
        </svg>
      </div>

      <div className="flex items-center justify-between relative z-10 w-full h-full">
        <div className="flex items-start gap-4">
          <div className="relative">
             <img 
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80" 
                alt="Profile" 
                className="w-20 h-20 rounded-lg object-cover border-[3px] border-[#2a364a] shadow-sm transform -rotate-1"
              />
          </div>
          
          <div className="flex flex-col justify-center h-full py-1">
            <span className="inline-block px-2 py-0.5 text-[11px] font-bold bg-[#ffffff] text-[#1e293b] rounded mb-1.5 w-max tracking-wide">#T594651</span>
            <h2 className="text-[17px] font-bold mb-1 tracking-tight text-white">Henriques Morgan</h2>
            <div className="flex items-center gap-1.5 text-[12px] text-gray-300 font-medium tracking-wide">
              <span>Classes : I-A, V-B</span>
              <span className="w-1.5 h-1.5 rounded-full bg-warning"></span>
              <span>Physics</span>
            </div>
          </div>
        </div>

        <button className="bg-[#4361ee] hover:bg-[#324fcc] text-white px-5 py-2 rounded-lg text-[13px] font-semibold transition-all shadow-[0_4px_14px_rgba(67,97,238,0.39)] hover:shadow-[0_6px_20px_rgba(67,97,238,0.23)] whitespace-nowrap self-center transform hover:-translate-y-0.5">
          Edit Profile
        </button>
      </div>
    </div>
  );
};

export default ProfileSummary;
