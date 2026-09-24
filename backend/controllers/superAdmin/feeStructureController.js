import FeeStructure from "../../models/finance/FeeStructure.model.js";
import Organization from "../../models/organization/Organization.js";
import Classes from "../../models/organization/organizationClass.js";
import mongoose from "mongoose";

// =======================
// MASTER FEE STRUCTURES
// =======================

export const createFeeStructure = async (req, res) => {
    try {
        const { organization, classId, feeLines, academicYear } = req.body;

        // NEW: Strict Academic Year Validation
        if (academicYear && !/^\d{4}-\d{4}$/.test(academicYear)) {
            return res.status(400).json({ success: false, message: "Academic year format must be YYYY-YYYY (e.g., 2025-2026)." });
        }

        let targetOrganization = organization;
        if (req.role === 'superadmin' && req.user) {
            targetOrganization = req.user._id;
        }

        if (!targetOrganization || !mongoose.Types.ObjectId.isValid(targetOrganization)) {
            return res.status(400).json({ success: false, message: "A valid Organization ID is required." });
        }

        const orgExists = await Organization.findById(targetOrganization);
        if (!orgExists) {
            return res.status(404).json({ success: false, message: "Organization ID is invalid or does not exist." });
        }

        if (!classId || !mongoose.Types.ObjectId.isValid(classId)) {
            return res.status(400).json({ success: false, message: "A valid Class ID is required." });
        }

        const classExists = await Classes.findById(classId);
        if (!classExists) {
            return res.status(404).json({ success: false, message: "Class ID is invalid or does not exist." });
        }

        if (!feeLines || feeLines.length === 0) {
            return res.status(400).json({ success: false, message: "At least one fee line must be provided." });
        }

        const headIdList = feeLines.map(line => line.feeHeadId.toString());
        const uniqueHeads = new Set(headIdList);

        if (uniqueHeads.size !== headIdList.length) {
            return res.status(400).json({ success: false, message: "Duplicate fee types are not allowed in the same fee structure." });
        }

        const feeStructure = new FeeStructure({
            ...req.body,
            organization: targetOrganization,
            createdBy: req.superAdminProfile._id,
            academicYear: academicYear || new Date().getFullYear().toString()
        });

        await feeStructure.save();

        const populated = await FeeStructure.findById(feeStructure._id)
            .populate("organization", "name")
            .populate("classId", "name")
            .populate("feeLines.feeHeadId", "name isInstallmentable feeType");

        res.status(201).json({ success: true, data: populated });

    } catch (error) {
        // Intercept the MongoDB Duplicate Key Error (E11000)
        if (error.code === 11000) {
            return res.status(400).json({ 
                success: false, 
                message: "A fee structure for this Class and Academic Year already exists. Please select a different class or year." 
            });
        }
        
        // Handle all other standard errors
        return res.status(400).json({ success: false, message: error.message });
    }
};

export const getFeeStructures = async (req, res) => {
    try {
        let query = {};
        if (req.role === 'superadmin' && req.user) {
            query.organization = req.user._id;
        } else if (req.query.organizationId) {
            query.organization = req.query.organizationId;
        }

        const structures = await FeeStructure.find(query)
            .populate("organization", "name")
            .populate("classId", "name")
            .populate("feeLines.feeHeadId", "name isInstallmentable feeType");

        res.status(200).json({ success: true, data: structures });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateFeeStructure = async (req, res) => {
    try {
        const { id } = req.params;
        const { classId, feeLines, academicYear, isActive } = req.body;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "A valid fee structure ID is required." });
        }

        // NEW: Strict Academic Year Validation
        if (academicYear && !/^\d{4}-\d{4}$/.test(academicYear)) {
            return res.status(400).json({ success: false, message: "Academic year format must be YYYY-YYYY (e.g., 2025-2026)." });
        }

        if (classId) {
            if (!mongoose.Types.ObjectId.isValid(classId)) {
                return res.status(400).json({ success: false, message: "A valid Class ID is required." });
            }
            const classExists = await Classes.findById(classId);
            if (!classExists) {
                return res.status(404).json({
                    success: false,
                    message: "Class ID is invalid or does not exist.",
                });
            }
        }

        if (Array.isArray(feeLines) && feeLines.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one fee line must be provided.",
            });
        }

        if (Array.isArray(feeLines) && feeLines.length > 0) {
            const headIdList = feeLines.map(line => line.feeHeadId.toString());
            const uniqueHeads = new Set(headIdList);

            if (uniqueHeads.size !== headIdList.length) {
                return res.status(400).json({ success: false, message: "Duplicate fee types are not allowed in the same fee structure." });
            }
        }

        const existing = await FeeStructure.findById(id);
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Fee structure not found",
            });
        }

        if (req.role === 'superadmin' && req.user && String(existing.organization) !== String(req.user._id)) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized to update this fee structure",
            });
        }

        if (classId) existing.classId = classId;
        if (feeLines) {
            existing.feeLines = feeLines.map((line) => ({
                ...line,
                amount: Number(line.amount),
            }));
        }
        if (academicYear) existing.academicYear = academicYear;
        if (typeof isActive === "boolean") existing.isActive = isActive;
        existing.lastModifiedBy = req.user?._id;

        await existing.save();

        const updated = await FeeStructure.findById(existing._id)
            .populate("organization", "name")
            .populate("classId", "name")
            .populate("feeLines.feeHeadId", "name isInstallmentable feeType");

        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        // Intercept the MongoDB Duplicate Key Error (E11000)
        if (error.code === 11000) {
            return res.status(400).json({ 
                success: false, 
                message: "A fee structure for this Class and Academic Year already exists. Please select a different class or year." 
            });
        }
        
        // Handle all other standard errors
        return res.status(400).json({ success: false, message: error.message });
    }
};

export const deleteFeeStructure = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "A valid fee structure ID is required." });
        }

        const existing = await FeeStructure.findById(id);
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Fee structure not found",
            });
        }

        if (req.role === 'superadmin' && req.user && String(existing.organization) !== String(req.user._id)) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized to delete this fee structure",
            });
        }

        // Permanently delete from the database
        await FeeStructure.findByIdAndDelete(id);

        res.status(200).json({ success: true, message: "Fee structure permanently deleted" });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
