const InputField = ({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  type = 'text',
  as = 'input',
  children,
  rows = 4,
}) => {
  const commonClass = "w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 border-gray-200 bg-white text-gray-800 placeholder:text-gray-400 focus:border-blue-500";

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </label>
      <div className="relative">
        {Icon ? <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /> : null}
        {as === 'select' ? (
          <select value={value} onChange={onChange} className={`${commonClass} ${Icon ? 'pl-9' : ''}`}>
            {children}
          </select>
        ) : as === 'textarea' ? (
          <textarea
            rows={rows}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={`${commonClass} ${Icon ? 'pl-9' : ''}`}
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={`${commonClass} ${Icon ? 'pl-9' : ''}`}
          />
        )}
      </div>
    </div>
  );
};

export default InputField;
