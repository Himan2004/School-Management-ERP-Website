import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsDarkMode } from '../../../features/theme/themeSlice.js';
import { Users, Briefcase, Layers, FileText } from 'lucide-react';
import { DashCard } from '../../../components/shared/Common_Components';

const OverviewStats = ({ statistics, loading }) => {
  const navigate = useNavigate();
  const darkMode = useSelector(selectIsDarkMode);

  const handleCardClick = (key) => {
    if (key === 'students') {
      navigate('/admin/students/manage');
    } else if (key === 'staff') {
      navigate('/admin/teachers/manage');
    } else if (key === 'teachers') {
      navigate('/admin/teachers/manage');
    } else if (key === 'classes') {
      navigate('/admin/academics?tab=classes');
    } else if (key === 'subjects') {
      navigate('/admin/academics?tab=subjects');
    }
  };

  return (
    <div className="mb-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <div className="w-full">
          <DashCard
            title="Total Students"
            value={loading ? '--' : (statistics?.students?.total ?? '--')}
            icon={<Users size={22} />}
            accentColor="#223F74"
            size={12}
            onClick={() => handleCardClick('students')}
          />
        </div>
        <div className="w-full">
          <DashCard
            title="Total Staff"
            value={loading ? '--' : (statistics?.staffCombined?.total ?? statistics?.staff?.total ?? '--')}
            icon={<Users size={22} />}
            accentColor="#E0A04B"
            size={12}
            onClick={() => handleCardClick('staff')}
          />
        </div>
        <div className="w-full">
          <DashCard
            title="Total Teachers"
            value={loading ? '--' : (statistics?.teachers?.total ?? '--')}
            icon={<Briefcase size={22} />}
            accentColor="#5B9A6A"
            size={12}
            onClick={() => handleCardClick('teachers')}
          />
        </div>
        <div className="w-full">
          <DashCard
            title="Total Classes"
            value={loading ? '--' : (statistics?.classes?.total ?? '--')}
            icon={<Layers size={22} />}
            accentColor="#7A8FC6"
            size={12}
            onClick={() => handleCardClick('classes')}
          />
        </div>
        <div className="w-full">
          <DashCard
            title="Total Subjects"
            value={loading ? '--' : (statistics?.subjects?.total ?? '--')}
            icon={<FileText size={22} />}
            accentColor="#D66B5F"
            size={12}
            onClick={() => handleCardClick('subjects')}
          />
        </div>
      </div>
    </div>
  );
};

export default OverviewStats;