const ProfileSkeleton = () => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 animate-pulse overflow-hidden">
      <div className="h-24 bg-gradient-to-r from-blue-800 via-blue-700 to-indigo-700" />
      <div className="p-6">
        <div className="flex items-center gap-5 -mt-14">
          <div className="w-24 h-24 rounded-full bg-gray-200 border-4 border-white" />
          <div className="flex-1 space-y-3 pt-10">
            <div className="h-6 bg-gray-200 rounded w-40" />
            <div className="h-4 bg-gray-200 rounded w-64" />
          </div>
        </div>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-24 rounded-xl bg-gray-100" />
          <div className="h-24 rounded-xl bg-gray-100" />
          <div className="h-24 rounded-xl bg-gray-100" />
          <div className="h-24 rounded-xl bg-gray-100" />
        </div>
      </div>
    </div>
  );
};

export default ProfileSkeleton;
