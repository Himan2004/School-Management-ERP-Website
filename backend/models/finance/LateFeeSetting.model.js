// models/finance/LateFeeSetting.model.js
import mongoose from 'mongoose';

const LateFeeSettingSchema = new mongoose.Schema({
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    dueDay: { type: Number, required: true, default: 10 }, // Day of month when fee is due
    penaltyPerDay: { type: Number, required: true, default: 50 }, // Amount per day late
    isActive: { type: Boolean, default: true },
    gracePeriod: { type: Number, default: 0 }, // Days of grace after due date
    maxPenalty: { type: Number, default: 0 }, // 0 means no max limit
    applicableClasses: [{ type: String }], // Empty means all classes
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('LateFeeSetting', LateFeeSettingSchema);