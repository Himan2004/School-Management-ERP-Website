import React, { useState, useEffect } from 'react';
import { Search, IndianRupee, Users, Receipt, AlertTriangle } from 'lucide-react';
import { Heading, DashGrid, EnhancedDashCard } from '../../components/shared/Common_Components';
import api from '../../services/api';

const TeacherFeeDue = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [summary, setSummary] = useState({
    totalStudents: 0,
    totalFee: '₹ 0',
    paidFee: '₹ 0',
    dueFee: '₹ 0'
  });

  const [students, setStudents] = useState([]);

  const fetchFeeData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [studentsRes, summaryRes] = await Promise.all([
        api.get('/accountant/fees/students'),
        api.get('/accountant/fees/summary')
      ]);

      if (studentsRes.data && studentsRes.data.data) {
        const mappedStudents = studentsRes.data.data.map(student => {
          let status = 'Due';
          if (student.feeStatus === 'paid') status = 'Paid';
          else if (student.feeStatus === 'partial' || student.totalPaid > 0) status = 'Partial';
          else if (student.lateFee?.daysLate > 0) status = 'Overdue';

          return {
            id: student.id || student._id,
            name: student.name || 'Unknown',
            rollNo: student.rollNo || '-',
            class: `${student.class} ${student.section}`.trim() || 'N/A',
            totalFee: student.totalFee || 0,
            paidFee: student.totalPaid || 0,
            dueFee: student.totalDue || 0,
            status
          };
        });
        setStudents(mappedStudents);
      }

      if (summaryRes.data && summaryRes.data.data) {
        const stats = summaryRes.data.data;
        setSummary({
          totalStudents: stats.totalStudents || 0,
          totalFee: `₹ ${Number(stats.totalFee || 0).toLocaleString()}`,
          paidFee: `₹ ${Number(stats.totalCollected || 0).toLocaleString()}`,
          dueFee: `₹ ${Number(stats.totalDue || 0).toLocaleString()}`
        });
      }
    } catch (error) {
      console.error('Error fetching teacher fee due records:', error);
      setError(error.message + (error.response?.data?.message ? `: ${error.response.data.message}` : ''));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeeData();
  }, []);

  // Filtering Logic
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          student.rollNo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || student.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500 animate-pulse text-sm font-semibold">Loading fee due records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-sm font-semibold mb-2">
          Error: {error}
        </div>
      )}
      
      {/* ── HERO HEADER ── */}
      <div className="w-full mb-8">
        <Heading 
          primaryText="Fee Due" 
          secondaryText="Overview" 
          showAnimation={true}
        />
        <div className="mb-6 mt-4">
          <p className="text-sm text-[#6B7280]">View students with pending fees, track total fee collection, and monitor overdue accounts.</p>
        </div>
      </div>

      {/* ── STATS CARDS ── */}
      <div className="w-full mb-8">
        <DashGrid cols={12} gap={4}>
          <EnhancedDashCard title="Total Students" value={String(summary.totalStudents)} icon={<Users size={22} />} accentColor="#3b82f6" size={3} showAnimations={true} />
          <EnhancedDashCard title="Total Fee" value={summary.totalFee} icon={<Receipt size={22} />} accentColor="#8b5cf6" size={3} showAnimations={true} />
          <EnhancedDashCard title="Paid Fee" value={summary.paidFee} icon={<IndianRupee size={22} />} accentColor="#22c55e" size={3} showAnimations={true} />
          <EnhancedDashCard title="Due Fee" value={summary.dueFee} icon={<AlertTriangle size={22} />} accentColor="#ef4444" size={3} showAnimations={true} />
        </DashGrid>
      </div>

      {/* ── MAIN CONTENT (TABLE) ── */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        
        {/* Filters Header */}
        <div className="p-5 border-b border-[#E2E8F0] bg-[#F8F9FA] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="font-bold text-[#1D1D1F] flex items-center gap-2">
            <Receipt size={18} className="text-[#223F74]" /> Fee Due Records
          </h3>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search student or roll no..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#223F74] transition-colors" 
              />
            </div>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#223F74] transition-colors bg-white text-[#4B5563]"
            >
              <option value="All">All Status</option>
              <option value="Paid">Paid</option>
              <option value="Partial">Partial</option>
              <option value="Due">Due</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#F8F9FA] border-b border-[#E2E8F0]">
              <tr>
                <th className="p-4 text-sm font-bold text-[#6B7280]">Student Name</th>
                <th className="p-4 text-sm font-bold text-[#6B7280]">Roll No</th>
                <th className="p-4 text-sm font-bold text-[#6B7280]">Class/Section</th>
                <th className="p-4 text-sm font-bold text-[#6B7280]">Total Fee</th>
                <th className="p-4 text-sm font-bold text-[#6B7280]">Paid Fee</th>
                <th className="p-4 text-sm font-bold text-[#6B7280]">Due Fee</th>
                <th className="p-4 text-sm font-bold text-[#6B7280]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredStudents.map(student => (
                <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-[#1D1D1F]">{student.name}</p>
                  </td>
                  <td className="p-4 text-sm text-[#4B5563] font-medium">{student.rollNo}</td>
                  <td className="p-4 text-sm text-[#6B7280]">{student.class}</td>
                  <td className="p-4 text-sm font-medium text-[#4B5563]">₹ {student.totalFee.toLocaleString()}</td>
                  <td className="p-4 text-sm font-medium text-emerald-600">₹ {student.paidFee.toLocaleString()}</td>
                  <td className="p-4 text-sm font-bold text-rose-600">₹ {student.dueFee.toLocaleString()}</td>
                  <td className="p-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                      student.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 
                      student.status === 'Partial' ? 'bg-blue-100 text-blue-700' :
                      student.status === 'Due' ? 'bg-amber-100 text-amber-700' :
                      'bg-rose-100 text-rose-700'
                    }`}>
                      {student.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-[#6B7280]">
                    <Receipt className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No fee records found matching your filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TeacherFeeDue;
