import React, { useState, useEffect } from 'react';
import { Save, Shield, ToggleRight } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import superAdminSettingsService from '../../services/api/superAdminSettingsService.js'; // Adjust path as needed

const SuperAdminSettings = () => {
  // 1. Rule States
  const [rules, setRules] = useState({
    attendance: 75,
    lateFee: 500
  });

  // 2. Module Activation States
  const [modules, setModules] = useState({
    transport: true,
    library: true,
  });

  const [isSaving, setIsSaving] = useState(false);

  // Fetch data on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await superAdminSettingsService.getSettings();
        if (response.success && response.data) {
          setRules(response.data.rules || { attendance: 75, lateFee: 500 });
          const savedModules = response.data.modules || { transport: true, library: true };
          setModules({
            transport: savedModules.transport ?? true,
            library: savedModules.library ?? true,
          });
        }
      } catch (error) {
        toast.error("Failed to load settings from server");
      }
    };
    fetchSettings();
  }, []);

  // --- Handlers ---
  const handleInputChange = (field, value) => {
    // Ensure we store numbers for the backend
    const numericValue = value === '' ? 0 : parseInt(value, 10);
    setRules(prev => ({ ...prev, [field]: numericValue }));
  };
  const handleToggle = (moduleKey) => {
    const newValue = !modules[moduleKey];
    setModules(prev => ({ ...prev, [moduleKey]: newValue }));
  };
  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      const response = await superAdminSettingsService.updateSettings({ rules, modules });
      if (!response?.success) {
        throw new Error(response?.message || 'Failed to update settings');
      }
      toast.success('Global Settings Updated Successfully!', {
        duration: 4000,
        position: 'top-right',
        style: { background: '#1e293b', color: '#fff', borderRadius: '15px' },
      });
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-[#f8faff] min-h-screen font-sans">
      <Toaster />

      {/* Header & Save Button - Fully Responsive */}
      <div className="mb-8 md:mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-[10px] md:text-[11px] font-bold text-blue-600 tracking-[0.2em] uppercase flex items-center gap-3">
            <span className="h-[2px] w-5 bg-blue-600"></span> System Configuration
          </h1>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mt-2 tracking-tight">
            Global <span className="text-blue-600">Settings</span>
          </h2>
        </div>
        
        <button 
          onClick={handleSaveSettings}
          disabled={isSaving}
          className={`w-full md:w-auto px-8 py-4 bg-blue-600 text-white rounded-2xl md:rounded-[22px] font-bold flex items-center justify-center gap-3 shadow-xl shadow-blue-100 hover:scale-[1.02] md:hover:scale-105 transition-all active:scale-95 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {isSaving ? (
            <span className="flex items-center gap-2">
               <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
               Saving...
            </span>
          ) : (
            <>
              <Save size={20} /> Save Changes
            </>
          )}
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* Left Column: Default Rules */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-[30px] md:rounded-[40px] shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="text-blue-600" size={24} />
              <h3 className="font-bold text-slate-800 text-lg">Default Rules</h3>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Min Attendance (%)</label>
                <input 
                  type="number" 
                  value={rules.attendance}
                  onChange={(e) => handleInputChange('attendance', e.target.value)}
                  className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all" 
                />
              </div>
              <div>
                <label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Late Fee Penalty (₹)</label>
                <input 
                  type="number" 
                  value={rules.lateFee}
                  onChange={(e) => handleInputChange('lateFee', e.target.value)}
                  className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Module Activation */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 md:p-8 rounded-[30px] md:rounded-[45px] shadow-sm border border-gray-100 h-full">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-bold text-slate-800 text-xl flex items-center gap-3">
                <ToggleRight className="text-green-500" size={26} /> Branch Module Activation
              </h3>
            </div>

            {/* Grid for Modules: 1 col on small mobile, 2 col on tablet/laptop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(modules).map(([key, isActive]) => (
                <div 
                  key={key} 
                  onClick={() => handleToggle(key)}
                  className={`p-5 md:p-6 rounded-[24px] md:rounded-[30px] border-2 transition-all cursor-pointer flex justify-between items-center group ${
                    isActive ? 'border-blue-100 bg-blue-50/30' : 'border-gray-50 bg-gray-50/50 hover:border-gray-200'
                  }`}
                >
                  <div className="capitalize font-bold text-slate-700 text-sm md:text-base">{key.replace(/([A-Z])/g, ' $1')}</div>
                  
                  {/* Custom Toggle Switch */}
                  <div className={`w-11 md:w-12 h-6 rounded-full relative transition-colors duration-300 ${isActive ? 'bg-blue-600' : 'bg-gray-300'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${isActive ? 'left-6 md:left-7' : 'left-1'}`}></div>
                  </div>
                </div>
              ))}
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminSettings;