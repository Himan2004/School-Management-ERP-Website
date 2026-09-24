import mongoose from 'mongoose';

const idCardRecordSchema = new mongoose.Schema(
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
        entityType: {
            type: String,
            enum: ['Student', 'Teacher', 'Staff'],
            required: true,
            index: true,
        },
        entityId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: 'entityTypeModel',
        },
        entityTypeModel: {
            type: String,
            required: true,
            enum: ['Student', 'Teacher', 'Accountant', 'StaffProfile', 'Principal', 'Admin'], // Adjust based on actual model names
        },
        template: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'IDCardTemplate',
            required: true,
        },
        serialNumber: {
            type: String,
            unique: true,
            sparse: true,
        },
        status: {
            type: String,
            enum: ['Pending', 'Active', 'Generated', 'Printed', 'Distributed', 'Revoked'],
            default: 'Pending',
            index: true,
        },
        qrCodeData: {
            type: String,
            unique: true,
        },
        generationDate: {
            type: Date,
            default: Date.now,
        },
        printedDate: {
            type: Date,
        },
        distributedDate: {
            type: Date,
        },
        history: [{
            status: String,
            date: { type: Date, default: Date.now },
            note: String,
            updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
        }]
    },
    {
        timestamps: true,
    }
);

idCardRecordSchema.index({ school: 1, entityId: 1 });
idCardRecordSchema.index({ school: 1, status: 1 });

const IDCardRecord = mongoose.models.IDCardRecord || mongoose.model('IDCardRecord', idCardRecordSchema);
export default IDCardRecord;
