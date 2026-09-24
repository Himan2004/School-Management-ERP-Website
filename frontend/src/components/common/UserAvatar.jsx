// components/common/UserAvatar.jsx
import { useState } from 'react';
import { User } from 'lucide-react';

/**
 * Generates a consistent Tailwind bg color class from a string.
 */
const getAvatarColor = (name = '') => {
    const colors = [
        'bg-blue-500',
        'bg-violet-500',
        'bg-emerald-500',
        'bg-amber-500',
        'bg-rose-500',
        'bg-cyan-500',
        'bg-indigo-500',
        'bg-teal-500',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

/**
 * Extracts up to 2 initials from a full name.
 * e.g. "Swarup Das" → "SD", "John" → "J"
 */
const getInitials = (name = '') => {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase() ?? '')
        .join('');
};

const SIZE_MAP = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-xl',
};

/**
 * UserAvatar
 *
 * Props:
 *  - name   {string}  Full name of the user (used for initials + color)
 *  - photo  {string}  URL of the user's photo (optional)
 *  - size   {'xs'|'sm'|'md'|'lg'|'xl'}  Defaults to 'sm'
 *  - ring   {boolean} Whether to show a white ring. Defaults to true
 *  - className {string} Extra classes for the root element
 */
const UserAvatar = ({ name = '', photo = '', size = 'sm', ring = true, className = '' }) => {
    const [imgError, setImgError] = useState(false);

    const sizeClass = SIZE_MAP[size] ?? SIZE_MAP.sm;
    const ringClass = ring ? 'ring-2 ring-white' : '';

    if (photo && !imgError) {
        return (
            <img
                src={photo}
                alt={name || 'User'}
                className={`${sizeClass} ${ringClass} rounded-full object-cover shrink-0 ${className}`}
                onError={() => setImgError(true)}
            />
        );
    }

    const initials = getInitials(name);
    const colorClass = getAvatarColor(name);

    return (
        <span
            title={name}
            className={`${sizeClass} ${ringClass} ${colorClass} ${className}
        rounded-full flex items-center justify-center shrink-0
        font-semibold text-white select-none`}
        >
            {initials || <User className="w-[40%] h-[40%]" />}
        </span>
    );
};

export default UserAvatar;