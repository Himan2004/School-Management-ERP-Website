import React from 'react';
import { Link } from 'react-router-dom';

const RoleCard = ({ title, icon, to }) => {
  return (
    <Link
      to={to}
      className="flex flex-col items-center justify-center rounded-2xl bg-white p-6 shadow hover:shadow-lg transition w-full h-full text-center"
    >
      <div className="text-4xl mb-3">{icon}</div>
      <span className="font-semibold text-lg text-gray-800">{title}</span>
    </Link>
  );
};

export default RoleCard;
