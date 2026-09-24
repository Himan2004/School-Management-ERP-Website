import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Download, CheckCircle, XCircle, ArrowLeft, Users } from 'lucide-react';
import Card from '../../components/teacher/Card';

const AssignmentSubmissions = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [submissions, setSubmissions] = useState([]);
  const [stats, setStats] = useState({ total: 0, submitted: 0, pending: 0, graded: 0 });

  const fetchSubmissions = async () => {
    try {
      const res = await api.get(`/teacher/assignments/${id}/submissions`);
      const data = res.data?.data || [];
      
      setSubmissions(data);
      setStats({
        total: data.length,
        submitted: data.filter(s => s.status === 'submitted').length,
        pending: data.filter(s => s.status === 'pending').length,
        graded: data.filter(s => s.status === 'graded').length,
      });
    } catch (err) {
      console.error("Failed to fetch submissions", err);
    }
  };

  useEffect(() => { fetchSubmissions(); }, [id]);

  const handleInputChange = (studentId, field, value) => {
    setSubmissions(prev => prev.map(sub => sub.studentId === studentId ? { ...sub, [field]: value } : sub));
  };

  const handleDownload = (fileUrl) => {
    if (!fileUrl) return;

    const link = document.createElement("a");
    link.href = fileUrl;
    link.target = "_blank";
    link.download = "";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveGrades = async () => {
    try {
      const gradesData = submissions.filter(s => s.grade !== '').map(s => ({
        studentId: s.studentId, grade: s.grade, feedback: s.feedback || ''
      }));
      await api.put(`/teacher/assignments/${id}/grades`, { gradesData });
      alert("Grades saved successfully!");
      fetchSubmissions(); 
    } catch (err) {
      alert("Failed to save grades");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button onClick={() => navigate('/teacher/assignments')} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Assignment Submissions & Grading</h1>
          <p className="mt-1 text-gray-500">Review files and enter grades.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card><div className="p-4"><p className="text-sm text-gray-500">Total Students</p><p className="text-2xl font-bold text-gray-900">{stats.total}</p></div></Card>
        <Card><div className="p-4"><p className="text-sm text-gray-500">Submitted</p><p className="text-2xl font-bold text-blue-600">{stats.submitted}</p></div></Card>
        <Card><div className="p-4"><p className="text-sm text-gray-500">Pending</p><p className="text-2xl font-bold text-yellow-600">{stats.pending}</p></div></Card>
        <Card><div className="p-4"><p className="text-sm text-gray-500">Graded</p><p className="text-2xl font-bold text-green-600">{stats.graded}</p></div></Card>
      </div>

      <Card>
        <div className="p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Student List</h2>
          
          {/* HELPFUL MESSAGE IF NO STUDENTS ARE ENROLLED IN THE CLASS */}
          {submissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <Users className="w-12 h-12 mb-3 text-gray-300" />
              <p className="text-lg font-medium text-gray-600">No students found</p>
              <p className="text-sm text-center max-w-sm mt-1">
                Your database does not have any active students linked to this specific class yet. Add students to this class to start grading their submissions!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Roll No</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Student Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Grade</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Teacher Feedback</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((submission) => {
                    console.log("Submission Data:", submission);
                    return (
                      <tr key={submission.studentId} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm">{submission.rollNo}</td>
                        <td className="py-3 px-4 text-sm font-medium">{submission.student}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs flex items-center w-fit ${submission.status === 'graded' ? 'bg-green-100 text-green-700' : submission.status === 'submitted' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {submission.status === 'graded' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {submission.status === 'pending' && <XCircle className="w-3 h-3 mr-1" />}
                            {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <input type="text" value={submission.grade || ''} onChange={(e) => handleInputChange(submission.studentId, 'grade', e.target.value)} placeholder="A, 95, etc." className="w-20 rounded border border-gray-300 bg-white p-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </td>
                        <td className="py-3 px-4">
                          <input type="text" value={submission.feedback || ''} onChange={(e) => handleInputChange(submission.studentId, 'feedback', e.target.value)} placeholder="Add remarks..." className="w-full rounded border border-gray-300 bg-white p-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button 
                            disabled={!submission.fileUrl} 
                            onClick={() => handleDownload(submission.fileUrl)}
                            className={`p-1.5 rounded ${submission.fileUrl ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-300 cursor-not-allowed'}`} 
                            title={submission.fileUrl ? "Download Homework File" : "No file submitted"}
                          >
                            <Download className="w-4 h-4 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="mt-6 flex justify-end">
                <button onClick={handleSaveGrades} className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all">Save Grades</button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default AssignmentSubmissions;
