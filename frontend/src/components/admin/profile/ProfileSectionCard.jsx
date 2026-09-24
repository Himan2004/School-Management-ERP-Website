const ProfileSectionCard = ({ title, children, darkMode = false }) => {
  return (
    <div
      className={`rounded-xl border p-5 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
        darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-white'
      }`}
    >
      <h2 className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        {title}
      </h2>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
};

export default ProfileSectionCard;
