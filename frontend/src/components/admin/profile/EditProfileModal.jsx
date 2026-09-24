import { Mail, Phone, Upload, User, X } from 'lucide-react';
import { useSelector } from 'react-redux';
import { selectIsDarkMode } from '../../../features/theme/themeSlice';
import AdminInput from '../ui/AdminInput';
import AdminModal from '../ui/AdminModal';
import LoadingButton from '../ui/LoadingButton';

const EditProfileModal = ({ form, setForm, onSave, onCancel, saving }) => {
  const darkMode = useSelector(selectIsDarkMode);

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ 
        ...prev, 
        profileImageFile: file,
        profileImage: String(reader.result || '') 
      }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <AdminModal open onClose={onCancel} widthClass="max-w-lg">
      <div>
        <div className="flex items-center justify-between mb-5">
          <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Edit Profile</h3>
          <button onClick={onCancel} className={`p-1 rounded-lg transition-colors duration-200 ${darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <AdminInput
            label="Name"
            icon={User}
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Enter full name"
          />
          <AdminInput
            label="Email"
            icon={Mail}
            type="email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="admin@school.edu"
          />
          <AdminInput
            label="Phone"
            icon={Phone}
            value={form.phone}
            onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            placeholder="Enter contact number"
          />
          <div>
            <label className={`mb-1.5 block text-xs font-medium uppercase tracking-wide ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Profile Image</label>
            <div className="flex items-center gap-3 mt-1">
              <label className={`inline-flex items-center gap-2 px-3 py-2 border rounded-xl cursor-pointer text-sm transition-colors duration-200
                ${darkMode ? 'border-[#334155] hover:bg-slate-850 text-slate-300' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}
              >
                <Upload className="w-4 h-4" />
                Upload
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
              <input
                value={form.profileImage}
                onChange={(e) => setForm((prev) => ({ ...prev, profileImage: e.target.value }))}
                placeholder="Or paste Cloudinary image URL"
                className={`flex-1 rounded-xl border px-3 py-2.5 text-sm outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100
                  ${darkMode ? 'border-[#334155] bg-slate-800 text-white placeholder-slate-500' : 'border-gray-200 bg-white text-slate-800 placeholder-gray-400'}`}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onCancel}
            className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors duration-200
              ${darkMode ? 'border-[#334155] bg-slate-850 hover:bg-slate-800 text-slate-300' : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'}`}
          >
            Cancel
          </button>
          <LoadingButton
            onClick={onSave}
            loading={saving}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            Save
          </LoadingButton>
        </div>
      </div>
    </AdminModal>
  );
};

export default EditProfileModal;
