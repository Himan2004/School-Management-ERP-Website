import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { useMemo, useState } from 'react';

const getStrength = (value) => {
  if (!value) return { label: 'Weak', score: 0, color: 'bg-gray-300' };
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
  if (/\d/.test(value) || /[^A-Za-z0-9]/.test(value)) score += 1;

  if (score <= 1) return { label: 'Weak', score: 1, color: 'bg-red-500' };
  if (score === 2) return { label: 'Medium', score: 2, color: 'bg-amber-500' };
  return { label: 'Strong', score: 3, color: 'bg-emerald-500' };
};

const PasswordField = ({
  label,
  value,
  onChange,
  placeholder,
  showStrength = false,
}) => {
  const [visible, setVisible] = useState(false);
  const strength = useMemo(() => getStrength(value), [value]);

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </label>
      <div className="relative">
        <KeyRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full rounded-xl border py-2.5 pl-9 pr-10 text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 border-gray-200 bg-white text-gray-800 placeholder:text-gray-400 focus:border-blue-500"
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 transition-colors duration-200 hover:bg-gray-100 text-gray-500"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {showStrength ? (
        <div className="mt-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full ${strength.color} transition-all duration-200`}
              style={{ width: `${(strength.score / 3) * 100}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">Password strength: {strength.label}</p>
        </div>
      ) : null}
    </div>
  );
};

export default PasswordField;
