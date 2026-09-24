export const mockFeeHeads = [
    { _id: "feehead-tuition", name: "Tuition Fee" },
    { _id: "feehead-transport", name: "Transport Fee" },
    { _id: "feehead-hostel", name: "Hostel & Mess" },
    { _id: "feehead-exam", name: "Exam Charges" },
    { _id: "feehead-library", name: "Library Fee" },
];

export const mockClasses = [
    { _id: "class-9a", className: "Class 9", section: "A" },
    { _id: "class-9b", className: "Class 9", section: "B" },
    { _id: "class-10a", className: "Class 10", section: "A" },
    { _id: "class-10b", className: "Class 10", section: "B" },
    { _id: "class-11a", className: "Class 11", section: "A" },
    { _id: "class-12a", className: "Class 12", section: "A" },
];

export const mockFeeStructures = [
    {
        _id: "fs-001",
        organization: "org-mock-001",
        classId: { _id: "class-9a", className: "Class 9", section: "A" },
        academicYear: "2025-2026",
        feeLines: [
            { _id: "line-1", feeHeadId: { _id: "feehead-tuition", name: "Tuition Fee" }, amount: 25000, dueDate: "2025-07-10" },
            { _id: "line-2", feeHeadId: { _id: "feehead-library", name: "Library Fee" }, amount: 2000, dueDate: "2025-07-10" },
        ],
        totalAmount: 27000,
        isActive: true,
    },
    {
        _id: "fs-002",
        organization: "org-mock-001",
        classId: { _id: "class-10a", className: "Class 10", section: "A" },
        academicYear: "2025-2026",
        feeLines: [
            { _id: "line-3", feeHeadId: { _id: "feehead-tuition", name: "Tuition Fee" }, amount: 28000, dueDate: "2025-07-10" },
            { _id: "line-4", feeHeadId: { _id: "feehead-exam", name: "Exam Charges" }, amount: 3500, dueDate: "2025-08-15" },
        ],
        totalAmount: 31500,
        isActive: true,
    },
    {
        _id: "fs-003",
        organization: "org-mock-001",
        classId: { _id: "class-11a", className: "Class 11", section: "A" },
        academicYear: "2025-2026",
        feeLines: [
            { _id: "line-5", feeHeadId: { _id: "feehead-hostel", name: "Hostel & Mess" }, amount: 60000, dueDate: "2025-06-15" },
        ],
        totalAmount: 60000,
        isActive: false,
    },
];

export const mockOrganizationId = "org-mock-001";
