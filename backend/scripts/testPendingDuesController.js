import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

// Models
import FeeInstallment from '../models/finance/FeeInstallment.model.js';
import School from '../models/school/School.js';
import Class from '../models/organization/organizationClass.js';
import Student from '../models/users/student.model.js';
import User from '../models/users/user.model.js';
import FeeStructure from '../models/finance/FeeStructure.model.js';
import FeeHead from '../models/finance/FeeHead.model.js';
import Parent from '../models/users/parent.model.js';

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

const testOrg = async (orgId, orgName) => {
  console.log(`\n========================================`);
  console.log(`TESTING ORG: "${orgName}" (${orgId})`);

  const filter = { organization: new mongoose.Types.ObjectId(orgId) };

  // 1. Fetch Dues
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

  console.log(`Fetched ${pendingDues.length} pending dues documents.`);

  // 2. Parent & Class Details
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
      };
  });

  console.log('Totals Computed:');
  console.log(`  - Total Dues: ${formatCurrency(totals.totalDues)}`);
  console.log(`  - Pending Dues: ${formatCurrency(totals.pendingDues)}`);
  console.log(`  - Collection: ${formatCurrency(totals.collection)}`);

  console.log(`\nSample Formatted Student Row (First 2):`);
  console.log(JSON.stringify(formattedData.slice(0, 2), null, 2));

  // 3. Aggregation for Collection Trend
  const trendData = await FeeInstallment.aggregate([
    { $match: { organization: new mongoose.Types.ObjectId(orgId) } },
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

  console.log(`\nCollection Trend Aggregated:`);
  console.log(JSON.stringify(collectionTrend, null, 2));
};

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    // Test Delhui scholl
    await testOrg('69d2293bf2a9b20969cf6349', 'Delhui scholl');

    // Test st. xavier
    await testOrg('69fe003e86110688cfd614de', 'st. xavier');

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

run();
