import React from 'react';

const ProfileCard = ({ profile, onEdit }) => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg max-w-md mx-auto">
      <div className="flex flex-col items-center">
        <img
          src={profile.photo || 'https://via.placeholder.com/120'}
          alt="avatar"
          className="w-28 h-28 rounded-full border-4 border-purple-200 mb-4 object-cover"
        />
        <h2 className="text-2xl font-bold text-gray-800">{profile.name}</h2>
        <p className="text-gray-500 mb-2">{profile.role}</p>
        <p className="text-gray-600 text-sm">{profile.email}</p>
      </div>
      <button
        onClick={onEdit}
        className="mt-6 w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition"
      >
        Edit Profile
      </button>
    </div>
  );
};

export default ProfileCard;