import Resignation from '../../models/HRM/Resignation.model.js';
import User from '../../models/users/user.model.js';

// Get all resignations strictly for the Principal's School
export const getSchoolResignations = async (req, res) => {
  try {
    // 🔥 SECURITY: Lock query to the logged-in principal's school
    const schoolId = req.user.school?._id || req.user.school; 
    
    const resignations = await Resignation.find({ school: schoolId })
      .populate('staffId', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json({ 
      success: true, 
      data: resignations,
      count: resignations.length 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Approve resignation
export const approveSchoolResignation = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    const schoolId = req.user.school?._id || req.user.school;

    // 1. Verify the resignation exists AND belongs to this principal's school
    const existingResignation = await Resignation.findOne({ _id: id, school: schoolId });
    if (!existingResignation) {
      return res.status(404).json({ success: false, message: 'Resignation not found or unauthorized' });
    }

    const resignation = await Resignation.findByIdAndUpdate(
      id,
      {
        status: 'approved',
        approvedBy: req.user._id,
        remarks: remarks || existingResignation.remarks
      },
      { new: true }
    ).populate('staffId');

    // 2. Mark staff as inactive if the last working date has passed
    if (new Date(resignation.lastWorkingDate) <= new Date()) {
      await User.findByIdAndUpdate(resignation.staffId._id, { status: 'inactive' });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Resignation approved successfully',
      data: resignation 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Reject resignation
export const rejectSchoolResignation = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const schoolId = req.user.school?._id || req.user.school;

    // Verify it belongs to this school
    const existingResignation = await Resignation.findOne({ _id: id, school: schoolId });
    if (!existingResignation) {
      return res.status(404).json({ success: false, message: 'Resignation not found or unauthorized' });
    }

    const resignation = await Resignation.findByIdAndUpdate(
      id,
      {
        status: 'rejected',
        rejectionReason
      },
      { new: true }
    ).populate('staffId');

    res.status(200).json({ 
      success: true, 
      message: 'Resignation rejected successfully',
      data: resignation 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};