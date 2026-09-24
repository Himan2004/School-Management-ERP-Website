import mongoose from 'mongoose';

const emailTemplateSchema = new mongoose.Schema(
    {
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
        subject: {
            type: String,
            required: true,
            trim: true,
        },
        body: {
            type: String,
            required: true,
        },
        placeholders: [String], // e.g. ["{{student_name}}", "{{exam_date}}"]
        type: {
            type: String,
            enum: ['system', 'custom'],
            default: 'custom'
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true,
    }
);

emailTemplateSchema.index({ school: 1, name: 1 }, { unique: true });

const EmailTemplate = mongoose.model('EmailTemplate', emailTemplateSchema);
export default EmailTemplate;
