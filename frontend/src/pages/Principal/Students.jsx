import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search,
  Eye,
  Edit2,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowRightLeft,
  History,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

// Services
import {
  getAllStudents,
} from "../../services/api/principalStudentApi";
import {
  fetchOrganizationSchools,
  transferStudent,
} from "../../services/api/principalAdmissionListApi";

// Shared Components
import {
  Grid,
  Heading,
  Button,
  DataField,
  SelectField,
  Option,
  DataTable,
  Modal,
  openModal,
  closeModal,
} from "../../components/shared/Common_Components";
import StudentDetailsDrawer from "./StudentDetailsDrawer";

const AllStudents = () => {
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0 });

  // ─── Modals ───
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);

  // ─── Transfer Modal State ───
  const [selectedTransferStudent, setSelectedTransferStudent] = useState(null);
  const [targetSchool, setTargetSchool] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);
  const [availableSchools, setAvailableSchools] = useState([]);

  // 1. Fetch Students Logic
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        limit: 5000, // Fetch a large number of students to allow DataTable to paginate client-side
      };

      const response = await getAllStudents(params);
      if (response.success) {
        setStudents(response.data);
        setStats({ total: response.total || response.data.length });
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // ─── Handlers ───


  const handleTransferClick = async (student) => {
    setSelectedTransferStudent(student);
    openModal("transfer-modal");

    try {
      const res = await fetchOrganizationSchools();
      if (res.success) setAvailableSchools(res.data);
    } catch (err) {
      toast.error("Failed to load destination branches");
    }
  };

  const handleConfirmTransfer = async () => {
    if (!targetSchool || !transferReason.trim()) return;
    setTransferLoading(true);
    try {
      await transferStudent({
        studentId: selectedTransferStudent._id,
        targetSchoolId: targetSchool,
        reason: transferReason,
      });
      toast.success(`Student transferred successfully.`);
      closeModal("transfer-modal");
      setTargetSchool("");
      setTransferReason("");
      setSelectedTransferStudent(null);
      fetchStudents();
    } catch (err) {
      toast.error("Failed to transfer student. Please try again.");
    } finally {
      setTransferLoading(false);
    }
  };



  // ─── Map Data for DataTable ───
  const tableColumns = [
    { key: "admissionNo", label: "Admission No" },
    { key: "studentName", label: "Student Name" },
    { key: "classSection", label: "Class & Section" },
    { key: "parent", label: "Parent" },
    { key: "contact", label: "Contact" },
    { key: "status", label: "Status" },
  ];

  const tableRows = useMemo(() => {
    return students.map((student) => ({
      _original: student,
      id: student._id,
      admissionNo: student.enrollmentNo || student.rollNo || "N/A",
      studentName: student.user?.name || student.fullName || "N/A",
      photoUrl:
        student.user?.photo ||
        `https://ui-avatars.com/api/?name=${student.user?.name || "S"}&background=random`,
      classSection: `${student.class?.name || "N/A"} - ${student.section?.name || student.section || "A"}`,
      parent: student.parent?.fatherName || student.parent?.fullName || "N/A",
      contact: student.user?.phone || student.parent?.primaryContact || "N/A",
      status: student.status || "Active",
    }));
  }, [students]);

  const tableActions = [
    {
      icon: <Eye size={16} />,
      tooltip: "View Details",
      variant: "ghost",
      onClick: (row) => {
        setSelectedStudent(row._original);
        openModal("student-details-modal");
      },
    },
    {
      icon: <Edit2 size={16} />,
      tooltip: "Edit Student",
      variant: "ghost",
      onClick: (row) => navigate(`/principal/students/manage/${row.id}?edit=true`, { state: { editMode: true } }),
    },
    {
      icon: <ArrowRightLeft size={16} />,
      tooltip: "Initiate Transfer",
      variant: "danger",
      show: (row) => {
        const s = row.status?.toLowerCase();
        return s !== "transferred" && s !== "tc_issued";
      },
      onClick: (row) => handleTransferClick(row._original),
    },
    {
      icon: <History size={16} />,
      tooltip: "View TC History",
      variant: "primary",
      show: (row) => {
        const s = row.status?.toLowerCase();
        return s === "transferred" || s === "tc_issued";
      },
      onClick: (row) =>
        navigate("/principal/admissions/transfer", {
          state: { studentId: row.id, activeTab: "history" },
        }),
    },
  ];

  const tableFilters = [
    {
      title: "Class & Section",
      type: "text",
      key: "classSection",
    },
    {
      title: "Status",
      type: "select",
      options: ["All", "Active", "Inactive", "TC Issued", "Transferred", "Dropped"],
      fn: (row, value) => {
        if (!value || value === "All") return true;
        return row.status.toLowerCase() === value.toLowerCase();
      }
    }
  ];

  return (
    <div className="w-full space-y-6 text-left pb-10">
      <Heading
        primaryText="All Students"
        secondaryText={
          loading ? "Loading..." : `${stats.total} students found`
        }
      />



      {/* ── Table & Pagination ── */}
      <div>
        <DataTable
          columns={tableColumns}
          rows={tableRows}
          actions={tableActions}
          userProfile="studentName"
          searchable={true}
          exportable={true}
          filterable={true}
          filters={tableFilters}
          exportFileName="students_list"
        />
      </div>

      {/* ── Drawers & Modals ── */}
      <Modal id="student-details-modal" title="Student Insights" size="xl">
        {selectedStudent && (
          <StudentDetailsDrawer
            student={selectedStudent}
            onClose={() => closeModal("student-details-modal")}
          />
        )}
      </Modal>

      <Modal id="transfer-modal" title="Transfer Certificate" size="md">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            Transferring{" "}
            <span className="font-bold text-[#223F74]">
              {selectedTransferStudent?.user?.name ||
                selectedTransferStudent?.fullName ||
                "Unknown Student"}
            </span>{" "}
            to another branch within your organization.
          </p>

          <Grid cols={1} gap={4}>
            <SelectField
              id="targetSchool"
              label="Destination Branch *"
              value={targetSchool}
              onChange={(e) => setTargetSchool(e.target.value)}
              placeholder="Select Branch"
            >
              <Option value="" label="Select Branch" />
              {availableSchools.map((school) => (
                <Option
                  key={school._id}
                  value={school._id}
                  label={school.name}
                />
              ))}
            </SelectField>

            <DataField
              id="transferReason"
              label="Reason for Transfer *"
              type="textarea"
              rows={3}
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              placeholder="E.g. Parent relocated..."
            />
          </Grid>

          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[#E2E8F0]">
            <Button
              text="Cancel"
              variant="ghost"
              onClick={() => closeModal("transfer-modal")}
              size={3}
            />
            <Button
              text="Initiate Transfer"
              variant="primary"
              onClick={handleConfirmTransfer}
              loading={transferLoading}
              disabled={!targetSchool || !transferReason.trim()}
              size={4}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AllStudents;