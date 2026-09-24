import IDCardTemplate from '../../models/principal/IDCardTemplate.model.js';
import User from '../../models/users/user.model.js';

// @desc    Create a new ID card template
// @route   POST /api/principal/id-cards/templates
// @access  Private (Principal)
export const createTemplate = async (req, res) => {
    try {
        const { name, targetRole, paperSize, dimensions, designConfig, visibleFields, isDefault } = req.body;

        const principal = await User.findById(req.user.id).populate('school');
        if (!principal || !principal.school) {
            return res.status(404).json({ success: false, message: "Principal's school not found" });
        }

        // If setting as default, unset other defaults for this role
        if (isDefault) {
            await IDCardTemplate.updateMany(
                { school: principal.school._id, targetRole },
                { isDefault: false }
            );
        }

        const template = await IDCardTemplate.create({
            organization: principal.school.organization,
            school: principal.school._id,
            name,
            targetRole,
            paperSize,
            dimensions,
            designConfig,
            visibleFields,
            isDefault,
            createdBy: req.user.id
        });

        res.status(201).json({ success: true, data: template });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all templates for the school
// @route   GET /api/principal/id-cards/templates
// @access  Private (Principal)
export const getTemplates = async (req, res) => {
    try {
        const principal = await User.findById(req.user.id);
        const templates = await IDCardTemplate.find({ school: principal.school })
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: templates });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update a template
// @route   PUT /api/principal/id-cards/templates/:id
// @access  Private (Principal)
export const updateTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const principal = await User.findById(req.user.id);

        if (updates.isDefault) {
            const template = await IDCardTemplate.findById(id);
            await IDCardTemplate.updateMany(
                { school: principal.school, targetRole: template.targetRole },
                { isDefault: false }
            );
        }

        const updatedTemplate = await IDCardTemplate.findOneAndUpdate(
            { _id: id, school: principal.school },
            updates,
            { new: true, runValidators: true }
        );

        if (!updatedTemplate) {
            return res.status(404).json({ success: false, message: "Template not found" });
        }

        res.status(200).json({ success: true, data: updatedTemplate });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete a template
// @route   DELETE /api/principal/id-cards/templates/:id
// @access  Private (Principal)
export const deleteTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const principal = await User.findById(req.user.id);

        const template = await IDCardTemplate.findOneAndDelete({ _id: id, school: principal.school });

        if (!template) {
            return res.status(404).json({ success: false, message: "Template not found" });
        }

        res.status(200).json({ success: true, message: "Template deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Clone a template
// @route   POST /api/principal/id-cards/templates/:id/clone
// @access  Private (Principal)
export const cloneTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const principal = await User.findById(req.user.id);

        const original = await IDCardTemplate.findOne({ _id: id, school: principal.school });
        if (!original) {
            return res.status(404).json({ success: false, message: "Original template not found" });
        }

        const clonedData = original.toObject();
        delete clonedData._id;
        delete clonedData.createdAt;
        delete clonedData.updatedAt;
        clonedData.name = `${original.name} (Copy)`;
        clonedData.isDefault = false;

        const clonedTemplate = await IDCardTemplate.create(clonedData);

        res.status(201).json({ success: true, data: clonedTemplate });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
