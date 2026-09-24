import IDCardRecord from '../../models/principal/IDCardRecord.model.js';
import IDCardTemplate from '../../models/principal/IDCardTemplate.model.js';
import User from '../../models/users/user.model.js';
import Student from '../../models/users/student.model.js';
import mongoose from 'mongoose';

// @desc    Generate ID card records for a batch of students
// @route   POST /api/principal/id-cards/generate
// @access  Private (Principal)
export const generateBatch = async (req, res) => {
    try {
        const { entityIds, entityType, templateId } = req.body;

        if (!entityIds || !Array.isArray(entityIds) || entityIds.length === 0) {
            return res.status(400).json({ success: false, message: "No entities selected for generation" });
        }

        const principal = await User.findById(req.user.id).populate('school');
        if (!principal) {
            return res.status(404).json({ success: false, message: "Principal user not found" });
        }
        if (!principal.school) {
            return res.status(400).json({ success: false, message: "School not linked to principal user" });
        }

        const schoolId = principal.school._id;
        const organizationId = principal.school.organization;

        // Find template safely
        let template;
        if (templateId && mongoose.isValidObjectId(templateId)) {
            template = await IDCardTemplate.findById(templateId);
        }

        if (!template) {
            template = await IDCardTemplate.findOne({ 
                isDefault: true, 
                school: schoolId, 
                targetRole: entityType 
            });
        }

        if (!template) {
            // Last fallback: find any template for this school
            template = await IDCardTemplate.findOne({ 
                school: schoolId, 
                targetRole: entityType 
            });
        }

        if (!template) {
            return res.status(404).json({ success: false, message: `No ID Card Template configured for ${entityType}. Please create a template first.` });
        }

        const records = [];
        for (const id of entityIds) {
            if (!mongoose.isValidObjectId(id)) {
                continue;
            }

            // Check if record already exists
            let record = await IDCardRecord.findOne({ entityId: id, school: schoolId });
            
            if (record) {
                // Update existing record to 'Generated' and refresh template
                record.status = 'Generated';
                record.template = template._id;
                record.history.push({ status: 'Generated', updatedBy: req.user.id, note: 'Re-generated card' });
                await record.save();
            } else {
                // Create new record
                const qrData = Buffer.from(`${schoolId}:${id}`).toString('base64');
                record = await IDCardRecord.create({
                    organization: organizationId,
                    school: schoolId,
                    entityType,
                    entityId: id,
                    entityTypeModel: entityType === 'Student' ? 'Student' : entityType,
                    template: template._id,
                    qrCodeData: qrData,
                    status: 'Generated',
                    history: [{ status: 'Generated', updatedBy: req.user.id }]
                });
            }
            records.push(record);
        }

        res.status(201).json({ 
            success: true, 
            message: "ID Card Generated Successfully",
            count: records.length, 
            data: records 
        });
    } catch (error) {
        console.error("ID Card Generate Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update card status (Printed, Distributed, Revoked)
// @route   PATCH /api/principal/id-cards/status
// @access  Private (Principal)
export const updateCardStatus = async (req, res) => {
    try {
        const { recordIds, status, note } = req.body;

        if (!recordIds || !Array.isArray(recordIds)) {
            return res.status(400).json({ success: false, message: "Record IDs are required" });
        }

        const principal = await User.findById(req.user.id);

        const updateData = { status };
        if (status === 'Printed') updateData.printedDate = new Date();
        if (status === 'Distributed') updateData.distributedDate = new Date();

        const results = await IDCardRecord.updateMany(
            { _id: { $in: recordIds }, school: principal.school },
            { 
                $set: updateData,
                $push: { history: { status, updatedBy: req.user.id, note } }
            }
        );

        res.status(200).json({ success: true, message: `${results.modifiedCount} records updated` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get ID Card generation statistics
// @route   GET /api/principal/id-cards/stats
// @access  Private (Principal)
export const getCardStats = async (req, res) => {
    try {
        const principal = await User.findById(req.user.id);

        const stats = await IDCardRecord.aggregate([
            { $match: { school: principal.school } },
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        res.status(200).json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Verify ID Card via QR Code
// @route   GET /api/principal/id-cards/verify/:qrData
// @access  Public (or Private depending on use case)
export const verifyCard = async (req, res) => {
    try {
        const { qrData } = req.params;
        const record = await IDCardRecord.findOne({ qrCodeData: qrData })
            .populate('entityId')
            .populate('template');

        if (!record) {
            return res.status(404).json({ success: false, message: "Invalid ID Card" });
        }

        res.status(200).json({ success: true, data: record });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
