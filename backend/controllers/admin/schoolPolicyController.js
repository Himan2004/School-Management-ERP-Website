import SchoolPolicy from "../../models/common/SchoolPolicy.js";
import mongoose from "mongoose";

/**
 * @desc    Create a new school policy
 * @route   POST /api/admin/policies
 */
export const createPolicy = async (req, res) => {
    try {
        const { title, description, effectiveDate, audience, status, attachment } = req.body;
        const schoolId = req.user.school._id || req.user.school;
        const organizationId = req.user.school.organization;

        const policy = await SchoolPolicy.create({
            organization: organizationId,
            school: schoolId,
            title,
            description,
            effectiveDate,
            audience: audience || 'Parents',
            status: status || 'Published',
            attachment: attachment || '',
            createdBy: req.user._id
        });

        res.status(201).json({
            success: true,
            message: 'Policy created successfully',
            data: policy
        });
    } catch (error) {
        console.error("Error creating policy:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get all school policies with filtering and search
 * @route   GET /api/admin/policies
 */
export const getAllPolicies = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const { audience, status, search, page = 1, limit = 100 } = req.query;

        const query = { school: schoolId };
        
        if (audience && audience !== 'All Users') query.audience = { $in: ['All Users', audience] };
        if (status) query.status = status;
        
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const policies = await SchoolPolicy.find(query)
            .populate("createdBy", "name role")
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await SchoolPolicy.countDocuments(query);

        res.status(200).json({
            success: true,
            count: policies.length,
            total,
            pages: Math.ceil(total / limit),
            data: policies
        });
    } catch (error) {
        console.error("Error fetching policies:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Update a school policy
 * @route   PUT /api/admin/policies/:id
 */
export const updatePolicy = async (req, res) => {
    try {
        const { id } = req.params;
        const schoolId = req.user.school._id || req.user.school;

        const updateData = { ...req.body };

        const policy = await SchoolPolicy.findOneAndUpdate(
            { _id: id, school: schoolId },
            updateData,
            { new: true, runValidators: true }
        );

        if (!policy) return res.status(404).json({ success: false, message: "Policy not found" });

        res.status(200).json({ success: true, message: "Policy updated successfully", data: policy });
    } catch (error) {
        console.error("Error updating policy:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Delete a school policy
 * @route   DELETE /api/admin/policies/:id
 */
export const deletePolicy = async (req, res) => {
    try {
        const { id } = req.params;
        const schoolId = req.user.school._id || req.user.school;

        const policy = await SchoolPolicy.findOneAndDelete({ _id: id, school: schoolId });
        if (!policy) return res.status(404).json({ success: false, message: "Policy not found" });

        res.status(200).json({ success: true, message: "Policy deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get policy stats
 * @route   GET /api/admin/policies/stats
 */
export const getPolicyStats = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;

        const stats = await SchoolPolicy.aggregate([
            { $match: { school: new mongoose.Types.ObjectId(schoolId) } },
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                statusStats: stats
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
