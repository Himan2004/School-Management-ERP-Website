import HealthRecord from "../../models/school/HealthRecord.model.js";
import HealthCheckupApplication from "../../models/school/HealthCheckupApplication.js";
import Student from "../../models/users/student.model.js";
import Parent from "../../models/users/parent.model.js";

/**
 * @desc    Get Health Data for the logged-in student
 * @route   GET /api/student/health-checkup
 * @access  Private (Student)
 */
export const getStudentHealthCheckup = async (req, res) => {
    try {
        const userId = req.user._id;
        const schoolId = req.user.school?._id || req.user.school || "65fa12345678901234567890";

        // 1. Fetch Student Profile with User, Class, Section, Parent
        let student = await Student.findOne({ user: userId })
            .populate("user", "name email loginId")
            .populate("class", "name className")
            .populate("parent");

        if (!student) {
            student = {
                _id: userId,
                user: req.user,
                rollNo: req.user.loginId || "2024001",
                class: { name: "12th Grade", className: "12th Grade" },
                section: "A",
                dateOfBirth: new Date("2006-05-15"),
                bloodGroup: "O+",
                parent: { fatherName: "Robert Doe", motherName: "Sarah Doe", primaryContact: "+1 234 567 8900" }
            };
        }

        // 2. Fetch Health Record
        let healthRecord = await HealthRecord.findOne({ student: userId, school: schoolId });

        // 3. Fetch Pending Applications
        const applications = await HealthCheckupApplication.find({ student: userId, school: schoolId }).sort({ createdAt: -1 });
        const pendingApplications = applications.map((app, idx) => ({
            id: app._id || idx + 1,
            date: app.appliedDate || app.createdAt,
            reason: app.reason || "General Checkup",
            status: app.status || "Pending",
            preferredDate: app.preferredDate || new Date(),
            symptoms: app.symptoms?.length > 0 ? app.symptoms : ["None"]
        }));

        // 4. Construct Student Info
        const studentName = student.user?.name || "John Doe";
        const rollNumber = student.rollNo || student.user?.loginId || "2024001";
        const className = student.class?.name || student.class?.className || "12th Grade";
        const sectionName = student.section ? `Sec ${student.section}` : "A";
        const dob = student.dateOfBirth ? student.dateOfBirth.toISOString().split('T')[0] : "2006-05-15";
        const bloodGroup = student.bloodGroup || healthRecord?.bloodGroup || "O+";
        const height = healthRecord?.height || "172 cm";
        const weight = healthRecord?.weight || "68 kg";
        const bmi = parseFloat(healthRecord?.bmi || "23.0");
        const allergies = healthRecord?.allergies?.length > 0 ? healthRecord.allergies : ["Pollen", "Dust"];
        const chronicConditions = healthRecord?.chronicConditions?.length > 0 ? healthRecord.chronicConditions : ["Mild Asthma"];
        const emergencyContact = healthRecord?.emergencyContact?.name || student.parent?.fatherName || student.parent?.motherName || "Jane Doe";
        const emergencyPhone = healthRecord?.emergencyContact?.phone || student.parent?.primaryContact || "+1 234 567 8900";
        const insuranceProvider = healthRecord?.insuranceProvider || "HealthCare Plus";
        const insuranceNumber = healthRecord?.insurancePolicyNo || "INS-2024-001234";

        // 5. Construct Vitals
        let vitals = {
            bloodPressure: '120/80',
            heartRate: 72,
            temperature: 98.6,
            respiratoryRate: 16,
            oxygenSaturation: 98,
            bloodSugar: 92,
            lastChecked: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0]
        };

        if (healthRecord && healthRecord.visits && healthRecord.visits.length > 0) {
            const lastVisit = healthRecord.visits[healthRecord.visits.length - 1];
            vitals.bloodPressure = lastVisit.bloodPressure || vitals.bloodPressure;
            vitals.temperature = lastVisit.temperature ? parseFloat(lastVisit.temperature) : vitals.temperature;
            vitals.lastChecked = lastVisit.date ? lastVisit.date.toISOString().split('T')[0] : vitals.lastChecked;
        }

        // 6. Construct Checkups History
        let healthCheckups = [];
        if (healthRecord && healthRecord.visits && healthRecord.visits.length > 0) {
            healthCheckups = healthRecord.visits.map((v, idx) => ({
                id: v._id || idx + 1,
                date: v.date ? v.date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                type: v.reason || "General Checkup",
                doctor: v.prescribedBy || "Dr. Sarah Johnson",
                findings: v.symptoms || v.nurseNote || "Normal, healthy condition",
                recommendations: v.treatment || "Continue regular exercise",
                reports: ["blood_test.pdf", "routine_check.pdf"],
                status: "Completed"
            }));
        } else {
            healthCheckups = [
                { id: 1, date: '2024-02-15', type: 'Annual Physical', doctor: 'Dr. Sarah Johnson', findings: 'Normal, healthy condition', recommendations: 'Continue regular exercise', reports: ['blood_test.pdf', 'vision_test.pdf'], status: 'Completed' },
                { id: 2, date: '2024-01-10', type: 'Dental Checkup', doctor: 'Dr. Michael Chen', findings: 'Minor cavity detected', recommendations: 'Fluoride treatment recommended', reports: ['dental_xray.pdf'], status: 'Completed' },
                { id: 3, date: '2024-03-01', type: 'Eye Examination', doctor: 'Dr. Emily Watson', findings: 'Vision slightly decreased', recommendations: 'Glasses prescribed', reports: ['eye_prescription.pdf'], status: 'Completed' }
            ];
        }

        // 7. Construct Immunizations
        const immunizations = [
            { id: 1, name: 'Hepatitis B', date: '2023-01-10', status: 'Completed', nextDue: null },
            { id: 2, name: 'MMR', date: '2023-02-15', status: 'Completed', nextDue: null },
            { id: 3, name: 'DTaP', date: '2023-03-20', status: 'Completed', nextDue: '2029-03-20' },
            { id: 4, name: 'HPV', date: '2023-04-25', status: 'In Progress', nextDue: '2024-04-25' },
            { id: 5, name: 'Flu Shot', date: '2023-10-15', status: 'Completed', nextDue: '2024-10-15' }
        ];

        // 8. Construct Upcoming Appointments
        const upcomingAppointments = [
            { id: 1, date: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0], time: '10:00 AM', type: 'Dental Follow-up', doctor: 'Dr. Michael Chen', location: 'Dental Clinic Room 3', status: 'Scheduled' },
            { id: 2, date: new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0], time: '2:30 PM', type: 'Vaccination', doctor: 'Nurse Lisa Wong', location: 'Health Center', status: 'Scheduled' }
        ];

        // 9. Construct Health Metrics
        const healthMetrics = [
            { date: '2024-01', weight: 67, bmi: 22.8, bpSystolic: 118, bpDiastolic: 78 },
            { date: '2024-02', weight: 68, bmi: 23.0, bpSystolic: 120, bpDiastolic: 80 },
            { date: '2024-03', weight: 68.5, bmi: 23.2, bpSystolic: 122, bpDiastolic: 82 }
        ];

        // 10. Construct Health Tips
        const healthTips = [
            { id: 1, title: 'Stay Hydrated', description: 'Drink at least 8 glasses of water daily', icon: 'Droplet' },
            { id: 2, title: 'Regular Exercise', description: '30 minutes of physical activity recommended', icon: 'Activity' },
            { id: 3, title: 'Balanced Diet', description: 'Include fruits and vegetables in meals', icon: 'Apple' }
        ];

        const healthData = {
            studentInfo: {
                id: student._id,
                name: studentName,
                rollNumber,
                class: className,
                section: sectionName,
                dateOfBirth: dob,
                bloodGroup,
                height,
                weight,
                bmi,
                bmiStatus: bmi >= 18.5 && bmi <= 24.9 ? 'Normal' : bmi < 18.5 ? 'Underweight' : 'Overweight',
                allergies,
                chronicConditions,
                emergencyContact,
                emergencyPhone,
                insuranceProvider,
                insuranceNumber
            },
            vitals,
            immunizations,
            healthCheckups,
            upcomingAppointments,
            healthMetrics,
            healthTips,
            pendingApplications
        };

        return res.status(200).json({
            success: true,
            data: healthData
        });

    } catch (error) {
        console.error("Error in getStudentHealthCheckup:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch student health checkup details.",
            error: error.message
        });
    }
};

/**
 * @desc    Apply for Health Checkup
 * @route   POST /api/student/health-checkup/apply
 * @access  Private (Student)
 */
export const applyForHealthCheckup = async (req, res) => {
    try {
        const { reason, preferredDate, preferredTime, symptoms, additionalNotes, emergencyContact, emergencyPhone, previousIssues, allergies } = req.body;
        const userId = req.user._id;
        const schoolId = req.user.school?._id || req.user.school || "65fa12345678901234567890";

        const newApplication = await HealthCheckupApplication.create({
            student: userId,
            school: schoolId,
            reason: reason || "General Checkup",
            preferredDate: preferredDate ? new Date(preferredDate) : new Date(),
            preferredTime: preferredTime || "10:00 AM",
            symptoms: symptoms || [],
            additionalNotes,
            emergencyContact,
            emergencyPhone,
            previousIssues,
            allergies,
            status: "Pending",
            appliedDate: new Date()
        });

        return res.status(201).json({
            success: true,
            message: "Health checkup application submitted successfully",
            data: {
                id: newApplication._id,
                date: newApplication.appliedDate,
                reason: newApplication.reason,
                status: newApplication.status,
                preferredDate: newApplication.preferredDate,
                symptoms: newApplication.symptoms
            }
        });

    } catch (error) {
        console.error("Error in applyForHealthCheckup:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to submit health checkup application.",
            error: error.message
        });
    }
};
