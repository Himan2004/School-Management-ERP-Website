const SettingsCard = ({ title, subtitle, children }) => {
  return (
    <div className="rounded-xl border p-5 shadow-md transition-all duration-200 sm:p-6 border-gray-100 bg-white">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {subtitle ? (
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
};

export default SettingsCard;
