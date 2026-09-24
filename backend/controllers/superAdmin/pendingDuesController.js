import FeeInstallment from "../../models/finance/FeeInstallment.model.js";
import School from "../../models/school/School.js";
import Class from "../../models/organization/organizationClass.js";
import Student from "../../models/users/student.model.js";
import mongoose from "mongoose";

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

export const getPendingDues = async (req, res) => {
  try {
    let orgId = 
      req.query.organizationId || 
      req.query.organization || 
      req.user?._id;

    if (!orgId) {
      return res.status(403).json({ 
        success: false, 
        message: "Unauthorized: Missing Organization ID" 
      });
    }

    orgId = new mongoose.Types.ObjectId(String(orgId));
    const filter = { organization: orgId };
    
    // Safely apply school filter by name
    if (req.query.school && req.query.school !== "All Schools" && req.query.school !== "All") {
      const schoolObj = await School.findOne({ 
         $or: [{ name: req.query.school }, { schoolName: req.query.school }],
         organization: orgId
      });
      if (schoolObj) filter.school = schoolObj._id;
    }

    // Fetch Dues strictly for this exact Org ID
    const pendingDues = await FeeInstallment.find({
        ...filter,
        status: { $in: ["active", "defaulted"] },
        totalDue: { $gt: 0 },
    })
    .populate("studentId", "name loginId")
    .populate("school", "schoolName name") 
    .populate({
        path: "feeStructureId",
        select: "classId academicYear feeLines",
        populate: [
          { path: "classId", select: "className name" },
          { path: "feeLines.feeHeadId", select: "name" }
        ]
    })
    .sort({ "installments.dueDate": 1 })
    .limit(100);

    // Fetch parent and class details from Student model
    const studentUserIds = pendingDues.map((d) => d.studentId?._id).filter(Boolean);
    const studentDocs = await Student.find({ user: { $in: studentUserIds } })
      .populate("parent")
      .populate("class", "name className")
      .lean();

    const studentMap = new Map(studentDocs.map((s) => [s.user.toString(), s]));
    
    const totals = pendingDues.reduce(
      (acc, doc) => {
        acc.totalDues += doc.netAmount || 0;
        acc.pendingDues += doc.totalDue || 0;
        acc.collection += doc.totalPaid || 0;
        return acc;
      },
      { totalDues: 0, pendingDues: 0, collection: 0 },
    );

    const formattedData = pendingDues.map((doc) => {
        const unpaidInstallments = doc.installments.filter((inst) => inst.amountDue > inst.amountPaid);
        const earliestDueDate = unpaidInstallments.length > 0 ? unpaidInstallments[0].dueDate : null;

        let daysOverdue = 0;
        let priority = "Pending";
        if (earliestDueDate) {
          const diffDays = Math.floor((new Date() - earliestDueDate) / (1000 * 60 * 60 * 24));
          if (diffDays > 0) {
            daysOverdue = diffDays;
            priority = diffDays > 15 ? "Overdue" : "Due Soon";
          }
        }

        const studentDoc = studentMap.get(doc.studentId?._id?.toString());
        const parentName = studentDoc?.parent?.fatherName || studentDoc?.parent?.motherName || studentDoc?.parent?.profileExtras?.guardianName || "-";
        const parentContact = studentDoc?.parent?.primaryContact || "-";

        const feeTypes = doc.feeStructureId?.feeLines?.map((line) => line.feeHeadId?.name).filter(Boolean) || [];
        const feeTypeStr = feeTypes.length > 0 ? feeTypes.join(", ") : "Tuition Fee";

        return {
          id: doc.studentId?.loginId || "UNKNOWN",
          name: doc.studentId?.name || "Unknown Student",
          schoolName: doc.school?.schoolName || doc.school?.name || "Unknown Branch", 
          class: doc.feeStructureId?.classId?.className || doc.feeStructureId?.classId?.name || "Unknown Class",
          feeType: feeTypeStr,
          totalDue: doc.netAmount || 0,
          paidAmount: doc.totalPaid || 0,
          pendingAmount: doc.totalDue || 0,
          daysOverdue,
          parentName,
          parentContact,
          dueDate: earliestDueDate ? earliestDueDate.toISOString().split("T")[0] : "-",
          status: priority,
          rawDocId: doc._id,
        };
    });
    
    // Fetch schools and classes for filters
    const schools = await School.find({ organization: orgId }).select("schoolName name");
    const allSchools = [...new Set(schools.map(s => s.schoolName || s.name).filter(Boolean))];
    
    const classes = await Class.find({ organization: orgId }).select("className name");
    const allClasses = [...new Set(classes.map(c => c.className || c.name).filter(Boolean))];

    // Aggregation for Collection Trend: group by monthly dueDate
    const trendData = await FeeInstallment.aggregate([
      { $match: { organization: orgId } },
      { $unwind: "$installments" },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m", date: "$installments.dueDate" }
          },
          expected: { $sum: "$installments.amountDue" },
          collected: { $sum: "$installments.amountPaid" }
        }
      },
      { $sort: { "_id": 1 } },
      { $limit: 12 }
    ]);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const collectionTrend = trendData.map((t) => {
      const [year, monthStr] = t._id.split("-");
      const monthIdx = parseInt(monthStr, 10) - 1;
      const label = `${monthNames[monthIdx] || monthStr} ${year.slice(-2)}`;
      return {
        name: label,
        expected: t.expected || 0,
        collected: t.collected || 0,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        students: formattedData,
        totalDues: formatCurrency(totals.totalDues),
        pendingDues: formatCurrency(totals.pendingDues),
        collection: formatCurrency(totals.collection),
        otherIncome: formatCurrency(0),
        collectionTrend: collectionTrend.length > 0 ? collectionTrend : [
          { name: "Week 1", expected: 15000, collected: 8000 },
          { name: "Week 2", expected: 20000, collected: 12000 },
          { name: "Week 3", expected: 25000, collected: 19000 },
          { name: "Week 4", expected: 30000, collected: 28000 },
        ],
        filters: { schools: allSchools.sort(), classes: allClasses.sort() }
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exportPendingDues = async (req, res) => {
  try {
    let orgId = 
      req.query.organizationId || 
      req.query.organization || 
      req.user?._id;

    if (!orgId) {
      return res.status(403).json({ 
        success: false, 
        message: "Unauthorized: Missing Organization ID" 
      });
    }

    orgId = new mongoose.Types.ObjectId(String(orgId));

    const filter = { organization: orgId };
    
    if (req.query.school && req.query.school !== "All Schools" && req.query.school !== "All") {
      const schoolObj = await School.findOne({ 
         $or: [{ name: req.query.school }, { schoolName: req.query.school }],
         organization: orgId
      });
      if (schoolObj) filter.school = schoolObj._id;
    }

    const pendingDues = await FeeInstallment.find({
        ...filter,
        status: { $in: ["active", "defaulted"] },
        totalDue: { $gt: 0 },
    })
    .populate("studentId", "name loginId")
    .populate("school", "schoolName name") 
    .populate({
        path: "feeStructureId",
        select: "classId academicYear feeLines",
        populate: [
          { path: "classId", select: "className name" },
          { path: "feeLines.feeHeadId", select: "name" }
        ]
    });

    const studentUserIds = pendingDues.map((d) => d.studentId?._id).filter(Boolean);
    const studentDocs = await Student.find({ user: { $in: studentUserIds } })
      .populate("parent")
      .populate("class", "name className")
      .lean();

    const studentMap = new Map(studentDocs.map((s) => [s.user.toString(), s]));

    const formattedData = pendingDues.map((doc) => {
        const unpaidInstallments = doc.installments.filter((inst) => inst.amountDue > inst.amountPaid);
        const earliestDueDate = unpaidInstallments.length > 0 ? unpaidInstallments[0].dueDate : null;
        
        let daysOverdue = 0;
        let priority = "Pending";
        if (earliestDueDate) {
          const diffDays = Math.floor((new Date() - earliestDueDate) / (1000 * 60 * 60 * 24));
          if (diffDays > 0) {
            daysOverdue = diffDays;
            priority = diffDays > 15 ? "Overdue" : "Due Soon";
          }
        }

        const studentDoc = studentMap.get(doc.studentId?._id?.toString());
        const parentName = studentDoc?.parent?.fatherName || studentDoc?.parent?.motherName || studentDoc?.parent?.profileExtras?.guardianName || "-";
        const parentContact = studentDoc?.parent?.primaryContact || "-";

        const feeTypes = doc.feeStructureId?.feeLines?.map((line) => line.feeHeadId?.name).filter(Boolean) || [];
        const feeTypeStr = feeTypes.length > 0 ? feeTypes.join(", ") : "Tuition Fee";

        return {
          id: doc.studentId?.loginId || "UNKNOWN",
          name: doc.studentId?.name || "Unknown Student",
          schoolName: doc.school?.schoolName || doc.school?.name || "Unknown Branch", 
          class: doc.feeStructureId?.classId?.className || doc.feeStructureId?.classId?.name || "Unknown Class",
          feeType: feeTypeStr,
          totalDue: doc.netAmount || 0,
          paidAmount: doc.totalPaid || 0,
          pendingAmount: doc.totalDue || 0,
          daysOverdue,
          parentName,
          parentContact,
          dueDate: earliestDueDate ? earliestDueDate.toISOString().split("T")[0] : "-",
          status: priority,
        };
    });

    const exportRows = formattedData.map((row) => ({
      "School/Branch": row.schoolName, 
      "Student ID": row.id, 
      "Student Name": row.name,
      Class: row.class, 
      "Fee Type": row.feeType,
      "Total Due": `₹${row.totalDue.toLocaleString("en-IN")}`, 
      "Paid Amount": `₹${row.paidAmount.toLocaleString("en-IN")}`, 
      "Pending Amount": `₹${row.pendingAmount.toLocaleString("en-IN")}`, 
      "Due Date": row.dueDate, 
      "Days Overdue": row.daysOverdue,
      "Parent Name": row.parentName,
      "Parent Contact": row.parentContact,
      Status: row.status,
    }));

    const exportHeaders = [
      "School/Branch", "Student ID", "Student Name", "Class", "Fee Type", 
      "Total Due", "Paid Amount", "Pending Amount", "Due Date", "Days Overdue",
      "Parent Name", "Parent Contact", "Status"
    ];
    const csvRows = [exportHeaders.join(",")];
    for (const row of exportRows) {
        const values = exportHeaders.map((header) => `"${String(row[header] ?? "").replace(/"/g, '""')}"`);
        csvRows.push(values.join(","));
    }
    
    const fileName = `Pending_Dues_${new Date().toISOString().split("T")[0]}`;

    res.status(200).json({ success: true, data: csvRows.join("\n"), fileName, format: "CSV" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};