import Payroll from '../../models/finance/Payroll.model.js';
import School from '../../models/school/School.js';

// Helper to reliably extract schoolId
const getSchoolId = async (req) => {
    let schoolId = req.user?.school?._id || req.user?.school;
    if (!schoolId) throw new Error("School ID not found in request");
    return schoolId;
};

export const getPrincipalPayroll = async (req, res) => {
  try {
    const schoolId = await getSchoolId(req);
    const { month, year, status } = req.query;
    
    const filter = { school: schoolId };

    if (status) filter.payrollStatus = status;
    
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);
      filter.payrollMonth = {
        $gte: startDate,
        $lt: endDate
      };
    }

    const payrolls = await Payroll.find(filter)
      .populate('staffId', 'name email role')
      .sort({ payrollMonth: -1 });

    res.status(200).json({ 
      success: true, 
      data: payrolls,
      count: payrolls.length 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const approvePrincipalPayroll = async (req, res) => {
  try {
    const schoolId = await getSchoolId(req);
    const { id } = req.params;
    const { remarks } = req.body;

    const payroll = await Payroll.findOne({ _id: id, school: schoolId });
    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payroll record not found for this school' });
    }

    if (payroll.payrollStatus !== 'draft') {
      return res.status(400).json({ success: false, message: 'Can only approve draft payroll' });
    }

    payroll.payrollStatus = 'approved';
    payroll.approvedBy = req.user._id;
    payroll.remarks = remarks || payroll.remarks;
    payroll.approvedDate = new Date();
    await payroll.save();

    res.status(200).json({ success: true, message: 'Payroll approved successfully', data: payroll });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const rejectPrincipalPayroll = async (req, res) => {
  try {
    const schoolId = await getSchoolId(req);
    const { id } = req.params;
    const { rejectionReason } = req.body;

    const payroll = await Payroll.findOne({ _id: id, school: schoolId });
    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payroll record not found for this school' });
    }

    payroll.payrollStatus = 'rejected';
    payroll.rejectionReason = rejectionReason;
    await payroll.save();

    res.status(200).json({ success: true, message: 'Payroll rejected successfully', data: payroll });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};