import React, { useEffect, useState } from 'react';
import { UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getPrincipalTeachers } from '../../services/api/principalTeachersApi';

const StaffManagement = () => {
  const [stats, setStats] = useState({ totalTeachers: 0, activeTeachers: 0, inactiveTeachers: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await getPrincipalTeachers();
        setStats(res?.stats || { totalTeachers: 0, activeTeachers: 0, inactiveTeachers: 0 });
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_0%,#dbeafe_0%,#f8fafc_40%,#ede9fe_100%)]">
      <main className="md:ml-64 mt-20 p-6 lg:p-8">
        <div className="bg-white/95 rounded-2xl shadow-lg p-8 border border-indigo-100">
          <div className="text-center mb-8">
            <UserCheck size={48} className="mx-auto mb-4 text-indigo-600 opacity-90" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Staff Management</h2>
            <p className="text-gray-500">Live summary and quick actions for teacher operations.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="border border-blue-100 bg-blue-50 rounded-xl p-4">
              <p className="text-sm text-gray-600">Total Teachers</p>
              <p className="text-2xl font-bold text-blue-600">{loading ? "-" : stats.totalTeachers}</p>
            </div>
            <div className="border border-emerald-100 bg-emerald-50 rounded-xl p-4">
              <p className="text-sm text-gray-600">Active Teachers</p>
              <p className="text-2xl font-bold text-green-600">{loading ? "-" : stats.activeTeachers}</p>
            </div>
            <div className="border border-rose-100 bg-rose-50 rounded-xl p-4">
              <p className="text-sm text-gray-600">Inactive Teachers</p>
              <p className="text-2xl font-bold text-red-600">{loading ? "-" : stats.inactiveTeachers}</p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/principal/teachers/all" className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:opacity-90">Manage Teachers</Link>
            <Link to="/principal/teachers/schedule" className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:opacity-90">Teacher Schedule</Link>
            <Link to="/principal/teachers/assign-subjects" className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg hover:opacity-90">Assign Subjects</Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StaffManagement;
