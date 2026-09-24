import mongoose from "mongoose";

const schoolPolicySchema = new mongoose.Schema(
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
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    effectiveDate: {
      type: Date,
      required: true,
    },
    audience: {
      type: String,
      enum: ['All Users', 'Parents', 'Students', 'Teachers', 'Principal', 'Accountant'],
      default: 'Parents',
    },
    status: {
      type: String,
      enum: ['Draft', 'Published', 'Archived'],
      default: 'Published',
    },
    attachment: {
      type: String, // Storing file name or URL
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

schoolPolicySchema.index({ school: 1, status: 1 });
schoolPolicySchema.index({ school: 1, audience: 1 });

export default mongoose.model('SchoolPolicy', schoolPolicySchema);
