import mongoose from "mongoose";
import Razorpay from "razorpay";
import crypto from "crypto";

import FeeInstallment from "../../models/finance/FeeInstallment.model.js";
import FeePayment from "../../models/finance/FeePayment.model.js";
import FeeStructure from "../../models/finance/FeeStructure.model.js";
import FeeHead from "../../models/finance/FeeHead.model.js";
import LateFeeSetting from "../../models/finance/LateFeeSetting.model.js";
import Parent from "../../models/users/parent.model.js";
import Student from "../../models/users/student.model.js";
import Class from "../../models/organization/organizationClass.js";
import Section from "../../models/school/Section.model.js";
import School from "../../models/school/School.js";

const rzp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ─── HELPER ──────────────────────────────────────────────────────────────────
// Resolves the correct student profile for a parent based on the request query
const resolveStudent = async (parentId, requestedStudentId) => {
  const parent = await Parent.findOne({ user: parentId }).populate({
    path: "students",
    populate: { path: "class section school user" },
  });

  if (!parent || !parent.students || parent.students.length === 0) {
    throw new Error("No student associated with parent");
  }

  let student = parent.students[0];
  if (requestedStudentId) {
    const found = parent.students.find(
      (s) => s._id.toString() === requestedStudentId.toString(),
    );
    if (found) student = found;
  }
  return student;
};

// ─── 1. GET FEE STATUS ───────────────────────────────────────────────────────
export const getFeeStatus = async (req, res) => {
  try {
    const { school_id: sId, student_id: stId } = req.query;
    if (!sId)
      return res
        .status(400)
        .json({ success: false, message: "School ID required" });

    const student = await resolveStudent(req.user?._id, stId);

    const ledger = await FeeInstallment.findOne({
      school: sId,
      studentId: { $in: [student._id, student.user?._id || student.user] },
      status: { $in: ["active", "completed"] },
    }).populate("school", "schoolName")
      .populate({
        path: "feeStructureId",
        populate: { path: "feeLines.feeHeadId" },
      });

    if (!ledger) {
      return res.status(200).json({ success: true, data: null });
    }

    const lateFeeRule = await LateFeeSetting.findOne({
      school: sId,
      isActive: true,
    });
    const penaltyPerDay = lateFeeRule ? lateFeeRule.penaltyPerDay : 0;
    const gracePeriod = lateFeeRule ? lateFeeRule.gracePeriod : 0;

    const totalSlots = ledger.installments.length || 1;
    const baseBreakdown =
      ledger.feeStructureId?.feeLines?.map((line) => ({
        key: line.feeHeadId?._id,
        label: line.feeHeadId?.name,
        amount: line.amount / totalSlots,
      })) || [];

    const mappedInstallments = ledger.installments.map((slot, index) => {
      let penalty = 0;
      let daysLate = 0;
      const today = new Date();
      const dueDate = new Date(slot.dueDate);

      if (slot.status !== "paid" && today > dueDate) {
        daysLate = Math.max(
          0,
          Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24)),
        );
        if (daysLate > gracePeriod) {
          penalty = daysLate * penaltyPerDay;
          if (lateFeeRule?.maxPenalty && penalty > lateFeeRule.maxPenalty) {
            penalty = lateFeeRule.maxPenalty;
          }
        }
      }

      let uiStatus = "Pending";
      if (slot.status === "paid") uiStatus = "Paid";
      else if (slot.status === "partially_paid") uiStatus = "Partially Paid";
      else if (daysLate > 0) uiStatus = "Overdue";
      else if (dueDate - today < 7 * 24 * 60 * 60 * 1000) uiStatus = "Due Soon";

      return {
        id: slot._id,
        month: slot.label || `Term ${index + 1}`,
        amount: slot.amountDue,
        remainingBase: Math.max(0, slot.amountDue - slot.amountPaid),
        amountPaid: slot.amountPaid || 0,
        fullDueDate: slot.dueDate,
        dueDate: slot.dueDate,
        isPaid: slot.status === "paid",
        status: uiStatus,
        penalty: penalty,
        paidOn: slot.paidOn || null,
        breakdown: baseBreakdown.map((b) => {
          const ratio =
            slot.amountDue > 0 ? slot.amountPaid / slot.amountDue : 0;
          return {
            ...b,
            paid: b.amount * ratio,
            pending: b.amount - b.amount * ratio,
          };
        }),
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        studentId: student._id,
        studentName: student.user?.name || "Student",
        admissionNo: student.admissionNo || "N/A",
        class: student.class?.name || "",
        section: student.section?.name || "",
        feeData: {
          sess: ledger.academicYear,
          gross: ledger.grossAmount,
          net: ledger.netAmount,
          tPaid: ledger.totalPaid,
          bal: ledger.totalDue,
        },
        schoolName: ledger.school?.schoolName || "School",
        instalments: mappedInstallments,
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// ─── 2. GET INSTALLMENTS ─────────────────────────────────────────────────────
export const getInstalments = async (req, res) => {
  try {
    const { school_id: sId, student_id: stId } = req.query;
    const student = await resolveStudent(req.user?._id, stId);

    const ledger = await FeeInstallment.findOne({
      school: sId,
      studentId: { $in: [student._id, student.user?._id || student.user] },
      status: { $in: ["active", "completed"] },
    }).populate({
      path: "feeStructureId",
      populate: { path: "feeLines.feeHeadId", select: "name" },
    });

    if (!ledger)
      return res.status(200).json({ success: true, data: { instalments: [] } });

    const lateFeeRule = await LateFeeSetting.findOne({
      school: sId,
      isActive: true,
    });
    const penaltyPerDay = lateFeeRule ? lateFeeRule.penaltyPerDay : 0;
    const gracePeriod = lateFeeRule ? lateFeeRule.gracePeriod : 0;

    const totalSlots = ledger.installments.length || 1;
    const baseBreakdown =
      ledger.feeStructureId?.feeLines?.map((line) => ({
        key: line.feeHeadId._id,
        label: line.feeHeadId.name,
        amount: line.amount / totalSlots,
      })) || [];

    const mappedInstallments = ledger.installments.map((slot, index) => {
      let penalty = 0;
      let daysLate = 0;
      const today = new Date();
      const dueDate = new Date(slot.dueDate);

      if (slot.status !== "paid" && today > dueDate) {
        daysLate = Math.max(
          0,
          Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24)),
        );
        if (daysLate > gracePeriod) {
          penalty = daysLate * penaltyPerDay;
          if (lateFeeRule?.maxPenalty && penalty > lateFeeRule.maxPenalty) {
            penalty = lateFeeRule.maxPenalty;
          }
        }
      }

      let uiStatus = "Pending";
      if (slot.status === "paid") uiStatus = "Paid";
      else if (slot.status === "partially_paid") uiStatus = "Partially Paid";
      else if (daysLate > 0) uiStatus = "Overdue";
      else if (dueDate - today < 7 * 24 * 60 * 60 * 1000) uiStatus = "Due Soon";

      return {
        id: slot._id,
        month: slot.label || `Term ${index + 1}`,
        amount: slot.amountDue,
        remainingBase: Math.max(0, slot.amountDue - slot.amountPaid),
        amountPaid: slot.amountPaid || 0,
        fullDueDate: slot.dueDate,
        isPaid: slot.status === "paid",
        status: uiStatus,
        penalty: penalty,
        paidOn: slot.paidOn || null,
        paymentRefId: slot.paymentRefs?.length > 0 ? slot.paymentRefs[0] : null,
        breakdown: baseBreakdown.map((b) => {
          const ratio =
            slot.amountDue > 0 ? slot.amountPaid / slot.amountDue : 0;
          return {
            ...b,
            paid: b.amount * ratio,
            pending: b.amount - b.amount * ratio,
          };
        }),
      };
    });

    return res.status(200).json({
      success: true,
      data: { instalments: mappedInstallments },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// ─── 3. GET PAYMENT HISTORY ──────────────────────────────────────────────────
export const getPaymentHistory = async (req, res) => {
  try {
    const {
      school_id: sId,
      student_id: stId,
      page = 1,
      limit = 20,
    } = req.query;
    const student = await resolveStudent(req.user?._id, stId);

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // FeePayment.studentId references the User model (not Student profile _id)
    // student.user is the User ObjectId linked to this student profile
    const payments = await FeePayment.find({
      school: sId,
      studentId: { $in: [student._id, student.user?._id || student.user] },
      paymentStatus: "success",
    })
      .sort({ paymentDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const formattedReceipts = payments.map((p) => {
      const pd = p.paymentDate ? new Date(p.paymentDate) : null;
      const formattedDate = pd
        ? pd.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : null;
      return {
        id: p._id,
        receiptNumber: p.receiptNumber,
        paymentDate: p.paymentDate,
        date: formattedDate,
        description: p.remarks || "Fee Payment",
        amount: p.amountPaid,
        mode:
          p.paymentMode === "online_portal"
            ? "Razorpay"
            : p.paymentMode || "Online",
        status: "Success",
        transactionId:
          p.gatewayPaymentId || p.chequeNumber || p.ddNumber || "N/A",
      };
    });

    return res.status(200).json({
      success: true,
      data: { receipts: formattedReceipts },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// ─── 4. GET FEE OFFERS ───────────────────────────────────────────────────────
export const getFeeOffers = async (req, res) => {
  try {
    const { school_id: sId, student_id: stId } = req.query;
    const student = await resolveStudent(req.user?._id, stId);

    const ledger = await FeeInstallment.findOne({
      school: sId,
      studentId: { $in: [student._id, student.user?._id || student.user] },
      status: "active",
    });

    let overdueInfo = null;
    let earlyPaymentOffer = null;

    if (ledger) {
      const today = new Date();
      const lateFeeRule = await LateFeeSetting.findOne({
        school: sId,
        isActive: true,
      });

      const overdueSlot = ledger.installments.find(
        (s) => s.status !== "paid" && new Date(s.dueDate) < today,
      );
      if (overdueSlot && lateFeeRule) {
        const daysLate = Math.ceil(
          (today - new Date(overdueSlot.dueDate)) / (1000 * 60 * 60 * 24),
        );
        if (daysLate > lateFeeRule.gracePeriod) {
          let penalty = daysLate * lateFeeRule.penaltyPerDay;
          if (lateFeeRule.maxPenalty && penalty > lateFeeRule.maxPenalty)
            penalty = lateFeeRule.maxPenalty;

          overdueInfo = {
            message: `Installment ${overdueSlot.label || ""} is overdue.`,
            penalty: penalty,
            daysLate: daysLate,
          };
        }
      }

      const nextDueSlot = ledger.installments.find(
        (s) => s.status !== "paid" && new Date(s.dueDate) > today,
      );
      if (nextDueSlot) {
        const daysUntilDue = Math.ceil(
          (new Date(nextDueSlot.dueDate) - today) / (1000 * 60 * 60 * 24),
        );
        if (daysUntilDue > 15) {
          earlyPaymentOffer = {
            message: `Pay ${nextDueSlot.label || "next term"} 15 days early to save.`,
            discount: 100,
            validUntil: nextDueSlot.dueDate,
          };
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: { earlyPaymentOffer, overdueInfo },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// ─── 5. CREATE RAZORPAY ORDER ────────────────────────────────────────────────
export const createRazorpayOrder = async (req, res) => {
  try {
    const {
      school_id: sId,
      student_id: stId,
      amount: am,
      instalmentId: iId,
    } = req.body;
    if (!sId || !am || am <= 0)
      return res
        .status(400)
        .json({ success: false, message: "Required parameters missing" });

    const parent = await Parent.findOne({ user: req.user?._id });
    if (!parent)
      return res
        .status(403)
        .json({ success: false, message: "Parent not found" });
    const student = await resolveStudent(req.user?._id, stId);

    let lF = 0;
    if (iId) {
      const i = await FeeInstallment.findOne({
        school: sId,
        studentId: { $in: [student._id, student.user?._id || student.user] },
      });
      const lateFeeRule = await LateFeeSetting.findOne({
        school: sId,
        isActive: true,
      });

      if (i && lateFeeRule) {
        const tS = i.installments.id(iId);
        if (tS && new Date() > new Date(tS.dueDate)) {
          const daysLate = Math.ceil(
            (new Date() - new Date(tS.dueDate)) / 86400000,
          );
          if (daysLate > lateFeeRule.gracePeriod) {
            lF = daysLate * lateFeeRule.penaltyPerDay;
            if (lateFeeRule.maxPenalty && lF > lateFeeRule.maxPenalty)
              lF = lateFeeRule.maxPenalty;
          }
        }
      }
    }

    const tA = am + lF;
    const aP = Math.round(tA * 100); // Razorpay requires paise

    const o = {
      amount: aP,
      currency: "INR",
      receipt: `r_${Date.now()}`,
      notes: {
        student_id: student._id.toString(),
        school_id: sId.toString(),
        instalment_id: iId || "full",
        late_fee: lF.toString(),
        parent_id: parent._id.toString(),
      },
    };

    const or = await rzp.orders.create(o);

    return res.status(200).json({
      success: true,
      data: {
        orderId: or.id,
        amount: or.amount,
        currency: or.currency,
        receipt: or.receipt,
        lateFee: lF,
        baseAmount: am,
        totalAmount: tA,
        keyId: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// ─── 6. VERIFY PAYMENT (WITH WATERFALL ALLOCATION) ───────────────────────────
export const verifyRazorpayPayment = async (req, res) => {
  const sn = await mongoose.startSession();
  sn.startTransaction();

  try {
    const {
      razorpay_order_id: oI,
      razorpay_payment_id: pI,
      razorpay_signature: rS,
      student_id: stId,
      school_id: sId,
      amount: am,
      lateFee: lF,
      instalmentId: iId,
    } = req.body;

    const student = await resolveStudent(req.user?._id, stId);

    // 1. Verify Signature
    const gS = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${oI}|${pI}`)
      .digest("hex");
    if (gS !== rS) {
      await sn.abortTransaction();
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment signature" });
    }

    // 2. Fetch Fee Ledger
    const i = await FeeInstallment.findOne({
      school: sId,
      studentId: { $in: [student._id, student.user?._id || student.user] },
      status: { $in: ["active", "completed"] },
    }).session(sn);

    if (!i) {
      await sn.abortTransaction();
      return res
        .status(404)
        .json({ success: false, message: "Fee ledger not found" });
    }

    // 3. Identify Anchor Slot
    let anchorSlot = iId
      ? i.installments.id(iId)
      : i.installments.find((s) => s.status !== "paid");
    if (!anchorSlot) anchorSlot = i.installments[i.installments.length - 1];

    // 4. Generate master receipt
    const rN = `RCP${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const pm = new FeePayment({
      organization: i.organization,
      school: sId,
      studentId: student.user?._id || student.user,
      feeInstallmentId: i._id,
      installmentSlotId: anchorSlot._id,
      academicYear: i.academicYear,
      amountPaid: am,
      lateFeePaid: lF || 0,
      advanceAdjusted: 0,
      totalCollected: am + (lF || 0),
      paymentMode: "online_portal",
      paymentStatus: "success",
      paymentGateway: "razorpay",
      gatewayOrderId: oI,
      gatewayPaymentId: pI,
      gatewaySignature: rS,
      receiptNumber: rN,
      paymentDate: new Date(),
      remarks: iId
        ? "Specific Instalment Payment"
        : "Custom Amount / Advance Payment",
    });

    await pm.save({ session: sn });

    // 5. Waterfall Allocation
    let remainingMoney = am;
    if (iId) {
      const target = i.installments.id(iId);
      if (target && target.status !== "paid") {
        const deficit = Math.max(0, target.amountDue - target.amountPaid);
        const alloc = Math.min(remainingMoney, deficit);

        target.amountPaid += alloc;
        target.lateFeeCharged += lF || 0;
        target.paidOn = new Date();
        target.status =
          target.amountPaid >= target.amountDue ? "paid" : "partially_paid";
        target.paymentRefs.push(pm._id);

        remainingMoney -= alloc;
      }
    }

    if (remainingMoney > 0) {
      for (const slot of i.installments) {
        if (slot.status !== "paid" && remainingMoney > 0) {
          const deficit = Math.max(0, slot.amountDue - slot.amountPaid);
          const alloc = Math.min(remainingMoney, deficit);

          slot.amountPaid += alloc;
          slot.paidOn = new Date();
          slot.status =
            slot.amountPaid >= slot.amountDue ? "paid" : "partially_paid";
          slot.paymentRefs.push(pm._id);

          remainingMoney -= alloc;
        }
      }
    }

    if (remainingMoney > 0) i.advanceBalance += remainingMoney;

    i.totalPaid += am;
    i.totalDue = Math.max(0, i.netAmount - i.totalPaid);
    if (i.totalPaid >= i.netAmount) i.status = "completed";

    await i.save({ session: sn });
    await sn.commitTransaction();

    const stdProfile = await mongoose
      .model("Student")
      .findById(student._id)
      .populate("user");
    return res.status(200).json({
      success: true,
      data: {
        paymentId: pm._id,
        receiptNumber: rN,
        amountPaid: am,
        lateFeePaid: lF || 0,
        totalAmount: am + (lF || 0),
        balanceDue: i.totalDue,
        transactionId: pI,
        orderId: oI,
        studentName: stdProfile?.user?.name || "",
        paymentDate: pm.paymentDate,
      },
    });
  } catch (e) {
    await sn.abortTransaction();
    return res.status(500).json({ success: false, message: e.message });
  } finally {
    sn.endSession();
  }
};

// ─── 7. GET SPECIFIC PAYMENT RECEIPT ─────────────────────────────────────────
export const getPaymentReceipt = async (req, res) => {
  try {
    const { paymentId: pI } = req.params;
    const isObjectId = mongoose.Types.ObjectId.isValid(pI);
    const query = isObjectId ? { _id: pI } : { receiptNumber: pI };

    const pm = await FeePayment.findOne(query)
      .populate(
        "school",
        "schoolName address city state pinCode officialPhone officialEmail",
      )
      .lean();

    if (!pm)
      return res
        .status(404)
        .json({ success: false, message: "Receipt not found" });

    const parent = await Parent.findOne({ user: req.user?._id });
    if (!parent)
      return res
        .status(403)
        .json({ success: false, message: "Parent not found" });

    const studentProfile = await Student.findOne({
      $or: [
        { _id: pm.studentId },
        { user: pm.studentId }
      ]
    })
      .populate("user class section")
      .lean();

    if (!studentProfile)
      return res
        .status(404)
        .json({ success: false, message: "Student profile not found" });

    const isChild = parent.students.some(
      (id) => id.toString() === studentProfile._id.toString(),
    );
    if (!isChild)
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized access" });

    return res.status(200).json({
      success: true,
      data: {
        id: pm._id,
        receiptNumber: pm.receiptNumber,
        receiptDate: pm.paymentDate,
        studentName: studentProfile.user?.name || "Student",
        class: studentProfile.class?.name || "N/A",
        section: studentProfile.section?.name || "N/A",
        admissionNo: studentProfile.admissionNo || "N/A",
        amount: pm.amountPaid,
        lateFee: pm.lateFeePaid,
        totalAmount: pm.totalCollected,
        paymentMode: pm.paymentMode
          ? pm.paymentMode.charAt(0).toUpperCase() + pm.paymentMode.slice(1)
          : "Online",
        transactionId:
          pm.gatewayPaymentId || pm.chequeNumber || pm.ddNumber || "N/A",
        academicYear: pm.academicYear || "2026-27",
        schoolName: pm.school?.schoolName || "School",
        schoolAddress: `${pm.school?.address || ""}, ${pm.school?.city || ""}, ${pm.school?.state || ""}`,
        schoolPhone: pm.school?.officialPhone || "N/A",
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// ─── 8. CHECK PAYMENT STATUS (RAZORPAY SYNC) ─────────────────────────────────
export const checkPaymentStatus = async (req, res) => {
  try {
    const { orderId: oI } = req.params;
    const or = await rzp.orders.fetch(oI);
    const pms = await rzp.orders.fetchPayments(oI);

    return res.status(200).json({
      success: true,
      data: {
        orderId: or.id,
        amount: or.amount,
        currency: or.currency,
        status: or.status,
        payments: pms.items,
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
