import Payroll from '../../models/finance/Payroll.model.js';
import SalarySlip from '../../models/finance/Salaryslip.model.js';
import StaffAttendance from '../../models/HRM/Staffattendance.model.js';
import User from '../../models/users/user.model.js';
import School from '../../models/school/School.js';

// ════════════════════════ PAYROLL ════════════════════════

// Get all payroll records
export const getAllPayroll = async (req, res) => {
  try {
    const { school, month, year, status } = req.query;
    const organization = req.user?._id;
    const filter = organization ? { organization } : {};

    if (school) filter.school = school;
    if (status) filter.paymentStatus = status;
    
    if (month && year) {
      filter.month = Number(month);
      filter.year = Number(year);
    }

    // Processed payroll is stored as salary slips. Payroll documents only hold
    // each staff member's salary configuration and have no payrollMonth/status.
    const salarySlips = await SalarySlip.find(filter)
      .populate('school', 'schoolName name')
      .populate('staffId', 'name email role')
      .sort({ year: -1, month: -1, createdAt: -1 });

    const payrolls = salarySlips.map((slip) => ({
      ...slip.toObject(),
      payrollMonth: new Date(slip.year, slip.month - 1, 1),
      payrollStatus: slip.paymentStatus === 'held' ? 'rejected' : slip.paymentStatus,
      grossSalary: slip.grossEarnings,
    }));

    // 🔥 FETCH ALL SCHOOLS FOR FILTER DROPDOWN
    let orgId = organization;
    if (!orgId) {
      const sample = await Payroll.findOne().select('organization');
      if (sample) orgId = sample.organization;
    }

    let allSchools = [];
    if (orgId) {
      const schools = await School.find({ organization: orgId }).select("schoolName name");
      allSchools = [...new Set(schools.map(s => s.schoolName || s.name).filter(Boolean))];
    } else {
      // Ultimate fallback
      const schools = await School.find({}).select("schoolName name");
      allSchools = [...new Set(schools.map(s => s.schoolName || s.name).filter(Boolean))];
    }

    res.status(200).json({ 
      success: true, 
      data: payrolls,
      filters: { schools: allSchools.sort() },
      count: payrolls.length 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get payroll by ID
export const getPayrollById = async (req, res) => {
  try {
    const { id } = req.params;
    const payroll = await Payroll.findById(id)
      .populate('school')
      .populate('staffId');

    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payroll record not found' });
    }

    res.status(200).json({ success: true, data: payroll });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create payroll for staff
export const createPayroll = async (req, res) => {
  try {
    const {
      staffId,
      school,
      organization,
      payrollMonth,
      baseSalary,
      allowances,
      deductions,
      overtimeHours,
      overtimeRate,
      remarks
    } = req.body;

    if (!staffId || !school || !payrollMonth || !baseSalary) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    const staff = await User.findById(staffId);
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    const payrollDate = new Date(payrollMonth);
    const monthStart = new Date(payrollDate.getFullYear(), payrollDate.getMonth(), 1);
    const monthEnd = new Date(payrollDate.getFullYear(), payrollDate.getMonth() + 1, 1);

    const existingPayroll = await Payroll.findOne({
      staffId,
      school,
      payrollMonth: { $gte: monthStart, $lt: monthEnd }
    });

    if (existingPayroll) {
      return res.status(409).json({ 
        success: false, 
        message: 'Payroll already exists for this month' 
      });
    }

    const overtimeEarnings = (overtimeHours || 0) * (overtimeRate || 0);
    const totalAllowances = Object.values(allowances || {}).reduce((a, b) => a + (b || 0), 0);
    const totalDeductions = Object.values(deductions || {}).reduce((a, b) => a + (b || 0), 0);
    const grossSalary = baseSalary + totalAllowances + overtimeEarnings;
    const netSalary = grossSalary - totalDeductions;

    const payroll = await Payroll.create({
      staffId,
      school,
      organization,
      payrollMonth: monthStart,
      baseSalary,
      allowances: allowances || {},
      deductions: deductions || {},
      overtimeHours: overtimeHours || 0,
      overtimeRate: overtimeRate || 0,
      overtimeEarnings,
      totalAllowances,
      totalDeductions,
      grossSalary,
      netSalary,
      payrollStatus: 'draft',
      remarks
    });

    res.status(201).json({ 
      success: true, 
      message: 'Payroll created successfully',
      data: payroll 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update payroll
export const updatePayroll = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      baseSalary,
      allowances,
      deductions,
      overtimeHours,
      overtimeRate,
      remarks
    } = req.body;

    const payroll = await Payroll.findById(id);
    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payroll record not found' });
    }

    if (payroll.payrollStatus !== 'draft') {
      return res.status(400).json({ 
        success: false, 
        message: 'Can only update draft payroll' 
      });
    }

    if (baseSalary || allowances || deductions || overtimeHours || overtimeRate) {
      const newBaseSalary = baseSalary || payroll.baseSalary;
      const newAllowances = allowances || payroll.allowances;
      const newDeductions = deductions || payroll.deductions;
      const newOvertimeHours = overtimeHours !== undefined ? overtimeHours : payroll.overtimeHours;
      const newOvertimeRate = overtimeRate || payroll.overtimeRate;

      const overtimeEarnings = newOvertimeHours * newOvertimeRate;
      const totalAllowances = Object.values(newAllowances).reduce((a, b) => a + (b || 0), 0);
      const totalDeductions = Object.values(newDeductions).reduce((a, b) => a + (b || 0), 0);
      const grossSalary = newBaseSalary + totalAllowances + overtimeEarnings;
      const netSalary = grossSalary - totalDeductions;

      Object.assign(payroll, {
        baseSalary: newBaseSalary,
        allowances: newAllowances,
        deductions: newDeductions,
        overtimeHours: newOvertimeHours,
        overtimeRate: newOvertimeRate,
        overtimeEarnings,
        totalAllowances,
        totalDeductions,
        grossSalary,
        netSalary,
        remarks: remarks || payroll.remarks
      });

      await payroll.save();
    }

    res.status(200).json({ 
      success: true, 
      message: 'Payroll updated successfully',
      data: payroll 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Approve payroll (change status to approved)
export const approvePayroll = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    const salarySlip = await SalarySlip.findOne({ _id: id, organization: req.user?._id });
    if (!salarySlip) {
      return res.status(404).json({ success: false, message: 'Payroll record not found' });
    }

    if (salarySlip.paymentStatus !== 'draft') {
      return res.status(400).json({ 
        success: false, 
        message: 'Can only approve draft payroll' 
      });
    }

    salarySlip.paymentStatus = 'approved';
    salarySlip.approvedBy = req.superAdminProfile?._id;
    salarySlip.approvedAt = new Date();
    salarySlip.remarks = remarks || salarySlip.remarks;
    await salarySlip.save();

    res.status(200).json({ 
      success: true, 
      message: 'Payroll approved successfully',
      data: salarySlip
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Reject payroll
export const rejectPayroll = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    const salarySlip = await SalarySlip.findOne({ _id: id, organization: req.user?._id });
    if (!salarySlip) {
      return res.status(404).json({ success: false, message: 'Payroll record not found' });
    }

    salarySlip.paymentStatus = 'held';
    salarySlip.remarks = rejectionReason;
    await salarySlip.save();

    res.status(200).json({ 
      success: true, 
      message: 'Payroll rejected successfully',
      data: salarySlip
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ════════════════════════ SALARY SLIPS ════════════════════════

// Generate salary slip
export const generateSalarySlip = async (req, res) => {
  try {
    const { payrollId } = req.params;

    const payroll = await Payroll.findById(payrollId).populate('staffId');
    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payroll record not found' });
    }

    const existingSlip = await SalarySlip.findOne({ payrollId });
    if (existingSlip) {
      return res.status(409).json({ 
        success: false, 
        message: 'Salary slip already exists for this payroll' 
      });
    }

    const monthStart = new Date(payroll.payrollMonth);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);

    const attendanceData = await StaffAttendance.find({
      staffId: payroll.staffId._id,
      date: { $gte: monthStart, $lt: monthEnd }
    });

    const presentDays = attendanceData.filter(a => a.status === 'present').length;
    const absentDays = attendanceData.filter(a => a.status === 'absent').length;
    const halfDays = attendanceData.filter(a => a.status === 'half_day').length;
    const totalWorkingDays = attendanceData.length;

    const salarySlip = await SalarySlip.create({
      staffId: payroll.staffId._id,
      payrollId,
      school: payroll.school,
      organization: payroll.organization,
      month: payroll.payrollMonth,
      baseSalary: payroll.baseSalary,
      allowances: payroll.allowances,
      deductions: payroll.deductions,
      grossSalary: payroll.grossSalary,
      netSalary: payroll.netSalary,
      attendanceData: {
        presentDays,
        absentDays,
        halfDays,
        totalWorkingDays
      },
      slipStatus: 'generated'
    });

    res.status(201).json({ 
      success: true, 
      message: 'Salary slip generated successfully',
      data: salarySlip 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get salary slip
export const getSalarySlip = async (req, res) => {
  try {
    const { id } = req.params;

    const slip = await SalarySlip.findById(id)
      .populate('staffId', 'name email')
      .populate('school', 'schoolName');

    if (!slip) {
      return res.status(404).json({ success: false, message: 'Salary slip not found' });
    }

    res.status(200).json({ success: true, data: slip });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get salary slips for staff
export const getStaffSalarySlips = async (req, res) => {
  try {
    const { staffId, school, year, month } = req.query;

    if (!staffId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Staff ID is required' 
      });
    }

    const filter = { staffId };

    if (school) filter.school = school;

    if (year && month) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);
      filter.month = {
        $gte: startDate,
        $lt: endDate
      };
    } else if (year) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year + 1, 0, 1);
      filter.month = {
        $gte: startDate,
        $lt: endDate
      };
    }

    const slips = await SalarySlip.find(filter)
      .populate('school', 'schoolName')
      .sort({ month: -1 });

    res.status(200).json({ 
      success: true, 
      data: slips,
      count: slips.length 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
