import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema({

    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization", 
        required: true,
        index: true
    },

    classRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Class", 
        required: true,
        index: true
    },

    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },

    code: {
        type: String,
        trim: true,
        unique: true,
        uppercase: true
    },

    type: {
        type: String,
        enum: ['core', 'optional', 'practical'],
        default: 'core'
    },

    isActive: {
        type: Boolean,
        default: true
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SuperAdmin"
    }

}, { timestamps: true });

subjectSchema.index({ organization: 1, classRef: 1, name: 1 }, { unique: true });

export default mongoose.model("organizationSubjects", subjectSchema);