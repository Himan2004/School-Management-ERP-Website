import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAdmissionById } from '../../../services/api/principalAdmissionApi';
import StudentAdmissionDetailsModal from '../../../components/principal/StudentAdmissionDetailsModal';
import { Loader2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const AdmissionDetails = () => {
    const { id } = useParams();
    const parts = String(id || "").split("_");
    const admissionId = parts[0];
    const routeStudentIndex = parts[1] ? parseInt(parts[1], 10) : 0;
    const navigate = useNavigate();
    const [request, setRequest] = useState(null);
    const [rawRequestData, setRawRequestData] = useState(null);
    const [currentStudentIndex, setCurrentStudentIndex] = useState(routeStudentIndex);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                setLoading(true);
                const res = await getAdmissionById(admissionId);
                if (res.success) {
                    setRawRequestData(res.data);
                    setRequest(normalizeAdmissionRequest(res.data, routeStudentIndex));
                }
            } catch (err) {
                toast.error("Failed to load admission details");
                navigate('/principal/admissions/list');
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [admissionId, navigate, routeStudentIndex]);

    useEffect(() => {
        if (rawRequestData) {
            setRequest(normalizeAdmissionRequest(rawRequestData, currentStudentIndex));
        }
    }, [currentStudentIndex, rawRequestData]);

    // Same normalization logic as in AdmissionRequest.jsx
    const normalizeDocuments = (docs) => {
        if (!docs || typeof docs !== "object") return [];
        return Object.entries(docs)
            .filter(([, val]) => val && val.url)
            .map(([key, val]) => ({
                name: key.charAt(0).toUpperCase() + key.slice(1),
                fileName: val.url.split("/").pop() || `${key}.pdf`,
                status: val.status || 'submitted',
                remarks: val.remarks || '',
                url: val.url,
            }));
    };

    const normalizeAdmissionRequest = (item, studentIndex = 0) => {
        if (!item) return null;
        const students = Array.isArray(item.students) ? item.students : [];
        const student = students[studentIndex] || {};
        const parent = item.parent || {};
        const address = parent.address || {};

        return {
            _id: item._id,
            admissionRequestId: item._id,
            studentIndex: studentIndex,
            applicationNo: item.applicationNumber || "N/A",
            submittedAt: item.submittedAt || item.createdAt || new Date().toISOString(),
            status: item.status || "pending",
            organizationName: item.organizationName || "",
            branchName: item.branchName || "",
            student: {
                fullName: student.fullName || "Unnamed",
                dob: student.dob ? new Date(student.dob).toLocaleDateString('en-IN') : "",
                gender: student.gender || "",
                bloodGroup: student.bloodGroup || "",
                aadhaar: parent.aadharNumber || "",
                previousSchool: student.previousSchool || "",
                photo: student.photo || null,
            },
            academic: {
                appliedClass: student.class?.name || student.class || "",
                preferredSection: student.section || "",
                academicYear: student.academicYear || "",
                rollNumber: student.rollNumber || "",
                transportRequired: student.transport?.required ? "Yes" : "No",
                busRoute: student.transport?.busRoute || "",
                healthNotes: student.healthNotes || "",
            },
            contact: {
                email: parent.email || "",
                phone: parent.primaryContact || "",
                alternatePhone: parent.alternateContact || "",
                city: address.city || "",
                address: [address.street, address.city, address.state, address.pincode]
                    .filter(Boolean).join(", "),
            },
            parent: {
                fullName: parent.fullName || "",
                relation: parent.relation || "",
                fatherName: parent.fatherName || "",
                motherName: parent.motherName || "",
                guardianPhone: parent.alternateContact || parent.primaryContact || "",
                notifications: parent.notifications || {},
            },
            documents: normalizeDocuments(student.documents),
            remarks: item.remarks || "",
        };
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Fetching Detailed Profile...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <main className="text-left">
                <button 
                    onClick={() => navigate(-1)}
                    className="mb-6 flex items-center gap-2 text-gray-600 hover:text-blue-600 font-bold uppercase text-xs tracking-widest transition-colors"
                >
                    <ArrowLeft size={16} />
                    Back to List
                </button>

                {request && (
                    <div className="relative space-y-4">
                        {rawRequestData?.students?.length > 1 && (
                            <div className="bg-white border border-gray-150 p-4 rounded-[20px] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                                <div className="text-left">
                                    <h4 className="text-sm font-bold text-[#223F74] uppercase tracking-wider">Multi-Student Application</h4>
                                    <p className="text-xs text-gray-500 font-medium">This application contains multiple students. Select a student to view details.</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {rawRequestData.students.map((stu, sIdx) => (
                                        <button
                                            key={sIdx}
                                            onClick={() => setCurrentStudentIndex(sIdx)}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition duration-200 ${
                                                currentStudentIndex === sIdx
                                                    ? "bg-[#223F74] text-white shadow-md"
                                                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                                            }`}
                                        >
                                            {stu.fullName || `Student ${sIdx + 1}`}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {/* We use the modal but modified to be a page content or just wrap it */}
                        <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-gray-100">
                             {/* Reusing the modal's internal logic/render by passing a fake onClose that just goes back */}
                             <StudentAdmissionDetailsModal 
                                request={request} 
                                onClose={() => navigate(-1)} 
                                // On page, we might not want it to look like a modal but for now let's fix the 404
                             />
                        </div>
                    </div>
                )}
            </main>

            {/* Custom CSS to make the modal look like a page if needed */}
            <style jsx>{`
                .fixed.inset-0.z-50 {
                    position: relative !important;
                    background: transparent !important;
                    padding: 0 !important;
                    z-index: 1 !important;
                }
                .max-w-5xl {
                    max-width: 100% !important;
                }
            `}</style>
        </div>
    );
};

export default AdmissionDetails;
