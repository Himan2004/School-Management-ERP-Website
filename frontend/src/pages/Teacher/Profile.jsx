import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Mail, Phone, MapPin, Briefcase, 
  GraduationCap, Award, BookOpen, Users, 
  Calendar, Edit, Clock, Target, 
  Activity, Star, X, Save
} from 'lucide-react';
import Card from '../../components/teacher/Card';
import { fetchTeacherProfile, updateProfile } from '../../features/teacher/teacherProfileSlice';

const Profile = () => {
  const dispatch = useDispatch();
  const { profile, loading, error } = useSelector((state) => state.teacherProfile || {});

  // Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    dispatch(fetchTeacherProfile());
  }, [dispatch]);

  // Pre-populate form when opening the modal
  const handleEditClick = () => {
    setFormData({
      phone: profile.phone || '',
      department: profile.department || '',
      designation: profile.designation || '',
      bio: profile.bio || '',
      qualifications: profile.qualifications,
      achievements: profile.achievements?.join(', ') || '',
      teachingFocus: profile.teachingFocus?.join(', ') || '',
      currentPriorities: profile.currentPriorities?.join(', ') || '',
      coursesManaged: profile.coursesManaged?.join(', ') || ''
    });
    setIsEditing(true);
  };

  // Handle Save
  const handleSave = async (e) => {
    e.preventDefault();
    
    // Parse comma-separated strings back into arrays
    const payload = {
      ...formData,
      qualifications: formData.qualifications.split(',').map(s => s.trim()).filter(Boolean),
      achievements: formData.achievements.split(',').map(s => s.trim()).filter(Boolean),
      teachingFocus: formData.teachingFocus.split(',').map(s => s.trim()).filter(Boolean),
      currentPriorities: formData.currentPriorities.split(',').map(s => s.trim()).filter(Boolean),
      coursesManaged: formData.coursesManaged.split(',').map(s => s.trim()).filter(Boolean)
    };

    await dispatch(updateProfile(payload));
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="text-lg font-medium text-gray-500 animate-pulse">Loading Comprehensive Profile...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="text-lg font-medium text-red-500 bg-red-50 px-6 py-4 rounded-xl border border-red-100">
          Error: {error}
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* 1. Header / Cover Banner */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="h-32 sm:h-40 w-full shrink-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>
        
        <div className="px-6 sm:px-8 pb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 -mt-12 sm:-mt-16 relative">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-6">
              <div className="p-1.5 bg-white rounded-full shadow-sm z-10">
                {profile.avatar ? (
                  <img 
                    src={profile.avatar} 
                    alt={profile.name} 
                    className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-gray-50"
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-4xl font-bold text-blue-600 border-4 border-gray-50">
                    {profile.name?.charAt(0)}
                  </div>
                )}
              </div>
              <div className="mb-2 z-10">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{profile.name}</h1>
                <p className="text-sm sm:text-base font-medium text-blue-600 flex items-center gap-2 mt-1">
                  <Briefcase className="h-4 w-4 shrink-0" /> {profile.designation}
                </p>
              </div>
            </div>

            <div className="mb-2 w-full sm:w-auto z-10">
              <button 
                onClick={handleEditClick}
                className="w-full sm:w-auto px-5 py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <Edit className="h-4 w-4" /> Edit Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Personal Info & Academics */}
        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-5">Contact Information</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Mail className="h-4 w-4" /></div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Email</p>
                    <p className="font-medium text-sm text-gray-900 truncate">{profile.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Phone className="h-4 w-4" /></div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Phone</p>
                    <p className="font-medium text-sm text-gray-900">{profile.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><MapPin className="h-4 w-4" /></div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Department</p>
                    <p className="font-medium text-sm text-gray-900">{profile.department}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="p-2 bg-violet-50 text-violet-600 rounded-lg"><Calendar className="h-4 w-4" /></div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Joined Date</p>
                    <p className="font-medium text-sm text-gray-900">
                      {profile.joiningDate ? new Date(profile.joiningDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-5">Qualifications</h2>
                <div className="space-y-4">
                    <div className="flex gap-3 items-start">
                      <GraduationCap className="h-5 w-5 text-indigo-500 mt-0.5 shrink-0" />
                      <p className="text-sm font-medium text-gray-800 leading-relaxed">{profile.qualifications}</p>
                    </div>
                </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-500" /> Teaching Focus
              </h2>
              <div className="flex flex-wrap gap-2">
                {profile.teachingFocus?.length > 0 ? (
                  profile.teachingFocus.map((focus, index) => (
                    <span key={index} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg border border-blue-100">
                      {focus}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 italic">No focus areas specified.</p>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: Stats, Rhythm, & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><BookOpen className="h-4 w-4" /></div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Classes</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{profile.stats?.totalClasses || 0}</p>
            </div>
            
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Users className="h-4 w-4" /></div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Students</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{profile.stats?.totalStudents || 0}</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Award className="h-4 w-4" /></div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Attendance</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{profile.stats?.attendanceRate || '100%'}</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Clock className="h-4 w-4" /></div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Hours</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{profile.weeklyHours || 0} <span className="text-sm font-medium text-gray-400">/wk</span></p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="flex flex-col h-full">
              <div className="p-6 border-b border-gray-50">
                <h2 className="text-lg font-bold text-gray-900 mb-3">About Me</h2>
                <p className="text-sm text-gray-600 leading-relaxed">{profile.bio}</p>
              </div>
              <div className="p-6 flex-1 bg-gray-50/50">
                <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" /> Current Priorities
                </h3>
                <ul className="space-y-2">
                  {profile.currentPriorities?.length > 0 ? (
                    profile.currentPriorities.map((priority, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0"></div>
                        {priority}
                      </li>
                    ))
                  ) : (
                    <p className="text-xs text-gray-500 italic">No priorities set.</p>
                  )}
                </ul>
              </div>
            </Card>

            <Card className="flex flex-col h-full">
              <div className="p-6 h-full flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-indigo-500" /> Weekly Rhythm
                  </h2>
                </div>
                
                <div className="flex-1 flex items-end justify-around gap-2 h-40 mt-4 relative">
                  {profile.weeklyRhythm?.map((dayData, index) => (
                    <div key={index} className="flex flex-col items-center justify-end h-full w-full group relative">
                      
                      <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-white bg-gray-800 px-2 py-1 rounded pointer-events-none z-10">
                        {dayData.load}%
                      </div>
                      
                      <div className="w-full max-w-[32px] sm:max-w-[40px] bg-indigo-50 rounded-t-md flex items-end h-full overflow-hidden">
                        <div 
                          className="w-full bg-indigo-500 rounded-t-md transition-all duration-700 ease-out" 
                          style={{ height: `${Math.max(dayData.load, 2)}%` }}
                        ></div>
                      </div>
                      
                      <span className="text-xs font-semibold text-gray-500 mt-2">{dayData.day}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-6">Recognition Timeline</h2>
              
              <div className="relative border-l-2 border-gray-100 ml-3 md:ml-4 space-y-8">
                {profile.recognitionTimeline?.length > 0 ? (
                  profile.recognitionTimeline.map((event, index) => (
                    <div key={index} className="relative pl-6">
                      <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-white border-4 border-blue-500"></div>
                      <span className="text-xs font-bold text-blue-600 mb-1 block">{event.year}</span>
                      <h3 className="text-sm font-bold text-gray-900">{event.title}</h3>
                      {event.description && <p className="text-sm text-gray-500 mt-1">{event.description}</p>}
                    </div>
                  ))
                ) : (
                  <p className="pl-6 text-sm text-gray-500 italic">Timeline data not available.</p>
                )}
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-50 bg-gray-50/30 rounded-b-xl">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Courses Managed</p>
              <div className="flex flex-wrap gap-2">
                {profile.coursesManaged?.length > 0 ? (
                  profile.coursesManaged.map((course, index) => (
                    <span key={index} className="px-3 py-1 bg-white border border-gray-200 text-gray-700 text-xs font-medium rounded-md shadow-sm">
                      {course}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-gray-400">No courses currently assigned.</p>
                )}
              </div>
            </div>
          </Card>

        </div>
      </div>

      {/* --- EDIT PROFILE MODAL --- */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">Edit Profile</h2>
              <button onClick={() => setIsEditing(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <form id="editProfileForm" onSubmit={handleSave} className="space-y-5">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Designation</label>
                    <input type="text" value={formData.designation} onChange={(e) => setFormData({...formData, designation: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Department</label>
                    <input type="text" value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Phone</label>
                    <input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Courses Managed (Comma separated)</label>
                    <input type="text" value={formData.coursesManaged} onChange={(e) => setFormData({...formData, coursesManaged: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Bio</label>
                  <textarea rows="3" value={formData.bio} onChange={(e) => setFormData({...formData, bio: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none"></textarea>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Teaching Focus (Comma separated)</label>
                    <textarea rows="2" value={formData.teachingFocus} onChange={(e) => setFormData({...formData, teachingFocus: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none resize-none"></textarea>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Current Priorities (Comma separated)</label>
                    <textarea rows="2" value={formData.currentPriorities} onChange={(e) => setFormData({...formData, currentPriorities: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none resize-none"></textarea>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Qualifications (Comma separated)</label>
                    <textarea rows="2" value={formData.qualifications} onChange={(e) => setFormData({...formData, qualifications: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none resize-none"></textarea>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Achievements (Comma separated)</label>
                    <textarea rows="2" value={formData.achievements} onChange={(e) => setFormData({...formData, achievements: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none resize-none"></textarea>
                  </div>
                </div>

              </form>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50 shrink-0">
              <button type="button" onClick={() => setIsEditing(false)} className="px-5 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="submit" form="editProfileForm" className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/30 flex items-center gap-2">
                <Save className="h-4 w-4" /> Save Changes
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;