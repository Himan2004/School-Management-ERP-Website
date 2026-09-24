import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
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
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed'],
      default: 'pending',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    dueDate: {
      type: Date,
    },
    assignedTo: {
      type: String, // For now, storing name or reference
      trim: true,
      default: 'Admin'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    assignedClass: {
      type: String,
      trim: true,
    },
    assignedSection: {
      type: String,
      trim: true,
    },
    assignedSubject: {
      type: String,
      trim: true,
    },
    attachment: {
      type: String,
    }
  },
  {
    timestamps: true,
  }
);

// Index for better performance when querying by school and status
taskSchema.index({ school: 1, status: 1 });
taskSchema.index({ assignedClass: 1, assignedSection: 1 });

export default mongoose.model('Task', taskSchema);
