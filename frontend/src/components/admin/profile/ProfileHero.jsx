import { ShieldCheck, Mail, Phone, Building2, Calendar, User } from 'lucide-react';
import { useSelector } from 'react-redux';
import { selectIsDarkMode } from '../../../features/theme/themeSlice';

const ProfileHero = ({ profile, authUser, initials, completionPercentage, schoolName }) => {
  const imageUrl = profile?.profileImage || profile?.avatarUrl;
  const darkMode = useSelector(selectIsDarkMode);
  
  // Format join date
  const joinDate = profile?.createdAt 
    ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : authUser?.createdAt 
      ? new Date(authUser.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : 'N/A';

  return (
    <div className={`overflow-hidden rounded-2xl border shadow-lg transition-colors duration-200 ${
      darkMode ? 'border-[#334155]' : 'border-slate-100'
    }`}>
      <div className="relative bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 p-6 md:p-8 text-white">
        {/* Background decorative circles */}
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 left-10 h-36 w-36 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-center justify-between">
          <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            {/* Avatar */}
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Admin avatar"
                className="h-28 w-28 rounded-2xl border-4 border-white/20 object-cover shadow-2xl transition-transform duration-300 hover:scale-105"
              />
            ) : (
              <div className="grid h-28 w-28 place-items-center rounded-2xl border-4 border-white/20 bg-white/10 text-4xl font-bold backdrop-blur-sm shadow-2xl text-white">
                {initials}
              </div>
            )}

            {/* Profile Info Details */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl font-black md:text-3xl tracking-tight">{profile?.name || authUser?.name || 'Administrator'}</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-300 border border-blue-500/30 backdrop-blur-sm">
                  <ShieldCheck className="h-3.5 w-3.5" /> Admin
                </span>
              </div>
              
              <p className="text-sm font-medium text-slate-300 flex items-center justify-center sm:justify-start gap-1.5">
                Role: School Administrator
              </p>

              <div className="flex flex-col sm:flex-row sm:flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1.5 text-xs text-slate-300 pt-1">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" /> {profile?.email || authUser?.email}
                </span>
                {(profile?.phone || authUser?.phone) && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400" /> {profile?.phone || authUser?.phone}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" /> {schoolName}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" /> Joined {joinDate}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Completion Progress Bar */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <div className="flex justify-between text-xs font-bold text-slate-300 mb-2">
            <span className="uppercase tracking-wider">Profile Completion</span>
            <span>{completionPercentage}%</span>
          </div>
          <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden border border-white/5">
            <div 
              className="bg-emerald-400 h-full rounded-full transition-all duration-700 ease-out shadow-sm" 
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProfileHero;
