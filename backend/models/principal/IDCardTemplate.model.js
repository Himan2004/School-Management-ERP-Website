import mongoose from 'mongoose';

const idCardTemplateSchema = new mongoose.Schema(
    {
        organization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization',
            required: true,
            index: true,
        },
        school: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'School',
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        targetRole: {
            type: String,
            enum: ['Student', 'Teacher', 'Staff'],
            default: 'Student',
            required: true,
        },
        paperSize: {
            type: String,
            enum: ['A4', 'A5', 'Postcard', 'PVC', 'Custom'],
            default: 'PVC',
        },
        dimensions: {
            width: { type: Number, default: 85.6 }, // mm
            height: { type: Number, default: 53.98 }, // mm
            unit: { type: String, default: 'mm' }
        },
        designConfig: {
            backgroundColor: { type: String, default: '#ffffff' },
            primaryColor: { type: String, default: '#1e40af' }, // Default blue-700
            secondaryColor: { type: String, default: '#facc15' }, // Default yellow-400
            textColor: { type: String, default: '#1e293b' },
            headerImage: { type: String }, // URL
            backgroundImage: { type: String }, // URL
            logoImage: { type: String }, // URL
            showSchoolName: { type: Boolean, default: true },
            showSchoolAddress: { type: Boolean, default: false },
        },
        visibleFields: [{
            field: { type: String, required: true }, // e.g., 'name', 'rollNo', 'bloodGroup'
            label: { type: String },
            isEnabled: { type: Boolean, default: true }
        }],
        isDefault: {
            type: Boolean,
            default: false,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }
    },
    {
        timestamps: true,
    }
);

idCardTemplateSchema.index({ school: 1, targetRole: 1 });

const IDCardTemplate = mongoose.models.IDCardTemplate || mongoose.model('IDCardTemplate', idCardTemplateSchema);
export default IDCardTemplate;
