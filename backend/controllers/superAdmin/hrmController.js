import Promotion from '../../models/HRM/Promotion.model.js';
import Resignation from '../../models/HRM/Resignation.model.js';
import StaffTransfer from '../../models/HRM/StaffTransfer.model.js';
import User from '../../models/users/user.model.js';
import School from '../../models/school/School.js';
import { sendRejectionEmail } from '../../services/emailService.js';

// 🔥 ADDED THESE IMPORTS SO WE CAN UPDATE THE STAFF'S SCHOOL EVERYWHERE
import Teacher from '../../models/users/teacher.model.js';
import Admin from '../../models/users/admin.model.js';
import Accountant from '../../models/users/accountant.model.js';
import Principal from '../../models/users/principal.model.js';

// ════════════════════════ PROMOTIONS ════════════════════════

// Get all promotions
export const getAllPromotions = async (req, res) => {
  try {
    const { school, organization, status } = req.query;
    const filter = {};

    if (school) filter.school = school;
    if (req.role === 'superadmin' && req.user) {
      filter.organization = req.user._id;
    } else if (organization) {
      filter.organization = organization;
    }
    if (status) filter.status = status;

    const promotions = await Promotion.find(filter)
      .populate('staffId', 'name email role')
      .populate('school', 'schoolName')
      .sort({ createdAt: -1 });

    res.status(200).json({ 
      success: true, 
      data: promotions,
      count: promotions.length 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get promotion by ID
export const getPromotionById = async (req, res) => {
  try {
    const { id } = req.params;
    const promotion = await Promotion.findById(id)
      .populate('staffId')
      .populate('school');

    if (!promotion) {
      return res.status(404).json({ success: false, message: 'Promotion record not found' });
    }

    res.status(200).json({ success: true, data: promotion });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create promotion
export const createPromotion = async (req, res) => {
  try {
    const {
      staffId,
      school,
      organization,
      previousRole,
      newRole,
      previousSalary,
      revisedSalary,
      effectiveDate,
      reason,
      remarks
    } = req.body;

    // Validation
    if (!staffId || !previousRole || !newRole || !effectiveDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    // Check if staff exists
    const staff = await User.findById(staffId);
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    const promotion = await Promotion.create({
      staffId,
      school,
      organization,
      actionType: 'promotion',
      previousRole,
      newRole,
      previousSalary: previousSalary || 0,
      revisedSalary: revisedSalary || 0,
      effectiveDate,
      reason,
      remarks,
      status: 'pending',
      approvedBy: null
    });

    res.status(201).json({ 
      success: true, 
      message: 'Promotion created successfully',
      data: promotion 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Approve promotion
export const approvePromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    // Fixed the initialization error here too just to be safe
    const existingPromotion = await Promotion.findById(id);
    if (!existingPromotion) {
      return res.status(404).json({ success: false, message: 'Promotion record not found' });
    }

    const promotion = await Promotion.findByIdAndUpdate(
      id,
      {
        status: 'approved',
        approvedBy,
        remarks: remarks || existingPromotion.remarks
      },
      { new: true }
    ).populate('staffId');

    // Update staff role if effective date is reached or immediately
    if (new Date(promotion.effectiveDate) <= new Date()) {
      await User.findByIdAndUpdate(promotion.staffId._id, { role: promotion.newRole });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Promotion approved successfully',
      data: promotion 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Reject promotion
export const rejectPromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    const promotion = await Promotion.findByIdAndUpdate(
      id,
      {
        status: 'rejected',
        reviewRemarks: rejectionReason,
        reviewedAt: new Date()
      },
      { new: true }
    ).populate('staffId');

    if (!promotion) {
      return res.status(404).json({ success: false, message: 'Promotion record not found' });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Promotion rejected successfully',
      data: promotion 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ════════════════════════ RESIGNATIONS ════════════════════════

// Get all resignations
export const getAllResignations = async (req, res) => {
  try {
    const { school, organization, status } = req.query;
    const filter = {};

    if (school) filter.school = school;
    if (req.role === 'superadmin' && req.user) {
      // Staff-submitted requests are always associated with a school. Include
      // those schools as well as the direct organization link so older and
      // staff-originated records are not omitted by an inconsistent org field.
      if (!school) {
        const schoolIds = await School.find({ organization: req.user._id }).distinct('_id');
        filter.$or = [
          { organization: req.user._id },
          { school: { $in: schoolIds } },
        ];
      } else {
        filter.organization = req.user._id;
      }
    } else if (organization) {
      filter.organization = organization;
    }
    if (status) filter.status = status;

    const resignations = await Resignation.find(filter)
      .populate('staffId', 'name email role')
      .populate('school', 'schoolName')
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

// Get resignation by ID
export const getResignationById = async (req, res) => {
  try {
    const { id } = req.params;
    const resignation = await Resignation.findById(id)
      .populate('staffId')
      .populate('school');

    if (!resignation) {
      return res.status(404).json({ success: false, message: 'Resignation record not found' });
    }

    res.status(200).json({ success: true, data: resignation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create resignation
export const createResignation = async (req, res) => {
  try {
    const {
      staffId,
      school,
      organization,
      resignationDate,
      lastWorkingDate,
      noticePeriodDays,
      reason,
      remarks
    } = req.body;

    // Validation
    if (!staffId || !resignationDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: staffId, resignationDate' 
      });
    }

    // Check if staff exists
    const staff = await User.findById(staffId);
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    // Check if resignation already exists (pending/approved)
    const existingResignation = await Resignation.findOne({
      staffId,
      status: { $in: ['pending', 'approved'] }
    });

    if (existingResignation) {
      return res.status(409).json({ 
        success: false, 
        message: 'Resignation already exists for this staff member' 
      });
    }

    const resignation = await Resignation.create({
      staffId,
      school,
      organization: req.role === 'superadmin' ? req.user._id : organization,
      staffRole: staff.role,
      resignationDate,
      lastWorkingDate: lastWorkingDate || new Date(new Date(resignationDate).getTime() + (noticePeriodDays || 30) * 24 * 60 * 60 * 1000),
      noticePeriodDays: noticePeriodDays || 30,
      reason,
      reviewRemarks: remarks,
      approvalLevel: 'hq_admin',
      status: 'pending'
    });

    res.status(201).json({ 
      success: true, 
      message: 'Resignation created successfully',
      data: resignation 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Approve resignation
export const approveResignation = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy, remarks } = req.body;

    const existingResignation = await Resignation.findById(id);
    if (!existingResignation) {
      return res.status(404).json({ success: false, message: 'Resignation record not found' });
    }

    const resignation = await Resignation.findByIdAndUpdate(
      id,
      {
      status: 'accepted',
      reviewRemarks: remarks || existingResignation.reviewRemarks,
      reviewedAt: new Date()
      },
      { new: true }
    ).populate('staffId');


    // Mark staff as inactive on last working date
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
export const rejectResignation = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    const resignation = await Resignation.findByIdAndUpdate(
      id,
      {
        status: 'rejected',
        rejectionReason
      },
      { new: true }
    ).populate('staffId');

    if (!resignation) {
      return res.status(404).json({ success: false, message: 'Resignation record not found' });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Resignation rejected successfully',
      data: resignation 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ════════════════════════ TRANSFERS ════════════════════════

// Get all transfers
export const getAllTransfers = async (req, res) => {
  try {
    const { organization, status } = req.query;
    const filter = {};

    if (req.role === 'superadmin' && req.user) {
      filter.organization = req.user._id;
    } else if (organization) {
      filter.organization = organization;
    }
    if (status) filter.status = status;

    const transfers = await StaffTransfer.find(filter)
      .populate('staffId', 'name email role')
      .populate('fromSchool', 'schoolName name')
      .populate('toSchool', 'schoolName name')
      .sort({ createdAt: -1 });

    res.status(200).json({ 
      success: true, 
      data: transfers,
      count: transfers.length 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get transfer by ID
export const getTransferById = async (req, res) => {
  try {
    const { id } = req.params;
    const transfer = await StaffTransfer.findById(id)
      .populate('staffId')
      .populate('fromSchool')
      .populate('toSchool');

    if (!transfer) {
      return res.status(404).json({ success: false, message: 'Transfer record not found' });
    }

    res.status(200).json({ success: true, data: transfer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create transfer
export const createTransfer = async (req, res) => {
  try {
    const {
      staffId,
      staffRole, 
      fromSchool,
      toSchool,
      organization,
      transferType,
      effectiveDate,
      returnDate,
      reason,
      remarks,
      initiatedBy 
    } = req.body;

    // Validation
    if (!staffId || !fromSchool || !toSchool || !effectiveDate || !staffRole || !initiatedBy) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields for transfer' 
      });
    }

    // Check if staff exists
    const staff = await User.findById(staffId);
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    // Check for existing active transfer
    const existingTransfer = await StaffTransfer.findOne({
      staffId,
      status: { $in: ['pending', 'approved', 'in_progress'] }
    });

    if (existingTransfer) {
      return res.status(409).json({ 
        success: false, 
        message: 'Staff member already has an active transfer' 
      });
    }

    const transfer = await StaffTransfer.create({
      staffId,
      staffRole,    
      fromSchool,
      toSchool,
      organization,
      transferType: transferType || 'permanent',
      effectiveDate,
      returnDate: returnDate || null,
      reason,
      remarks,
      initiatedBy,  
      status: 'pending'
    });

    res.status(201).json({ 
      success: true, 
      message: 'Transfer created successfully',
      data: transfer 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Approve transfer
export const approveTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy, remarks } = req.body;

    // 1. Fetch the transfer FIRST to avoid the initialization crash
    const existingTransfer = await StaffTransfer.findById(id).populate('staffId');

    if (!existingTransfer) {
      return res.status(404).json({ success: false, message: 'Transfer record not found' });
    }

    // 2. Update the transfer record
    existingTransfer.status = 'approved';
    existingTransfer.approvedBy = approvedBy || req.user?._id;
    existingTransfer.remarks = remarks || existingTransfer.remarks;
    existingTransfer.approvedAt = new Date();
    await existingTransfer.save();

    // 3. 🔥 ACTUALLY MOVE THE STAFF TO THE NEW SCHOOL 🔥
    // If the effective date is today or in the past, move them immediately
    if (new Date(existingTransfer.effectiveDate) <= new Date()) {
      const staffId = existingTransfer.staffId._id;
      const toSchoolId = existingTransfer.toSchool;
      const staffRole = existingTransfer.staffRole;

      // Update main User collection
      await User.findByIdAndUpdate(staffId, { school: toSchoolId });

      // Update role-specific collection so the branch updates everywhere
      if (staffRole === 'teacher') await Teacher.findOneAndUpdate({ user: staffId }, { school: toSchoolId });
      if (staffRole === 'admin') await Admin.findOneAndUpdate({ user: staffId }, { school: toSchoolId });
      if (staffRole === 'accountant') await Accountant.findOneAndUpdate({ user: staffId }, { school: toSchoolId });
      if (staffRole === 'principal') await Principal.findOneAndUpdate({ user: staffId }, { school: toSchoolId });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Transfer approved and staff successfully moved to the new branch!',
      data: existingTransfer 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Reject transfer
export const rejectTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    const transfer = await StaffTransfer.findByIdAndUpdate(
      id,
      {
        status: 'rejected',
        rejectionReason
      },
      { new: true }
    ).populate('staffId');

    if (!transfer) {
      return res.status(404).json({ success: false, message: 'Transfer record not found' });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Transfer rejected successfully',
      data: transfer 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Complete transfer
export const completeTransfer = async (req, res) => {
  try {
    const { id } = req.params;

    const transfer = await StaffTransfer.findByIdAndUpdate(
      id,
      { status: 'completed' },
      { new: true }
    );

    if (!transfer) {
      return res.status(404).json({ success: false, message: 'Transfer record not found' });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Transfer completed successfully',
      data: transfer 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
