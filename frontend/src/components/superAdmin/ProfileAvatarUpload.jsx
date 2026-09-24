import React, { useRef, useState } from 'react';

const ProfileAvatarUpload = ({ photo, onFileSelect }) => {
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(photo || '');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      if (onFileSelect) onFileSelect(file);
    }
  };

  const triggerFileSelect = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  return (
    <div className="relative w-28 h-28 mx-auto">
      <img
        src={preview || 'https://via.placeholder.com/120'}
        alt="avatar"
        className="w-full h-full rounded-full object-cover border-2 border-purple-200"
      />
      <button
        type="button"
        onClick={triggerFileSelect}
        className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow hover:bg-gray-100 transition"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.232 5.232l3.536 3.536M9 11l3 3L21 5l-3-3-9 9zm0 0L3 21h18"
          />
        </svg>
      </button>
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default ProfileAvatarUpload;